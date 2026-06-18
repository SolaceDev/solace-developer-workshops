# Getting Started with Solace Agent Mesh

Welcome to the Solace Agent Mesh workshop. This guide is the entry point for the full hands-on experience. By the end of this workshop, you will have a working Agent Mesh environment, a conceptual understanding of the Agent Development Lifecycle (ADLC), and the foundational skills to build, deploy, and operate AI agents in an enterprise setting.

This workshop is designed for developers, architects, and technical practitioners who want to understand agent development as a structured engineering discipline, not just a collection of prompts and API calls.

---

## Table of Contents

- [What This Workshop Covers](#what-this-workshop-covers)
- [Understanding the ADLC](#understanding-the-adlc)
- [Prompts](#prompts)

---

## What This Workshop Covers

![ADLC Overview](./img/adlc_overview.svg)

This workshop guides you through the Agent Development Lifecycle (ADLC): a six-stage framework for designing, building, deploying, and governing AI agents at enterprise scale using Solace Agent Mesh.

The ADLC is the methodology that underpins everything in this workshop. It defines the repeatable process that engineering teams need to move agents from initial concept to production-grade deployment. Each section of this workshop maps directly to a stage of the ADLC, giving you hands-on experience with the tooling, patterns, and decisions that each stage requires.

![Solace Agent Mesh](./img/sam_overview.svg)

Alongside the ADLC methodology, you will work with Solace Agent Mesh directly. Agent Mesh is a Go-based, event-driven agent runtime built for enterprise scale. It provides the runtime infrastructure, CLI tooling, declarative configuration model, and gateway integrations that the ADLC stages depend on.

![Workshop Outcomes](./img/workshop_outcomes.svg)

By the end of this workshop you will be able to:

- Explain the ADLC and map each stage to concrete Agent Mesh capabilities
- Stand up a local Agent Mesh environment and apply declarative configuration
- Define an agent, assign it tools, and connect it to an external system
- Evaluate agent behavior using structured evaluation methods
- Understand the operational and governance concerns that arise at production scale

---

## Understanding the ADLC

![ADLC](./img/adlc.png)

The Agent Development Lifecycle (ADLC) is the framework this workshop is built around. It provides a structured, repeatable path from agent conception to continuous improvement in production.

The ADLC exists because agents are fundamentally different from traditional software. They are non-deterministic: the same input does not guarantee the same output. Standard software development methodologies, built for deterministic, rule-based systems, are not sufficient. A new lifecycle is required.

The six stages of the ADLC are:

| Stage | Name | What It Addresses |
|---|---|---|
| 1 | Hiring | Define what the agent does, who it serves, and what role it plays |
| 2 | Onboarding | Give the agent the right access, tools, and context it needs to operate |
| 3 | Coaching | Validate that the agent performs correctly through structured evaluation |
| 4 | Supervision | Maintain human oversight and monitor agent behavior in production |
| 5 | Teamwork | Integrate the agent into a multi-agent system |
| 6 | Improvement | Close the feedback loop and continuously improve agent performance |

Each stage of the ADLC maps directly to a set of Agent Mesh features. The workshop guides that follow this document each cover one stage in depth.

For more detail on the ADLC framework, its origins, and how Solace has positioned it, read the [ADLC Background](./101_ADLC.md) document before proceeding.

---

## Prompts

Using the integrated AI-assitant Copilot Run the following prompts
```
Using the sam cli, install the ai-assit skills
```

```
Scaffold a folder structure for solace agent mesh
```

```
Create a a manifest file for local development with no auth and sam running on localhost:8800. Also create a .env file to hold any env vars
```

```
Pull the configuration
```