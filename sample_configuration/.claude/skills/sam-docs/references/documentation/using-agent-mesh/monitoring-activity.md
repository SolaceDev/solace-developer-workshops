---
title: Monitoring Activity
description: Watch live task execution, browse the step-by-step linear view, Gantt timeline, and raw event stream on the Activities page. Review and download versioned artifacts.
sidebar_position: 655
---

# Monitoring Activity

The Activities page is a live monitor for every task running across your Agent Mesh deployment. As a task moves from a user request through agents, large language model (LLM) calls, tool invocations, and peer delegations, the Activities page renders that execution in real time as a visual flow graph, an ordered list of steps, a raw event stream, or a performance timeline. Use it to watch a task as it happens, to trace a completed task end to end, and to reach the artifacts a task produced.

This page is written for operators and developers debugging live tasks. For sending messages and managing conversations, see [Chatting with Agents](./chatting.md).

## Open the Activities Page

1. In the left navigation sidebar, select **Activities**.

The Activities page opens at `/activities` and loads the recent task history. On a wide screen it shows three panes side by side:

- **Task list** (left) — every task the mesh has run, newest first.
- **Flow graph** (center) — the visual execution graph of the selected task.
- **Step detail** (right) — the selected task's steps or raw events.

The task list is loaded from recent task history rather than a live connection. Use the **Refresh** button in the task-list header to re-fetch the list at any time. If no tasks have run yet, the page shows **No tasks yet — No recent tasks found** along with a **Return To Chat** button. If the task list fails to load, the page shows an error state titled **Something went wrong** with the error message.

The most recent task is selected automatically, so an active mesh shows a populated graph as soon as the page loads.

## Select a Task

The task list shows one row per task. Each row displays the initial request text, the task ID, the time of the last update, and an **Events: N** counter that climbs as the task produces more events.

- Click any row to select that task. The flow graph and step detail update to match.
- When an agent delegates to a peer agent, the resulting sub-task is nested under its parent. Use the chevron to **Expand sub-tasks** or **Collapse sub-tasks**.

A task that is still running streams updates live; new steps appear in the graph and the **Events** counter rises without a refresh. Selecting an older task loads its full history from the server so you can replay exactly what happened.

## The Views

The Activities page offers four ways to look at the selected task. The flow graph is the central visualization; the linear step view, the raw event stream, and the Gantt timeline are complementary detail views.

### Flow Graph

The center pane renders the task as a pan-and-zoom node graph. Each node is a participant or step in the execution (the user, an agent, an LLM call, a tool call, a peer delegation, or a workflow construct such as a switch, map, or loop), and the edges connect them in order.

- **Center Workflow** re-centers and fits the graph to the pane.
- **Detail Mode** toggles nested agent details on and off, so you can collapse a busy graph down to the high-level shape or expand it to every internal step.
- Click any node to open its **Node Details**. Clicking a node or edge also highlights the matching step in the right pane.

### Step-by-Step Linear View

The right pane lists the task's steps top to bottom under the **Events** heading, each with a millisecond-precision timestamp. The card for each step shows detail appropriate to its kind:

- The original user request and the agent's final response, rendered as formatted text.
- LLM calls, with the model name and a preview of the prompt and response.
- Tool calls, with the tool name, the arguments passed, and the result returned.
- Peer delegations, showing which agent the work was delegated to and the response that came back.
- Artifact notifications, showing the artifact name and version with a **View File** link.
- Task completion or failure, with any error message and code.

Click an edge in the graph or a card in this list to highlight and scroll to the corresponding step; this is how you line up a point in the graph with its detail.

### Raw Event Stream

The same right pane has a **Toggle Event View** switch that flips from the curated step view to the raw event stream. This view shows the underlying Agent-to-Agent (A2A) event records for the task, one card per event, unprocessed. Use it when you need to see exactly what crossed the event broker rather than the curated step summary.

### Gantt Timeline

For timing analysis, select **Performance** in the task header to open **Performance Insights**. The Gantt timeline populates after the task completes, and it contains:

- **Overall Summary** — the total task duration.
- **Agent Breakdown** — a sortable table of each agent's total active time, LLM time, and tool time.
- **Detailed Agent View** — select an agent in the table to reveal its **Agent Timeline**, a Gantt chart of that agent's LLM calls, tool calls, and peer delegations laid out against a seconds axis, color-coded by kind.

## Trace a Task End to End

To follow a task from the request to the result:

1. Select the task in the task list.
2. Read the flow graph to see the overall structure: which agents took part, where work was delegated, and which tools were called.
3. Click through the nodes, or scroll the linear step view to inspect each step's inputs and outputs. Clicking a node highlights its step, so you can move between the visual and the detail without losing your place.
4. Open **Performance Insights** to see where the time went after the task has finished.

## View and Download Artifacts

Artifacts produced during a task (files written by a tool or an agent) are reachable from the steps that created them.

1. In the linear step view, find an artifact step. It shows **Artifact: \<name\> (v\<version\>)**.
2. Select **View File**. The Agent Mesh UI switches to the originating chat session and opens the **Files** tab with that artifact previewed at the referenced version.

In the Files tab:

- When an artifact has more than one version, a **Version** drop-down list lets you switch between **Version 1**, **Version 2**, and so on. The latest version is selected by default.
- Select **Download** to save the current version locally.

For more information about how artifacts are versioned and stored, see [Artifacts](../concepts/artifacts.md).

## Share a Session Link

You can share a read-only snapshot of a conversation so a collaborator can review it without re-running the task. This feature is available only when your deployment has chat sharing enabled.

1. Open the conversation you want to share and select **Share**.
2. In the **Manage Access** dialog, either add a specific user by email as a **Viewer**, or select **Copy Sharing Link** to create a link that anyone in your organization can open.
3. Select **Save**.

The recipient opens the link to a read-only view of the conversation, including its files and history, marked with a **Viewer** badge and the date of the snapshot. They cannot change the conversation, but they can select **Continue in New Chat** to fork it into their own session.

For more information about sessions and conversation history, see [Sessions](../concepts/sessions.md).

## Next Steps

You have just learned how to monitor and trace task execution. Next, you might want to organize your work into reusable workspaces. For more information, see [Managing Projects](./managing-projects.md).
