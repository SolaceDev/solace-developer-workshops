---
title: What Are Skills?
description: "An introduction to skills in Agent Mesh: what they are, how they package reusable capabilities, and how agents use them."
sidebar_position: 560
---

# What Are Skills?

A *skill* is a reusable bundle of instructions and tools that an agent loads on demand. Rather than packing every rule and capability into one agent, you group related material into a named package. The material inside a skill is a set of tools, the instructions that tell the model when to use them, and any reference documents the tools rely on. An agent that has the skill available loads it only when a task actually calls for it.

Skills are how an agent stays small at the prompt level while still reaching a large library of capabilities. An agent with 10 skills available pays only the prompt-size cost of the ones it loads for the task in front of it.

## Skill or Tool?

A tool is a single capability, one operation the model can call. A skill is a **package**: it can bundle several tools plus the instructions telling the model when to use them and any reference material those tools depend on. The distinction that matters:

- **Tools an agent must always have** belong on the agent's tool list. They are visible to the model on every task.
- **Behavior that only applies to some tasks** belongs in a skill. The model sees a short description of the skill on every task, and pulls the full instructions and bundled tools into context only when it decides the skill is relevant.

For example, a general-purpose assistant might have artifact management and web search always on its tool list, plus a `quarterly-report` skill available. The skill loads only when the user asks for a quarterly report. It pulls in the reporting instructions, the chart-generation tools, and the report template that the skill ships with.

## What a Skill Bundle Contains

A skill is one directory:

- A `SKILL.md` file. It contains the description the model reads to decide when to load the skill, plus the instructions the model receives after it does.
- Optional reference files. Documentation the tools inside the skill can consult on demand.
- Optional bundled tools. Python scripts or Go binaries the skill ships with. They become callable after the agent loads the skill.
- Optional assets. Templates, lookup tables, or other static files the tools use.

Only `SKILL.md` is required. A skill that ships only instructions has none of the other three. A skill that ships tools uses the same authoring patterns as any other custom tool. For the tool side of the story, see [What Are Tools?](./what-are-tools.md).

## How an Agent Uses a Skill

At startup, the agent knows only each available skill's name and one-sentence description. During a task, the language model decides a skill applies and calls a built-in `load_skill` operation. The runtime pulls the skill's full instructions into the conversation, registers the skill's bundled tools so they become callable, and the model continues from there. When the task shifts to something else, the model can unload the skill.

This "load on demand" pattern is the point of skills. The pattern is what lets you attach many skills to an agent without inflating the prompt or paying to send unrelated instructions to the model on every turn.

## Distributing a Skill

Skills are meant to be shared. Because a skill is a self-contained directory, you can package it as a ZIP file and re-use it across teams: upload the ZIP through the Agent Mesh UI or apply it as part of your declarative configuration, then attach it by name to any agent that requires it.

Agent Mesh also ships a curated set of built-in skills that appear in the skills catalog automatically, such as `sam-knowledge` and `sam-docs`. You attach a built-in skill by name; no upload is required.

## What Next?

- [Creating Skills](../building/skills.md) walks the hands-on authoring flow: laying out the bundle, writing `SKILL.md`, adding bundled tools, packaging, and attaching to an agent.
- [What Are Tools?](./what-are-tools.md) covers tools in isolation, the direct counterpart to the bundled-tool half of a skill.
- [Skills](./skills.md) is the deeper concept page: the progressive-disclosure model, the discovery lifecycle, and how skills fit alongside toolsets.
