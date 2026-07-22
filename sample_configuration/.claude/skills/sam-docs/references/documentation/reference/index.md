---
title: Reference
description: "Lookup material for a running deployment: the configuration schema, environment variables, Helm values, CLI commands, built-in tools, the RBAC scope catalog, and the glossary."
sidebar_position: 0
---

# Reference

This section is the lookup layer of the documentation. The concept and task sections explain how something works and how to do it; the pages here hold the exhaustive tables behind them, covering every configuration field, command flag, environment variable, Helm value, built-in tool, and access-control scope.

Come here when you already know what you are looking for and need the exact name, type, default value, or scope string. If you are new to Agent Mesh, start with [Understanding Agent Mesh](../concepts/index.md) or [Getting Started with Agent Mesh](../getting-started/index.md) instead.

## Configuration

- [Configuration Schema](./config-schema.md)—The startup YAML that the Entrypoint Executor, Platform service, and Secure Tool Runtime read at boot, with the loading pipeline, the shared blocks, and the per-process field tables.
- [Environment Variables](./env-vars.md)—Every environment variable the runtime reads, plus the authentication and secret placeholders in the shipped YAML samples, grouped by concern with defaults and related YAML keys.
- [Helm Values Reference](./helm-values.md)—Every value in the Agent Mesh Helm chart: global settings, core configuration, external datastores, networking, deployment, and bundled components.

## Commands and Tools

- [CLI Reference](./cli.md)—Every `sam` command and flag, from authentication and declarative configuration to tasks, evaluations, tools and skills, and local run orchestration.
- [Built-In Tools](./built-in-tools.md)—The tools an agent can attach without writing code, with the group each tool belongs to, its parameters, what it returns, and any scope or availability requirement.

## Access Control

- [RBAC Reference](./rbac-reference.md)—How Agent Mesh authorizes users with role-based access control (RBAC): the access model, the scope catalog, the YAML and `sam config apply` authoring surfaces, and how to diagnose a denial.

## Terminology

- [Glossary](./glossary.md)—The domain terms used throughout Agent Mesh, gathered into one canonical dictionary.
