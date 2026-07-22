---
title: Connecting External Agents with the CLI
description: External agents are configured through the Agent Mesh UI, not declarative config.
sidebar_position: 2
---

# Connecting External Agents with the CLI

External agents are not managed through declarative config. Unlike agents you author, an external agent is an Agent-to-Agent (A2A) proxy connection that skips the YAML round-trip: there is no `kind` for one, and `sam config` does not create, export, or reconcile external agents.

Connect and manage external agents from the Agent Mesh UI instead, as described in [Connecting External Agents](./index.md). For automation, the Platform service also exposes external-agent endpoints under `/api/v1/platform/remoteAgents` that you can call with `sam api`.
