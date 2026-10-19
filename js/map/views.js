// Views and map state. Switching animates every node 750ms cubic in-out to its place in
// the new view and zooms to that view's home; keyword labels fade out, turn to their new
// orientation, and fade back in. Drag with live physics only in Force.
// Label modes: auto | all | off. Line modes: all | projects | hover.
// Nodes with n.hidden set (by js/ui/filter.js) and their lines are not drawn.
import { orientKeyword, orientWork, sizeHit, neighbours, VIEWS } from "./render.js";
import { live } from "./layout-force.js";

const d3 = window.d3;
const MS = 750;
const AUTO_K = { edge: 0, force: 1.25, rings: 0.95 }; // Auto shows keyword labels from this zoom
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

export function createViews(graph, zoom) {
  const state = { view: "edge", labels: "auto", lines: "projects", hover: null, focus: null, moving: false };
  const listeners = new Set();
  let physics = null;

  function bounds(view) {
    const b = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
    for (const n of graph.nodes) {
      const [x, y] = n.pos[view];
      // Rings and Force fit their marks; keyword labels there appear on zoom or hover.
      const f = view === "edge" || n.role !== "kw" ? footprint(n, view) : { x: -3, y: -3, w: 6, h: 6 };
      b.x0 = Math.min(b.x0, x + f.x);
      b.y0 = Math.min(b.y0, y + f.y);
      b.x1 = Math.max(b.x1, x + f.x + f.w);
      b.y1 = Math.max(b.y1, y + f.y + f.h);
    }
    if (view === "edge") Object.assign(b, { x0: Math.min(b.x0, -600), x1: Math.max(b.x1, 600), y0: Math.min(b.y0, -390), y1: Math.max(b.y1, 390) });
    return b;
  }
  const footprint = (n, view) => (n.role === "work" ? n.fpSide[n.lab[view]] : n.fp[view]);
  const home = (view = state.view) => zoom.home(bounds(view));

  function place() {
    for (const n of graph.nodes) n.el.setAttribute("transform", `translate(${n.x},${n.y})`);
    for (const e of graph.edges) {
      e.el.setAttribute("x1", e.a.x);
      e.el.setAttribute("y1", e.a.y);
      e.el.setAttribute("x2", e.b.x);
      e.el.setAttribute("y2", e.b.y);
    }
  }

  function orient(view) {
    for (const k of graph.kws) {
      orientKeyword(k, k.lab[view]);
      sizeHit(k);
    }
    for (const w of graph.works) {
      orientWork(w, w.lab[view]);
      sizeHit(w);
    }
    for (const g of graph.groups) {
      const p = g.pos[view];
      g.el.classList.toggle("is-off", !p);
      if (!p) continue;
      const dx = p.centred ? -g.size.w / 2 : 0;
      g.el.setAttribute("transform", `translate(${p.x},${p.y}) rotate(${p.rot}) translate(${dx},${p.centred ? 3.5 : 0})`);
    }
    for (const r of graph.rings) r.classList.toggle("is-off", view !== "rings");
  }

  // Visibility of keyword labels and lines, from the modes, zoom, hover and focus.
  function paint() {
    const near = new Set();
    const lit = new Set();
    for (const id of [state.hover, state.focus]) {
      const n = id && graph.byId.get(id);
      if (!n || n.hidden) continue;
      near.add(n);
      for (const o of neighbours(n)) if (!o.hidden) near.add(o);
    }
    const autoOn = graph.k >= AUTO_K[state.view];
    for (const k of graph.kws) {
      let on = state.labels === "all" || (state.labels === "auto" && (autoOn || near.has(k)));
      if (state.labels === "off") on = k.id === state.hover || k.id === state.focus;
      if (state.moving) on = false;
      k.labG.classList.toggle("is-off", !on);
    }
    const hov = state.hover && graph.byId.get(state.hover);
    const foc = state.focus && graph.byId.get(state.focus);
    for (const e of graph.edges) {
      const isFocus = !!foc && (e.a === foc || e.b === foc);
      const isHover = !isFocus && !!hov && (e.a === hov || e.b === hov);
      const rest = state.lines === "all" || (state.lines === "projects" && e.project);
      const gone = e.a.hidden || e.b.hidden;
      e.el.classList.toggle("is-focus", isFocus && !gone);
      e.el.classList.toggle("is-hover", isHover && !gone);
      e.el.classList.toggle("is-off", gone || !(rest || isFocus || isHover));
      if ((isFocus || isHover) && !gone) lit.add(e.el);
    }
    // Lit lines draw above the rest.
    for (const el of lit) el.parentNode.appendChild(el);
    // Hidden by the filter: no mark, no lines, out of the tab order.
    for (const n of graph.nodes) {
      n.el.classList.toggle("is-hidden", !!n.hidden);
      n.el.classList.toggle("is-focus", n.id === state.focus);
      n.el.classList.toggle("is-near", near.has(n) && n.id !== state.hover && n.id !== state.focus);
    }
    graph.svg.classList.toggle("view-force", state.view === "force");
    for (const fn of listeners) fn(state);
  }

  function setView(view, { animate = true } = {}) {
    if (!VIEWS.includes(view)) return;
    const from = state.view;
    state.view = view;
    physics?.stop();
    physics = null;
    const ms = animate && !reduced.matches && from !== view ? MS : 0;
    const start = graph.nodes.map((n) => [n.x, n.y]);
    const end = graph.nodes.map((n) => n.pos[view]);
    zoom.to(home(view), ms);
    if (!ms) {
      graph.nodes.forEach((n, i) => ([n.x, n.y] = end[i]));
      orient(view);
      place();
      paint();
      done();
      return Promise.resolve();
    }
    state.moving = true;
    graph.svg.classList.add("is-moving");
    // Works whose label changes side fade like keyword labels.
    for (const w of graph.works) w.el.classList.toggle("is-turning", w.lab[from] !== w.lab[view]);
    paint();
    return new Promise((resolve) => {
      d3.select(graph.svg)
        .transition("view")
        .duration(ms)
        .ease(d3.easeCubicInOut)
        .tween("nodes", () => (t) => {
          graph.nodes.forEach((n, i) => {
            n.x = start[i][0] + (end[i][0] - start[i][0]) * t;
            n.y = start[i][1] + (end[i][1] - start[i][1]) * t;
          });
          place();
        })
        .on("end interrupt", () => {
          graph.nodes.forEach((n, i) => ([n.x, n.y] = end[i]));
          place();
          orient(view);
          state.moving = false;
          graph.svg.classList.remove("is-moving");
          for (const w of graph.works) w.el.classList.remove("is-turning");
          paint();
          done();
          resolve();
        });
      // Labels turn while hidden: halfway is safe, they fade back in at the end.
      if (from !== view) setTimeout(() => state.view === view && state.moving && orient(view), ms / 2);
    });
  }

  function done() {
    graph.svg.dataset.view = state.view;
    if (state.view === "force" && !reduced.matches) {
      physics = live(graph, () => {
        for (const n of graph.nodes) n.pos.force = [n.x, n.y];
        place();
      });
    }
  }

  // Drag in Force only. Live physics unless reduced motion, then the node moves alone.
  const drag = d3
    .drag()
    .filter((e) => state.view === "force" && !state.moving && !e.button)
    .clickDistance(4)
    .container(() => graph.zoomG)
    .on("start", function (e, n) {
      if (n.role === "me") return;
      this.classList.add("dragging");
      physics?.start(n);
    })
    .on("drag", (e, n) => {
      if (n.role === "me") return;
      if (physics) physics.move(n, e.x, e.y);
      else {
        n.x = e.x;
        n.y = e.y;
        n.pos.force = [n.x, n.y];
        place();
      }
    })
    .on("end", function (e, n) {
      this.classList.remove("dragging");
      physics?.end(n);
    });
  d3.select(graph.nodesG).selectAll(".node").data(graph.nodes).call(drag);

  return {
    state,
    setView,
    home,
    paint,
    place,
    bounds,
    set(key, value) {
      state[key] = value;
      paint();
    },
    onChange: (fn) => listeners.add(fn),
  };
}
