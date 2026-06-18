---
title: Community and Support
description: Where to find help, ask questions, and report issues with Solace Agent Mesh.
sidebar_position: 2
---

# Community and Support

Agent Mesh is supported through the same channels as the wider Solace product line. There are three primary paths — start at the top and escalate down as the situation requires.

## Solace Community

The Solace Community forum is the public Q&A surface for the broader Solace product line, including Agent Mesh. Start here for peer-to-peer questions, design discussions, and topics that other operators will benefit from seeing answered in public. The community is staffed by Solace engineers and experienced practitioners; many configuration and integration questions are answered within a working day.

## Your Sales Engineer

Customers with an assigned Sales Engineer can reach out directly. The SE is the right next contact for scoping questions, deployment planning, and anything that benefits from a conversation before a ticket — for example, deciding between embedded mode and a distributed deployment, or working through which gateway type fits a new integration.

## Solace Support

The Solace Support portal is the formal path for technical issues, configuration problems, and production-incident support that need a tracked case with an SLA behind it. The portal accepts tickets, surfaces existing knowledge-base articles, and tracks the status of your open cases. Reach for it once the community forum and your Sales Engineer have not resolved the issue, or whenever the issue is production-impacting and needs a tracked case from the start.

When you open a ticket, include:

- The binary version (`sam --version` from the command line).
- The relevant log excerpts. If the logs are not detailed enough, raise the level with `log.stdout_log_level: DEBUG` in your YAML config and reproduce the issue.
- The YAML config that reproduces the issue, with secrets redacted.
- A short description of what you expected versus what you observed.

## What Next?

For quick answers to common product questions before you reach for any of these channels, start with the FAQ.
