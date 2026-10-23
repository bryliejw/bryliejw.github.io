// Playwright at 1440 x 900. Loads the map, switches views in all six directions with the
// keyboard shortcuts, and checks each view at its home zoom with default settings
// (labels Auto, lines Auto): label or tile overlaps (0 in Edge map, at most 3 in Force
// and Rings) and console errors. Exits 1 on any failure.
// Options: --shots <dir> saves a screenshot of each view.
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium } from "playwright";
import { serve } from "./serve.mjs";

const LIMIT = { edge: 0, force: 3, rings: 3 };
const KEY = { force: "1", rings: "2", edge: "3" };
// Six directions, each view visited from both others.
const ROUTE = ["rings", "edge", "rings", "force", "edge", "force"];

const shotsAt = process.argv.indexOf("--shots");
const shots = shotsAt > 0 ? resolve(process.argv[shotsAt + 1]) : null;
if (shots) mkdirSync(shots, { recursive: true });

const server = await serve();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(`console: ${m.text()}`));
page.on("pageerror", (e) => errors.push(`page: ${e.message}`));
page.on("requestfailed", (r) => errors.push(`request: ${r.url()} ${r.failure()?.errorText}`));

const failures = [];
try {
  await page.goto(server.url);
  await page.waitForFunction(() => window.__map, null, { timeout: 20000 });
  await settle();

  const seen = new Set();
  await checkView("force");
  seen.add("force");
  let from = "force";
  for (const to of ROUTE) {
    await switchTo(from, to);
    if (!seen.has(to)) {
      await checkView(to);
      seen.add(to);
    }
    from = to;
  }
} catch (e) {
  failures.push(`run: ${e.message}`);
} finally {
  await browser.close();
  await server.close();
}

