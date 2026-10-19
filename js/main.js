// Boot: load data, draw the map, measure once fonts are ready, compute the three layouts,
// then wire zoom, views and controls. ?relayout recomputes the Edge map work positions
// instead of reading pos.edge (scripts/layout-edge.mjs uses it).
import { buildGraph, render, fit, measureKeyword, sizeHit, KW_SPEC } from "./map/render.js";
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

const PDF = "/assets/Wilson_Brylie_Taster-Folio_Final.pdf";
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

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
  bindNodes(graph, views);

  // Focus a node from the interface (palette, index, Surprise me, About): light its lines,
  // pan it to the centre and move keyboard focus to it.
  // TODO(phase 4): open the grow card here, and the About panel for "me".
  const select = (id) => {
    const n = graph.byId.get(id);
    if (!n || n.hidden) return;
    views.set("focus", id);
    zoom.centre([n.x, n.y], reduced.matches ? 0 : 400);
    n.el.focus({ preventScroll: true });
  };
  const filter = createFilter(graph, views);
  const actions = {
    about: () => select("me"),
    folio: () => window.open(PDF, "_blank", "noopener"),
    contact: () => nav.contact(),
  };
  bindFilterDrawer(filter);
  bindActives({ graph, views, filter });
  bindReadout({ graph, views, filter });
  bindIndex({ filter, select });
  bindKey();
  const nav = bindNav({ data, actions });
  const palette = bindPalette({ graph, data, filter, select, actions });
  bindRail({ views, select, graph });
  bindLayers(views);
  bindShortcuts({ views, zoom, palette, select, graph });
  filter.apply({ announce: false });
  document.getElementById("zoom-in").addEventListener("click", () => zoom.by(1.4, 250));
  document.getElementById("zoom-out").addEventListener("click", () => zoom.by(1 / 1.4, 250));
  document.getElementById("zoom-fit").addEventListener("click", () => zoom.to(views.home(), 400));
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => zoom.to(views.home()), 120);
  });

  const start = { "#force": "force", "#rings": "rings" }[location.hash] ?? "edge";
  await views.setView(start, { animate: false });
  document.documentElement.classList.add("map-ready");

  // For scripts/layout-edge.mjs and scripts/check-overlaps.mjs.
  window.__map = {
    graph,
    views,
    zoom,
    filter,
    edgePositions: () => Object.fromEntries(graph.works.map((w) => [w.id, w.pos.edge])),
  };
}

// Hover or keyboard focus lights a node's lines; click, Enter or Space focuses it.
function bindNodes(graph, views) {
  for (const n of graph.nodes) {
    n.el.addEventListener("pointerenter", () => views.set("hover", n.id));
    n.el.addEventListener("pointerleave", () => views.state.hover === n.id && views.set("hover", null));
    n.el.addEventListener("focus", () => views.set("hover", n.id));
    n.el.addEventListener("blur", () => views.state.hover === n.id && views.set("hover", null));
    n.el.addEventListener("click", (e) => {
      if (e.defaultPrevented) return;
      e.stopPropagation();
      views.set("focus", views.state.focus === n.id ? null : n.id);
    });
    n.el.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      views.set("focus", views.state.focus === n.id ? null : n.id);
    });
  }
  graph.svg.addEventListener("click", (e) => {
    if (!e.target.closest(".node")) views.set("focus", null);
  });
}

boot().catch((err) => {
  console.error(err);
  document.documentElement.classList.add("map-failed");
});
