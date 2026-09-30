/* Thin wrapper over the cockpit's REST and WebSocket surface.
   Kept separate from rendering so the UI layer never builds URLs by hand. */

const API = (() => {
  async function req(path, options = {}) {
    const resp = await fetch(path, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    if (!resp.ok) {
      let detail = `${resp.status} ${resp.statusText}`;
      try {
        const body = await resp.json();
        if (body.detail) detail = body.detail;
      } catch (_) {
        /* non-JSON error body; the status line is all we have */
      }
      throw new Error(detail);
    }
    return resp.json();
  }

  return {
    env: () => req("/api/env"),
    health: () => req("/api/health"),
    overview: () => req("/api/overview"),
    scenarios: () => req("/api/scenarios"),
    runs: () => req("/api/runs"),

    startAction: (scenario, action) =>
      req(`/api/scenarios/${scenario}/actions/${action}/start`, { method: "POST" }),
    stopAction: (scenario, action) =>
      req(`/api/scenarios/${scenario}/actions/${action}/stop`, { method: "POST" }),
    inspect: (scenario) => req(`/api/scenarios/${scenario}/inspect`),
    scenarioState: (scenario) => req(`/api/scenarios/${scenario}/state`),
    runScenario: (scenario) => req(`/api/scenarios/${scenario}/run`, { method: "POST" }),
    pauseScenario: (scenario) => req(`/api/scenarios/${scenario}/pause`, { method: "POST" }),
    cleanupScenario: (scenario) => req(`/api/scenarios/${scenario}/cleanup`, { method: "POST" }),
    reset: (scenario) => req(`/api/scenarios/${scenario}/reset`, { method: "POST" }),
    stopAll: () => req("/api/runs/stop-all", { method: "POST" }),
    clearBroker: () => req("/api/broker/clear", { method: "POST" }),

    /* Opens a log stream for one action. Returns the socket so the caller can
       close it when the user navigates away -- leaking sockets across a long
       workshop session is the kind of thing nobody notices until it breaks. */
    streamRun(scenario, action, handlers) {
      const proto = location.protocol === "https:" ? "wss:" : "ws:";
      const ws = new WebSocket(`${proto}//${location.host}/ws/runs/${scenario}/${action}`);
      ws.addEventListener("message", (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === "history") handlers.onHistory?.(msg.lines);
        else if (msg.type === "line") handlers.onLine?.(msg.line);
        else if (msg.type === "status") handlers.onStatus?.(msg.status);
      });
      ws.addEventListener("close", () => handlers.onClose?.());
      ws.addEventListener("error", () => handlers.onClose?.());
      return ws;
    },
  };
})();
