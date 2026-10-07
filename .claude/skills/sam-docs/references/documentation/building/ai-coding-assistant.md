---
published: true
title: Building with an AI Coding Assistant (Early Access)
description: Install the Agent Mesh authoring skills so an AI coding assistant such as OpenAI Codex CLI or Claude Code can draft, review, and fix your agents, tools, entrypoints, connectors, and declarative configuration.
sidebar_position: 1.5
---

# Building with an AI Coding Assistant (Early Access)

:::warning
This feature is in the Early Access stage and under active development. Configuration schemas and behavior are subject to change. We recommend that you do not use this feature in production environments.
:::

The `sam` CLI ships a set of *authoring skills* that teach an AI coding assistant how to build for Solace Agent Mesh. After you install them, your AI coding assistant knows the agent, workflow, entrypoint, connector, toolset, and declarative-config formats at the exact version of the CLI you run, can search the product documentation, and can draft, review, and fix your configuration and tool code from a plain-language request.

The skills follow the [Agent Skills standard](https://agentskills.io), an open format that many AI coding assistants read. Any AI coding assistant that supports the standard, such as OpenAI Codex CLI, uses them without changes. For Claude Code, add `--target claude` to the install command to write them to `.claude/skills/`.

:::note Not the Skills Your Agents Load
The authoring skills on this page guide your AI coding assistant while you author. They are separate from the skills that your agents load at runtime, which you manage with `sam skill` and the Skills page. For more information about runtime skills, see [Skills](../concepts/skills.md) and [Creating Skills](./skills.md).
:::

## Before You Begin

- Install the `sam` CLI. For more information, see [Install and Deploy](../installing/index.md).
- Install an AI coding assistant, such as OpenAI Codex CLI or Claude Code.
- Open a terminal in the repository where you keep your Agent Mesh configuration, typically your declarative-config repository. For more information, see [The Configuration Repo](./declarative-config/the-config-repo.md).

## Install the Authoring Skills

Run the install command at the root of your repository:

```bash
sam ai-assistance skill install
```

The command writes the skills to `.agents/skills/`, the Agent Skills standard location. For Claude Code, write them to `.claude/skills/` instead:

```bash
sam ai-assistance skill install --target claude
```

The command does not overwrite existing skills. To replace an installed copy, add `--force`.

### Install Once for Every Repository

If you work across many repositories on one machine with a single `sam` version, install the skills under your home directory instead:

```bash
sam ai-assistance skill install --scope user
```

The command writes to `~/.agents/skills/`, or to `~/.claude/skills/` with `--target claude`. On Windows, `~` is `%USERPROFILE%`. When the `CLAUDE_CONFIG_DIR` environment variable is set, the `claude` target writes to `skills/` under that directory instead, which is where Claude Code reads user skills from.

### Install to Another Directory

If your AI coding assistant reads skills from a different location, pass the directory explicitly:

```bash
sam ai-assistance skill install --to <DIRECTORY>
```

You cannot combine `--to` with `--target` or `--scope`. For the full list of flags, see [`sam ai-assistance`](../reference/cli.md#sam-ai-assistance).

## What Your AI Coding Assistant Learns

The skills span the lifecycle of an Agent Mesh deployment: authoring agents and workflows, writing tools and packaging them as toolsets, configuring entrypoints and connectors, managing declarative configuration, deploying, operating, and troubleshooting. One of them carries the product documentation, which your AI coding assistant searches before it answers.

You do not pick a skill yourself. Describe what you want in your own words, and the `sam-concierge` router skill selects the ones that apply.

## Update the Authoring Skills

The skills describe the CLI version that installed them. After you upgrade `sam`, check every installed copy:

```bash
sam ai-assistance skill check
```

Without `--path`, the command looks for skills in `.agents/skills/` and `.claude/skills/` under the current directory and under your home directory, and reports whether each copy it finds is complete and matches the CLI version. To check one directory, pass `--path <DIRECTORY>`.

If a copy is out of date, follow the guidance in the command output to refresh it. If you already know which copy to refresh, install it again with `--force` and the same `--target` and `--scope` values you used for the original install. For example, to refresh a user-scope copy for an AI coding assistant that supports the Agent Skills standard, such as OpenAI Codex CLI:

```bash
sam ai-assistance skill install --scope user --force
```

## What Next?

You have installed the authoring skills, and your AI coding assistant can now author for Agent Mesh. Continue with [Managing Configuration as Code (Early Access)](./declarative-config/index.md) to keep the configuration it writes as version-controlled YAML.
