// One d3-zoom on the map (0.4 to 4). Each view has a home: its content fitted inside the
// viewport, clear of the floating controls (insets in CSS pixels) and of the side panel
// while it is open (setRight).
import { W, H } from "./render.js";

const d3 = window.d3;
const INSET = { x: 76, top: 56, bottom: 56 };

export function setupZoom(graph, onZoom) {
  const svg = d3.select(graph.svg);
  const zoom = d3
    .zoom()
    .scaleExtent([0.4, 4])
    .filter((e) => (!e.ctrlKey || e.type === "wheel") && !e.button && !e.target.closest?.(".node.dragging"))
    .on("zoom", (e) => {
      graph.zoomG.setAttribute("transform", e.transform);
      graph.k = e.transform.k;
      onZoom(e.transform);
    });
  svg.call(zoom).on("dblclick.zoom", null);
  graph.k = 1;
  let right = 0; // CSS px covered on the right by the side panel

  // CSS px per map unit at k = 1.
  const unit = () => {
    const rect = graph.svg.getBoundingClientRect();
    return Math.min(rect.width / W, rect.height / H) || 1;
  };

  // Home transform for a content box { x0, y0, x1, y1 } in map units.
  function home(b) {
    const rect = graph.svg.getBoundingClientRect();
    const s = Math.min(rect.width / W, rect.height / H) || 1; // CSS px per map unit at k = 1
    const visW = rect.width / s;
    const visH = rect.height / s;
    const availW = visW - (2 * INSET.x + right) / s;
    const availH = visH - (INSET.top + INSET.bottom) / s;
    const k = Math.max(0.4, Math.min(4, availW / (b.x1 - b.x0), availH / (b.y1 - b.y0)));
    const cx = (b.x0 + b.x1) / 2;
    const cy = (b.y0 + b.y1) / 2;
    const oy = (INSET.top - INSET.bottom) / 2 / s;
    const ox = -right / 2 / s;
    return d3.zoomIdentity.translate(-k * cx + ox, -k * cy + oy).scale(k);
  }

  const run = (fn, ms) => (ms ? svg.transition().duration(ms).ease(d3.easeCubicInOut).call(fn) : svg.call(fn));
  return {
    zoom,
    home,
    to: (t, ms = 0) => run((s) => zoom.transform(s, t), ms),
    by: (f, ms = 0) => run((s) => zoom.scaleBy(s, f), ms),
    // Pans so the map point [x, y] sits at the centre, keeping the zoom.
    centre: ([x, y], ms = 0) => run((s) => zoom.translateTo(s, x, y), ms),
    // Pans by [dx, dy] CSS px on screen.
    pan: ([dx, dy], ms = 0) => {
      const f = unit() * graph.k;
      return run((s) => zoom.translateBy(s, dx / f, dy / f), ms);
    },
    setRight: (px) => (right = px),
    get right() {
      return right;
    },
    // Width over height of the area the map can use, clear of the controls and the panel.
    aspect() {
      const rect = graph.svg.getBoundingClientRect();
      const w = Math.max(200, rect.width - 2 * INSET.x - right);
      const h = Math.max(200, rect.height - INSET.top - INSET.bottom);
      return w / h;
    },
    current: () => d3.zoomTransform(graph.svg),
  };
}
