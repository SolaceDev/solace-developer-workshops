#!/usr/bin/env python3
"""
Script to populate Solace Agent Mesh with prompt groups from a JSON file.

Usage:
    python populate_prompts.py [--file prompts.json] [--url http://localhost:8000] [--delete-all]
"""

import json
import sys
import urllib.request
import urllib.error


def load_prompts_from_file(filename):
    """Load prompts from a JSON file."""
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            prompts = json.load(f)

        if not isinstance(prompts, list):
            print(f"Error: Expected JSON array in {filename}, got {type(prompts).__name__}")
            return None

        print(f"Loaded {len(prompts)} prompts from {filename}")
        return prompts

    except FileNotFoundError:
        print(f"Error: File '{filename}' not found")
        return None
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON in {filename}: {e}")
        return None
    except Exception as e:
        print(f"Error reading file {filename}: {e}")
        return None


def get_all_prompt_groups(base_url):
    """Get all existing prompt groups from API."""
    url = f"{base_url}/api/v1/prompts/groups/all"

    req = urllib.request.Request(url, method='GET')

    try:
        with urllib.request.urlopen(req) as response:
            response_data = json.loads(response.read().decode('utf-8'))
            return True, response_data

    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        try:
            error_data = json.loads(error_body)
            error_msg = error_data.get('detail', error_body)
        except:
            error_msg = error_body
        return False, f"HTTP {e.code}: {error_msg}"

    except urllib.error.URLError as e:
        return False, f"Connection error: {e.reason}"

    except Exception as e:
        return False, f"Unexpected error: {e}"


def delete_prompt_group(base_url, group_id):
    """Delete a single prompt group via API."""
    url = f"{base_url}/api/v1/prompts/groups/{group_id}"

    req = urllib.request.Request(url, method='DELETE')

    try:
        with urllib.request.urlopen(req) as response:
            return True, "Deleted successfully"

    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        try:
            error_data = json.loads(error_body)
            error_msg = error_data.get('detail', error_body)
        except:
            error_msg = error_body
        return False, f"HTTP {e.code}: {error_msg}"

    except urllib.error.URLError as e:
        return False, f"Connection error: {e.reason}"

    except Exception as e:
        return False, f"Unexpected error: {e}"


def delete_all_prompts(base_url):
    """Delete all prompt groups after user confirmation."""
    print("\n" + "!" * 60)
    print("WARNING: You are about to delete ALL existing prompt groups!")
    print("!" * 60)

    # Get all existing prompts
    success, result = get_all_prompt_groups(base_url)
    if not success:
        print(f"Error fetching existing prompts: {result}")
        return False

    prompt_groups = result
    if not prompt_groups:
        print("No prompt groups found to delete.")
        return True

    print(f"\nFound {len(prompt_groups)} prompt group(s) to delete:")
    for group in prompt_groups:
        print(f"  - {group.get('name')} (ID: {group.get('id')}, Command: {group.get('command')})")

    print("\nType 'DELETE ALL' to confirm deletion: ", end='')
    confirmation = input().strip()

    if confirmation != "DELETE ALL":
        print("Deletion cancelled.")
        return False

    print("\nDeleting all prompt groups...")
    print("-" * 60)

    success_count = 0
    failure_count = 0

    for idx, group in enumerate(prompt_groups, 1):
        group_id = group.get('id')
        group_name = group.get('name')

        print(f"[{idx}/{len(prompt_groups)}] Deleting: {group_name}")

        success, result = delete_prompt_group(base_url, group_id)

        if success:
            print(f"  ✓ Deleted")
            success_count += 1
        else:
            print(f"  ✗ Failed: {result}")
            failure_count += 1

    print("\n" + "=" * 60)
    print(f"Deletion Summary: {success_count} deleted, {failure_count} failed")
    print("=" * 60)

    return failure_count == 0


def create_prompt_group(base_url, prompt_data):
    """Create a single prompt group via API."""
    url = f"{base_url}/api/v1/prompts/groups"

    # Convert prompt data to JSON
    json_data = json.dumps(prompt_data).encode('utf-8')

    # Create request
    req = urllib.request.Request(
        url,
        data=json_data,
        headers={
            'Content-Type': 'application/json',
        },
        method='POST'
    )

    try:
        with urllib.request.urlopen(req) as response:
            response_data = json.loads(response.read().decode('utf-8'))
            return True, response_data

    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        try:
            error_data = json.loads(error_body)
            error_msg = error_data.get('detail', error_body)
        except:
            error_msg = error_body
        return False, f"HTTP {e.code}: {error_msg}"

    except urllib.error.URLError as e:
        return False, f"Connection error: {e.reason}"

    except Exception as e:
        return False, f"Unexpected error: {e}"


def main():
    """Main execution function."""
    # Parse command line arguments
    filename = "prompts.json"
    base_url = "http://localhost:8000"
    delete_all = False

    args = sys.argv[1:]
    i = 0
    while i < len(args):
        if args[i] == "--file" and i + 1 < len(args):
            filename = args[i + 1]
            i += 2
        elif args[i] == "--url" and i + 1 < len(args):
            base_url = args[i + 1].rstrip('/')
            i += 2
        elif args[i] == "--delete-all":
            delete_all = True
            i += 1
        elif args[i] in ("-h", "--help"):
            print(__doc__)
            sys.exit(0)
        else:
            print(f"Unknown argument: {args[i]}")
            print(__doc__)
            sys.exit(1)

    # Handle delete-all operation
    if delete_all:
        print(f"Target API endpoint: {base_url}/api/v1/prompts/groups")
        success = delete_all_prompts(base_url)
        sys.exit(0 if success else 1)

    # Normal prompt creation flow
    print(f"Populating prompts from: {filename}")
    print(f"Target API endpoint: {base_url}/api/v1/prompts/groups")
    print("-" * 60)

    # Load prompts from file
    prompts = load_prompts_from_file(filename)
    if prompts is None:
        sys.exit(1)

    # Validate prompt structure
    required_fields = ["name", "description", "category", "command", "initial_prompt"]
    for idx, prompt in enumerate(prompts):
        missing_fields = [field for field in required_fields if field not in prompt]
        if missing_fields:
            print(f"Error: Prompt {idx + 1} is missing required fields: {', '.join(missing_fields)}")
            sys.exit(1)

    # Create each prompt group
    success_count = 0
    failure_count = 0

    for idx, prompt in enumerate(prompts, 1):
        print(f"\n[{idx}/{len(prompts)}] Creating prompt group: {prompt['name']}")

        success, result = create_prompt_group(base_url, prompt)

        if success:
            print(f"  ✓ Success!")
            print(f"  ID: {result.get('id')}")
            print(f"  Command: {result.get('command')}")
            success_count += 1
        else:
            print(f"  ✗ Failed: {result}")
            failure_count += 1

    # Summary
    print("\n" + "=" * 60)
    print(f"Summary: {success_count} succeeded, {failure_count} failed")
    print("=" * 60)

    sys.exit(0 if failure_count == 0 else 1)


if __name__ == "__main__":
    main()
