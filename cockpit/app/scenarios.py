"""Scenario registry.

A scenario is a folder under cockpit/scenarios/<id>/ containing a
scenario.yaml descriptor plus whatever it needs to run (terraform config,
sample app source, and so on). Adding a workshop module means dropping in a
folder -- no cockpit code changes.
"""

from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

import yaml

from .config import SCENARIOS_DIR, scenario_state_dir, terraform_env


@dataclass
class Action:
    """One button on a scenario card."""

    id: str
    label: str
    kind: str  # "terraform" | "process"
    description: str = ""
    # terraform actions
    command: str = "apply"  # apply | destroy | plan
    tf_dir: str = "tf"
    # process actions
    cmd: list = field(default_factory=list)
    cwd: Optional[str] = None
    long_running: bool = False
    # presentation
    variant: str = "primary"  # primary | secondary | danger
    confirm: Optional[str] = None
    # Exists only to cause a failure mode, so it is left out of the Actions
    # flowchart and reached from that failure mode's card instead.
    failure_only: bool = False

    @property
    def is_destructive(self) -> bool:
        return self.variant == "danger" or self.command == "destroy"


@dataclass
class Inspect:
    """A read-only view rendered after a scenario runs, so attendees can see
    what the configuration actually produced before touching the broker UI."""

    label: str
    kind: str  # "semp"
    path: str
    columns: list = field(default_factory=list)
    ui_hint: str = ""
    # "config" for objects, "monitor" for live counters. See broker.semp_get.
    api: str = "config"


# Broker object kinds a scenario can own at the top level, mapped to their SEMP
# collection. Listed in the order they have to be deleted: a client username
# refers to its profiles, so it goes before them.
_TOP_LEVEL = {
    "client_username": "clientUsernames",
    "queue": "queues",
    "acl_profile": "aclProfiles",
    "client_profile": "clientProfiles",
}


@dataclass
class Scenario:
    id: str
    title: str
    summary: str
    eyebrow: str
    root: Path
    order: int = 100
    objectives: list = field(default_factory=list)
    actions: list = field(default_factory=list)
    inspect: list = field(default_factory=list)
    # Optional node/flow diagram animated at the top of the scenario page.
    # Passed through to the browser as-is; the cockpit renders it.
    diagram: dict = field(default_factory=dict)
    # Ordered action ids for the one-click "Run scenario" button. Declared
    # per scenario because the right sequence is a workshop decision, not
    # something that can be inferred: pub-sub must start its subscribers
    # before it publishes, and no scenario wants its destroy action included.
    run: list = field(default_factory=list)
    # Ordered action ids for Cleanup: tears down whatever Play created. Usually
    # a terraform destroy, but a scenario may need several steps.
    cleanup: list = field(default_factory=list)
    # Ways to break the running scenario on purpose, each with the steps that
    # cause it and the steps that put things back. Passed to the browser
    # as-is; the cockpit drives them with the ordinary start and stop calls.
    failure_modes: list = field(default_factory=list)

    @property
    def run_sequence(self) -> list:
        """The actions Run scenario executes, in order.

        Falls back to every non-destructive action in declaration order, which
        is right for a simple scenario and wrong often enough that anything
        with ordering constraints should declare `run:` explicitly.
        """
        if self.run:
            resolved = [self.action(aid) for aid in self.run]
            return [a for a in resolved if a is not None]
        return [a for a in self.actions if not a.is_destructive]

    @property
    def cleanup_sequence(self) -> list:
        """The actions Cleanup executes, in order.

        Defaults to every destructive action, which is the destroy step in a
        typical scenario. Declared explicitly when the teardown needs more.
        """
        if self.cleanup:
            resolved = [self.action(aid) for aid in self.cleanup]
            return [a for a in resolved if a is not None]
        return [a for a in self.actions if a.is_destructive]

    def owned_objects(self) -> list:
        """(kind, name) for every top-level broker object this scenario owns,
        read from tf/imports.tsv, the same list Reconcile uses. Children such
        as queue subscriptions and ACL exceptions are left out: they go when
        their parent is deleted."""
        imports = self.root / "tf" / "imports.tsv"
        if not imports.exists():
            return []
        found = []
        for line in imports.read_text().splitlines():
            if not line.strip() or line.startswith("#") or "\t" not in line:
                continue
            address, import_id = line.split("\t", 1)
            kind = address.split(".", 1)[0].removeprefix("solacebroker_msg_vpn_")
            if kind in _TOP_LEVEL:
                found.append((kind, import_id.strip().split("/", 1)[1]))
        return found

    def action(self, action_id: str) -> Optional[Action]:
        return next((a for a in self.actions if a.id == action_id), None)

    def tf_workdir(self, action: Action) -> Path:
        return self.root / action.tf_dir

    def as_dict(self) -> dict:
        return {
            "id": self.id,
            "title": self.title,
            "summary": self.summary,
            "eyebrow": self.eyebrow,
            "order": self.order,
            "objectives": self.objectives,
            "actions": [
                {
                    "id": a.id,
                    "label": a.label,
                    "description": a.description,
                    "kind": a.kind,
                    "variant": a.variant,
                    "confirm": a.confirm,
                    "longRunning": a.long_running,
                    "failureOnly": a.failure_only,
                }
                for a in self.actions
            ],
            "inspect": [
                {"label": i.label, "kind": i.kind, "path": i.path,
                 "columns": i.columns, "uiHint": i.ui_hint}
                for i in self.inspect
            ],
            "runSequence": [a.id for a in self.run_sequence],
            "cleanupSequence": [a.id for a in self.cleanup_sequence],
            "diagram": self.diagram,
            "failureModes": self.failure_modes,
        }


