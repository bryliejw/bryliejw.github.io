// Edge map layout. Keywords sit on the four edges, one strip per group, styled like the
// keyword strips on the folio's project openers; ticks on the inner side of the labels.
// Works sit at the mean of their keywords pushed 45% outward from the centre, snapped to
// the nearest free 20px cell, colliding on their full footprint, with the name block reserved.
// Runs in the browser (it measures text). scripts/layout-edge.mjs stores the work positions
// in data/nodes.json as pos.edge; keyword strips are rebuilt the same way at load.
import { W, H, KW_SPEC } from "./render.js";

const M = 16; // margin from the viewBox edge
const GRID = 10;
const PUSH = 1.45;
const PAD = 6; // clear space between footprints
const ITER = 4; // ordering passes

const SIDES = { left: ["discipline"], right: ["topic", "deliverable"], top: ["value"], bottom: ["tool"] };

export function layoutEdge(graph, { recompute = false, w = W, h = H } = {}) {
  const groups = new Map(graph.groups.map((g) => [g.type, g]));
  for (const g of graph.groups) g.order = [...g.kws];
  const geo = geometry(graph, groups, w, h);

  // Order each strip so keywords sit near the works they join (barycentric passes).
  for (let i = 0; i < ITER; i++) {
    placeStrips(geo, groups);
    const approx = new Map(graph.works.map((w) => [w, target(w, geo.inner)]));
    for (const [side, types] of Object.entries(SIDES)) {
      const axis = side === "left" || side === "right" ? 1 : 0;
      for (const t of types) {
        const g = groups.get(t);
        const key = new Map(g.order.map((k, j) => [k, sortKey(k, axis, approx) ?? k.pos.edge[axis] + j * 1e-6]));
        g.order.sort((a, b) => key.get(a) - key.get(b));
      }
    }
  }
  placeStrips(geo, groups);

  const reserved = [inflate(at(graph.me.fp.edge, 0, 0), 12)];
  const placed = [];
  const works = [...graph.works].sort(
    (a, b) => "LMS".indexOf(a.size) - "LMS".indexOf(b.size) || b.data.keywords.length - a.data.keywords.length
  );
  for (const w of works) {
    const stored = w.data.pos?.edge;
    const p = !recompute && stored ? stored : snap(w, target(w, geo.inner, placed), geo.inner, [...reserved, ...placed]);
    w.pos.edge = p;
    w.lab.edge = 1;
    placed.push(inflate(at((w.fpPack ?? w.fpSide[1]), p[0], p[1]), PAD / 2));
  }
  graph.me.pos.edge = [0, 0];
  graph.edgeGeo = geo;
  return geo;
}

function geometry(graph, groups, W, H) {
  const maxW = (types) => Math.max(...types.flatMap((t) => groups.get(t).kws.map((k) => k.labelW)));
  // When the bottom strip's labels would not fit in one row, alternate them over two rows.
  const tools = groups.get(SIDES.bottom[0]);
  const stagger = tools.kws.reduce((s, k) => s + k.labelW + 18, 0) > W - 2 * M - tools.size.w - 28;
  const topTick = -H / 2 + M + 9 + 8;
  const bottomTick = H / 2 - M - 3 - 16 - (stagger ? 13 : 0);
  const leftTick = -W / 2 + M + maxW(SIDES.left) + 9;
  const rightTick = W / 2 - M - maxW(SIDES.right) - 9;
  return {
    w: W,
    h: H,
    stagger,
    topTick,
    bottomTick,
    leftTick,
    rightTick,
    yTop: topTick + 30,
    yBot: bottomTick - 30,
    inner: { x0: leftTick + 20, x1: rightTick - 20, y0: topTick + 22, y1: bottomTick - 22 },
  };
}

