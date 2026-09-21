/* Scenario diagram renderer.

   Turns the `diagram:` block in a scenario.yaml into an animated SVG that shows
   what the scenario does. It is representative, not live: packets loop on a
   timer rather than tracking real broker traffic, so the picture reads the same
   before anyone presses Run as it does afterwards.

   Scenarios declare nodes and flows; layout is computed here so every scenario
   looks like it belongs to the same workshop.
*/

const Diagram = (() => {
  const SVG_NS = "http://www.w3.org/2000/svg";

  /* Geometry. Columns are laid out left to right, nodes stacked within a
     column, which suits the publisher -> broker -> subscribers shape that most
     messaging scenarios take. */
  const NODE_W = 150;
  const NODE_H = 76;
  const COL_GAP = 116;
  const ROW_GAP = 26;
  const PAD_X = 18;
  const PAD_Y = 22;

  function el(name, attrs = {}, ...children) {
    const node = document.createElementNS(SVG_NS, name);
    for (const [k, v] of Object.entries(attrs)) {
      if (v === null || v === undefined || v === false) continue;
      node.setAttribute(k, String(v));
    }
    for (const c of children.flat()) {
      if (c === null || c === undefined || c === false) continue;
      node.append(c instanceof Node ? c : document.createTextNode(String(c)));
    }
    return node;
  }

  /* Place every node on a grid: x from its column, y from its position within
     that column, with each column centred vertically against the tallest one so
     a single broker sits level with three subscribers rather than at the top. */
  function layout(nodes) {
    const columns = new Map();
    for (const n of nodes) {
      const col = Number(n.col ?? 0);
      if (!columns.has(col)) columns.set(col, []);
      columns.get(col).push(n);
    }

    const colIndexes = [...columns.keys()].sort((a, b) => a - b);
    const tallest = Math.max(...colIndexes.map((c) => columns.get(c).length));
    const canvasH = PAD_Y * 2 + tallest * NODE_H + (tallest - 1) * ROW_GAP;

    const placed = new Map();
    colIndexes.forEach((col, i) => {
      const members = columns.get(col);
      const blockH = members.length * NODE_H + (members.length - 1) * ROW_GAP;
      const top = (canvasH - blockH) / 2;
      members.forEach((n, row) => {
        placed.set(n.id, {
          ...n,
          x: PAD_X + i * (NODE_W + COL_GAP),
          y: top + row * (NODE_H + ROW_GAP),
          w: NODE_W,
          h: NODE_H,
        });
      });
    });

    const canvasW = PAD_X * 2 + colIndexes.length * NODE_W
      + (colIndexes.length - 1) * COL_GAP;
    return { placed, canvasW, canvasH };
  }

  function drawNode(n, handlers) {
    /* The broker is the one element drawn in Classic Green: it is the subject of
       the workshop, and colouring everything would flatten that. */
    const isBroker = n.kind === "broker";
    /* Anything with something to say is clickable: an action to toggle, or a
       checklist worth reading. A config node has no process but its list of
       what does and does not exist is the most useful thing on the page. */
    const hasChecklist = Boolean(
      (n.requires && n.requires.length) || (n.provides && n.provides.length)
    );
    const clickable = Boolean(n.action) || isBroker || hasChecklist;

    const g = el("g", {
      class: `dg-node dg-node--${n.kind || "app"}${clickable ? " is-clickable" : ""}`,
      "data-node": n.id,
    });
    if (isBroker) g.classList.add("is-broker");

    g.append(el("rect", {
      x: n.x, y: n.y, width: n.w, height: n.h,
      rx: 10, class: "dg-node__box",
    }));

    /* Status ring: a small dot rather than a border change, so a node's state
       is readable without competing with the broker's green fill. */
    g.append(el("circle", {
      cx: n.x + 14, cy: n.y + 15, r: 4.5, class: "dg-node__dot",
    }));

    const cx = n.x + n.w / 2;
    g.append(el("text", {
      x: cx, y: n.y + 32, class: "dg-node__label", "text-anchor": "middle",
    }, n.label));

    if (n.sublabel) {
      g.append(el("text", {
        x: cx, y: n.y + 48, class: "dg-node__sub", "text-anchor": "middle",
      }, n.sublabel));
    }

    /* Bottom row: how much of this node's config exists, and a way into its
       logs. Both are per-node so nothing has to live further down the page. */
    g.append(el("text", {
      x: n.x + 12, y: n.y + n.h - 10,
      class: "dg-node__check", "text-anchor": "start",
    }, ""));

    if (n.action) {
      const btn = el("g", { class: "dg-node__logbtn", "data-log": n.id,
        role: "button", tabindex: "0" });
      btn.append(el("rect", {
        x: n.x + n.w - 42, y: n.y + n.h - 22, width: 32, height: 16,
        rx: 8, class: "dg-node__logbtn-box",
      }));
      btn.append(el("text", {
        x: n.x + n.w - 26, y: n.y + n.h - 10,
        class: "dg-node__logbtn-text", "text-anchor": "middle",
      }, "logs"));
      btn.addEventListener("click", (e) => {
        // Never let the log button also trigger the node's start/stop.
        e.stopPropagation();
        handlers.onLogs?.(n.id);
      });
      g.append(btn);
    }

    if (clickable) {
      g.addEventListener("click", () => handlers.onSelect?.(n.id));
      g.setAttribute("role", "button");
      g.setAttribute("tabindex", "0");
      g.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handlers.onSelect?.(n.id);
        }
      });
    }

    return g;
  }

  /* A flow is drawn as a path from the right edge of one node to the left edge
     of another, with a packet animated along it. Curved rather than straight so
     fan-out from one broker to three subscribers stays readable. */
  function flowPath(from, to) {
    const x1 = from.x + from.w;
    const y1 = from.y + from.h / 2;
    const x2 = to.x;
    const y2 = to.y + to.h / 2;
    const dx = Math.max(28, (x2 - x1) / 2);
    return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
  }

  function render(host, diagram, handlers = {}) {
    host.replaceChildren();
    const nodes = diagram.nodes || [];
    const flows = diagram.flows || [];
    if (!nodes.length) return;

    const { placed, canvasW, canvasH } = layout(nodes);

    const svg = el("svg", {
      viewBox: `0 0 ${canvasW} ${canvasH}`,
      class: "dg",
      role: "img",
      "aria-label": diagram.caption || "Scenario data flow",
      preserveAspectRatio: "xMidYMid meet",
    });

    const defs = el("defs");
    defs.append(el("marker", {
      id: "dg-arrow", viewBox: "0 0 10 10", refX: "9", refY: "5",
      markerWidth: "5", markerHeight: "5", orient: "auto-start-reverse",
    }, el("path", { d: "M 0 0 L 10 5 L 0 10 z", class: "dg-arrowhead" })));
    svg.append(defs);

    const edges = el("g", { class: "dg-edges" });
    const packets = el("g", { class: "dg-packets" });
    const reduceMotion = window.matchMedia
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    flows.forEach((f, i) => {
      const from = placed.get(f.from);
      const to = placed.get(f.to);
      // A flow naming a node that does not exist is a typo in the scenario, not
      // something to crash the page over; skip it and draw the rest.
      if (!from || !to) return;

      const d = flowPath(from, to);
      const pathId = `dg-flow-${i}`;

      edges.append(el("path", {
        id: pathId, d, class: "dg-edge", "marker-end": "url(#dg-arrow)",
      }));

      if (f.label) {
        /* Set flat rather than along the path: a textPath rotates with the
           curve, and on a steep fan-out the labels end up near-vertical and
           unreadable.

           Position is sampled from the curve itself at a point that varies with
           how far the flow rises or falls, which spreads a fan-out's labels
           along their own paths instead of stacking them at one x. */
        /* Anchor the label to the destination end of the curve. A fan-out's
           paths all leave the broker from the same point but arrive at well
           separated ones, so labelling near the arrival keeps them apart;
           a level flow has no such crowding and reads best labelled midway. */
        const rise = Math.abs((to.y + to.h / 2) - (from.y + from.h / 2));
        const at = rise < 4 ? 0.5 : 0.78;

        // Path geometry is measurable without being in the document, so this
        // works while the svg is still being assembled.
        const probe = el("path", { d });
        const pt = probe.getPointAtLength(probe.getTotalLength() * at);

        edges.append(el("text", {
          x: pt.x, y: pt.y - 9, class: "dg-edge__label", "text-anchor": "middle",
        }, f.label));
      }

      /* The moving part. Each flow's packet is offset in time so a fan-out
         reads as one message being copied outward rather than three unrelated
         dots, and `dur` is uniform so speed stays consistent across scenarios. */
      const packet = el("circle", { r: 5, class: "dg-packet" });

      /* SMIL animation is not controlled by CSS, so honouring reduced motion
         means not creating the animation at all. The packet is parked midway
         along its path instead, which keeps the picture readable. */
      if (reduceMotion) {
        const probe = el("path", { d });
        const rest = probe.getPointAtLength(probe.getTotalLength() * 0.5);
        packet.setAttribute("cx", rest.x);
        packet.setAttribute("cy", rest.y);
        packets.append(packet);
        return;
      }

      packet.append(el("animateMotion", {
        dur: `${diagram.duration || 2.4}s`,
        repeatCount: "indefinite",
        begin: `${(f.delay ?? i * 0.35)}s`,
        path: d,
        keyPoints: "0;1",
        keyTimes: "0;1",
        calcMode: "linear",
      }));
      packets.append(packet);
    });

    const nodeLayer = el("g", { class: "dg-nodes" });
    for (const n of placed.values()) nodeLayer.append(drawNode(n, handlers));

    // Edges beneath nodes, packets above, so a packet passing a box is visible
    // but a line never crosses a label.
    svg.append(edges, nodeLayer, packets);

    const figure = document.createElement("figure");
    figure.className = "dg-figure";
    figure.append(svg);
    if (diagram.caption) {
      const cap = document.createElement("figcaption");
      cap.className = "dg-caption";
      cap.textContent = diagram.caption;
      figure.append(cap);
    }
    host.append(figure);
  }

  /* Apply live state to an already-rendered diagram.

     Called on every poll, so it only ever updates attributes -- re-rendering
     would restart the SMIL animations and make the packets stutter. */
  function paint(host, diagram, state) {
    const svg = host.querySelector(".dg");
    if (!svg || !state) return;

    for (const node of svg.querySelectorAll(".dg-node")) {
      const id = node.dataset.node;
      const s = state.nodes?.[id];
      if (!s) continue;

      const run = s.run;
      const status = s.running
        ? "running"
        : run && run.state === "failed"
        ? "failed"
        : run && run.state === "succeeded"
        ? "done"
        : s.ready === false
        ? "missing"
        : "idle";
      node.setAttribute("data-status", status);

      // "3/5" reads faster than a list, and the panel has the detail.
      const check = node.querySelector(".dg-node__check");
      if (check) {
        const list = s.checklist || [];
        const present = list.filter((c) => c.present).length;
        check.textContent = list.length ? `${present}/${list.length}` : "";
        check.setAttribute("data-complete", String(list.length > 0 && present === list.length));
      }
    }

    /* Packets move only while the node named by `liveWhen` is running, so a
       stopped publisher cannot leave the diagram implying traffic. */
    const gate = diagram.liveWhen;
    const flowing = !gate || Boolean(state.nodes?.[gate]?.running);
    svg.classList.toggle("is-idle", !flowing);
  }

  return { render, paint };
})();
