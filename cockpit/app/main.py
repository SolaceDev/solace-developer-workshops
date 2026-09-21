"""Workshop cockpit -- FastAPI application.

REST for control (list scenarios, start/stop actions, read broker state),
WebSocket for streaming subprocess output to the browser.
"""

import asyncio
import shutil
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from . import broker
from .config import (BROKER_UI_URL, MSG_VPN, SEMP_PORT, STATE_DIR, STATIC_DIR,
                     scenario_state_dir, terraform_env)
from .processes import RunState, manager
from .scenarios import build_command, registry


@asynccontextmanager
async def lifespan(app: FastAPI):
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    yield
    # Never leave an attendee's container with orphaned publishers running.
    await manager.stop_all()


app = FastAPI(title="Solace Workshop Cockpit", lifespan=lifespan)


# ---------------------------------------------------------------- environment

@app.get("/api/env")
async def get_env():
    return {
        "brokerUiUrl": BROKER_UI_URL,
        "msgVpn": MSG_VPN,
        "sempPort": SEMP_PORT,
        "terraformAvailable": shutil.which("terraform") is not None,
    }


@app.get("/api/health")
async def get_health():
    return await broker.health()


@app.get("/api/overview")
async def get_overview():
    return await broker.overview()


# ------------------------------------------------------------------ scenarios

@app.get("/api/scenarios")
async def list_scenarios():
    scenarios = []
    for scenario in registry.all():
        payload = scenario.as_dict()
        payload["runs"] = {
            action["id"]: (run.status() if (run := manager.get(f"{scenario.id}:{action['id']}")) else None)
            for action in payload["actions"]
        }
        scenarios.append(payload)
    return {"scenarios": scenarios}


@app.post("/api/scenarios/{scenario_id}/actions/{action_id}/start")
async def start_action(scenario_id: str, action_id: str):
    scenario = registry.get(scenario_id)
    if scenario is None:
        raise HTTPException(404, f"unknown scenario: {scenario_id}")
    action = scenario.action(action_id)
    if action is None:
        raise HTTPException(404, f"unknown action: {action_id}")

    run = await _start_one(scenario, action)
    return run.status()


async def _start_one(scenario, action):
    """Launch a single action. Shared by the individual buttons and by the
    Run scenario sequence, so both take exactly the same path."""
    key = f"{scenario.id}:{action.id}"
    try:
        argv, cwd, env = build_command(scenario, action)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc

    # Terraform needs an initialized working directory before apply/destroy.
    # Doing it here rather than making attendees click an "init" button keeps
    # the workshop focused on broker concepts instead of terraform mechanics.
    if action.kind == "terraform":
        if shutil.which("terraform") is None:
            raise HTTPException(503, "terraform is not installed in this container")
        await _ensure_tf_init(scenario, action)

    try:
        return await manager.start(key, action.label, argv, cwd, env=env)
    except RuntimeError as exc:
        raise HTTPException(409, str(exc)) from exc


async def _terraform(workdir, *args) -> tuple:
    proc = await asyncio.create_subprocess_exec(
        "terraform", f"-chdir={workdir}", *args,
        cwd=str(workdir), env=terraform_env(),
        stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.STDOUT,
    )
    out, _ = await proc.communicate()
    return proc.returncode, out.decode(errors="replace")


async def _ensure_tf_init(scenario, action) -> None:
    """Make sure the working directory has usable provider plugins.

    A present .terraform directory is not proof of a usable one: plugins are
    platform-specific, so a directory initialised on another machine (or before
    a container rebuild) leaves terraform reporting "Required plugins are not
    installed". `validate` is the cheap way to ask terraform itself whether the
    directory works, and `-upgrade` re-resolves a lock file written elsewhere.
    """
    workdir = scenario.tf_workdir(action)

    if (workdir / ".terraform").is_dir():
        code, _ = await _terraform(workdir, "validate", "-no-color")
        if code == 0:
            return

    code, out = await _terraform(workdir, "init", "-no-color", "-input=false", "-upgrade")
    if code != 0:
        raise HTTPException(500, f"terraform init failed:\n{out}")


