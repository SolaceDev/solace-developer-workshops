---
title: Pro-Code Overview
description: An overview of the pro-code authoring paths in Solace Agent Mesh — custom tools, custom agents, plugins, and image-based agents.
sidebar_position: 0
---

# Pro-Code Overview

*Content forthcoming.*

Pro-code in Solace Agent Mesh gives developers full control over authoring: write custom tools and agents in Python or Go, package them for distribution as plugins, or deploy container-based agents. Four paths are available.

- **[Building Custom Tools](./custom-tools.md)** — Write tools in Python or Go, package as self-contained zip archives, and run them in sandboxed Secure Tool Runtime (STR) replicas.
- **[Building Custom Agents](./custom-agents.md)** — Author agents in code alongside YAML configuration using your own IDE.
- **[Packaging Plugins](./plugins.md)** — Package and version agents for distribution and reuse across teams.
- **[Image-Based Agents](./image-based-agents.md)** — Deploy agents as container images. Note: this is a current stopgap while the full Go STR-based pro-code model lands. Long-term availability is under review.
