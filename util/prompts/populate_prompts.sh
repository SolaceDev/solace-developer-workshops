#!/bin/bash
# Seed Solace Agent Mesh prompt groups from a JSON file.
#
# Usage:
#   ./populate_prompts.sh [--file prompts.json] [--url http://localhost:8080] [--delete-all]
#
# Requires: curl, jq

set -euo pipefail

FILE="$(dirname "$0")/prompts.json"
URL="http://localhost:8080"
DELETE_ALL=false

# --- Parse arguments ---
while [[ $# -gt 0 ]]; do
  case "$1" in
    --file)       FILE="$2";       shift 2 ;;
    --url)        URL="$2";        shift 2 ;;
    --delete-all) DELETE_ALL=true; shift   ;;
    *) echo "Unknown option: $1"; exit 1   ;;
  esac
done

URL="${URL%/}"

# --- Helpers ---
api_get() {
  curl -sf -H "Accept: application/json" "${URL}$1"
}

api_delete() {
  curl -sf -o /dev/null -w "%{http_code}" -X DELETE \
    -H "Accept: application/json" "${URL}$1"
}

api_post() {
  local path="$1"
  local body="$2"
  curl -sf -o /tmp/sam_resp.json -w "%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -H "Accept: application/json" \
    -d "$body" \
    "${URL}${path}"
}

# --- Delete all ---
if $DELETE_ALL; then
  raw=$(api_get "/api/v1/prompts/groups/all")
  count=$(echo "$raw" | jq '.data | length')

  if [[ "$count" -eq 0 ]]; then
    echo "No prompt groups found."
    exit 0
  fi

  echo "Found $count prompt group(s):"
  echo "$raw" | jq -r '.data[] | "  - \(.name) (\(.id))"'

  printf "\nType DELETE ALL to confirm: "
  read -r confirm
  if [[ "$confirm" != "DELETE ALL" ]]; then
    echo "Aborted."
    exit 0
  fi

  echo "Deleting..."
  echo "$raw" | jq -r '.data[] | "\(.id) \(.name)"' | while IFS=' ' read -r id name; do
    status=$(api_delete "/api/v1/prompts/groups/${id}")
    if [[ "$status" == "204" ]]; then
      echo "  Deleted: ${name} (${id})"
    else
      echo "  Failed to delete '${name}' (${id}): HTTP ${status}"
    fi
  done

  echo "Done."
  exit 0
fi

# --- Seed prompts ---
if [[ ! -f "$FILE" ]]; then
  echo "Error: file not found: $FILE"
  exit 1
fi

count=$(jq 'length' "$FILE")
echo "Seeding $count prompt group(s) to $URL..."

jq -c '.[]' "$FILE" | while read -r entry; do
  name=$(echo "$entry" | jq -r '.name')
  initial_prompt=$(echo "$entry" | jq -r '.initialPrompt')

  if [[ -z "$name" ]]; then
    echo "  Error: entry missing required field 'name' — skipping"
    continue
  fi
  if [[ -z "$initial_prompt" ]]; then
    echo "  Error: '${name}' missing required field 'initialPrompt' — skipping"
    continue
  fi

  # Build the JSON body, including optional fields only when present
  body=$(echo "$entry" | jq '{
    name:          .name,
    initialPrompt: .initialPrompt,
    description:   (.description // empty),
    category:      (.category   // empty),
    command:       (.command    // empty)
  } | with_entries(select(.value != null))')

  status=$(api_post "/api/v1/prompts/groups" "$body")

  case "$status" in
    201)
      id=$(jq -r '.id' /tmp/sam_resp.json)
      echo "  Created: ${name} (id: ${id})"
      ;;
    409)
      echo "  Skipped (command conflict): ${name}"
      ;;
    *)
      error=$(jq -r '.error // .message // "unknown error"' /tmp/sam_resp.json 2>/dev/null || echo "no details")
      echo "  Failed: ${name} — HTTP ${status} — ${error}"
      ;;
  esac
done

echo "Done."
