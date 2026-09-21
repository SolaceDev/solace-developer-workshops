#!/usr/bin/env python3
"""Check every scenario descriptor for the mistakes that only show up mid-workshop.

A scenario.yaml is data, so a typo in it is not caught by any compiler and
usually surfaces as a button that does nothing while an attendee is watching.
This checks the references that have to line up: run and cleanup steps naming
real actions, diagram nodes pointing at real actions, process commands whose
scripts exist, terraform directories that are present, and an imports.tsv for
every scenario offering a reconcile action.

Run from anywhere:  python3 cockpit/scripts/check_scenarios.py
"""

import pathlib
import sys

import yaml

COCKPIT = pathlib.Path(__file__).resolve().parent.parent
SCENARIOS = COCKPIT / "scenarios"


def check(path: pathlib.Path) -> list[str]:
    bad = []
    spec = yaml.safe_load(path.read_text())
    sid = spec.get("id", path.parent.name)
    here = path.parent

    if sid != here.name:
        bad.append(f"id {sid!r} does not match directory {here.name!r}")

    actions = {a["id"]: a for a in spec.get("actions", [])}

    for step in spec.get("run", []) + spec.get("cleanup", []):
        if step not in actions:
            bad.append(f"run/cleanup step {step!r} is not an action")

    for node in spec.get("diagram", {}).get("nodes", []):
        if node.get("action") and node["action"] not in actions:
            bad.append(f"diagram node {node['id']!r} points at missing action {node['action']!r}")

    node_ids = {n["id"] for n in spec.get("diagram", {}).get("nodes", [])}
    for flow in spec.get("diagram", {}).get("flows", []):
        for end in ("from", "to"):
            if flow.get(end) not in node_ids:
                bad.append(f"diagram flow {end} {flow.get(end)!r} is not a node")

    live = spec.get("diagram", {}).get("liveWhen")
    if live and live not in node_ids:
        bad.append(f"diagram liveWhen {live!r} is not a node")

    for action in actions.values():
        if action.get("kind") == "terraform":
            tf = here / action.get("tf_dir", "tf")
            if not tf.is_dir():
                bad.append(f"action {action['id']!r} needs missing terraform dir {tf}")
        if action.get("kind") == "process":
            cmd = action.get("cmd", [])
            if not cmd:
                bad.append(f"action {action['id']!r} has no cmd")
                continue
            # Resolve the script a bash command runs, relative to cwd.
            if cmd[0] == "bash" and len(cmd) > 1:
                target = (here / action.get("cwd", ".") / cmd[1]).resolve()
                if not target.exists():
                    bad.append(f"action {action['id']!r} runs missing script {cmd[1]}")

    if "reconcile" in actions and not (here / "tf" / "imports.tsv").exists():
        bad.append("offers reconcile but has no tf/imports.tsv")

    return [f"{sid}: {m}" for m in bad]


def main() -> int:
    problems = []
    found = sorted(SCENARIOS.glob("*/scenario.yaml"))
    for path in found:
        problems.extend(check(path))

    for p in problems:
        print(p)
    print(f"\nChecked {len(found)} scenarios, {len(problems)} problem(s).")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
