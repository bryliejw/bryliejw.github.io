// Node frames: the shape of a work's image on the map follows what the work is
// (data/showcase.json, frames). The cover image always shows; only its frame, or which
// cut of it, changes. A book for the magazine, a fanned hand of cards for the deck, torn
// edges for the collage explainer, an arch for the installation, a browser window for the
// website, a screen for slides and renders; everything else keeps its cover's proportions.
// Every frame keeps the area of its level's square tile, so levels still read by size.
import { el } from "./render.js";

export const TILE = { L: 124, M: 72, S: 42 };
const clampA = (a) => Math.max(0.62, Math.min(1.75, a || 1));
const href = (p) => `/${p}`.replace(/^\/+/, "/");

// Deterministic jitter so torn edges are the same on every load.
function rng(seed) {
  let s = [...seed].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

// Tile width and height for a work.
export function tileSize(w, frame) {
  const s = TILE[w.size];
  const img = w.images[0];
  let a = frame?.aspect ?? (img ? img.w / img.h : 1);
  a = clampA(a);
  return { tw: Math.round(s * Math.sqrt(a)), th: Math.round(s / Math.sqrt(a)) };
}

// The outline of a frame as a path, centred on the node.
function outline(shape, tw, th, id) {
  const x0 = -tw / 2;
  const y0 = -th / 2;
  if (shape === "arch") {
    const r = tw / 2;
    return `M${x0},${-y0} V${y0 + r} A${r},${r} 0 0 1 ${-x0},${y0 + r} V${-y0} Z`;
  }
  if (shape === "torn") {
    const rand = rng(id);
    const pts = [];
    const step = 5;
    const j = () => (rand() - 0.5) * 3.6;
    for (let x = x0; x < -x0; x += step) pts.push([x, y0 + Math.abs(j())]);
    for (let y = y0; y < -y0; y += step) pts.push([-x0 - Math.abs(j()), y]);
    for (let x = -x0; x > x0; x -= step) pts.push([x, -y0 - Math.abs(j())]);
    for (let y = -y0; y > y0; y -= step) pts.push([x0 + Math.abs(j()), y]);
    return `M${pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" L")} Z`;
  }
  return `M${x0},${y0} H${-x0} V${-y0} H${x0} Z`;
}

// Draws the frame into the node body. Returns the tile box { x, y, w, h } (the image area).
export function drawFrame(b, n, frame) {
  const w = n.data;
  const shape = frame?.shape ?? "photo";
  const { tw, th } = tileSize(w, frame);
  const img = w.images[0];
  const src = frame?.src ?? (img ? img.thumb ?? img.src : null);
  const x0 = -tw / 2;
  const y0 = -th / 2;
  const id = `fr-${w.id}`;
  n.shape = shape;

  if (shape === "cards") {
    // A fanned hand: two cards behind, tilted, and one in front.
    const r = Math.round(tw * 0.06);
    const cards = frame.cards;
    const tilt = [-11, 7, 0];
    const off = [[-6, 3], [7, -2], [0, 0]];
    cards.forEach((c, i) => {
      const g = el("g", { class: "fr-card", transform: `translate(${off[i][0]},${off[i][1]}) rotate(${tilt[i]})` }, b);
      const cid = `${id}-${i}`;
      el("rect", { x: x0, y: y0, width: tw, height: th, rx: r }, el("clipPath", { id: cid }, b));
      el("rect", { class: "tile has-img", x: x0, y: y0, width: tw, height: th, rx: r }, g);
      el("image", { href: href(c), x: x0, y: y0, width: tw, height: th, preserveAspectRatio: "xMidYMid slice", "clip-path": `url(#${cid})`, class: "tile-img" }, g);
      if (i === cards.length - 1) el("rect", { class: "tile-key", x: x0, y: y0, width: tw, height: th, rx: r }, g);
    });
    return { x: x0, y: y0, w: tw, h: th };
  }

  if (shape === "book") {
    // Page edges behind the cover, bottom right; a spine shade on the left.
    for (const k of [4, 2]) el("rect", { class: "fr-pages", x: x0 + k, y: y0 + k, width: tw, height: th }, b);
  }
  const d = outline(shape, tw, th, w.id);
  let top = y0;
  if (shape === "browser") {
    // A window bar above the page.
    const bar = Math.max(7, Math.round(th * 0.12));
    el("rect", { class: "fr-bar", x: x0, y: y0, width: tw, height: bar }, b);
    for (let i = 0; i < 3; i++) el("circle", { class: "fr-dot", cx: x0 + 5 + i * 5, cy: y0 + bar / 2, r: 1.4 }, b);
    top = y0 + bar;
  }
  const ih = th - (top - y0);
  const shapeD = shape === "browser" ? `M${x0},${top} H${-x0} V${-y0} H${x0} Z` : d;
  el("path", { class: `tile tile-${w.size.toLowerCase()}${src ? " has-img" : ""}`, d: shapeD }, b);
  if (src) {
    el("path", { d: shapeD }, el("clipPath", { id }, b));
    el("image", { href: href(src), x: x0, y: top, width: tw, height: ih, preserveAspectRatio: "xMidYMid slice", "clip-path": `url(#${id})`, class: "tile-img" }, b);
  }
  if (shape === "book") el("rect", { class: "fr-spine", x: x0, y: y0, width: 3, height: th }, b);
  el("path", { class: `tile-key${img?.white && !frame?.src ? " is-white" : ""}`, d: shapeD }, b);
  return { x: x0, y: y0, w: tw, h: th };
}
