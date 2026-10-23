// Views and map state. Switching animates every node 750ms cubic in-out to its place in
// the new view and zooms to that view's home; keyword labels fade out, turn to their new
// orientation, and fade back in. Drag with live physics only in Force.
// Label modes: auto | all | off. Line modes: all | projects | hover.
// Nodes with n.hidden set (by js/ui/filter.js) and their lines are not drawn.
import { orientKeyword, orientWork, sizeHit, neighbours, VIEWS, DEFAULT_VIEW, TILE } from "./render.js";
import { live } from "./layout-force.js";

const d3 = window.d3;
const MS = 750;
// Auto label thresholds, as zoom relative to the view's home (1 = fitted). Keyword labels
// in Edge always show (the edges are the index); work titles appear as you zoom in, by level.
const KW_K = { force: 1.45, rings: 1.25, edge: 0 };
const WORK_K = { L: 0, M: 1.2, S: 1.55 };
const META_K = 1.2; // L and M "year · subtitle"
// Lines by view when the mode is Auto: all in Force, projects in Rings, on hover in Edge.
const LINES = { force: "all", rings: "projects", edge: "hover" };
// Label counter-scale exponent: at twice the fitted zoom a label is 2^(1-LZ) its fitted size.
const LZ = 0.75;
const PRIORITY = { L: 0, M: 1, S: 2 };
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