failures.push(...errors);
if (failures.length) {
  console.error(`check: ${failures.length} problem${failures.length === 1 ? "" : "s"}`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}
console.log("check: ok");

async function settle() {
  await page.waitForFunction(() => !window.__map.views.state.moving);
  await page.waitForTimeout(450); // label fades
}

async function switchTo(from, to) {
  const t0 = Date.now();
  await page.keyboard.press(KEY[to]);
  // Halfway through, nodes must be between their two places (animated, not jumped).
  await page.waitForTimeout(300);
  const mid = await page.evaluate(([a, b]) => {
    const { graph, views } = window.__map;
    const moved = graph.nodes.filter((n) => {
      const [x0, y0] = n.pos[a];
      const [x1, y1] = n.pos[b];
      const d = Math.hypot(x1 - x0, y1 - y0);
      if (d < 20) return false;
      const t = Math.hypot(n.x - x0, n.y - y0) / d;
      return t > 0.02 && t < 0.98;
    }).length;
    return { moving: views.state.moving, moved };
  }, [from, to]);
  if (!mid.moving || mid.moved < 10) failures.push(`${from} to ${to}: not animating at 300ms (${mid.moved} nodes in flight)`);
  await settle();
  const ms = Date.now() - t0;
  const end = await page.evaluate((v) => {
    const { graph, views } = window.__map;
    const off = graph.nodes.filter((n) => Math.hypot(n.x - n.pos[v][0], n.y - n.pos[v][1]) > 0.5).map((n) => n.id);
    const turned = graph.kws.filter((k) => k.orient !== k.lab[v]).map((k) => k.id);
    const pressed = document.querySelector(`.rail [data-view="${v}"]`).getAttribute("aria-pressed");
    return { view: views.state.view, data: graph.svg.dataset.view, off, turned, pressed };
  }, to);
  const tag = `${from} to ${to}`;
  if (end.view !== to || end.data !== to) failures.push(`${tag}: view is ${end.view}`);
  if (end.off.length) failures.push(`${tag}: ${end.off.length} nodes not at their place (${end.off.slice(0, 5).join(", ")})`);
  if (end.turned.length) failures.push(`${tag}: ${end.turned.length} keyword labels not turned`);
  if (end.pressed !== "true") failures.push(`${tag}: view button not active`);
  console.log(`  ${tag.padEnd(16)} ${ms}ms, ${mid.moved} nodes in flight at 300ms`);
}

async function checkView(view) {
  const r = await page.evaluate(overlaps);
  const label = { edge: "Edge map", force: "Force", rings: "Rings" }[view];
  console.log(`${label}: ${r.pairs.length} overlaps (limit ${LIMIT[view]}), ${r.items} labels and tiles checked`);
  for (const p of r.pairs) console.log(`    ${p}`);
  if (r.pairs.length > LIMIT[view]) failures.push(`${label}: ${r.pairs.length} overlaps, limit ${LIMIT[view]}`);
  if (shots) await page.screenshot({ path: join(shots, `${view}.png`) });
  if (view !== "edge") {
    // For information: the same view with every keyword label on (zoom shows them in Auto).
    await page.evaluate(() => window.__map.views.set("labels", "all"));
    await page.waitForTimeout(450);
    const all = await page.evaluate(overlaps);
    console.log(`  with labels All: ${all.pairs.length} overlaps (not limited)`);
    if (shots) await page.screenshot({ path: join(shots, `${view}-labels-all.png`) });
    await page.evaluate(() => window.__map.views.set("labels", "auto"));
    await page.waitForTimeout(450);
  }
}

// In the page: every visible label and tile as a screen-space quad, then pairwise tests
// between different owners (nodes, group labels). Touching within 0.5px is not an overlap.
function overlaps() {
  const { graph } = window.__map;
  const svg = graph.svg;
  const shown = (el) => {
    for (let e = el; e && e !== svg; e = e.parentNode) {
      const cs = getComputedStyle(e);
      if (cs.display === "none" || cs.visibility === "hidden" || +cs.opacity < 0.05) return false;
    }
    return true;
  };
  const quad = (el) => {
    const b = el.getBBox();
    const m = el.getScreenCTM();
    return [
      [b.x, b.y],
      [b.x + b.width, b.y],
      [b.x + b.width, b.y + b.height],
      [b.x, b.y + b.height],
    ].map(([x, y]) => [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f]);
  };
  const items = [];
  const add = (owner, name, el) => {
    if (!el || !shown(el)) return;
    const b = el.getBBox();
    if (!b.width || !b.height) return;
    items.push({ owner, name, q: quad(el) });
  };
  for (const n of graph.nodes) {
    const name = n.role === "work" ? `${n.data.n} ${n.data.title}` : n.role === "kw" ? n.data.label : "name";
    const sel = ".tile, .chip, .sq, .tick, .me-mark, text";
    for (const el of n.body.querySelectorAll(sel)) add(n.id, `${name} (${el.getAttribute("class").split(" ")[0]})`, el);
  }
  for (const g of graph.groups) add(`group-${g.type}`, `${g.name} group label`, g.inner);

  const project = (q, [ax, ay]) => {
    let lo = Infinity;
    let hi = -Infinity;
    for (const [x, y] of q) {
      const v = x * ax + y * ay;
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
    }
    return [lo, hi];
  };
  const axes = (q) =>
    q.slice(0, 2).map((p, i) => {
      const [x0, y0] = p;
      const [x1, y1] = q[i + 1];
      const l = Math.hypot(x1 - x0, y1 - y0) || 1;
      return [-(y1 - y0) / l, (x1 - x0) / l];
    });
  const intersect = (a, b) => {
    for (const ax of [...axes(a), ...axes(b)]) {
      const [a0, a1] = project(a, ax);
      const [b0, b1] = project(b, ax);
      if (Math.min(a1, b1) - Math.max(a0, b0) <= 0.5) return false;
    }
    return true;
  };
  const pairs = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i];
      const b = items[j];
      if (a.owner !== b.owner && intersect(a.q, b.q)) pairs.push(`${a.name} x ${b.name}`);
    }
  }
  return { items: items.length, pairs };
}
