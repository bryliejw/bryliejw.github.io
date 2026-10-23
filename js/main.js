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
import { buildGraph, render, fit, measureKeyword, sizeHit, KW_SPEC, VIEWS, DEFAULT_VIEW, TILE } from "./map/render.js";
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
import { bindCursor } from "./ui/cursor.js";
import { indexData, hasPage, pageHref, PDF } from "./open/content.js";
import { createPreview } from "./open/preview.js";
import { createCard } from "./open/grow.js";
import { createPanel } from "./open/panel.js";
import { createPage } from "./open/page.js";

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
const narrow = window.matchMedia("(max-width: 719px)"); // card and panel are full-screen sheets

const FONTS = [
  "900 34px Anybody",
  "800 17px Anybody",
  "800 14px Anybody",
  '600 11px "Instrument Sans"',
  '500 11px "Instrument Sans"',
  'italic 500 11px "Instrument Sans"',
  '600 10px "Geist Mono"',
  '500 10px "Geist Mono"',
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

  sizeHit(graph.me);
  // Force and Edge pack by image: Extras and smaller works keep their labels for hover and zoom,
  // so their footprint is the tile with a margin; projects keep their title.
  for (const n of graph.works) {
    const h = TILE[n.size] / 2 + (n.size === "S" ? 10 : 14);
    n.fp.force = n.size === "L" ? n.fpSide[1] : { x: -h, y: -h, w: 2 * h, h: 2 * h };
    n.fpPack = n.fp.force; // Edge packs the same way

  }

  let views;
  const zoom = setupZoom(graph, () => views?.paint());

  // Layouts for the map area's shape: Edge gets a canvas of that aspect, Force is stretched
  // to it, Rings stays round. Rerun when the area changes shape (window resize, panel).
  let aspect = 0;
  function layouts(a) {
    aspect = a;
    const w = 1200;
    const h = Math.round(Math.max(560, Math.min(1500, w / Math.max(0.6, a))));
    layoutEdge(graph, { recompute: true, w, h });
    for (const n of graph.kws) {
      n.lab.force = KW_SPEC.right;
      n.fp.edge = measureKeyword(n, n.lab.edge);
      n.fp.force = measureKeyword(n, n.lab.force);
    }
    layoutForce(graph, { aspect: a });
    layoutRings(graph);
    for (const n of graph.kws) n.fp.rings = measureKeyword(n, n.lab.rings);
  }
  layouts(zoom.aspect());

  views = createViews(graph, zoom);
  const filter = createFilter(graph, views);
  // Refit after the map area changes: relayout when its shape changed, else just refit.
  const refit = ({ animate = true } = {}) => {
    const a = zoom.aspect();
    if (Math.abs(a - aspect) / aspect > 0.04) {
      layouts(a);
      return views.settle({ animate }).then(() => true);
    }
    zoom.to(views.home(), animate && !reduced.matches ? 450 : 0);
    return Promise.resolve(false);
  };
  const flow = createFlow({ graph, data, views, zoom, filter, refit });
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
  bindCursor();
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
      refit();
    }, 180);
  });

  // #force and #rings were the view links before ?view=.
  const legacy = VIEWS.includes(hash) && !graph.byId.has(hash) ? hash : null;
  const start = VIEWS.includes(params.get("view")) ? params.get("view") : legacy ?? DEFAULT_VIEW;
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

function createFlow({ graph, data, views, zoom, filter, refit }) {
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
    step: (dir) => step(dir),
  };
  const preview = createPreview({ graph, views, ix, isOpen: (id) => !!cur.layer && cur.id === id, edge: () => (cur.layer === "panel" ? panelW() : 0) });
  const card = createCard({ graph, ix, edge: () => 0, on });
  const panel = createPanel({
    ix,
    graph,
    on,
    onResize: () => {
      if (cur.layer !== "panel" || narrow.matches) return;
      zoom.setRight(panel.width);
      refit();
    },
  });
  const pageLayer = createPage({ ix, on });

  const panelW = () => (narrow.matches ? 0 : panel.width);
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

  // The view's home leaves room for the panel while it shows; the map refits to the rest.
  function inset() {
    const r = cur.layer === "panel" || cur.layer === "page" ? panelW() : 0;
    if (r === zoom.right) return false;
    zoom.setRight(r);
    return true;
  }

  function url(layer, id) {
    if (layer === "page") return pageHref(ix.works.get(id));
    const view = views.state.view === DEFAULT_VIEW ? "" : `?view=${views.state.view}`;
    return `/${view}${layer === "panel" ? `#${encodeURIComponent(id)}` : ""}`;
  }
  function record(layer, id, mode) {
    const depth = (history.state?.depth ?? 0) + (mode === "push" ? 1 : 0);
    try {
      history[mode === "push" ? "pushState" : "replaceState"]({ layer, id: layer ? id : null, depth }, "", url(layer, id));
    } catch {
      // Sandboxed previews refuse URL changes; the layers still work.
    }
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
    if (inset() && layer !== "page") refit().then(() => layer === "panel" && cur.id === id && reveal(n));
    else if (layer === "panel" && (rank(prev.layer) < rank("panel") || prev.id !== id)) reveal(n);
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
  // Previous or next work (index order, showing works only) in the card or panel.
  function step(dir) {
    const n = cur.id && graph.byId.get(cur.id);
    if (!n || n.role !== "work" || (cur.layer !== "card" && cur.layer !== "panel")) return false;
    const list = graph.works.filter((w) => !w.hidden);
    const to = list[(list.indexOf(n) + dir + list.length) % list.length];
    if (!to || to === n) return false;
    if (cur.layer === "card" && !narrow.matches) zoom.centre([to.x, to.y], reduced.matches ? 0 : 400);
    go(cur.layer, to.id, "replace");
    return true;
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
    step,
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