@app.post("/api/scenarios/{scenario_id}/actions/{action_id}/stop")
async def stop_action(scenario_id: str, action_id: str):
    key = f"{scenario_id}:{action_id}"
    if not await manager.stop(key):
        raise HTTPException(404, f"no run for {key}")
    run = manager.get(key)
    return run.status()


@app.post("/api/scenarios/{scenario_id}/run")
async def run_scenario(scenario_id: str):
    """Run the whole scenario in order, so an attendee who wants the end state
    can get there in one click instead of pressing five buttons in sequence.

    Each step is the same action the individual buttons run, and its output
    still streams to its own log pane -- this only automates the clicking.
    """
    scenario = registry.get(scenario_id)
    if scenario is None:
        raise HTTPException(404, f"unknown scenario: {scenario_id}")

    sequence = scenario.run_sequence
    if not sequence:
        raise HTTPException(400, f"{scenario_id} has no runnable actions")

    key = f"__sequence__:{scenario_id}"
    existing = _sequences.get(key)
    if existing is not None and not existing.done():
        raise HTTPException(409, "this scenario is already running")

    _sequences[key] = asyncio.create_task(_run_sequence(scenario, sequence))
    return {"started": [a.id for a in sequence]}


@app.post("/api/scenarios/{scenario_id}/pause")
async def pause_scenario(scenario_id: str):
    """Stop this scenario's running processes, leaving broker config in place.

    Pause is about the apps, not the broker: queues, profiles and usernames
    survive so Play can start the processes again without re-applying anything.
    Removing configuration is Cleanup's job.
    """
    scenario = registry.get(scenario_id)
    if scenario is None:
        raise HTTPException(404, f"unknown scenario: {scenario_id}")

    # Cancel an in-flight Play first, or it would keep launching steps behind us.
    task = _sequences.get(f"__sequence__:{scenario_id}")
    if task is not None and not task.done():
        task.cancel()

    stopped = 0
    for action in scenario.actions:
        if await manager.stop(f"{scenario_id}:{action.id}"):
            stopped += 1
    return {"stopped": stopped}


@app.post("/api/scenarios/{scenario_id}/cleanup")
async def cleanup_scenario(scenario_id: str):
    """Stop everything, then run the scenario's teardown steps.

    Processes are stopped before the teardown runs so terraform is not deleting
    configuration out from under a live client, which produces confusing errors
    in the app logs rather than a clean shutdown.
    """
    scenario = registry.get(scenario_id)
    if scenario is None:
        raise HTTPException(404, f"unknown scenario: {scenario_id}")

    sequence = scenario.cleanup_sequence
    if not sequence:
        raise HTTPException(400, f"{scenario_id} has no cleanup actions")

    key = f"__sequence__:{scenario_id}"
    task = _sequences.get(key)
    if task is not None and not task.done():
        task.cancel()

    _sequences[key] = asyncio.create_task(_run_cleanup(scenario, sequence))
    return {"started": [a.id for a in sequence]}


async def _run_cleanup(scenario, sequence) -> None:
    for action in scenario.actions:
        await manager.stop(f"{scenario.id}:{action.id}")

    for action in sequence:
        try:
            run = await _start_one(scenario, action)
        except HTTPException:
            return
        await _await_completion(run)
        # Teardown steps continue past a failure rather than stopping: a partly
        # removed scenario is worse than one where every step at least tried.
        if run.state is not RunState.SUCCEEDED:
            continue


# Sequence tasks live here rather than in the ProcessManager: they supervise
# runs, they are not runs themselves.
_sequences: dict = {}

# Why the last sequence for a scenario stopped early, so the UI can explain a
# halted Play instead of silently returning the buttons to their resting state.
_sequence_errors: dict = {}


