// Boot: load data, draw the map, measure once fonts are ready, compute the three layouts,
// then wire zoom, views, controls and the open flow. ?relayout recomputes the Edge map
// work positions instead of reading pos.edge (scripts/layout-edge.mjs uses it).
//
// Routing. ?view=edge|force|rings picks the view and #<id> opens that node's panel.
// The open flow keeps one history entry per layer, so browser Back steps out of the page,
// then the panel, then the card:
//   map, card    /?view=...        (the card is a pushed entry on the same URL)
//   panel        /?view=...#<id>
//   page         /work/<slug>/     (the generated page, readable with JS off)
// Each entry's state is { layer, id, depth }; depth counts entries pushed above the one
// the visit started on, so closing from the interface can step back through history.
import { buildGraph, render, fit, measureKeyword, sizeHit, KW_SPEC, VIEWS } from "./map/render.js";
import { layoutEdge } from "./map/layout-edge.js";
import { layoutForce } from "./map/layout-force.js";
import { layoutRings } from "./map/layout-rings.js";
import { setupZoom } from "./map/zoom.js";
import { createViews } from "./map/views.js";
import { bindRail } from "./ui/rail.js";
import { bindLayers } from "./ui/layers.js";
import { bindShortcuts } from "./ui/shortcuts.js";
import { createFilter, bindFilterDrawer } from "./ui/filter.js";
import { bindActives } from "./ui/actives.js";
import { bindReadout } from "./ui/readout.js";
import { bindIndex } from "./ui/index.js";
import { bindKey } from "./ui/key.js";
import { bindNav } from "./ui/nav.js";
import { bindPalette } from "./ui/palette.js";
import { indexData, hasPage, pageHref, PDF } from "./open/content.js";
import { createPreview } from "./open/preview.js";
import { createCard } from "./open/grow.js";
import { createPanel, PANEL_W } from "./open/panel.js";
import { createPage } from "./open/page.js";

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
const narrow = window.matchMedia("(max-width: 719px)"); // card and panel are full-screen sheets

const FONTS = [
  "800 30px Archivo",
  "700 15px Archivo",
  "600 11px Archivo",
  "400 11px Archivo",
  "italic 400 11px Archivo",
  '500 10px "IBM Plex Mono"',
  '600 10px "IBM Plex Mono"',
];

async function boot() {
  const params = new URLSearchParams(location.search);
  const hash = decodeURIComponent(location.hash.slice(1));
  const data = await (await fetch("/data/nodes.json")).json();
  const graph = buildGraph(data);
  const svg = document.getElementById("map");
  render(svg, graph);

  await Promise.all(FONTS.map((f) => document.fonts.load(f)));
  await document.fonts.ready;
  fit(graph);

  layoutEdge(graph, { recompute: params.has("relayout") });
  for (const n of graph.kws) {
    n.lab.force = KW_SPEC.right;
    n.fp.edge = measureKeyword(n, n.lab.edge);
    n.fp.force = measureKeyword(n, n.lab.force);
  }
  for (const n of graph.works) n.fp.force = n.fpSide[1];
  layoutForce(graph);
  layoutRings(graph);
  for (const n of graph.kws) n.fp.rings = measureKeyword(n, n.lab.rings);
  sizeHit(graph.me);

  let views;
  const zoom = setupZoom(graph, () => views?.paint());
  views = createViews(graph, zoom);
  const filter = createFilter(graph, views);
  const flow = createFlow({ graph, data, views, zoom, filter });
  bindNodes(graph, views, flow);

  const actions = {
    about: () => flow.panel("me"),
    folio: () => window.open(PDF, "_blank", "noopener"),
    contact: () => nav.contact(),
  };
  bindFilterDrawer(filter);
  bindActives({ graph, views, filter });
  bindReadout({ graph, views, filter });
  bindIndex({ filter, select: flow.select });
  bindKey();
  const nav = bindNav({ data, actions });
  const palette = bindPalette({ graph, data, filter, select: flow.select, actions });
  bindRail({ views, select: flow.select, graph });
  bindLayers(views);
  bindShortcuts({ views, zoom, palette, select: flow.select, graph, flow });
  filter.apply({ announce: false });
  document.getElementById("zoom-in").addEventListener("click", () => zoom.by(1.4, 250));
  document.getElementById("zoom-out").addEventListener("click", () => zoom.by(1 / 1.4, 250));
  document.getElementById("zoom-fit").addEventListener("click", () => zoom.to(views.home(), 400));
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      flow.inset();
      zoom.to(views.home());
    }, 120);
  });

  // #force and #rings were the view links before ?view=.
  const legacy = VIEWS.includes(hash) && !graph.byId.has(hash) ? hash : null;
  const start = VIEWS.includes(params.get("view")) ? params.get("view") : legacy ?? "edge";
  await views.setView(start, { animate: false });
  document.documentElement.classList.add("map-ready");
  flow.start(legacy ? null : hash);

  // For scripts/layout-edge.mjs, scripts/check-overlaps.mjs and scripts/check-open.mjs.
  window.__map = {
    graph,
    views,
    zoom,
    filter,
    flow,
    edgePositions: () => Object.fromEntries(graph.works.map((w) => [w.id, w.pos.edge])),
  };
}

