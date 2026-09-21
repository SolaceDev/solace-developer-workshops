"""Supervision of workshop subprocesses.

Everything the cockpit runs -- terraform, SDK sample apps, CLI tools -- is a
subprocess rather than a thread. That gives us uniform treatment across
languages, real cancellation via signals, and crash isolation so a hung
publisher can never take the cockpit UI down with it.
"""

import asyncio
import os
import signal
import time
from collections import deque
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional

from .config import LOG_RING_SIZE


class RunState(str, Enum):
    IDLE = "idle"
    RUNNING = "running"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    STOPPED = "stopped"


@dataclass
class LogLine:
    seq: int
    stream: str  # "stdout" | "stderr" | "system"
    text: str
    ts: float = field(default_factory=time.time)

    def as_dict(self) -> dict:
        return {"seq": self.seq, "stream": self.stream, "text": self.text, "ts": self.ts}


class Run:
    """A single invocation of an action: its process, its output, its state."""

    def __init__(self, key: str, label: str, cmd: list, cwd: str):
        self.key = key
        self.label = label
        self.cmd = cmd
        self.cwd = cwd
        self.state = RunState.IDLE
        self.exit_code: Optional[int] = None
        self.started_at: Optional[float] = None
        self.finished_at: Optional[float] = None

        self._proc: Optional[asyncio.subprocess.Process] = None
        self._lines: deque = deque(maxlen=LOG_RING_SIZE)
        self._seq = 0
        # Subscribers are per-websocket queues. A slow browser tab must never
        # block process output, so queues are bounded and drop oldest-first.
        self._subscribers: set = set()

    # ---- output plumbing -------------------------------------------------

    def _emit(self, stream: str, text: str) -> None:
        self._seq += 1
        line = LogLine(seq=self._seq, stream=stream, text=text)
        self._lines.append(line)
        for q in list(self._subscribers):
            if q.full():
                try:
                    q.get_nowait()
                except asyncio.QueueEmpty:
                    pass
            q.put_nowait(line)

    def history(self) -> list:
        return [line.as_dict() for line in self._lines]

    def subscribe(self) -> "asyncio.Queue":
        """Register a queue that receives every subsequent log line.

        A plain queue rather than an async generator: callers poll it with a
        timeout so they can also notice a client disconnecting or a newer run
        taking over, and cancelling a `queue.get()` is safe in a way that
        cancelling a generator mid-yield is not.

        The caller must pass the queue back to `unsubscribe` when finished.
        """
        q: asyncio.Queue = asyncio.Queue(maxsize=512)
        self._subscribers.add(q)
        return q

    def unsubscribe(self, q: "asyncio.Queue") -> None:
        self._subscribers.discard(q)

    # ---- lifecycle -------------------------------------------------------

    @property
    def is_active(self) -> bool:
        return self.state is RunState.RUNNING

    async def start(self, env: Optional[dict] = None) -> None:
        if self.is_active:
            raise RuntimeError(f"{self.key} is already running")

        self.state = RunState.RUNNING
        self.exit_code = None
        self.started_at = time.time()
        self.finished_at = None
        self._emit("system", "$ " + " ".join(self.cmd))

        try:
            self._proc = await asyncio.create_subprocess_exec(
                *self.cmd,
                cwd=self.cwd,
                env=env or dict(os.environ),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                # Own process group so stopping kills the whole tree, not just
                # the wrapper. Terraform in particular spawns provider plugins.
                start_new_session=True,
            )
        except FileNotFoundError:
            self.state = RunState.FAILED
            self.exit_code = 127
            self.finished_at = time.time()
            self._emit("system", f"command not found: {self.cmd[0]}")
            return

        asyncio.create_task(self._pump(self._proc.stdout, "stdout"))
        asyncio.create_task(self._pump(self._proc.stderr, "stderr"))
        asyncio.create_task(self._reap())

    async def _pump(self, reader, stream: str) -> None:
        if reader is None:
            return
        while True:
            raw = await reader.readline()
            if not raw:
                break
            self._emit(stream, raw.decode(errors="replace").rstrip("\n"))

    async def _reap(self) -> None:
        assert self._proc is not None
        code = await self._proc.wait()
        self.exit_code = code
        self.finished_at = time.time()
        # A stop request marks state before signalling; don't overwrite it.
        if self.state is RunState.RUNNING:
            self.state = RunState.SUCCEEDED if code == 0 else RunState.FAILED
        self._emit("system", f"exited with code {code}")

    async def stop(self, grace: float = 5.0) -> None:
        if not self.is_active or self._proc is None:
            return
        self.state = RunState.STOPPED
        self._emit("system", "stopping...")
        try:
            os.killpg(os.getpgid(self._proc.pid), signal.SIGTERM)
        except ProcessLookupError:
            return
        try:
            await asyncio.wait_for(self._proc.wait(), timeout=grace)
        except asyncio.TimeoutError:
            self._emit("system", "did not exit on SIGTERM; sending SIGKILL")
            try:
                os.killpg(os.getpgid(self._proc.pid), signal.SIGKILL)
            except ProcessLookupError:
                pass

    def status(self) -> dict:
        return {
            "key": self.key,
            "label": self.label,
            "state": self.state.value,
            "exitCode": self.exit_code,
            "startedAt": self.started_at,
            "finishedAt": self.finished_at,
        }


class ProcessManager:
    """Registry of runs keyed by "<scenario_id>:<action_id>".

    One run per key: restarting an action replaces its predecessor, which keeps
    the mental model simple for attendees -- a card is either running or it isn't.
    """

    def __init__(self) -> None:
        self._runs: dict = {}

    def get(self, key: str) -> Optional[Run]:
        return self._runs.get(key)

    def all(self) -> list:
        return list(self._runs.values())

    def active(self) -> list:
        return [r for r in self._runs.values() if r.is_active]

    async def start(self, key: str, label: str, cmd: list, cwd: str,
                    env: Optional[dict] = None) -> Run:
        existing = self._runs.get(key)
        if existing and existing.is_active:
            raise RuntimeError(f"{label} is already running")
        run = Run(key=key, label=label, cmd=cmd, cwd=cwd)
        self._runs[key] = run
        await run.start(env=env)
        return run

    async def stop(self, key: str) -> bool:
        run = self._runs.get(key)
        if run is None:
            return False
        await run.stop()
        return True

    async def stop_all(self) -> int:
        active = self.active()
        await asyncio.gather(*(r.stop() for r in active), return_exceptions=True)
        return len(active)


manager = ProcessManager()