export function createViews(graph, zoom) {
  const state = { view: DEFAULT_VIEW, labels: "auto", lines: "auto", hover: null, focus: null, moving: false };
  const homeK = {};
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
    if (view === "edge" && graph.edgeGeo) {
      const { w, h } = graph.edgeGeo;
      Object.assign(b, { x0: Math.min(b.x0, -w / 2), x1: Math.max(b.x1, w / 2), y0: Math.min(b.y0, -h / 2), y1: Math.max(b.y1, h / 2) });
    }
    return b;
  }
  const footprint = (n, view) => (n.role === "work" ? n.fpSide[n.lab[view]] : n.fp[view]);
  const home = (view = state.view) => {
    const t = zoom.home(bounds(view));
    homeK[view] = t.k;
    return t;
  };
  const rel = () => graph.k / (homeK[state.view] || graph.k || 1);

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
      sizeHit(w, w.labOn === false);
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

  // Auto labels never sit on each other or on another node's tile. Labels are placed in
  // order (hovered and connected first, then projects, Extras, smaller works, keywords);
  // one that would collide stays hidden until there is room, and a project or Extra whose
  // "year · subtitle" will not fit shows its title alone.
  function cull(want, near, lz) {
    const PAD = 2;
    const hit = (a, b) => a.x0 < b.x1 + PAD && b.x0 < a.x1 + PAD && a.y0 < b.y1 + PAD && b.y0 < a.y1 + PAD;
    const scaled = (b, ox, oy, n) => ({
      x0: n.x + ox + (b.x - ox) * lz,
      y0: n.y + oy + (b.y - oy) * lz,
      x1: n.x + ox + (b.x + b.w - ox) * lz,
      y1: n.y + oy + (b.y + b.h - oy) * lz,
    });
    const obst = [];
    for (const n of graph.nodes) {
      if (n.hidden) continue;
      if (n.role === "work") {
        const h = TILE[n.size] / 2;
        obst.push({ n, x0: n.x - h, y0: n.y - h, x1: n.x + h, y1: n.y + h });
      } else if (n.role === "kw") obst.push({ n, x0: n.x - 3, y0: n.y - 3, x1: n.x + 3, y1: n.y + 3 });
      else {
        const f = n.fp[state.view];
        obst.push({ n, x0: n.x + f.x, y0: n.y + f.y, x1: n.x + f.x + f.w, y1: n.y + f.y + f.h });
      }
    }
    const placed = [];
    const free = (b, self) => !placed.some((p) => hit(p, b)) && !obst.some((o) => o.n !== self && hit(o, b));
    const boxes = (n) => {
      if (n.role === "kw") {
        const b = n.labBox;
        if (!b) return null;
        const o = n.label.dataset.o;
        const ox = o === "e" ? b.x + b.w : o === "s" ? b.x : b.x + b.w / 2;
        const oy = o === "t" ? b.y + b.h : o === "b" ? b.y : b.y + b.h / 2;
        return { full: scaled(b, ox, oy, n) };
      }
      const { full, title } = n.lbSide[n.lab[state.view]];
      const ox = n.size !== "L" && n.side < 0 ? full.x + full.w : full.x;
      const oy = n.size === "L" ? full.y : full.y + full.h / 2;
      return { full: scaled(full, ox, oy, n), title: scaled(title, ox, oy, n) };
    };
    const order = [...graph.works.filter((w) => !w.hidden), ...graph.kws.filter((k) => !k.hidden)]
      .filter((n) => want.get(n).on)
      .sort((a, b) => (near.has(b) - near.has(a)) || rank(a) - rank(b));
    for (const n of order) {
      const v = want.get(n);
      const bx = boxes(n);
      // Rotated keyword labels (Rings) and Edge strips are laid out already.
      if (!bx || (n.role === "kw" && state.view === "edge")) {
        if (bx) placed.push(bx.full);
        continue;
      }
      if (near.has(n)) {
        placed.push(v.meta ? bx.full : bx.title ?? bx.full);
        continue;
      }
      if (v.meta && free(bx.full, n)) placed.push(bx.full);
      else if (bx.title && free(bx.title, n)) {
        v.meta = false;
        placed.push(bx.title);
      } else if (!bx.title && free(bx.full, n)) placed.push(bx.full);
      else v.on = false;
    }
  }
  const rank = (n) => (n.role === "work" ? PRIORITY[n.size] : 3);

  // Visibility of labels and lines, from the modes, zoom, hover and focus. While a node is
  // hovered or focused, everything not connected to it steps back.
  function paint() {
    const near = new Set();
    const lit = new Set();
    for (const id of [state.hover, state.focus]) {
      const n = id && graph.byId.get(id);
      if (!n || n.hidden) continue;
      near.add(n);
      for (const o of neighbours(n)) if (!o.hidden) near.add(o);
    }
    const z = rel();
    // Labels keep a steadier screen size than the map: zooming in gives them room rather
    // than just making them bigger (see .wl and .kw-label in site.css).
    const lz = z > 1 ? Math.pow(z, -LZ) : 1;
    graph.svg.style.setProperty("--lz", lz.toFixed(3));
    const kwOn = z >= KW_K[state.view] - 1e-6;
    const want = new Map();
    for (const k of graph.kws) {
      let on = state.labels === "all" || (state.labels === "auto" && (kwOn || near.has(k)));
      if (state.labels === "off") on = k.id === state.hover || k.id === state.focus;
      if (state.moving) on = false;
      want.set(k, { on, meta: false });
    }
    for (const w of graph.works) {
      const active = near.has(w);
      const on = state.labels === "all" || active || (state.labels !== "off" && z >= WORK_K[w.size] - 1e-6);
      const meta = state.labels === "all" || w.id === state.hover || w.id === state.focus || (state.labels !== "off" && z >= META_K - 1e-6);
      want.set(w, { on, meta });
    }
    if (state.labels === "auto" && !state.moving) cull(want, near, lz);
    for (const k of graph.kws) k.labG.classList.toggle("is-off", !want.get(k).on);
    for (const w of graph.works) {
      const { on, meta } = want.get(w);
      w.el.classList.toggle("lbl-off", !on);
      w.el.classList.toggle("meta-off", !meta);
      if (w.labOn !== on) {
        w.labOn = on;
        sizeHit(w, !on);
      }
    }
    const hov = state.hover && graph.byId.get(state.hover);
    const foc = state.focus && graph.byId.get(state.focus);
    const mode = state.lines === "auto" ? LINES[state.view] : state.lines;
    for (const e of graph.edges) {
      const isFocus = !!foc && (e.a === foc || e.b === foc);
      const isHover = !isFocus && !!hov && (e.a === hov || e.b === hov);
      const rest = mode === "all" || (mode === "projects" && e.project);
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
      n.el.classList.toggle("is-hover", n.id === state.hover);
      n.el.classList.toggle("is-near", near.has(n) && n.id !== state.hover && n.id !== state.focus);
    }
    graph.svg.classList.toggle("has-active", near.size > 0 && !state.moving);
    // The node in hand draws above its neighbours, so its label is never covered.
    const top = [...new Set([state.focus, state.hover])].filter((id) => id && !graph.byId.get(id)?.hidden);
    const key = top.join(" ");
    if (graph.topG.dataset.ids !== key) {
      graph.topG.dataset.ids = key;
      graph.topG.replaceChildren(...top.map((id) => {
        const u = document.createElementNS("http://www.w3.org/2000/svg", "use");
        u.setAttribute("href", `#nd-${id}`);
        return u;
      }));
    }
    graph.svg.classList.toggle("view-force", state.view === "force");
    graph.svg.dataset.lines = mode;
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

  // New positions for the current view (after a relayout for a new map area): nodes glide
  // there and the view refits.
  function settle({ animate = true } = {}) {
    physics?.stop();
    physics = null;
    const view = state.view;
    const ms = animate && !reduced.matches ? 600 : 0;
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
    orient(view);
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
          paint();
          done();
          resolve();
        });
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
    settle,
    home,
    homeK,
    rel,
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
