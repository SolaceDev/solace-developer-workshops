#!/usr/bin/env python3
"""
Seed Solace Agent Mesh prompt groups from a JSON file.

Usage:
    python3 populate_prompts.py [--file prompts.json] [--url http://localhost:8080] [--delete-all]

Each entry in the JSON file must have:
    name           (required) string
    initialPrompt  (required) string  -- field name used by the Go SAM API
    description    (optional) string
    category       (optional) string
    command        (optional) string  -- chat shortcut, must be unique per user
"""

import json
import sys
import urllib.request
import urllib.error
import argparse

DEFAULT_FILE = "prompts.json"
DEFAULT_URL  = "http://localhost:8080"


def load_prompts(path):
    with open(path) as f:
        data = json.load(f)
    if not isinstance(data, list):
        print(f"Error: {path} must contain a JSON array")
        sys.exit(1)
    for i, entry in enumerate(data):
        if not entry.get("name"):
            print(f"Error: entry {i} is missing required field 'name'")
            sys.exit(1)
        if not entry.get("initialPrompt"):
            print(f"Error: entry {i} ('{entry.get('name')}') is missing required field 'initialPrompt'")
            sys.exit(1)
    return data


def api(base_url, method, path, body=None):
    url = base_url.rstrip("/") + path
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={"Content-Type": "application/json", "Accept": "application/json"},
    )
    try:
        with urllib.request.urlopen(req) as resp:
            raw = resp.read()
            return resp.status, json.loads(raw) if raw else None
    except urllib.error.HTTPError as e:
        raw = e.read()
        try:
            return e.code, json.loads(raw)
        except Exception:
            return e.code, {"error": raw.decode(errors="replace")}
    except urllib.error.URLError as e:
        print(f"Connection error: {e.reason}")
        sys.exit(1)


def get_all_groups(base_url):
    status, body = api(base_url, "GET", "/api/v1/prompts/groups/all")
    if status != 200:
        print(f"Failed to list prompt groups: HTTP {status} — {body}")
        sys.exit(1)
    return body.get("data", [])


def delete_group(base_url, group_id, name):
    status, body = api(base_url, "DELETE", f"/api/v1/prompts/groups/{group_id}")
    if status == 204:
        print(f"  Deleted: {name} ({group_id})")
    else:
        print(f"  Failed to delete '{name}' ({group_id}): HTTP {status} — {body}")


def delete_all(base_url):
    groups = get_all_groups(base_url)
    if not groups:
        print("No prompt groups found.")
        return
    print(f"Found {len(groups)} prompt group(s):")
    for g in groups:
        print(f"  - {g['name']} ({g['id']})")
    confirm = input("\nType DELETE ALL to confirm: ")
    if confirm != "DELETE ALL":
        print("Aborted.")
        sys.exit(0)
    print("Deleting...")
    for g in groups:
        delete_group(base_url, g["id"], g["name"])
    print("Done.")


def create_group(base_url, entry):
    body = {
        "name":          entry["name"],
        "initialPrompt": entry["initialPrompt"],
    }
    for field in ("description", "category", "command"):
        if entry.get(field):
            body[field] = entry[field]

    status, resp = api(base_url, "POST", "/api/v1/prompts/groups", body)
    if status == 201:
        print(f"  Created: {entry['name']} (id: {resp['id']})")
    elif status == 409:
        print(f"  Skipped (command conflict): {entry['name']}")
    else:
        print(f"  Failed: {entry['name']} — HTTP {status} — {resp}")


def main():
    parser = argparse.ArgumentParser(description="Seed SAM prompt groups from a JSON file.")
    parser.add_argument("--file",       default=DEFAULT_FILE, help=f"Path to prompts JSON (default: {DEFAULT_FILE})")
    parser.add_argument("--url",        default=DEFAULT_URL,  help=f"SAM gateway base URL (default: {DEFAULT_URL})")
    parser.add_argument("--delete-all", action="store_true",  help="Delete all existing prompt groups (prompts for confirmation)")
    args = parser.parse_args()

    if args.delete_all:
        delete_all(args.url)
        return

    prompts = load_prompts(args.file)
    print(f"Seeding {len(prompts)} prompt group(s) to {args.url}...")
    for entry in prompts:
        create_group(args.url, entry)
    print("Done.")


if __name__ == "__main__":
    main()