// Layers of the open flow, in order. Each closes to the one before it.
const LAYERS = [null, "card", "panel", "page"];
const rank = (layer) => LAYERS.indexOf(layer);

function createFlow({ graph, data, views, zoom, filter }) {
  const ix = indexData(data);
  let cur = { layer: null, id: null };
  let unwinding = false;

  const on = {
    close: () => close(),
    expand: () => expand(),
    page: () => page(cur.id),
    back: () => close(),
    next: (id) => go("page", id, "replace"),
    link: (id) => open(id),
  };
  const preview = createPreview({ graph, views, isOpen: (id) => !!cur.layer && cur.id === id, edge: () => (cur.layer === "panel" ? panelW() : 0) });
  const card = createCard({ graph, ix, edge: () => 0, on });
  const panel = createPanel({ ix, on });
  const pageLayer = createPage({ ix, on });

  const panelW = () => (narrow.matches ? 0 : PANEL_W);
  const centre = (n) => {
    const r = n.hit.getBoundingClientRect();
    return [(r.left + r.right) / 2, (r.top + r.bottom) / 2];
  };

  // Keeps n on screen and clear of the panel and the floating controls.
  function reveal(n, ms = 400) {
    if (narrow.matches) return;
    const r = n.hit.getBoundingClientRect();
    const box = { x0: 72, x1: window.innerWidth - panelW() - 24, y0: 64, y1: window.innerHeight - 64 };
    // The smallest pan that brings the node inside, with a margin; centred if it is too big.
    const shift = (lo, hi, a, b) => {
      if (b - a > hi - lo) return (lo + hi) / 2 - (a + b) / 2;
      if (a < lo) return lo - a + 24;
      if (b > hi) return hi - b - 24;
      return 0;
    };
    const dx = shift(box.x0, box.x1, r.left, r.right);
    const dy = shift(box.y0, box.y1, r.top, r.bottom);
    if (dx || dy) zoom.pan([dx, dy], reduced.matches ? 0 : ms);
  }

  // The view's home leaves room for the panel while it shows.
  function inset() {
    zoom.setRight(cur.layer === "panel" || cur.layer === "page" ? panelW() : 0);
  }

  function url(layer, id) {
    if (layer === "page") return pageHref(ix.works.get(id));
    const view = views.state.view === "edge" ? "" : `?view=${views.state.view}`;
    return `/${view}${layer === "panel" ? `#${encodeURIComponent(id)}` : ""}`;
  }
  function record(layer, id, mode) {
    const depth = (history.state?.depth ?? 0) + (mode === "push" ? 1 : 0);
    history[mode === "push" ? "pushState" : "replaceState"]({ layer, id: layer ? id : null, depth }, "", url(layer, id));
  }

  // Shows a layer for a node. Lower layers under it are hidden, except the panel, which
  // stays under the page so Back returns to it.
  function apply(layer, id, { focus = true } = {}) {
    const n = id ? graph.byId.get(id) : null;
    if (layer && !n) layer = null;
    if (layer === "page" && !hasPage(n.data)) layer = "panel";
    if (n?.hidden) filter.reveal(n);
    const prev = cur;
    cur = { layer, id: layer ? id : null };
    preview.hide();
    if (layer) views.set("focus", id);
    if (pageLayer.open && layer !== "page") {
      const to = graph.byId.get(prev.id) ?? n;
      pageLayer.hide({ origin: to && !to.hidden ? centre(to) : null });
    }
    if (layer === "card") {
      panel.hide();
      card.show(n, { focus });
    } else if (layer === "panel" || layer === "page") {
      card.hide();
      panel.show(n, { focus: focus && layer === "panel" });
    } else {
      card.hide();
      panel.hide();
      const back = prev.id && graph.byId.get(prev.id);
      if (focus && back && !back.hidden && prev.layer) back.el.focus({ preventScroll: true });
    }
    inset();
    if (layer === "panel" && (rank(prev.layer) < rank("panel") || prev.id !== id)) reveal(n);
    if (layer === "page") pageLayer.show(n.data, { origin: centre(n) });
  }

  function go(layer, id, mode) {
    apply(layer, id);
    record(cur.layer, cur.id, mode);
  }

  // Click, Enter or Space on a node, a label link, the palette, the index, Surprise me:
  // the node opens in the layer that is showing (a card from the map, or the panel).
  function open(id) {
    if (!graph.byId.get(id)) return;
    if (cur.layer === "panel" || cur.layer === "page") return go("panel", id, "replace");
    go("card", id, cur.layer === "card" ? "replace" : "push");
  }
  function toggle(id) {
    if (cur.layer === "card" && cur.id === id) close();
    else open(id);
  }
  // From the interface: open and bring the node into view.
  function select(id) {
    const n = graph.byId.get(id);
    if (!n) return;
    filter.reveal(n);
    if (cur.layer !== "panel" && !narrow.matches) zoom.centre([n.x, n.y], reduced.matches ? 0 : 400);
    open(id);
  }
  function expand() {
    if (cur.layer === "card") go("panel", cur.id, "push");
  }
  // The panel straight from the map (About).
  function openPanel(id) {
    if (cur.layer === "panel" || cur.layer === "page") go("panel", id, "replace");
    else go("panel", id, cur.layer === "card" ? "replace" : "push");
  }
  function page(id) {
    const w = ix.works.get(id);
    if (!w || !hasPage(w)) return;
    if (cur.layer === "card") go("panel", id, "push");
    if (cur.layer === "panel") go("page", id, "push");
  }

  // Steps out one layer: back through history when this visit pushed the entry,
  // otherwise in place.
  function close() {
    if (!cur.layer) return false;
    const s = history.state;
    if (s?.depth > 0 && s.layer === cur.layer) history.back();
    else go(LAYERS[rank(cur.layer) - 1], cur.id, "replace");
    return true;
  }

  // Everything closes when the focus goes elsewhere (the focus chip, Clear all, a map
  // click, or the filter hiding the node): history unwinds to where the visit started.
  function dismiss() {
    const depth = history.state?.depth ?? 0;
    apply(null, null, { focus: false });
    if (depth > 0) {
      unwinding = true;
      history.go(-depth);
    } else record(null, null, "replace");
  }

  window.addEventListener("popstate", (e) => {
    if (unwinding) {
      unwinding = false;
      record(null, null, "replace");
      return;
    }
    const s = e.state;
    let layer;
    let id;
    if (s && "layer" in s) {
      layer = s.layer;
      // Stepping out keeps the node that is showing (the panel or page may have moved on).
      id = rank(layer) < rank(cur.layer) && cur.id ? cur.id : s.id;
      if (layer && id !== s.id) history.replaceState({ ...s, id }, "", url(layer, id));
    } else {
      // An entry the visit did not make: a typed or followed #<id>.
      id = decodeURIComponent(location.hash.slice(1));
      layer = graph.byId.has(id) ? "panel" : null;
      history.replaceState({ layer, id: layer ? id : null, depth: 0 }, "", url(layer, id));
    }
    apply(layer, id);
  });

  let lastView = views.state.view;
  views.onChange((s) => {
    if (cur.layer && s.focus !== cur.id) dismiss();
    if (s.view !== lastView) {
      lastView = s.view;
      if (cur.layer !== "page") history.replaceState(history.state, "", url(cur.layer, cur.id));
    }
  });

  return {
    select,
    toggle,
    open,
    panel: openPanel,
    close,
    inset,
    get state() {
      return { ...cur };
    },
    // Esc: closes the top layer of the open flow; false when nothing is open.
    escape: close,
    // While the page covers the map, only Esc works.
    get blocking() {
      return pageLayer.open;
    },
    isOpen: (el) => card.contains(el) || panel.contains(el),
    start(id) {
      if (id && graph.byId.has(id)) {
        apply("panel", id, { focus: false });
        record("panel", id, "replace");
      } else record(null, null, "replace");
    },
  };
}

// Hover or keyboard focus lights a node's lines and shows its preview; click, Enter or
// Space opens its card (or updates the panel when it is open).
function bindNodes(graph, views, flow) {
  for (const n of graph.nodes) {
    n.el.addEventListener("pointerenter", () => views.set("hover", n.id));
    n.el.addEventListener("pointerleave", () => views.state.hover === n.id && views.set("hover", null));
    n.el.addEventListener("focus", () => views.set("hover", n.id));
    n.el.addEventListener("blur", () => views.state.hover === n.id && views.set("hover", null));
    n.el.addEventListener("click", (e) => {
      if (e.defaultPrevented) return;
      e.stopPropagation();
      flow.toggle(n.id);
    });
    n.el.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      flow.toggle(n.id);
    });
  }
  // A click on the empty map closes the card and clears the focus; the panel stays.
  graph.svg.addEventListener("click", (e) => {
    if (e.target.closest(".node") || flow.state.layer === "panel") return;
    views.set("focus", null);
  });
}

boot().catch((err) => {
  console.error(err);
  document.documentElement.classList.add("map-failed");
});
