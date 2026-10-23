// Rings layout, computed at load and deterministic. Name at the centre, PDF projects on
// r 180, Extras on r 320, smaller works on r 430, keywords on r 545 in typed arcs with rotated labels.
// Group labels sit in the gap before their arc, set along the circle.
import { separate } from "./layout-force.js";

export const R = { L: 180, M: 320, S: 430, K: 545 };
const GAP = 5; // empty keyword slots before each arc, for its group label
const ITER = 4;
const TAU = Math.PI * 2;
const deg = (a) => (a * 180) / Math.PI;

export function ringSpec(a) {
  // Radial labels, read left to right on both halves.
  const left = Math.cos(a) < -1e-9;
  return left ? { anchor: "end", x: -9, y: 0, baseline: true, rot: deg(a) + 180 } : { anchor: "start", x: 9, y: 0, baseline: true, rot: deg(a) };
}

export function layoutRings(graph) {
  const total = graph.kws.length + GAP * graph.groups.length;
  const step = TAU / total;
  const start = -Math.PI / 2;
  for (const g of graph.groups) g.order = [...g.kws];

  const angleOf = new Map();
  const assign = () => {
    let slot = 0;
    for (const g of graph.groups) {
      g.angle = start + (slot + (GAP - 1) / 2) * step;
      slot += GAP;
      for (const k of g.order) angleOf.set(k, start + slot++ * step);
    }
  };
  assign();

  const workAngle = (w) => circMean(neighboursOf(w).filter((n) => n.role === "kw").map((k) => angleOf.get(k)));
  for (let i = 0; i < ITER; i++) {
    const wa = new Map(graph.works.map((w) => [w, workAngle(w)]));
    for (const g of graph.groups) {
      const mid = angleOf.get(g.order[Math.floor(g.order.length / 2)]);
      const key = new Map(
        g.order.map((k, j) => {
          const ws = neighboursOf(k).filter((n) => n.role === "work");
          const rel = neighboursOf(k).filter((n) => n.role === "kw");
          const a = ws.length ? circMean(ws.map((w) => wa.get(w))) : rel.length ? circMean(rel.map((r) => angleOf.get(r))) : angleOf.get(k);
          return [k, unwrap(a, mid) + j * 1e-6];
        })
      );
      g.order.sort((a, b) => key.get(a) - key.get(b));
    }
    assign();
  }

  for (const k of graph.kws) {
    const a = angleOf.get(k);
    k.pos.rings = [R.K * Math.cos(a), R.K * Math.sin(a)];
    k.lab.rings = ringSpec(a);
    k.ringAngle = a;
  }
  for (const g of graph.groups) {
    const a = g.angle;
    const bottom = Math.sin(a) > 0;
    g.pos.rings = { x: R.K * Math.cos(a), y: R.K * Math.sin(a), rot: deg(a) + (bottom ? -90 : 90), centred: true };
  }

  graph.me.pos.rings = [0, 0];
  const items = [{ n: graph.me, x: 0, y: 0, fp: graph.me.fp.rings, fixed: true, r: 0 }];
  for (const size of ["L", "M", "S"]) {
    const ws = graph.works.filter((w) => w.size === size);
    if (!ws.length) continue;
    const r = R[size];
    const target = ws.map((w) => [w, workAngle(w)]).sort((a, b) => a[1] - b[1] || 0);
    const gap = { L: Math.PI / 4, M: Math.PI / 4, S: (TAU / ws.length) * 0.9 }[size];
    const spread = spreadAngles(target.map((t) => t[1]), gap);
    target.forEach(([w, _], i) => {
      const a = spread[i];
      // Label on the side facing the centre, so it stays clear of the keyword ring.
      const side = Math.cos(a) > 0.15 ? -1 : 1;
      w.lab.rings = w.size === "L" ? 1 : side;
      items.push({ n: w, x: r * Math.cos(a), y: r * Math.sin(a), fp: w.fpSide[w.lab.rings], r, a });
    });
  }

  // Footprints apart, then back onto a band around each ring.
  for (let p = 0; p < 60; p++) {
    if (!separate(items, 1, 4)) break;
    for (const d of items) {
      if (d.fixed) continue;
      const a = Math.atan2(d.y, d.x);
      const band = d.r === R.L ? 20 : d.r === R.M ? 26 : 44;
      const rr = Math.max(d.r - band, Math.min(d.r + band, Math.hypot(d.x, d.y)));
      d.x = rr * Math.cos(a);
      d.y = rr * Math.sin(a);
    }
  }
  for (const d of items) d.n.pos.rings = [Math.round(d.x * 10) / 10, Math.round(d.y * 10) / 10];
}

// Keeps sorted target angles at least minGap apart around the circle, staying near targets.
function spreadAngles(targets, minGap) {
  const n = targets.length;
  if (n < 2) return targets;
  const gap = Math.min(minGap, TAU / n);
  const a = [...targets];
  for (let it = 0; it < 200; it++) {
    let moved = false;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const aj = j === 0 ? a[0] + TAU : a[j];
      const d = aj - a[i];
      if (d < gap - 1e-6) {
        const push = (gap - d) / 2;
        a[i] -= push;
        if (j === 0) a[0] += push;
        else a[j] += push;
        moved = true;
      }
    }
    if (!moved) break;
  }
  return a;
}

const neighboursOf = (n) => n.edges.map((e) => (e.a === n ? e.b : e.a));
function circMean(as) {
  if (!as.length) return 0;
  const s = as.reduce((v, a) => v + Math.sin(a), 0);
  const c = as.reduce((v, a) => v + Math.cos(a), 0);
  return Math.atan2(s, c);
}
function unwrap(a, ref) {
  while (a - ref > Math.PI) a -= TAU;
  while (ref - a > Math.PI) a += TAU;
  return a;
}