async def _run_sequence(scenario, sequence) -> None:
    _sequence_errors.pop(scenario.id, None)
    # Re-running must produce the same end state as a first run. Long-running
    # actions left over from a previous run would otherwise be skipped (start
    # refuses to replace a live run), and the sequence would publish into
    # whatever happened to still be listening.
    for action in sequence:
        if action.long_running:
            await manager.stop(f"{scenario.id}:{action.id}")

    for action in sequence:
        try:
            run = await _start_one(scenario, action)
        except HTTPException as exc:
            # A failed step stops the sequence: later steps almost always
            # depend on earlier ones, and pressing on would bury the real
            # error under a cascade of follow-on failures.
            _sequence_errors[scenario.id] = f"{action.label} could not start: {exc.detail}"
            return

        if action.long_running:
            # A consumer never exits on its own, so waiting for it would stall
            # the sequence forever. Give it a moment to connect and subscribe,
            # then move on -- which is exactly what a person clicking the
            # buttons would do.
            await _settle(run, seconds=6.0)
            if not run.is_active:
                # It died during startup; stop rather than publish into the void.
                _sequence_errors[scenario.id] = f"{action.label} stopped during startup"
                return
        else:
            await _await_completion(run)
            if run.state is not RunState.SUCCEEDED:
                _sequence_errors[scenario.id] = (
                    f"{action.label} failed. Check its output below.")
                return


async def _settle(run, seconds: float) -> None:
    """Wait for a long-running action to get going, or die trying."""
    deadline = asyncio.get_running_loop().time() + seconds
    while asyncio.get_running_loop().time() < deadline:
        if not run.is_active:
            return
        await asyncio.sleep(0.2)


async def _await_completion(run, timeout: float = 900.0) -> None:
    deadline = asyncio.get_running_loop().time() + timeout
    while run.is_active and asyncio.get_running_loop().time() < deadline:
        await asyncio.sleep(0.2)


@app.get("/api/scenarios/{scenario_id}/state")
async def scenario_state(scenario_id: str):
    """Per-node status for the interactive diagram.

    Two kinds of truth, both real: whether a node's process is running (from the
    ProcessManager) and whether the config it depends on exists (from SEMP). The
    browser polls this to paint status rings and checklists, so the picture
    always reflects the broker rather than an assumption about it.
    """
    scenario = registry.get(scenario_id)
    if scenario is None:
        raise HTTPException(404, f"unknown scenario: {scenario_id}")

    nodes = (scenario.diagram or {}).get("nodes", [])

    # Every distinct SEMP path across every node, checked once and concurrently.
    # A node's checklist often repeats paths another node also needs, and a
    # serial pass would make this poll take as long as the sum of its parts.
    paths = {
        item["semp"]
        for node in nodes
        for item in (node.get("requires", []) + node.get("provides", []))
        if item.get("semp")
    }

    async def probe(path: str):
        try:
            return path, await broker.exists(path)
        except Exception:
            # Broker still booting, or a transient failure. Unknown is more
            # honest than claiming the object is absent.
            return path, None

    found = dict(await asyncio.gather(*(probe(p) for p in paths))) if paths else {}

    out = {}
    for node in nodes:
        node_id = node.get("id")
        action_id = node.get("action")
        run = manager.get(f"{scenario_id}:{action_id}") if action_id else None

        checklist = [
            {"label": item.get("label", item.get("semp", "")),
             "present": found.get(item.get("semp"))}
            for item in (node.get("requires", []) + node.get("provides", []))
        ]

        out[node_id] = {
            "action": action_id,
            "run": run.status() if run else None,
            "running": bool(run and run.is_active),
            "checklist": checklist,
            "ready": all(c["present"] for c in checklist) if checklist else None,
        }

    return {"nodes": out}


@app.get("/api/scenarios/{scenario_id}/inspect")
async def inspect_scenario(scenario_id: str):
    """Fetch every SEMP view a scenario declares, so attendees can confirm what
    the configuration produced before they go looking for it in the broker UI."""
    scenario = registry.get(scenario_id)
    if scenario is None:
        raise HTTPException(404, f"unknown scenario: {scenario_id}")

    views = []
    for spec in scenario.inspect:
        view = {"label": spec.label, "columns": spec.columns,
                "uiHint": spec.ui_hint, "rows": [], "error": None}
        try:
            data = await broker.semp_get(spec.path, spec.api)
            view["rows"] = data.get("data", [])
        except broker.BrokerUnavailable as exc:
            view["error"] = str(exc)
        except Exception as exc:
            view["error"] = f"{type(exc).__name__}: {exc}"
        views.append(view)
    return {"views": views}


# ------------------------------------------------------------------- run state

