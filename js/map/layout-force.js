// Force layout, computed at load and deterministic: a seeded simulation run for 360 ticks
// from the edge positions, then 240 passes that push apart any two footprints that overlap.
// The name stays fixed at the centre. live() keeps the same forces for dragging.
import { at, inflate, hits } from "./layout-edge.js";

const d3 = window.d3;
const TICKS = 360;
const PASSES = 240;
const PAD = 3;

function simulation(graph, items) {
  const byNode = new Map(items.map((d) => [d.n, d]));
  const links = graph.edges.map((e) => ({ source: byNode.get(e.a), target: byNode.get(e.b), type: e.type }));
  const degree = new Map(items.map((d) => [d, 0]));
  for (const l of links) {
    degree.set(l.source, degree.get(l.source) + 1);
    degree.set(l.target, degree.get(l.target) + 1);
  }
  const radius = (d) => Math.hypot(d.fp.w, d.fp.h) / 2 * 0.62;
  return d3
    .forceSimulation(items)
    .randomSource(d3.randomLcg(0.42))
    .force(
      "link",
      d3
        .forceLink(links)
        .distance((l) => (l.type === "me" ? 170 : l.type === "rel" ? 64 : 82))
        .strength((l) => 0.9 / Math.min(degree.get(l.source), degree.get(l.target)))
    )
    .force("charge", d3.forceManyBody().strength(-220).distanceMax(480))
    .force("x", d3.forceX(0).strength(0.03))
    .force("y", d3.forceY(0).strength(0.075))
    .force("collide", d3.forceCollide(radius).strength(0.8))
    .stop();
}

const centre = (d) => [d.x + d.fp.x + d.fp.w / 2, d.y + d.fp.y + d.fp.h / 2];

// Pushes overlapping footprints apart along their smaller overlap. Returns overlaps left.
export function separate(items, passes, pad = PAD) {
  let left = 0;
  for (let p = 0; p < passes; p++) {
    left = 0;
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i];
        const b = items[j];
        const A = inflate(at(a.fp, a.x, a.y), pad);
        const B = inflate(at(b.fp, b.x, b.y), pad);
        if (!hits(A, B)) continue;
        left++;
        const ox = Math.min(A.x1, B.x1) - Math.max(A.x0, B.x0);
        const oy = Math.min(A.y1, B.y1) - Math.max(A.y0, B.y0);
        const [ax, ay] = centre(a);
        const [bx, by] = centre(b);
        const wa = a.fixed ? 0 : b.fixed ? 1 : 0.5;
        const wb = 1 - wa;
        if (ox < oy) {
          const s = ax < bx || (ax === bx && i < j) ? -1 : 1;
          a.x += s * ox * wa;
          b.x -= s * ox * wb;
        } else {
          const s = ay < by || (ay === by && i < j) ? -1 : 1;
          a.y += s * oy * wa;
          b.y -= s * oy * wb;
        }
      }
    }
    if (!left) break;
  }
  return left;
}

// aspect: width over height of the map area; the settled layout is stretched to fill it.
export function layoutForce(graph, { aspect = 1.6 } = {}) {
  const items = graph.nodes.map((n) => ({
    n,
    x: n.pos.edge[0] * 0.8,
    y: n.pos.edge[1] * 0.8,
    fp: n.fp.force,
    fixed: n.role === "me",
  }));
  for (const d of items) if (d.fixed) Object.assign(d, { x: 0, y: 0, fx: 0, fy: 0 });
  const sim = simulation(graph, items);
  for (let i = 0; i < TICKS; i++) sim.tick();
  // Stretch to the map area's shape (area kept), then settle the footprints again.
  const xs = items.map((d) => d.x);
  const ys = items.map((d) => d.y);
  const a0 = (Math.max(...xs) - Math.min(...xs)) / Math.max(1, Math.max(...ys) - Math.min(...ys));
  const f = Math.sqrt(Math.max(0.5, Math.min(3, aspect)) / Math.max(0.3, a0));
  for (const d of items) if (!d.fixed) {
    d.x *= f;
    d.y /= f;
  }
  separate(items, PASSES);
  // Separation pushes the layout taller; stretch it back out to the area's width.
  for (let k = 0; k < 3; k++) {
    const bx = items.map((d) => d.x + d.fp.x);
    const bx1 = items.map((d) => d.x + d.fp.x + d.fp.w);
    const by = items.map((d) => d.y + d.fp.y);
    const by1 = items.map((d) => d.y + d.fp.y + d.fp.h);
    const a1 = (Math.max(...bx1) - Math.min(...bx)) / Math.max(1, Math.max(...by1) - Math.min(...by));
    const want = Math.max(0.5, Math.min(3, aspect)) * 1.06;
    if (a1 >= want * 0.97) break;
    const g = Math.min(1.35, want / a1);
    for (const d of items) if (!d.fixed) d.x *= g;
    separate(items, 80);
  }
  for (const d of items) {
    d.n.pos.force = [Math.round(d.x * 10) / 10, Math.round(d.y * 10) / 10];
    if (d.n.role === "work") d.n.lab.force = 1;
  }
}

// Live physics for dragging in Force: same forces, plus footprint separation each tick.
export function live(graph, onTick) {
  const items = graph.nodes.map((n) => ({ n, x: n.x, y: n.y, fp: n.fp.force, fixed: n.role === "me" }));
  for (const d of items) if (d.fixed) Object.assign(d, { fx: 0, fy: 0 });
  const sim = simulation(graph, items);
  sim.force("rects", () => separate(items, 1)).alpha(0).on("tick", () => {
    for (const d of items) {
      d.n.x = d.x;
      d.n.y = d.y;
    }
    onTick();
  });
  const byNode = new Map(items.map((d) => [d.n, d]));
  return {
    start(n) {
      for (const d of items) Object.assign(d, { x: d.n.x, y: d.n.y, vx: 0, vy: 0 });
      const d = byNode.get(n);
      Object.assign(d, { fx: n.x, fy: n.y });
      sim.alphaTarget(0.25).restart();
    },
    move(n, x, y) {
      Object.assign(byNode.get(n), { fx: x, fy: y });
    },
    end(n) {
      const d = byNode.get(n);
      if (!d.fixed) Object.assign(d, { fx: null, fy: null });
      sim.alphaTarget(0);
    },
    stop() {
      sim.stop();
    },
  };
}
