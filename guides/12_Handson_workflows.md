# [Hands-on] Workflows

Add a workflow that plans a complete trip in a fixed sequence, and have the TravelOrchestratorAgent use it.

---

## What is a workflow?

A workflow is a deterministic graph of steps (a DAG). Each step is a node: an agent, a tool, a nested workflow, or a control step such as a switch, map, or loop. You declare which nodes depend on which, and Agent Mesh runs them in that order. Nodes with no dependency between them run in parallel. To other agents, a deployed workflow looks like any other agent: it publishes a card and can be called by name.

## Workflows vs. dynamic orchestration

| | Workflow | Dynamic orchestrator |
|---|---|---|
| Who decides the steps | You, when you write the workflow | The orchestrator's LLM, at runtime |
| Sequence | Fixed and repeatable | Can change from one request to the next |
| Parallelism | Declared through dependencies | Decided by the LLM |
| Data between steps | Typed: each node declares the fields it returns | Free text in the conversation |
| Tool steps | Can call a tool directly, with no LLM | Every tool call goes through the LLM |
| Retries and timeouts | Configured per node | Up to the LLM |
| Auditability | Each node's input and output is recorded | One conversation transcript |
| Best for | Known processes that must run the same way every time | Conversational requests where the next step depends on the answer |

The two work well together. The orchestrator handles the conversation and decides *whether* a request needs the full process. The workflow runs that process the same way every time.

---

## What TravelPlanningWorkflow does

```
                    ┌─→ flights  (FlightSearchAgent) ──────┬─→ budget     (calculate_budget tool)
workflow input ─────┼─→ hotels   (HotelSearchAgent) ───────┤
                    └─→ local    (LocalExperiencesAgent) ──┴─→ itinerary  (compile_itinerary tool)
```

| Node | Type | What it does |
|---|---|---|
| `flights` | Agent | Finds flights and returns the recommended one as typed fields: flight number, airline, route, duration, and price per traveler |
| `hotels` | Agent | Finds hotels, counts the nights, and returns the recommended one with its nightly rate and total cost |
| `local` | Agent | Finds restaurants and attractions that match the traveler's preferences |
| `itinerary` | Tool | Runs `compile_itinerary` with the results of the three searches. It waits for all three |
| `budget` | Tool | Runs `calculate_budget` with the flight price and the hotel total. It waits for `flights` and `hotels` only |

- The three searches run in parallel, because none depends on another.
- Each agent node declares an output schema, so the tool nodes receive exactly the fields they need. The two tool nodes make no LLM calls.
- Each agent node retries once if it fails. If one search fails, the other branches still run.

The weather forecast comes from WeatherAdvisorAgent, an external agent. The TravelOrchestratorAgent calls it at the same time as the workflow.

### How the orchestrator uses it

The TravelOrchestratorAgent now chooses one of three paths for each request:

| Request | Path |
|---|---|
| A complete trip plan with a destination and dates | Call TravelPlanningWorkflow and WeatherAdvisorAgent at the same time |
| A focused question, such as flights only or weather only | Delegate to the one right specialist agent |
| A partial combination, such as the best route and an estimated cost | Delegate to only the specialists it needs, and call `calculate_budget` itself |

---

## Step 1: Review the workflow

Open [sample_configuration/workflows/TravelPlanningWorkflow.yaml](../sample_configuration/workflows/TravelPlanningWorkflow.yaml). Look for:

- `input_schema`: the inputs the workflow expects, such as origin, destination, dates, and travelers
- `nodes`: the five nodes, and the `depends_on` lists that order them
- `output_schema_override` on each agent node: the typed fields it must return
- `output_mapping`: what the workflow returns to its caller

## Step 2: Review the manifest

Open [sample_configuration/manifests/12-workflows.yaml](../sample_configuration/manifests/12-workflows.yaml). It adds the workflow, and the updated TravelOrchestratorAgent, to the resources from the previous steps:

```yaml
kind: manifest
name: 12-workflows
description: Adds the travel planning workflow and routes the orchestrator to it
target:
  url: http://localhost:8800
resources:
  toolsets:
    - travel-planner
  connectors:
    - flights-db
    - hotels-db
    - places-mcp
  agents:
    - HotelSearchAgent
    - LocalExperiencesAgent
    - TravelOrchestratorAgent
  workflows:
    - TravelPlanningWorkflow
```

## Step 3: Plan and apply

From the root of the repository, run:

```bash
export TRAVEL_DB_PASSWORD=travel123
sam config plan --manifest sample_configuration/manifests/12-workflows.yaml
```

The plan shows `TravelPlanningWorkflow` to create and `TravelOrchestratorAgent` to update.

```bash
sam config apply --manifest sample_configuration/manifests/12-workflows.yaml
```

> [!NOTE]
> On SAM Desktop, add `--target desktop` to both commands.

## Step 4: Verify the workflow

1. Go to **Builder → Workflows**
1. Confirm `TravelPlanningWorkflow` is listed and deployed
1. Open it to see the nodes and their dependencies on the canvas

## Step 5: Run a trip plan through the workflow

Start a new chat and send:

```
@TravelOrchestratorAgent Plan a 4-day trip from London to Paris for 2 people.
Departure: 10 days from today. Return: 4 days later.
We love French food, museums, and parks.
Include flights, hotels, restaurants, weather forecast, and full budget breakdown.
```

Watch the activity timeline:

1. The orchestrator calls **TravelPlanningWorkflow** and **WeatherAdvisorAgent** at the same time
1. Inside the workflow, `flights`, `hotels`, and `local` run in parallel
1. `budget` starts as soon as `flights` and `hotels` finish, and `itinerary` once all three searches finish
1. The orchestrator combines the workflow result and the forecast into the final plan

> [!TIP]
> Compare this run with the same kind of request in [Run the System](./11_Handson_run_the_system.md), where the orchestrator decided every step itself.

---
Section complete! Close this file and return to the Workshop Tracker to continue.
