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
    /* The failure mode currently in effect, as { scenarioId, modeId }, and
       the log socket its card is streaming. One at a time, so the diagram
       only ever marks one thing as broken. */
    failure: null,
    failureSocket: null,
    /* The failure mode most recently reset, as { scenarioId, modeId }. Its
       card stays open on the restarted app's log, because what happens after
       a reset (a backlog draining, a queued command arriving, a gap that
       never fills) is half of what the failure teaches. */
    recovered: null,
    // Inspect shades the attendee has opened, as "<scenario>:<label>".
    openInspect: new Set(),
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
    clearBroker: document.getElementById("clear-broker"),
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

        paintFailureModes(active);

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
    // An action that exists only to cause a failure belongs to that failure
    // mode's card, not to the list of optional steps.
    const optional = scenario.actions.filter((a) => !sequenced.has(a.id) && !a.failureOnly);

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
    // Whatever log the previous step was streaming belongs to that step.
    closeSockets();

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
        }),
        h("button", {
          class: "btn btn--ghost btn--sm aflow__logs-btn",
          text: "Show logs",
          "aria-expanded": "false",
          onClick: (e) => toggleStepLog(scenario, action, e.currentTarget),
        })
      ),
      h("pre", { class: "panel__log aflow__log", id: "aflow-log", hidden: true })
    );
    detail.hidden = false;
    paintStatus(scenario.id, action.id, status);
  }

  /* A step's own output, streamed under its detail. Not every action has a
     diagram node to open logs from, and a step that is meant to fail, like a
     refused subscription, is only useful if its output can be read. */
  function toggleStepLog(scenario, action, button) {
    const pre = document.getElementById("aflow-log");
    if (!pre) return;
    const key = `${scenario.id}:${action.id}`;
    const opening = pre.hidden;
    pre.hidden = !opening;
    button.textContent = opening ? "Hide logs" : "Show logs";
    button.setAttribute("aria-expanded", String(opening));

    if (!opening) {
      closeSockets();
      return;
    }

    const append = (line) => {
      const atBottom = pre.scrollHeight - pre.scrollTop - pre.clientHeight < 40;
      pre.append(h("div", { class: `line--${line.stream}`, text: line.text }));
      if (atBottom) pre.scrollTop = pre.scrollHeight;
    };
    state.sockets.set(key, API.streamRun(scenario.id, action.id, {
      onHistory: (lines) => { pre.textContent = ""; lines.forEach(append); },
      onLine: append,
    }));
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

  /* -------------------------------------------------------- failure modes */

  /* Each failure mode is a card: what breaks, a button that breaks it, what
     to look for once it has, and a reset that puts the scenario back so the
     next one starts from a working system. They need the scenario running,
     so they stay locked until Play has brought it up. */
  function makeFailureModes(scenario) {
    return h(
      "div",
      { class: "fm-list" },
      scenario.failureModes.map((mode, i) => {
        const id = `fm-${mode.id}`;
        return h(
          "article",
          { class: "fm", id, "data-mode": mode.id, "data-state": "locked" },
          h(
            "div",
            { class: "fm__head" },
            h("span", { class: "fm__num", text: String(i + 1) }),
            h("h3", { class: "fm__title", text: mode.title }),
            h("span", { class: "badge badge--idle fm__badge", text: "Not ready" })
          ),
          h("p", { class: "fm__breaks", text: mode.breaks }),
          h(
            "div",
            { class: "fm__controls" },
            h("button", {
              class: "btn btn--danger btn--sm fm__break",
              text: "Break it",
              disabled: true,
              onClick: () => breakScenario(scenario, mode),
            }),
            h("button", {
              class: "btn btn--secondary btn--sm fm__reset",
              text: "Reset",
              disabled: true,
              onClick: () => resetFailure(scenario, mode),
            })
          ),
          (mode.why || mode.real_world) &&
            h(
              "details",
              { class: "shade fm__why" },
              h(
                "summary",
                { class: "shade__summary fm__why-summary" },
                h("span", { class: "shade__chev", "aria-hidden": "true" }),
                h("span", { text: "Why this breaks, and where you would see it" })
              ),
              h(
                "div",
                { class: "shade__body fm__why-body" },
                mode.why && h("p", { class: "fm__why-title", text: "Why it breaks" }),
                mode.why && h("p", { class: "fm__why-text", text: mode.why }),
                mode.real_world && h("p", { class: "fm__why-title", text: "In the real world" }),
                mode.real_world && h("p", { class: "fm__why-text", text: mode.real_world })
              )
            ),
          h(
            "div",
            { class: "fm__watch", hidden: true },
            /* The app's own output comes first: it is the evidence, and the
               explanation below it makes more sense once it has been read.
               Errors are the red lines. */
            mode.logs &&
              h(
                "div",
                { class: "fm__output" },
                h(
                  "p",
                  { class: "fm__watch-title" },
                  h("span", { class: "fm__output-label", text: "What the app printed" }),
                  h("span", {
                    class: "fm__output-source",
                    text: ` · ${scenario.actions.find((a) => a.id === mode.logs)?.label || mode.logs}`,
                  })
                ),
                h("pre", { class: "panel__log fm__log" }),
                h("p", { class: "fm__output-hint", text: "Errors from the broker show in red. The same output is under this node's logs button in the diagram while the failure is in effect." })
              ),
            h("p", { class: "fm__watch-title", text: "What to look for" }),
            h("p", { class: "fm__watch-text", text: mode.watch })
          ),
          /* Where to read more: the Go API's reference for this failure, and
             the broker documentation for the behaviour behind it. Always
             shown, so the card is useful before and after breaking it. */
          (mode.docs || []).length &&
            h(
              "div",
              { class: "fm__docs" },
              h("span", { class: "fm__docs-title", text: "Docs" }),
              mode.docs.map((d) =>
                h("a", { class: "fm__doc", href: d.url, target: "_blank", rel: "noopener", text: d.label })
              )
            )
        );
      })
    );
  }

  const failureActive = (scenario, mode) =>
    state.failure?.scenarioId === scenario.id && state.failure?.modeId === mode.id;

  /* Keep every card honest about whether it can be used. Called on each run
     poll, since "the scenario is running" is what unlocks them. */
  function paintFailureModes(live) {
    const scenario = state.scenarios.find((s) => s.id === state.activeId);
    if (!scenario) return;
    /* Most failures need apps running to break. A scenario with no apps, like
       the broker tour, marks its modes `needs: applied`: they unlock once its
       configuration has been applied. */
    const applied = live || state.runStatus.get(`${scenario.id}:apply`)?.state === "succeeded";
    for (const mode of scenario.failureModes || []) {
      const card = document.getElementById(`fm-${mode.id}`);
      if (!card) continue;
      const ready = mode.needs === "applied" ? applied : live;
      const active = failureActive(scenario, mode);
      const other = Boolean(state.failure) && !active;
      const recovered =
        state.recovered?.scenarioId === scenario.id && state.recovered?.modeId === mode.id;
      const cardState = active
        ? "broken"
        : !ready
        ? "locked"
        : other
        ? "waiting"
        : recovered
        ? "recovered"
        : "ready";
      card.dataset.state = cardState;

      const badge = card.querySelector(".fm__badge");
      const [cls, text] = {
        broken: ["failed", "Broken"],
        locked: ["idle", "Not ready"],
        waiting: ["idle", "Reset the other first"],
        recovered: ["succeeded", "Recovered"],
        ready: ["succeeded", "Ready"],
      }[cardState];
      badge.className = `badge badge--${cls} fm__badge`;
      badge.textContent = text;

      // A recovered card can be broken again straight away: try again.
      card.querySelector(".fm__break").disabled = cardState !== "ready" && cardState !== "recovered";
      card.querySelector(".fm__reset").disabled = !active;
      card.querySelector(".fm__watch").hidden = !active && cardState !== "recovered";
      const label = card.querySelector(".fm__output-label");
      if (label) label.textContent = cardState === "recovered" ? "After reset" : "What the app printed";
    }
  }

  /* Steps in order, as a failure mode's trigger or reset lists them. `start`
     and `stop` return at once; `run` starts a step and waits for it to finish,
     for a step the next one depends on, like deleting terraform's state
     before an apply that should then fail. */
  async function runSteps(scenario, steps) {
    for (const step of steps || []) {
      const [verb, actionId] = Object.entries(step)[0];
      if (verb === "stop") {
        await API.stopAction(scenario.id, actionId);
        continue;
      }
      // A step already running is left alone, so a failure mode can make
      // sure something is up (like the processor's router) without failing
      // when it already is.
      const { runs } = await API.runs();
      const current = (runs || []).find((r) => r.key === `${scenario.id}:${actionId}`);
      if (current?.state !== "running") await API.startAction(scenario.id, actionId);
      if (verb === "run") await waitForStep(scenario.id, actionId);
    }
  }

  async function waitForStep(scenarioId, actionId, timeoutMs = 180000) {
    const key = `${scenarioId}:${actionId}`;
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 1000));
      const { runs } = await API.runs();
      const run = (runs || []).find((r) => r.key === key);
      if (run && run.state !== "running") return run;
    }
    throw new Error(`Timed out waiting for ${actionId} to finish`);
  }

  function markDiagramNode(nodeId, broken) {
    for (const n of document.querySelectorAll(".dg-node.is-faulted")) n.classList.remove("is-faulted");
    if (broken && nodeId) {
      document.querySelector(`.dg-node[data-node="${nodeId}"]`)?.classList.add("is-faulted");
    }
  }

  function closeFailureSocket() {
    if (state.failureSocket) {
      state.failureSocket.close();
      state.failureSocket = null;
    }
  }

  // Stream the step whose output tells this failure's story into its card.
  function streamFailureLog(scenario, mode) {
    closeFailureSocket();
    const pre = document.querySelector(`#fm-${mode.id} .fm__log`);
    if (!pre || !mode.logs) return;
    pre.textContent = "";
    const append = (line) => {
      const atBottom = pre.scrollHeight - pre.scrollTop - pre.clientHeight < 40;
      pre.append(h("div", { class: `line--${line.stream}`, text: line.text }));
      if (atBottom) pre.scrollTop = pre.scrollHeight;
    };
    state.failureSocket = API.streamRun(scenario.id, mode.logs, {
      onHistory: (lines) => { pre.textContent = ""; lines.forEach(append); },
      onLine: append,
    });
  }

  async function breakScenario(scenario, mode) {
    state.recovered = null;
    state.failure = { scenarioId: scenario.id, modeId: mode.id };
    paintFailureModes(true);
    markDiagramNode(mode.node, true);
    try {
      await runSteps(scenario, mode.trigger);
      streamFailureLog(scenario, mode);
      // The card grows to full width and may move, so keep it on screen.
      document.getElementById(`fm-${mode.id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      // An open panel for the marked node should switch to the failure's log.
      if (state.panel?.nodeId === mode.node) renderPanel();
    } catch (err) {
      toast(err.message, true);
    }
  }

  async function resetFailure(scenario, mode) {
    try {
      await runSteps(scenario, mode.reset);
      toast(`${mode.title}: reset`);
    } catch (err) {
      toast(err.message, true);
    }
    state.failure = null;
    state.recovered = { scenarioId: scenario.id, modeId: mode.id };
    markDiagramNode(null, false);
    paintFailureModes(true);
    // Reattach to the log, which now belongs to the app's new run.
    streamFailureLog(scenario, mode);
    if (state.panel?.nodeId === mode.node) renderPanel();
  }

  /* -------------------------------------------------------------- inspect */

  /* Each view is a shade, closed until opened, so the part reads as a list
     of what is on the broker rather than a wall of tables. The summary still
     says how many objects there are, so a closed shade is not empty of
     information. Which shades are open is remembered across refreshes. */
  function makeInspectView(scenarioId, view) {
    const key = `${scenarioId}:${view.label}`;
    const count = view.error
      ? "unavailable"
      : view.rows.length
      ? `${view.rows.length} on the broker`
      : "none yet";

    let body;
    if (view.error) {
      body = h("div", { class: "empty", text: view.error });
    } else if (!view.rows.length) {
      body = h("div", { class: "empty", text: "Nothing here yet. Apply the configuration to populate it." });
    } else {
      /* A scenario may declare which columns matter; fall back to whatever
         keys the first row happens to have so a new inspect view still renders. */
      const columns = view.columns.length ? view.columns : Object.keys(view.rows[0]);
      body = h(
        "div",
        { class: "table-wrap" },
        h(
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
        )
      );
    }

    const shade = h(
      "details",
      { class: "shade", open: state.openInspect.has(key) },
      h(
        "summary",
        { class: "inspect__head shade__summary" },
        h("span", { class: "shade__chev", "aria-hidden": "true" }),
        h("h4", { text: view.label }),
        h("span", { class: "inspect__hint", text: count }),
        view.uiHint && h("span", { class: "inspect__hint inspect__where", text: view.uiHint })
      ),
      h("div", { class: "shade__body" }, body)
    );
    shade.addEventListener("toggle", () => {
      if (shade.open) state.openInspect.add(key);
      else state.openInspect.delete(key);
    });
    return shade;
  }

  async function refreshInspect(scenarioId) {
    const host = document.getElementById("inspect-host");
    if (!host) return;
    try {
      const { views } = await API.inspect(scenarioId);
      host.replaceChildren(...views.map((v) => makeInspectView(scenarioId, v)));
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

    /* The page reads top to bottom in the order a scenario is worked through:
       run it, step through it, break it, then look at what is on the broker.
       Numbering the parts makes that order visible rather than implied. */
    const parts = [];
    const part = (title, hint, extra, ...content) => {
      const n = String(parts.length + 1).padStart(2, "0");
      parts.push(
        h(
          "section",
          { class: "part" },
          h(
            "div",
            { class: "part__head" },
            h("span", { class: "part__num", text: n }),
            h("div", { class: "part__titles" },
              h("h2", { class: "part__title", text: title }),
              hint && h("p", { class: "part__hint", text: hint })),
            extra
          ),
          ...content
        )
      );
    };

    part(
      "Run it",
      "Press Play to bring the scenario up. The diagram shows what is running and where events go.",
      null,
      transport, stage, stats
    );

    part(
      "Step through it",
      "Every step Play and Cleanup run, one at a time. Click a step to run it on its own or read its logs.",
      h("button", {
        class: "btn btn--ghost btn--sm",
        text: "Reset this scenario",
        onClick: () => resetScenario(scenario),
      }),
      makeActionFlow(scenario)
    );

    if ((scenario.failureModes || []).length) {
      part(
        "Break it",
        "With the scenario running, cause one failure on purpose, watch what the broker does, then reset and try another.",
        null,
        makeFailureModes(scenario)
      );
    }

    part(
      "On the broker",
      "What the broker holds right now, read over SEMP.",
      h("button", {
        class: "btn btn--secondary btn--sm",
        text: "Refresh",
        onClick: () => refreshInspect(scenario.id),
      }),
      h("div", { id: "inspect-host", class: "shade-list" }, h("div", { class: "empty", text: "Loading…" }))
    );

    el.view.replaceChildren(header, ...parts);

    /* A failure left in effect is still in effect on the broker, so coming
       back to the scenario shows it broken again rather than a fresh card. */
    const broken = (scenario.failureModes || []).find((m) => failureActive(scenario, m));
    if (broken) {
      markDiagramNode(broken.node, true);
      streamFailureLog(scenario, broken);
    }

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
    /* While a failure mode marks this node, its logs are the failure's, not
       the node's own app: a refused subscription happens in a separate
       process, and the healthy subscriber's log would show nothing wrong. */
    const failing = (scenario.failureModes || []).find(
      (m) => m.node === nodeId && m.logs && failureActive(scenario, m)
    );
    const logAction = failing
      ? scenario.actions.find((a) => a.id === failing.logs) || action
      : action;

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
      logAction && tabBtn("logs", "Logs")
    );

    const body = h("div", { class: "panel__body", id: "panel-body" });
    host.replaceChildren(head, tabs, body);

    if (tab === "logs" && logAction) {
      renderPanelLogs(scenario, logAction, body, failing);
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

  function renderPanelLogs(scenario, action, body, failing) {
    const pre = h("pre", { class: "panel__log" });
    body.replaceChildren(
      failing &&
        h("p", {
          class: "panel__notice",
          text: `"${failing.title}" is in effect, so this shows the output of "${action.label}". Reset it to see this node's own log again.`,
        }),
      pre
    );

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
    closeFailureSocket();
    state.recovered = null;
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

    /* Wipes every scenario's configuration so the next Play starts from an
       empty broker. Asks first, because queued messages go with the queues. */
    el.clearBroker.addEventListener("click", async () => {
      const ok = window.confirm(
        "Clear broker config?\n\nThis stops everything that is running, then deletes every " +
          "queue, client profile, ACL profile and client username the workshop scenarios " +
          "create, along with any messages waiting on those queues. Broker defaults and " +
          "anything you created yourself are left alone.\n\nPress Play on a scenario to set " +
          "it up again."
      );
      if (!ok) return;
      el.clearBroker.disabled = true;
      try {
        const { deleted, failed } = await API.clearBroker();
        state.failure = null;
        state.recovered = null;
        toast(
          failed.length
            ? `Cleared ${deleted} object(s); ${failed.length} could not be deleted: ${failed[0]}`
            : `Cleared ${deleted} object(s) from the broker`,
          failed.length > 0
        );
        await load();
        refreshStats();
      } catch (err) {
        toast(err.message, true);
      } finally {
        el.clearBroker.disabled = false;
      }
    });

    window.addEventListener("hashchange", () => {
      const id = location.hash.slice(1);
      if (id && id !== state.activeId) select(id);
    });
  }

  init().catch((err) => {
    el.view.replaceChildren(h("div", { class: "empty", text: `The dashboard failed to start: ${err.message}` }));
  });
})();
