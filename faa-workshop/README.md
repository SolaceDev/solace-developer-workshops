# Workshop: Agentic AI with Realtime FAA Data

## Table of Contents

- [Overview](#overview)
  - [The Mission](#the-mission)
  - [The Challenge](#the-challenge)
  - [Your Task: "Chat with your Data"](#your-task-chat-with-your-data)
  - [The Technical Landscape](#the-technical-landscape)
  - [Topic Structure](#topic-structure)
  - [Architecture Diagram](#architecture-diagram)
  - [Agent Ecosystem](#agent-ecosystem)
- [Get Started](#get-started)
- [Workshop Structure](#workshop-structure)
- [Support](#support)
- [Additional Resources](#additional-resources)

## Overview

In this hands-on workshop, you will explore how to use Solace Agent Mesh to analyze real-time FAA (Federal Aviation Administration) flight data streams. This workshop demonstrates how to transform complex aviation data into actionable insights using AI-powered agents and natural language queries.

### The Mission
Imagine you're part of an elite team of FAA engineers tasked with revolutionizing how aviation professionals interact with flight data. Your mission? To harness the power of AI and transform the way flight planners, operators, and controllers access critical information.

### The Challenge
Every day, aviation professionals face a common hurdle: while they're experts in their domain, navigating the FAA's vast ocean of data sources can be overwhelming. They know what they need, but finding it in the complex web of aviation data? That's where things get turbulent.

What about responding to real-time events? It takes a long time to investigate a critical business event and finally take action on it.

### Your Task: "Chat with your Data"
You'll build an intelligent system that lets aviation professionals simply ask questions in plain English and get instant, accurate answers from real-time flight data. This system will also enable reacting to critical business event in an agentic autonomous manner.

You will be using the ⭐️ [Solace Agent Mesh](https://github.com/SolaceLabs/solace-agent-mesh) framework to do so. 

### The Technical Landscape
- The FAA's real-time flight information flows through a sophisticated publish/subscribe messaging system, powered by the [Solace Event Mesh](https://solace.com/what-is-an-event-mesh/)
- This system lets users tap into exactly the data streams they need, creating an efficient, dynamic flow of information
- To make this data AI-ready, we're capturing a 10-minute historical window in a time series database (e.g. MongoDB). Don't worry, we've already set this up in your workshop environment!

### Topic Structure
The FAA stream is being published on the following topic hierarchy

```
FDPS/position/{FLIGHT_ID}/{STATUS}/{CALLSIGN}/{ORIGIN}/{DESTINATION}/{LATITUDE}/{LONGITUDE}/{GROUND_SPEED}/{ALTITUDE}/{HEADING}
```
And
```
STDDS/position/{AIRPORT_CODE}/{FLIGHT_ID}
```
### Architecture Diagram
By the end of this workshop, you will have built a multi-agent system that can:
- Interact with real-time flight data from multiple FAA systems
- Analyze flight plan adherence
- Generate automated landing reports
- Provide operational insights to flight planners, operators, and controllers

![Arch Diagram](./img/arch_diagram.png)

### Agent Ecosystem
Solace Agent Mesh is an agent agnostic orchestration framework. In this workshop we will be using the following resources
- Native Solace Agent Mesh agents
- Lang Agents
- MCP
- A2A

Ready for takeoff? Let's transform how aviation professionals interact with their data! ✈️

## Get Started
This workshop will start from the [Environment Setup](./guides/100-EnvSetup.md) step

> Note that throughout the workshop, you can refer to the solutions in the [solution](./solution/) dir

## Workshop Structure

This workshop is divided into the following parts:

1. **[Environment Setup](./guides/100-EnvSetup.md)** - Install and configure Solace Agent Mesh, set up your development environment, and add pre-populated prompts to get started with the workshop.

2. **[Introduction to FAA Data and Systems](./guides/101-FaaData.md)** - Learn about the FAA data that you'll work with throughout the workshop.

3. **[Understanding Solace Agent Mesh](./guides/102-SAMOverview.md)** - Explore the core concepts of Solace Agent Mesh including the artifact service, event-driven architecture with pub/sub, and A2A protocol communication.

4. **[Database Agent](./guides/200-DatabaseAgent.md)** - Create your first agent by connecting to the MongoDB instance containing real-time FAA flight data and enabling natural language queries.

5. **[RAG Agent](./guides/300-RAG.md)** - Add a knowledge database agent using Retrieval-Augmented Generation (RAG) to query CONOPS documentation and FAA operational context.

6. **[Lang Agent Integration](./guides/400-lang.md)** - Integrate external Lang agents into your Solace Agent Mesh ecosystem using the integrated proxy

7. **[Event-Driven Gateway](./guides/500-EventTriggered.md)** - Add an Event Mesh Gateway to enable real-time, event-triggered Agentic workflow

## Support

If you need assistance during the workshop:
- Raise your hand for in-person support
- Post questions [Solace Agent Mesh forum](https://community.solace.com/c/solace-agent-mesh/16)

## Additional Resources

- ⭐️ [Solace Agent Mesh Github Repo](https://github.com/SolaceLabs/solace-agent-mesh)
- [What is Agentic AI](https://solace.com/what-is-agentic-ai/)
- [Solace Agent Mesh Product](https://solace.com/products/agent-mesh/)
- [Event-Driven Architecture Patterns](https://solace.com/)
