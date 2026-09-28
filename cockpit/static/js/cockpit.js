/* Workshop cockpit UI.

   No framework and no build step: the container should boot straight into a
   working cockpit, and an attendee who opens devtools should see the same code
   we wrote. State is a plain object; rendering is direct DOM construction.
*/

(() => {
  const state = {
    env: null,
    scenarios: [],
    activeId: null,
    /* One open log socket per action, keyed "<scenario>:<action>". Closed on
       navigation so a long session doesn't accumulate sockets. */
    sockets: new Map(),
    /* The node panel: which node is open, which tab, and its own log socket
       kept apart from the per-action sockets. */
    panel: null,
    panelSocket: null,
    diagramState: null,
    /* Last run status per "<scenario>:<action>", so a flow step opened between
       polls paints its badge and buttons straight away. */
    runStatus: new Map(),
    // The one flow step whose detail is expanded, if any.
    openStep: null,
  };

  const el = {
    nav: document.getElementById("nav"),
    view: document.getElementById("view"),
    crumb: document.getElementById("crumb"),
    toasts: document.getElementById("toasts"),
    brokerDot: document.getElementById("broker-dot"),
    brokerText: document.getElementById("broker-text"),
    brokerLink: document.getElementById("broker-link"),
    activeBadge: document.getElementById("active-badge"),
    stopAll: document.getElementById("stop-all"),
    refresh: document.getElementById("refresh"),
  };

  /* ------------------------------------------------------------ helpers */

  function h(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (value === null || value === undefined || value === false) continue;
      if (key === "class") node.className = value;
      else if (key === "text") node.textContent = value;
      else if (key.startsWith("on")) node.addEventListener(key.slice(2).toLowerCase(), value);
      else node.setAttribute(key, value === true ? "" : value);
    }
    for (const child of children.flat()) {
      if (child === null || child === undefined || child === false) continue;
      node.append(child instanceof Node ? child : document.createTextNode(String(child)));
    }
    return node;
  }

  function toast(message, isError = false) {
    const node = h("div", { class: `toast${isError ? " toast--error" : ""}`, text: message });
    el.toasts.append(node);
    setTimeout(() => node.remove(), isError ? 7000 : 4000);
  }

  /* SEMP returns camelCase keys; turn them into readable column headers rather
     than maintaining a label map for every field a scenario might inspect. */
  function humanize(key) {
    return key
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (c) => c.toUpperCase())
      .trim();
  }

  function formatCell(value) {
    if (value === true) return { text: "Yes", cls: "is-true" };
    if (value === false) return { text: "No", cls: "is-false" };
    if (value === null || value === undefined || value === "") return { text: "—", cls: "is-false" };
    if (typeof value === "number") return { text: value.toLocaleString(), cls: "is-mono" };
    return { text: String(value), cls: "is-mono" };
  }

  const STATE_LABEL = {
    running: "Running",
    succeeded: "Succeeded",
    failed: "Failed",
    stopped: "Stopped",
    idle: "Idle",
  };

  /* ------------------------------------------------------- broker status */

  async function pollBroker() {
    try {
      const health = await API.health();
      if (health.ready) {
        el.brokerDot.className = "dot dot--ready";
        el.brokerText.textContent = `Ready · ${health.msgVpn}`;
      } else {
        /* Almost always the 30-60s container boot, so say that rather than
           showing a raw connection error an attendee cannot act on. */
        el.brokerDot.className = "dot dot--wait";
        el.brokerText.textContent = "Starting…";
      }
    } catch (err) {
      el.brokerDot.className = "dot dot--down";
      el.brokerText.textContent = "Unreachable";
    }
  }

  async function pollRuns() {
    try {
      const { activeCount, sequences, runs, sequenceErrors } = await API.runs();
      el.activeBadge.classList.toggle("hidden", activeCount === 0);
      el.activeBadge.textContent = `${activeCount} running`;

      /* Drive the transport from what is actually running: a sequence in
         flight means busy, a live process means Pause is available. */
      if (state.activeId) {
        const busy = (sequences || []).includes(state.activeId);
        const active = (runs || []).some(
          (r) => r.key.startsWith(`${state.activeId}:`) && r.state === "running"
        );
        /* A halted Play must say why. Without this the buttons simply return
           to resting and it looks like nothing happened. */
        const failure = (sequenceErrors || {})[state.activeId];
        // The diagram's rings and checklists come from the broker, so refresh
        // them on the same tick that updates the transport.
        const current = state.scenarios.find((s) => s.id === state.activeId);
        if (current) refreshDiagramState(current);

        /* The action flow has no log socket of its own, so the run list is
           what keeps its steps honest. */
        for (const r of runs || []) {
          const [sid, aid] = r.key.split(":");
          if (sid === state.activeId) paintStatus(sid, aid, r);
        }

        setTransport({
          busy,
          active,
          status: busy
            ? "Working through the steps..."
            : failure
            ? failure
            : active
            ? `${activeCount} process(es) running`
            : "",
          failed: Boolean(failure) && !busy,
        });
      }
    } catch (_) {
      /* transient; the next tick will correct it */
    }
  }

  /* ------------------------------------------------------------- console */

  /* Log streams are opened by the node panel now, one at a time. This clears
     any that a future surface might open, and keeps teardown in one place. */
  function closeSockets() {
    for (const socket of state.sockets.values()) socket.close();
    state.sockets.clear();
  }

  /* One place that paints run state, so a flow step's dot, the open step's
     badge and its Run and Stop buttons can never disagree. */
  function paintStatus(scenarioId, actionId, status) {
    const key = `${scenarioId}:${actionId}`;
    state.runStatus.set(key, status);
    const stateName = status?.state || "idle";
    const label = STATE_LABEL[status?.state] || "Not run";

    const badge = document.getElementById(`badge-${key}`);
    if (badge) {
      badge.className = `badge badge--${stateName}`;
      badge.textContent = label;
    }

    const card = document.getElementById(`action-${key}`);
    if (card) card.dataset.state = stateName;

    const running = stateName === "running";
    const run = document.getElementById(`run-${key}`);
    const stop = document.getElementById(`stop-${key}`);
    if (run) run.disabled = running;
    if (stop) stop.disabled = !running;
  }

  /* ---------------------------------------------------------- action flow */

  /* Every action drawn as a flowchart: what Play runs, then what Cleanup runs,
     then anything in neither as optional tools. Each step is one line until
     clicked, when a single detail area underneath shows its description and
     its own Run and Stop. */
  function makeActionFlow(scenario) {
    const byId = (id) => scenario.actions.find((a) => a.id === id);
    const play = scenario.runSequence.map(byId).filter(Boolean);
    const cleanup = scenario.cleanupSequence.map(byId).filter(Boolean);
    const sequenced = new Set([...scenario.runSequence, ...scenario.cleanupSequence]);
    const optional = scenario.actions.filter((a) => !sequenced.has(a.id));

    state.openStep = null;
    for (const a of scenario.actions) {
      state.runStatus.set(`${scenario.id}:${a.id}`, scenario.runs?.[a.id]);
    }

    let n = 0;
    const step = (action, numbered) =>
      h(
        "button",
        {
          class: `aflow__step aflow__step--${action.variant}`,
          id: `action-${scenario.id}:${action.id}`,
          "data-step": action.id,
          "data-state": scenario.runs?.[action.id]?.state || "idle",
          "aria-expanded": "false",
          "aria-controls": "aflow-detail",
          onClick: () => toggleStep(scenario, action),
        },
        numbered && h("span", { class: "aflow__num", text: String(++n) }),
        h("span", { class: "aflow__dot", "aria-hidden": "true" }),
        h("span", { class: "aflow__label", text: action.label }),
        h("span", { class: "aflow__chev", "aria-hidden": "true", text: "\u25BE" })
      );

    const arrow = (long) =>
      h("span", { class: `aflow__arrow${long ? " aflow__arrow--long" : ""}`, "aria-hidden": "true" });

    /* Steps in a sequence are joined by arrows; optional tools stand alone.
       Each arrow is bound to the step it points at, so a long sequence wraps
       between steps and never leaves an arrow dangling at the end of a line.
       `lead` draws the arrow from Play into the first Cleanup step. */
    const group = (title, actions, { sequence = true, lead = false, cls = "" } = {}) =>
      actions.length
        ? h(
            "div",
            { class: `aflow__group ${cls}`, role: "group", "aria-label": title },
            h("span", { class: "aflow__title", text: title }),
            h(
              "div",
              { class: "aflow__steps" },
              actions.map((a, i) =>
                sequence && (i > 0 || lead)
                  ? h("span", { class: "aflow__hop" }, arrow(i === 0), step(a, true))
                  : step(a, sequence)
              )
            )
          )
        : null;

    return h(
      "div",
      { class: "aflow" },
      h(
        "div",
        { class: "aflow__chart" },
        group("Play", play),
        group("Cleanup", cleanup, { lead: play.length > 0 }),
        group("Optional", optional, { sequence: false, cls: "aflow__group--optional" })
      ),
      h("div", { class: "aflow__detail", id: "aflow-detail", hidden: true })
    );
  }

  function toggleStep(scenario, action) {
    const detail = document.getElementById("aflow-detail");
    if (!detail) return;
    state.openStep = state.openStep === action.id ? null : action.id;

    for (const node of document.querySelectorAll(".aflow__step")) {
      const open = node.dataset.step === state.openStep;
      node.classList.toggle("is-open", open);
      node.setAttribute("aria-expanded", String(open));
    }

    if (!state.openStep) {
      detail.hidden = true;
      detail.replaceChildren();
      return;
    }

    const key = `${scenario.id}:${action.id}`;
    const status = state.runStatus.get(key);
    detail.replaceChildren(
      h(
        "div",
        { class: "aflow__detail-head" },
        h("span", { class: "action__title", text: action.label }),
        h("span", {
          class: `badge badge--${status?.state || "idle"}`,
          id: `badge-${key}`,
          text: STATE_LABEL[status?.state] || "Not run",
        })
      ),
      action.description && h("p", { class: "action__desc", text: action.description }),
      h(
        "div",
        { class: "action__controls" },
        h("button", {
          class: `btn btn--${action.variant} btn--sm`,
          id: `run-${key}`,
          text: action.label,
          onClick: () => startAction(scenario, action),
        }),
        h("button", {
          class: "btn btn--ghost btn--sm",
          id: `stop-${key}`,
          text: "Stop",
          disabled: true,
          onClick: () => stopAction(scenario, action),
        })
      )
    );
    detail.hidden = false;
    paintStatus(scenario.id, action.id, status);
  }

  async function startAction(scenario, action) {
    if (action.confirm && !window.confirm(action.confirm)) return;
    try {
      await API.startAction(scenario.id, action.id);
      toast(`${action.label} started`);
    } catch (err) {
      toast(err.message, true);
    }
  }

  async function stopAction(scenario, action) {
    try {
      await API.stopAction(scenario.id, action.id);
    } catch (err) {
      toast(err.message, true);
    }
  }

  /* -------------------------------------------------------------- inspect */

  function makeInspectView(view) {
    if (view.error) {
      return h(
        "div",
        { class: "inspect" },
        h("div", { class: "inspect__head" }, h("h4", { text: view.label })),
        h("div", { class: "empty", text: view.error })
      );
    }

    if (!view.rows.length) {
      return h(
        "div",
        { class: "inspect" },
        h(
          "div",
          { class: "inspect__head" },
          h("h4", { text: view.label }),
          view.uiHint && h("span", { class: "inspect__hint", text: view.uiHint })
        ),
        h("div", { class: "empty", text: "Nothing here yet. Apply the configuration to populate it." })
      );
    }

    /* A scenario may declare which columns matter; fall back to whatever keys
       the first row happens to have so a new inspect view still renders. */
    const columns = view.columns.length ? view.columns : Object.keys(view.rows[0]);

    const table = h(
      "table",
      {},
      h("thead", {}, h("tr", {}, columns.map((c) => h("th", { text: humanize(c) })))),
      h(
        "tbody",
        {},
        view.rows.map((row) =>
          h(
            "tr",
            {},
            columns.map((c) => {
              const { text, cls } = formatCell(row[c]);
              return h("td", { class: cls, text });
            })
          )
        )
      )
    );

    return h(
      "div",
      { class: "inspect" },
      h(
        "div",
        { class: "inspect__head" },
        h("h4", { text: view.label }),
        h("span", { class: "inspect__hint", text: `${view.rows.length} on the broker` }),
        view.uiHint && h("span", { class: "inspect__hint", style: "margin-left:auto", text: view.uiHint })
      ),
      h("div", { class: "table-wrap" }, table)
    );
  }

  async function refreshInspect(scenarioId) {
    const host = document.getElementById("inspect-host");
    if (!host) return;
    try {
      const { views } = await API.inspect(scenarioId);
      host.replaceChildren(...views.map(makeInspectView));
    } catch (err) {
      host.replaceChildren(h("div", { class: "empty", text: err.message }));
    }
  }

  /* --------------------------------------------------------------- render */

  function renderNav() {
    el.nav.replaceChildren(
      ...state.scenarios.map((scenario, index) =>
        h(
          "button",
          {
            class: "nav-item",
            "aria-current": String(scenario.id === state.activeId),
            onClick: () => select(scenario.id),
          },
          h("span", { class: "nav-item__index", text: String(index + 1).padStart(2, "0") }),
          scenario.title
        )
      )
    );
  }

  function renderScenario(scenario) {
    el.crumb.textContent = scenario.title;

    const header = h(
      "section",
      { class: "scenario-header" },
      h("p", { class: "eyebrow", text: scenario.eyebrow }),
      h("h1", { text: scenario.title }),
      h("p", { class: "scenario-header__summary", text: scenario.summary }),
      scenario.objectives.length &&
        h("ul", { class: "objectives" }, scenario.objectives.map((o) => h("li", { text: o })))
    );

    /* The diagram is the primary interface: nodes carry live status, open their
       own logs, and can be clicked to start or stop what they represent. */
    const diagramHost = h("div", { class: "stage__diagram", id: "diagram-host" });
    const panelHost = h("aside", { class: "stage__panel", id: "panel-host" });
    const stage = h("section", { class: "stage" }, diagramHost, panelHost);

    if (scenario.diagram && (scenario.diagram.nodes || []).length) {
      Diagram.render(diagramHost, scenario.diagram, {
        onSelect: (id) => selectNode(scenario, id),
        onLogs: (id) => selectNode(scenario, id, "logs"),
      });
      refreshDiagramState(scenario);
    }

    const stats = h("section", { class: "stats", id: "stats" });

    /* Transport controls: the primary way to drive a scenario. The action flow
       below is for anyone who wants one step on its own. */
    const transport = makeTransport(scenario);

    const actions = h(
      "section",
      { class: "section" },
      h(
        "div",
        { class: "section__head" },
        h("h3", { text: "Actions" }),
        h("button", {
          class: "btn btn--ghost btn--sm",
          text: "Reset this scenario",
          onClick: () => resetScenario(scenario),
        })
      ),
      makeActionFlow(scenario)
    );

    const inspect = h(
      "section",
      { class: "section" },
      h(
        "div",
        { class: "section__head" },
        h("h3", { text: "On the broker" }),
        h("button", {
          class: "btn btn--secondary btn--sm",
          text: "Refresh",
          onClick: () => refreshInspect(scenario.id),
        })
      ),
      h("div", { id: "inspect-host", class: "section" }, h("div", { class: "empty", text: "Loading…" }))
    );

    el.view.replaceChildren(header, transport, stage, stats, actions, inspect);

    refreshInspect(scenario.id);
    refreshStats();
  }

  async function refreshStats() {
    const host = document.getElementById("stats");
    if (!host) return;
    try {
      const data = await API.overview();
      const tiles = [
        ["Queues", data.queues],
        ["Client profiles", data.clientProfiles],
        ["ACL profiles", data.aclProfiles],
        ["Client usernames", data.clientUsernames],
      ];
      host.replaceChildren(
        ...tiles.map(([label, value]) =>
          h(
            "div",
            { class: "stat" },
            h("div", { class: "stat__label", text: label }),
            h(
              "div",
              { class: "stat__value" },
              h("span", { class: "stat__number", text: value === null ? "—" : String(value) }),
              h("span", { class: "stat__unit", text: "on broker" })
            )
          )
        )
      );
    } catch (_) {
      host.replaceChildren();
    }
  }

  /* --------------------------------------------------------- node panel */

  /* Clicking a node opens this beside the diagram: what the node needs, whether
     it has it, and its logs. Everything about a node in one place, so nothing
     has to live further down the page. */

  function nodeSpec(scenario, nodeId) {
    return (scenario.diagram?.nodes || []).find((n) => n.id === nodeId);
  }

  function selectNode(scenario, nodeId, tab) {
    const spec = nodeSpec(scenario, nodeId);
    if (!spec) return;

    // Re-selecting the open node with no tab given closes the panel, so a
    // second click on a node is a way back to the full-width diagram.
    if (state.panel?.nodeId === nodeId && !tab) {
      closePanel();
      return;
    }

    state.panel = { nodeId, tab: tab || state.panel?.tab || "detail", scenario };
    renderPanel();
  }

  function closePanel() {
    state.panel = null;
    closePanelSocket();
    const host = document.getElementById("panel-host");
    if (host) host.replaceChildren();
    document.querySelector(".stage")?.classList.remove("is-open");
    for (const n of document.querySelectorAll(".dg-node")) n.classList.remove("is-selected");
  }

  function closePanelSocket() {
    if (state.panelSocket) {
      state.panelSocket.close();
      state.panelSocket = null;
    }
  }

  function renderPanel() {
    const host = document.getElementById("panel-host");
    if (!host || !state.panel) return;
    const { nodeId, tab, scenario } = state.panel;
    const spec = nodeSpec(scenario, nodeId);
    const action = spec.action
      ? scenario.actions.find((a) => a.id === spec.action)
      : null;

    closePanelSocket();
    document.querySelector(".stage")?.classList.add("is-open");
    for (const n of document.querySelectorAll(".dg-node")) {
      n.classList.toggle("is-selected", n.dataset.node === nodeId);
    }

    const tabBtn = (id, label) =>
      h("button", {
        class: `panel__tab${tab === id ? " is-active" : ""}`,
        text: label,
        onClick: () => {
          state.panel.tab = id;
          renderPanel();
        },
      });

    const head = h(
      "div",
      { class: "panel__head" },
      h("div", { class: "panel__titles" },
        h("p", { class: "panel__eyebrow", text: spec.kind || "node" }),
        h("h4", { class: "panel__title", text: spec.label })),
      h("button", { class: "panel__close", text: "\u00d7", title: "Close",
        onClick: closePanel })
    );

    const tabs = h(
      "div",
      { class: "panel__tabs" },
      tabBtn("detail", "Detail"),
      action && tabBtn("logs", "Logs")
    );

    const body = h("div", { class: "panel__body", id: "panel-body" });
    host.replaceChildren(head, tabs, body);

    if (tab === "logs" && action) {
      renderPanelLogs(scenario, action, body);
    } else {
      renderPanelDetail(scenario, spec, action, body);
    }
  }

  function renderPanelDetail(scenario, spec, action, body) {
    const nodeState = state.diagramState?.nodes?.[spec.id];
    const checklist = nodeState?.checklist || [];

    const statusText = nodeState?.running
      ? "Running"
      : nodeState?.run
      ? STATE_LABEL[nodeState.run.state] || "Idle"
      : "Not started";

    const rows = [
      h("div", { class: "panel__status" },
        h("span", { class: `dot dot--${nodeState?.running ? "ready" : "idle"}` }),
        h("span", { text: statusText })),
    ];

    if (spec.sublabel) {
      rows.push(h("p", { class: "panel__meta", text: spec.sublabel }));
    }

    if (checklist.length) {
      rows.push(
        h("p", { class: "panel__section-title",
          text: spec.provides ? "Configuration it provides" : "Configuration it needs" }),
        h("ul", { class: "checklist" },
          checklist.map((c) =>
            h("li", { class: `checklist__item is-${c.present === null ? "unknown" : c.present}` },
              h("span", { class: "checklist__mark",
                text: c.present === null ? "?" : c.present ? "\u2713" : "\u00d7" }),
              h("span", { text: c.label }))))
      );
    }

    if (action) {
      const running = Boolean(nodeState?.running);
      rows.push(
        h("div", { class: "panel__actions" },
          h("button", {
            class: `btn btn--${running ? "secondary" : "primary"} btn--sm`,
            text: running ? "Stop" : "Start",
            // Read state at click time, not render time: the label is updated
            // in place by polling, so a captured value would go stale.
            onClick: () =>
              toggleNode(
                scenario,
                action,
                Boolean(state.diagramState?.nodes?.[spec.id]?.running)
              ),
          }),
          h("button", {
            class: "btn btn--ghost btn--sm",
            text: "View logs",
            onClick: () => { state.panel.tab = "logs"; renderPanel(); },
          }))
      );
      if (action.description) {
        rows.push(h("p", { class: "panel__desc", text: action.description }));
      }
    }

    body.replaceChildren(...rows);
  }

  function renderPanelLogs(scenario, action, body) {
    const pre = h("pre", { class: "panel__log" });
    body.replaceChildren(pre);

    const append = (line) => {
      const atBottom = pre.scrollHeight - pre.scrollTop - pre.clientHeight < 40;
      pre.append(h("div", { class: `line--${line.stream}`, text: line.text }));
      if (atBottom) pre.scrollTop = pre.scrollHeight;
    };

    // A dedicated socket for whatever the panel is showing, closed on every
    // switch so a long session cannot accumulate one per node visited.
    state.panelSocket = API.streamRun(scenario.id, action.id, {
      onHistory: (lines) => { pre.textContent = ""; lines.forEach(append); },
      onLine: append,
    });
  }

  /* Update the open Detail tab without rebuilding it, so a poll landing between
     a mousedown and its click cannot swallow the press. */
  function repaintPanelDetail() {
    if (!state.panel) return;
    const { nodeId, scenario } = state.panel;
    const spec = nodeSpec(scenario, nodeId);
    const nodeState = state.diagramState?.nodes?.[nodeId];
    if (!spec || !nodeState) return;

    const statusEl = document.querySelector("#panel-body .panel__status");
    if (statusEl) {
      const text = nodeState.running
        ? "Running"
        : nodeState.run
        ? STATE_LABEL[nodeState.run.state] || "Idle"
        : "Not started";
      statusEl.lastElementChild.textContent = text;
      statusEl.firstElementChild.className = `dot dot--${nodeState.running ? "ready" : "idle"}`;
    }

    const items = document.querySelectorAll("#panel-body .checklist__item");
    (nodeState.checklist || []).forEach((c, i) => {
      const li = items[i];
      if (!li) return;
      li.className = `checklist__item is-${c.present === null ? "unknown" : c.present}`;
      li.firstElementChild.textContent =
        c.present === null ? "?" : c.present ? "\u2713" : "\u00d7";
    });

    const btn = document.querySelector("#panel-body .panel__actions .btn");
    if (btn) {
      const label = nodeState.running ? "Stop" : "Start";
      // Only touch the button when it is actually wrong, so an in-flight click
      // is never interrupted by a needless rewrite.
      if (btn.textContent !== label) {
        btn.textContent = label;
        btn.className = `btn btn--${nodeState.running ? "secondary" : "primary"} btn--sm`;
      }
    }
  }

  async function toggleNode(scenario, action, running) {
    try {
      if (running) {
        await API.stopAction(scenario.id, action.id);
      } else {
        await API.startAction(scenario.id, action.id);
      }
    } catch (err) {
      toast(err.message, true);
    }
  }

  async function refreshDiagramState(scenario) {
    try {
      state.diagramState = await API.scenarioState(scenario.id);
      const host = document.getElementById("diagram-host");
      if (host) Diagram.paint(host, scenario.diagram, state.diagramState);
      // Keep an open Detail tab honest as things start and stop, but update it
      // in place rather than rebuilding: a full re-render on every poll would
      // replace the Start/Stop button out from under a click in progress.
      if (state.panel && state.panel.tab === "detail") repaintPanelDetail();
    } catch (_) {
      /* transient; the next tick will correct it */
    }
  }

  /* ----------------------------------------------------------- transport */

  function labelsFor(scenario, ids) {
    return ids
      .map((id) => scenario.actions.find((a) => a.id === id)?.label)
      .filter(Boolean);
  }

  /* Play / Pause / Cleanup, with the steps each one runs listed underneath so
     the buttons are never a mystery box. */
  function makeTransport(scenario) {
    const playSteps = labelsFor(scenario, scenario.runSequence);
    const cleanupSteps = labelsFor(scenario, scenario.cleanupSequence);

    const play = h("button", {
      class: "btn btn--primary",
      id: "tp-play",
      text: "Play",
      onClick: () => transportPlay(scenario),
    });

    const pause = h("button", {
      class: "btn btn--secondary",
      id: "tp-pause",
      text: "Pause",
      disabled: true,
      onClick: () => transportPause(scenario),
    });

    const cleanup = h("button", {
      class: "btn btn--danger",
      id: "tp-cleanup",
      text: "Cleanup",
      disabled: cleanupSteps.length === 0,
      // Remembered so polling never re-enables a button the scenario cannot use.
      "data-empty": String(cleanupSteps.length === 0),
      onClick: () => transportCleanup(scenario),
    });

    const taskList = (title, steps, note) =>
      steps.length
        ? h(
            "div",
            { class: "tasks" },
            h("p", { class: "tasks__title", text: title }),
            h("ol", { class: "tasks__list" }, steps.map((s) => h("li", { text: s }))),
            note && h("p", { class: "tasks__note", text: note })
          )
        : null;

    return h(
      "section",
      { class: "transport" },
      h(
        "div",
        { class: "transport__controls" },
        play, pause, cleanup,
        h("span", { class: "transport__status", id: "tp-status", text: "" })
      ),
      h(
        "div",
        { class: "transport__tasks" },
        taskList("When you press Play", playSteps),
        taskList(
          "When you press Cleanup",
          cleanupSteps,
          "Anything still running is stopped first."
        )
      )
    );
  }

  async function transportPlay(scenario) {
    setTransport({ busy: true, status: "Starting..." });
    try {
      await API.runScenario(scenario.id);
    } catch (err) {
      toast(err.message, true);
      setTransport({ busy: false, status: "" });
    }
    /* The sequence advances server-side and each step's output lands in its own
       log pane over the existing sockets, so there is nothing to poll here.
       pollRuns settles the buttons once the sequence finishes. */
  }

  async function transportPause(scenario) {
    setTransport({ busy: true, status: "Stopping..." });
    try {
      const { stopped } = await API.pauseScenario(scenario.id);
      toast(stopped ? `Paused: stopped ${stopped} process(es)` : "Nothing was running");
    } catch (err) {
      toast(err.message, true);
    }
  }

  async function transportCleanup(scenario) {
    const steps = labelsFor(scenario, scenario.cleanupSequence).join(", ");
    const ok = window.confirm(
      `Clean up ${scenario.title}?\n\nThis stops anything running, then: ${steps}.\n` +
        `Configuration this scenario created is removed from the broker.`
    );
    if (!ok) return;

    setTransport({ busy: true, status: "Cleaning up..." });
    try {
      await API.cleanupScenario(scenario.id);
    } catch (err) {
      toast(err.message, true);
      setTransport({ busy: false, status: "" });
    }
  }

  /* One place that owns transport button state, so Play, Pause and Cleanup can
     never contradict each other or the actual run state. */
  function setTransport({ busy, active, status, failed }) {
    const play = document.getElementById("tp-play");
    const pause = document.getElementById("tp-pause");
    const cleanup = document.getElementById("tp-cleanup");
    const label = document.getElementById("tp-status");
    if (!play) return;

    play.disabled = Boolean(busy);
    play.textContent = busy ? "Working..." : active ? "Restart" : "Play";
    // Pause is only meaningful while something is actually running.
    pause.disabled = !active;
    cleanup.disabled = Boolean(busy) || cleanup.dataset.empty === "true";
    if (label && status !== undefined) {
      label.textContent = status;
      label.classList.toggle("is-failed", Boolean(failed));
    }
  }

  async function resetScenario(scenario) {
    const ok = window.confirm(
      `Reset ${scenario.title}?\n\nThis stops anything still running and deletes this scenario's ` +
        `terraform state. Configuration already on the broker is left in place -- run ` +
        `"Remove configuration" first if you want a clean broker.`
    );
    if (!ok) return;
    try {
      await API.reset(scenario.id);
      toast(`${scenario.title} reset`);
      await load();
    } catch (err) {
      toast(err.message, true);
    }
  }

  function select(scenarioId) {
    closeSockets();
    closePanel();
    state.diagramState = null;
    state.activeId = scenarioId;
    const scenario = state.scenarios.find((s) => s.id === scenarioId);
    renderNav();
    if (scenario) renderScenario(scenario);
    location.hash = scenarioId;
  }

  /* ----------------------------------------------------------------- boot */

  async function load() {
    const { scenarios } = await API.scenarios();
    state.scenarios = scenarios;
    if (!scenarios.length) {
      el.view.replaceChildren(h("div", { class: "empty", text: "No scenarios found." }));
      return;
    }
    const wanted = location.hash.slice(1);
    const target = scenarios.find((s) => s.id === wanted) || scenarios[0];
    select(target.id);
  }

  async function init() {
    state.env = await API.env();
    el.brokerLink.href = state.env.brokerUiUrl;

    if (!state.env.terraformAvailable) {
      toast("Terraform is not installed in this container; terraform actions will fail.", true);
    }

    await load();

    pollBroker();
    pollRuns();
    setInterval(pollBroker, 5000);
    setInterval(pollRuns, 3000);

    el.refresh.addEventListener("click", () => {
      refreshStats();
      if (state.activeId) refreshInspect(state.activeId);
    });

    el.stopAll.addEventListener("click", async () => {
      try {
        const { stopped } = await API.stopAll();
        toast(stopped ? `Stopped ${stopped} process(es)` : "Nothing was running");
      } catch (err) {
        toast(err.message, true);
      }
    });

    window.addEventListener("hashchange", () => {
      const id = location.hash.slice(1);
      if (id && id !== state.activeId) select(id);
    });
  }

  init().catch((err) => {
    el.view.replaceChildren(h("div", { class: "empty", text: `Cockpit failed to start: ${err.message}` }));
  });
})();
