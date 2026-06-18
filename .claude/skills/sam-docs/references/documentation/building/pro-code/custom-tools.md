---
title: Building Custom Tools
description: Write custom tools in Python or Go, package them as self-contained zip archives, and run them in sandboxed Secure Tool Runtime (STR) replicas.
sidebar_position: 6910
---

# Building Custom Tools

*Content forthcoming. Source: STR/pro-code documentation and Slackbot summary (May–June 2026).*

Custom tools are the primary pro-code path. Tools are packaged as self-contained zip archives (similar to the AWS Lambda model) and executed in isolated Secure Tool Runtime (STR) sandboxes.

Key topics to cover:
- Initializing a tool project: `sam toolset init <name> --lang <python|go>`
- The `tool.json` manifest: entry point, metadata, dependencies
- Vendoring dependencies (no runtime installs; air-gapped by design)
- Sandbox profiles: restrictive, standard, permissive, default
- Uploading via the Platform Service REST API or the Builder UI
- Static binary requirements (Linux x86_64)
