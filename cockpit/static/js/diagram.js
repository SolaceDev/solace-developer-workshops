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
  const COL_GAP = 136;
  const ROW_GAP = 26;
  const PAD_X = 18;
  const PAD_Y = 22;

  /* A node may contain configuration objects rather than point at them.
     Drawing a queue as a box inside the broker says "this lives on the
     broker" structurally, where an arrow to a box outside it says "messages
     travel here" -- which is wrong for something that was merely created. */
  const CHILD_H = 26;
  const CHILD_GAP = 6;
  const CHILD_INSET = 12;
  // Space above the first child: status dot, label and sublabel.
  const CHILD_TOP = 60;
  /* Bottom strip left clear below the last child, for the node's own count
     and its logs button. Without it the last box sits underneath both. */
  const CHILD_BOTTOM = 28;
  /* A node holding configuration needs more width than a plain one: each
     child carries a label and a count on the same line. */
  const NODE_W_WIDE = 210;

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
  // How tall one node needs to be, given whatever it contains.
  /* A processor consumes and publishes, and is drawn as a hexagon standing on
     a point: events arrive at the top point and the new events it publishes
     leave from the bottom one, so a chain of processors reads as work falling
     through the pipeline even though every hop goes back through the broker.
     A hexagon rather than a cylinder, which would read as a database. */
  const isProcessor = (n) => n.shape === "processor";
  // Height of the hexagon's top and bottom points above and below its sides.
  const HEX_POINT = 18;
  /* Space between two nodes in a column when either is a processor: room for
     one flow leaving a bottom and the next arriving at a top. */
  const PROC_GAP = 64;

  function rowGap(a, b) {
    return isProcessor(a) || isProcessor(b) ? PROC_GAP : ROW_GAP;
  }

  function nodeHeight(n) {
    // A point above and below the usual box, so the text keeps its room.
    if (isProcessor(n)) return NODE_H + HEX_POINT * 2;
    const kids = n.contains?.length ?? 0;
    if (!kids) return NODE_H;
    return CHILD_TOP + kids * CHILD_H + (kids - 1) * CHILD_GAP + CHILD_BOTTOM;
  }

  /* A node holding configuration grows to fit its longest child label, so a
     queue name like q.shock.scans.partitioned never runs into its count.
     Child labels are 10px monospace, about 6.2px a character; the constant
     covers the insets, the label's padding and the count beside it. */
  const CHILD_CHAR_W = 6.2;
  const CHILD_CHROME_W = 76;

  function nodeWidth(n) {
    if (!n.contains?.length) return NODE_W;
    const longest = Math.max(...n.contains.map((c) => (c.label || "").length));
    return Math.max(NODE_W_WIDE, Math.ceil(CHILD_CHROME_W + longest * CHILD_CHAR_W));
  }

  function layout(nodes) {
    const columns = new Map();
    for (const n of nodes) {
      const col = Number(n.col ?? 0);
      if (!columns.has(col)) columns.set(col, []);
      columns.get(col).push(n);
    }

    const colIndexes = [...columns.keys()].sort((a, b) => a - b);

    /* Column height is the sum of its nodes' own heights, not a count times a
       constant, because a node holding configuration is taller than one that
       does not. */
    const colHeight = (c) => {
      const m = columns.get(c);
      return m.reduce((t, n, i) => t + nodeHeight(n) + (i ? rowGap(m[i - 1], n) : 0), 0);
    };
    /* Flows enter a processor from above and leave below, so a diagram with
       one needs room over its top node and under its bottom one. */
    const hasProcessor = nodes.some(isProcessor);
    const padY = PAD_Y + (hasProcessor ? PROC_HEADROOM : 0);
    const canvasH = padY * 2 + Math.max(...colIndexes.map(colHeight));

    /* Column width is set by its widest member, so a column containing the
       broker and its configuration is wider than one holding subscribers,
       and every node in a column still lines up on the left. */
    const colWidth = (c) => Math.max(...columns.get(c).map(nodeWidth));

    // Left edge of each column, accumulated so widths can differ.
    const colX = new Map();
    let x = PAD_X;
    colIndexes.forEach((col) => {
      colX.set(col, x);
      x += colWidth(col) + COL_GAP;
    });

    const placed = new Map();
    colIndexes.forEach((col) => {
      const members = columns.get(col);
      const top = (canvasH - colHeight(col)) / 2;
      let y = top;
      members.forEach((n, i) => {
        if (i) y += rowGap(members[i - 1], n);
        const h = nodeHeight(n);
        const w = nodeWidth(n);
        placed.set(n.id, {
          ...n,
          // Centre a narrow node within a wide column so a column of mixed
          // widths reads as a column rather than a ragged edge.
          x: colX.get(col) + (colWidth(col) - w) / 2,
          y,
          w,
          h,
        });
        y += h;
      });
    });

    /* With processors, the broker runs the full height of the diagram. Each
       flow to or from a processor travels along the gap above or below it,
       and a broker that spans every gap can take each one head on. */
    if (hasProcessor) {
      for (const n of placed.values()) {
        if (n.kind !== "broker") continue;
        n.y = PAD_Y;
        n.h = Math.max(n.h, canvasH - PAD_Y * 2);
      }
    }

    const canvasW = x - COL_GAP + PAD_X;
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

    // Content sits below a hexagon's top point, so everything shifts down by it.
    const shift = isProcessor(n) ? HEX_POINT : 0;

    if (isProcessor(n)) {
      const { x, y, w, h } = n;
      const cx = x + w / 2;
      g.append(el("path", {
        class: "dg-node__box",
        d: `M ${cx} ${y} L ${x + w} ${y + HEX_POINT} L ${x + w} ${y + h - HEX_POINT} ` +
           `L ${cx} ${y + h} L ${x} ${y + h - HEX_POINT} L ${x} ${y + HEX_POINT} Z`,
        "stroke-linejoin": "round",
      }));
    } else {
      g.append(el("rect", {
        x: n.x, y: n.y, width: n.w, height: n.h,
        rx: 10, class: "dg-node__box",
      }));
    }

    /* Status ring: a small dot rather than a border change, so a node's state
       is readable without competing with the broker's green fill. */
    g.append(el("circle", {
      cx: n.x + 14, cy: n.y + 15 + shift, r: 4.5, class: "dg-node__dot",
    }));

    const cx = n.x + n.w / 2;
    g.append(el("text", {
      x: cx, y: n.y + 32 + shift, class: "dg-node__label", "text-anchor": "middle",
    }, n.label));

    if (n.sublabel) {
      g.append(el("text", {
        x: cx, y: n.y + 48 + shift, class: "dg-node__sub", "text-anchor": "middle",
      }, n.sublabel));
    }

    /* Configuration this node holds, drawn as dotted boxes inside it. Nesting
       is the whole point: an object on the broker is part of the broker, not
       a separate destination something is sent to. */
    (n.contains || []).forEach((child, i) => {
      const cyTop = n.y + CHILD_TOP + i * (CHILD_H + CHILD_GAP);
      const kid = el("g", { class: "dg-node__child", "data-child": child.id || "" });

      kid.append(el("rect", {
        x: n.x + CHILD_INSET, y: cyTop,
        width: n.w - CHILD_INSET * 2, height: CHILD_H,
        rx: 5, class: "dg-node__child-box",
      }));
      kid.append(el("text", {
        x: n.x + CHILD_INSET + 8, y: cyTop + 17,
        class: "dg-node__child-label", "text-anchor": "start",
      }, child.label));

      /* The count is filled in from SEMP on each poll, like the node-level
         check, so a box reads as present or missing rather than assumed. */
      kid.append(el("text", {
        x: n.x + n.w - CHILD_INSET - 8, y: cyTop + 17,
        class: "dg-node__child-count", "text-anchor": "end",
        "data-child-count": child.id || "",
      }, ""));

      g.append(kid);
    });

    /* Bottom row: how much of this node's config exists, and a way into its
       logs. Both are per-node so nothing has to live further down the page. */
    // A hexagon narrows to its bottom point, so its bottom row sits higher.
    const base = isProcessor(n) ? HEX_POINT : 0;
    g.append(el("text", {
      x: n.x + 12, y: n.y + n.h - 10 - base,
      class: "dg-node__check", "text-anchor": "start",
    }, ""));

    if (n.action) {
      const btn = el("g", { class: "dg-node__logbtn", "data-log": n.id,
        role: "button", tabindex: "0" });
      btn.append(el("rect", {
        x: n.x + n.w - 42, y: n.y + n.h - 22 - base, width: 32, height: 16,
        rx: 8, class: "dg-node__logbtn-box",
      }));
      btn.append(el("text", {
        x: n.x + n.w - 26, y: n.y + n.h - 10 - base,
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

  /* A flow is drawn as a path between two nodes, with a packet animated along
     it. Curved rather than straight so fan-out from one broker to three
     subscribers stays readable.

     Most flows run left to right, from one node's right edge to the next
     one's left. A flow back to a node on the left is an app publishing to the
     broker it also consumes from, so it leaves the app's left edge and lands
     on the broker's right edge. A processor is the exception: flows arrive at
     its top and leave from its bottom. */
  const isBack = (from, to) => to.x + to.w <= from.x;

  /* Which edge of `node` a flow uses, and its outward direction, which the
     curve follows so a line always leaves and enters square to its edge. */
  function sideOf(node, other) {
    const otherIsLeft = other.x + other.w <= node.x;
    return otherIsLeft ? { side: "L", nx: -1, ny: 0 } : { side: "R", nx: 1, ny: 0 };
  }

  function flowPath(p1, p2) {
    const k = Math.max(28, Math.abs(p2.x - p1.x) / 2);
    return `M ${p1.x} ${p1.y} C ${p1.x + p1.nx * k} ${p1.y}, ` +
      `${p2.x + p2.nx * k} ${p2.y}, ${p2.x} ${p2.y}`;
  }

  /* Flows to and from a processor are routed square rather than curved: along
     the gap above it and down onto its top point, or out of its bottom point
     and along the gap below it. Stacked processors then read as one stream falling from
     each into the next, with the broker between every hop. */
  // Distance of the lane above or below a processor from its edge.
  const PROC_LANE = 22;
  // Radius of the rounded corner where a lane turns into a processor.
  const PROC_CORNER = 10;
  // Room above the top processor and below the bottom one for their lanes.
  const PROC_HEADROOM = 36;

  function processorPath(from, to) {
    const r = PROC_CORNER;
    if (isProcessor(to)) {
      const x1 = from.x + from.w;
      const cx = to.x + to.w / 2;
      const lane = to.y - PROC_LANE;
      return {
        d: `M ${x1} ${lane} H ${cx - r} Q ${cx} ${lane} ${cx} ${lane + r} V ${to.y}`,
        label: { x: (x1 + cx) / 2, y: lane - 6 },
      };
    }
    const cx = from.x + from.w / 2;
    const base = from.y + from.h;
    const lane = base + PROC_LANE;
    const x2 = to.x + to.w;
    return {
      d: `M ${cx} ${base} V ${lane - r} Q ${cx} ${lane} ${cx - r} ${lane} H ${x2}`,
      label: { x: (cx + x2) / 2, y: lane - 6 },
    };
  }

  // Spacing between connection points on one edge of a node.
  const PORT_GAP = 14;

  /* Where each flow meets each node. Every edge of a node spreads its flows
     over separate points, ordered by where the other end sits, so a broker
     consuming to four apps and hearing back from two of them shows six
     distinct lines rather than one knot. Repeated flows between the same two
     nodes in the same direction (a burst drawn as three packets) share a
     point, because they are the same line. Returns [start, end] per flow,
     each a point with its outward direction. */
  function assignPorts(flows, placed) {
    const sides = new Map();
    const attach = (node, other, leaving, i) => {
      const { side, nx, ny } = sideOf(node, other);
      const key = `${node.id}:${side}`;
      if (!sides.has(key)) sides.set(key, { node, side, nx, ny, lanes: new Map() });
      const lanes = sides.get(key).lanes;
      const lane = `${other.id}${leaving ? ">" : "<"}`;
      if (!lanes.has(lane)) {
        lanes.set(lane, {
          otherY: other.y + other.h / 2,
          back: leaving ? isBack(node, other) : isBack(other, node),
          uses: [],
        });
      }
      lanes.get(lane).uses.push([i, leaving ? 0 : 1]);
    };

    flows.forEach((f, i) => {
      const from = placed.get(f.from);
      const to = placed.get(f.to);
      // Processor flows run along their own lanes; see processorPath.
      if (!from || !to || isProcessor(from) || isProcessor(to)) return;
      attach(from, to, true, i);
      attach(to, from, false, i);
    });

    const ends = flows.map(() => [null, null]);
    for (const { node, side, nx, ny, lanes } of sides.values()) {
      // Down the edge by the far end, and on a tie the outbound lane above its
      // return so a consume and the publish back never cross each other.
      const ordered = [...lanes.values()].sort(
        (a, b) => a.otherY - b.otherY || Number(a.back) - Number(b.back)
      );
      const span = Math.min(node.h - 24, (ordered.length - 1) * PORT_GAP);
      const step = ordered.length > 1 ? span / (ordered.length - 1) : 0;
      // Centred on the far ends rather than on this node, so a tall broker
      // meets a short app level with it instead of from far above or below.
      const aim = ordered.reduce((t, l) => t + l.otherY, 0) / ordered.length;
      const centre = Math.min(Math.max(aim, node.y + 12 + span / 2), node.y + node.h - 12 - span / 2);
      ordered.forEach((lane, k) => {
        const point = { x: side === "L" ? node.x : node.x + node.w, y: centre - span / 2 + k * step };
        for (const [i, end] of lane.uses) ends[i][end] = { ...point, nx, ny };
      });
    }
    return ends;
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

    const ports = assignPorts(flows, placed);

    flows.forEach((f, i) => {
      const from = placed.get(f.from);
      const to = placed.get(f.to);
      // A flow naming a node that does not exist is a typo in the scenario, not
      // something to crash the page over; skip it and draw the rest.
      if (!from || !to) return;

      const back = isBack(from, to);
      const routed = isProcessor(from) || isProcessor(to) ? processorPath(from, to) : null;
      const d = routed ? routed.d : flowPath(...ports[i]);
      const pathId = `dg-flow-${i}`;

      edges.append(el("path", {
        id: pathId, d, class: "dg-edge", "marker-end": "url(#dg-arrow)",
      }));

      if (f.label && routed) {
        // A processor lane is level, so its label sits flat along it.
        edges.append(el("text", {
          x: routed.label.x, y: routed.label.y, class: "dg-edge__label", "text-anchor": "middle",
        }, f.label));
      } else if (f.label) {
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
        const rise = Math.abs(ports[i][1].y - ports[i][0].y);
        /* A flow back to the broker is labelled near the app that sends it,
           and below its line: the app end is where it is distinct from the
           other flows arriving at the broker, and below keeps it clear of the
           label on the consume running the other way above it. */
        const at = rise < 4 ? 0.5 : back ? 0.35 : 0.78;

        // Path geometry is measurable without being in the document, so this
        // works while the svg is still being assembled.
        const probe = el("path", { d });
        const pt = probe.getPointAtLength(probe.getTotalLength() * at);

        edges.append(el("text", {
          x: pt.x, y: back ? pt.y + 16 : pt.y - 9, class: "dg-edge__label", "text-anchor": "middle",
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

      /* Hidden until its first run starts: before `begin` an animated circle
         with no position of its own sits at the canvas origin. */
      const begin = `${f.delay ?? i * 0.35}s`;
      packet.setAttribute("visibility", "hidden");
      packet.append(el("set", { attributeName: "visibility", to: "visible", begin }));
      packet.append(el("animateMotion", {
        dur: `${diagram.duration || 2.4}s`,
        repeatCount: "indefinite",
        begin,
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
      const list = s.checklist || [];
      const check = node.querySelector(".dg-node__check");
      if (check) {
        const present = list.filter((c) => c.present).length;
        check.textContent = list.length ? `${present}/${list.length}` : "";
        check.setAttribute("data-complete", String(list.length > 0 && present === list.length));
      }

      /* Contained configuration gets its own count, so each dotted box says
         whether the objects it stands for are actually on the broker. A child
         claims the checklist entries whose group matches its id, which is how
         one node's flat checklist is split across several boxes. */
      for (const countEl of node.querySelectorAll("[data-child-count]")) {
        const childId = countEl.getAttribute("data-child-count");
        if (!childId) continue;
        const mine = list.filter((c) => c.group === childId);
        if (!mine.length) continue;
        const present = mine.filter((c) => c.present).length;
        countEl.textContent = `${present}/${mine.length}`;
        countEl.setAttribute("data-complete", String(present === mine.length));
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
