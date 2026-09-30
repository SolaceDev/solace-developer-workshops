#!/usr/bin/env python3
"""Check every scenario descriptor for the mistakes that only show up mid-workshop.

A scenario.yaml is data, so a typo in it is not caught by any compiler and
usually surfaces as a button that does nothing while an attendee is watching.
This checks the references that have to line up: run and cleanup steps naming
real actions, diagram nodes pointing at real actions, diagram flows that go
through the one broker, failure modes naming real actions, process commands
whose scripts exist, terraform directories that are present, and an
imports.tsv for every scenario offering a reconcile action.

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

    # Events always go through the broker: one broker per diagram, and every
    # flow either arrives at it or leaves it. An app that consumes and then
    # publishes draws one flow in from the broker and one flow back.
    nodes = spec.get("diagram", {}).get("nodes", [])
    brokers = {n["id"] for n in nodes if n.get("kind") == "broker"}
    if nodes and len(brokers) != 1:
        bad.append(f"diagram has {len(brokers)} broker nodes, expected exactly 1")
    for flow in spec.get("diagram", {}).get("flows", []):
        if brokers and not ({flow.get("from"), flow.get("to")} & brokers):
            bad.append(f"diagram flow {flow.get('from')!r} -> {flow.get('to')!r} bypasses the broker")

    # A failure mode is steps on actions that must exist, plus an optional
    # diagram node to mark while it is in effect.
    for mode in spec.get("failure_modes", []):
        mid = mode.get("id", "?")
        for key in ("id", "title", "trigger", "reset"):
            if not mode.get(key):
                bad.append(f"failure mode {mid!r} has no {key}")
        for phase in ("trigger", "reset"):
            for op in mode.get(phase, []) or []:
                verb, target = next(iter(op.items())) if len(op) == 1 else (None, None)
                if verb not in ("start", "stop", "run"):
                    bad.append(f"failure mode {mid!r} {phase} step {op!r} is not start:, stop: or run:")
                elif target not in actions:
                    bad.append(f"failure mode {mid!r} {phase} names missing action {target!r}")
        for doc in mode.get("docs", []) or []:
            if not doc.get("label") or not str(doc.get("url", "")).startswith("https://"):
                bad.append(f"failure mode {mid!r} has a docs entry without a label and https url")
        if mode.get("logs") and mode["logs"] not in actions:
            bad.append(f"failure mode {mid!r} logs names missing action {mode['logs']!r}")
        if mode.get("needs", "running") not in ("running", "applied"):
            bad.append(f"failure mode {mid!r} needs {mode['needs']!r}, expected running or applied")
        if mode.get("node") and mode["node"] not in node_ids:
            bad.append(f"failure mode {mid!r} marks missing diagram node {mode['node']!r}")

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