@app.get("/api/runs")
async def list_runs():
    return {
        "runs": [r.status() for r in manager.all()],
        "activeCount": len(manager.active()),
        # Which scenarios are mid-sequence, so the UI can show that a Run
        # scenario is still working through its steps.
        "sequences": [k.split(":", 1)[1] for k, t in _sequences.items() if not t.done()],
        "sequenceErrors": dict(_sequence_errors),
    }


@app.post("/api/runs/stop-all")
async def stop_all_runs():
    """The escape hatch. Attendees jump between sections out of order, and a
    stale process from an earlier section is the most confusing failure mode in
    a workshop like this."""
    return {"stopped": await manager.stop_all()}


@app.post("/api/scenarios/{scenario_id}/reset")
async def reset_scenario(scenario_id: str):
    """Stop this scenario's runs and delete its terraform state. Destructive by
    design: it exists so an attendee who has tangled a section can start over."""
    scenario = registry.get(scenario_id)
    if scenario is None:
        raise HTTPException(404, f"unknown scenario: {scenario_id}")

    stopped = 0
    for action in scenario.actions:
        if await manager.stop(f"{scenario_id}:{action.id}"):
            stopped += 1

    state = scenario_state_dir(scenario_id)
    if state.exists():
        shutil.rmtree(state)
    return {"stopped": stopped, "stateCleared": True}


@app.websocket("/ws/runs/{scenario_id}/{action_id}")
async def stream_run(websocket: WebSocket, scenario_id: str, action_id: str):
    """Replay buffered history, then stream live output.

    History first matters: an attendee who opens a log pane after a terraform
    apply has finished should see what happened, not an empty box.
    """
    await websocket.accept()
    key = f"{scenario_id}:{action_id}"

    # The socket follows the KEY, not one Run object. The browser opens a stream
    # for every action as soon as a scenario renders, which is usually before
    # anything has run, and starting an action replaces that key's Run. A socket
    # bound to a single Run would go deaf in both cases.
    current = None          # the Run this socket is bound to right now
    queue = None            # its output subscription
    announced_empty = False

    try:
        while True:
            run = manager.get(key)

            if run is None:
                # Nothing has run under this key yet. Say so once, then wait for
                # an action to start rather than closing the socket.
                if not announced_empty:
                    await websocket.send_json({"type": "status", "status": None})
                    announced_empty = True
                await asyncio.sleep(0.4)
                continue

            if run is not current:
                if current is not None and queue is not None:
                    current.unsubscribe(queue)
                current, queue, announced_empty = run, run.subscribe(), False
                await websocket.send_json({"type": "history", "lines": run.history()})
                await websocket.send_json({"type": "status", "status": run.status()})

            # Poll rather than block indefinitely, so a newer run replacing this
            # key is noticed. Cancelling a queue.get() on timeout is safe.
            try:
                line = await asyncio.wait_for(queue.get(), timeout=0.4)
            except asyncio.TimeoutError:
                continue

            await websocket.send_json({"type": "line", "line": line.as_dict()})
            if not run.is_active:
                await websocket.send_json({"type": "status", "status": run.status()})
    except (WebSocketDisconnect, RuntimeError):
        pass
    finally:
        if current is not None and queue is not None:
            current.unsubscribe(queue)


# ----------------------------------------------------------------- static site

class _NoCacheStatic(StaticFiles):
    """Serve the cockpit's own assets without caching.

    An attendee who reloads after the cockpit is updated should get the new
    JS and CSS, not a stale copy their browser decided to keep. These files are
    a few KB served from localhost, so there is nothing to gain from caching
    them, and a mysteriously stale UI during a workshop costs real time.
    """

    def is_not_modified(self, response_headers, request_headers) -> bool:
        return False

    async def get_response(self, path, scope):
        response = await super().get_response(path, scope)
        response.headers["Cache-Control"] = "no-store, must-revalidate"
        return response


app.mount("/static", _NoCacheStatic(directory=str(STATIC_DIR)), name="static")


@app.get("/")
async def index():
    return FileResponse(str(STATIC_DIR / "index.html"))


@app.exception_handler(broker.BrokerUnavailable)
async def broker_unavailable_handler(request, exc):
    return JSONResponse(status_code=503, content={"detail": str(exc)})