function placeStrips(geo, groups) {
  const W = geo.w;
  // Columns: a group label slot, then its keywords; groups separated by one empty slot.
  for (const side of ["left", "right"]) {
    const types = SIDES[side];
    const slots = types.reduce((n, t, i) => n + 1 + groups.get(t).order.length + (i ? 1 : 0), 0);
    const step = (geo.yBot - geo.yTop) / (slots - 1);
    let y = geo.yTop;
    const x = side === "left" ? geo.leftTick : geo.rightTick;
    types.forEach((t, i) => {
      const g = groups.get(t);
      if (i) y += step;
      const gx = side === "left" ? -W / 2 + M : W / 2 - M - g.size.w;
      g.pos.edge = { x: gx, y: y + 3.5, rot: 0 };
      y += step;
      for (const k of g.order) {
        k.pos.edge = [x, y];
        k.lab.edge = KW_SPEC[side];
        y += step;
      }
      y -= step;
    });
  }
  // Strips: the group label at the left end, keywords spread with equal gaps.
  for (const side of ["top", "bottom"]) {
    const g = groups.get(SIDES[side][0]);
    const tick = side === "top" ? geo.topTick : geo.bottomTick;
    const baseline = side === "top" ? tick - 8 : tick + 16;
    g.pos.edge = { x: -W / 2 + M, y: baseline, rot: 0 };
    const x0 = -W / 2 + M + g.size.w + 28;
    const x1 = W / 2 - M;
    if (side === "bottom" && geo.stagger) {
      // Equal steps, labels alternating between two rows.
      const step = (x1 - x0) / g.order.length;
      g.order.forEach((k, i) => {
        k.pos.edge = [x0 + step * (i + 0.5), tick];
        k.lab.edge = i % 2 ? { ...KW_SPEC.bottom, y: KW_SPEC.bottom.y + 13 } : KW_SPEC.bottom;
      });
      continue;
    }
    const total = g.order.reduce((s, k) => s + k.labelW, 0);
    const gap = (x1 - x0 - total) / g.order.length;
    let x = x0 + gap / 2;
    for (const k of g.order) {
      k.pos.edge = [x + k.labelW / 2, tick];
      k.lab.edge = KW_SPEC[side];
      x += k.labelW + gap;
    }
  }
}

function sortKey(k, axis, approx) {
  const works = k.edges.map((e) => (e.a === k ? e.b : e.a)).filter((n) => n.role === "work");
  if (works.length) return mean(works.map((w) => approx.get(w)[axis]));
  const related = k.edges.filter((e) => e.type === "rel").map((e) => (e.a === k ? e.b : e.a));
  if (related.length) return mean(related.map((r) => r.pos.edge[axis]));
  return null;
}

// Mean of a work's keywords (and its parent work, once placed), pushed outward, kept inside.
function target(w, inner) {
  const pts = [];
  for (const e of w.edges) {
    const o = e.a === w ? e.b : e.a;
    if (o.role === "kw" || (e.type === "part" && o.pos.edge)) pts.push(o.pos.edge);
  }
  const x = mean(pts.map((p) => p[0])) * PUSH;
  const y = mean(pts.map((p) => p[1])) * PUSH;
  return [clamp(x, inner.x0, inner.x1), clamp(y, inner.y0, inner.y1)];
}

// Nearest free grid cell to the target where the full footprint fits inside the inner area.
function snap(w, [tx, ty], inner, taken) {
  const fp = (w.fpPack ?? w.fpSide[1]);
  const cells = [];
  for (let x = Math.ceil(inner.x0 / GRID) * GRID; x <= inner.x1; x += GRID) {
    for (let y = Math.ceil(inner.y0 / GRID) * GRID; y <= inner.y1; y += GRID) {
      if (x + fp.x < inner.x0 || x + fp.x + fp.w > inner.x1 || y + fp.y < inner.y0 || y + fp.y + fp.h > inner.y1) continue;
      cells.push([x, y, (x - tx) ** 2 + (y - ty) ** 2]);
    }
  }
  cells.sort((a, b) => a[2] - b[2] || a[0] - b[0] || a[1] - b[1]);
  for (const [x, y] of cells) {
    const b = inflate(at(fp, x, y), PAD / 2);
    if (!taken.some((t) => hits(b, t))) return [x, y];
  }
  return [Math.round(tx / GRID) * GRID, Math.round(ty / GRID) * GRID];
}

export const at = (fp, x, y) => ({ x0: x + fp.x, y0: y + fp.y, x1: x + fp.x + fp.w, y1: y + fp.y + fp.h });
export const inflate = (b, p) => ({ x0: b.x0 - p, y0: b.y0 - p, x1: b.x1 + p, y1: b.y1 + p });
export const hits = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
const mean = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