def _load_one(path: Path) -> Scenario:
    raw = yaml.safe_load(path.read_text()) or {}
    root = path.parent
    return Scenario(
        id=raw.get("id", root.name),
        title=raw.get("title", root.name),
        summary=raw.get("summary", ""),
        eyebrow=raw.get("eyebrow", "Scenario"),
        order=raw.get("order", 100),
        objectives=raw.get("objectives", []),
        root=root,
        actions=[Action(**a) for a in raw.get("actions", [])],
        inspect=[Inspect(**i) for i in raw.get("inspect", [])],
        run=raw.get("run", []),
        cleanup=raw.get("cleanup", []),
        diagram=raw.get("diagram", {}) or {},
        failure_modes=raw.get("failure_modes", []) or [],
    )


class Registry:
    def __init__(self, base: Path = SCENARIOS_DIR):
        self.base = base
        self._scenarios: dict = {}
        self.reload()

    def reload(self) -> None:
        found = {}
        for descriptor in sorted(self.base.glob("*/scenario.yaml")):
            scenario = _load_one(descriptor)
            found[scenario.id] = scenario
        self._scenarios = found

    def all(self) -> list:
        return sorted(self._scenarios.values(), key=lambda s: (s.order, s.title))

    def get(self, scenario_id: str) -> Optional[Scenario]:
        return self._scenarios.get(scenario_id)


def build_command(scenario: Scenario, action: Action):
    """Resolve an action into (argv, cwd, env) ready for the ProcessManager.

    Terraform runs with state held under cockpit/.state/<scenario>/ rather than
    beside the .tf files, so a reset is a directory delete and the repo stays
    clean for the next attendee.
    """
    if action.kind == "terraform":
        workdir = scenario.tf_workdir(action)
        state = scenario_state_dir(scenario.id)
        state.mkdir(parents=True, exist_ok=True)
        statefile = state / f"{action.tf_dir}.tfstate"

        if action.command == "apply":
            argv = ["terraform", f"-chdir={workdir}", "apply",
                    "-auto-approve", "-no-color", f"-state={statefile}"]
        elif action.command == "destroy":
            argv = ["terraform", f"-chdir={workdir}", "destroy",
                    "-auto-approve", "-no-color", f"-state={statefile}"]
        elif action.command == "plan":
            argv = ["terraform", f"-chdir={workdir}", "plan",
                    "-no-color", f"-state={statefile}"]
        else:
            raise ValueError(f"unsupported terraform command: {action.command}")
        return argv, str(workdir), terraform_env()

    if action.kind == "process":
        cwd = scenario.root / action.cwd if action.cwd else scenario.root
        # Process actions get the full environment, terraform variables included.
        # Sample apps need the broker connection details, and helper scripts that
        # shell out to terraform need the TF_VAR_* values and the state location.
        # Without them a script would silently target a different broker, or a
        # different state file, than the cockpit does.
        return list(action.cmd), str(cwd), terraform_env()

    raise ValueError(f"unsupported action kind: {action.kind}")


registry = Registry()
