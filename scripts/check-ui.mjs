// Playwright at 1440 x 900: the interface (CLAUDE.md, Page layout and Shortcuts).
// - every icon-only control has an aria-label and a tooltip with its name (and shortcut)
// - Tab reaches every control with a visible 2px ultramarine focus ring
// - each shortcut opens its layer, only one layer is open at a time, Esc and a map click close
// - the drawer, chips, filter badge, index, readout and map group labels agree on counts
// - the search palette works by keyboard, and picking a hidden work shows it again
// - no console errors
// Exits 1 on any failure. Options: --shots <dir> saves the drawer, palette and key.
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium } from "playwright";
import { serve } from "./serve.mjs";

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
const expect = (ok, msg) => {
  if (!ok) failures.push(msg);
  return ok;
};
const step = (name) => console.log(`  ${name}`);
const press = async (key, wait = 120) => {
  await page.keyboard.press(key);
  await page.waitForTimeout(wait);
};
const openLayers = () => page.evaluate(() => [...document.querySelectorAll(".pop, .palette")].filter((e) => !e.hidden).map((e) => e.id));
const active = () => page.evaluate(() => document.activeElement?.id || document.activeElement?.getAttribute("aria-label") || document.activeElement?.tagName);

try {
  await page.goto(server.url);
  await page.waitForFunction(() => window.__map && document.documentElement.classList.contains("map-ready"), null, { timeout: 20000 });
  await page.waitForTimeout(500);

  step("labels and tooltips");
  const unlabelled = await page.evaluate(() => {
    const bad = [];
    for (const el of document.querySelectorAll("button, a[href], [role='button']")) {
      if (el.closest(".map")) continue;
      const text = [...el.childNodes].filter((n) => !(n.nodeType === 1 && n.classList.contains("navtext"))).map((n) => n.textContent).join("").trim();
      const iconOnly = !text || el.matches(".navlink");
      if (!iconOnly) continue;
      const name = el.getAttribute("aria-label") || el.querySelector(".navtext")?.textContent;
      if (!name) bad.push(`${el.id || el.outerHTML.slice(0, 60)}: no aria-label`);
      if (!el.dataset.tip) bad.push(`${el.id || name}: no tooltip`);
      if (el.closest(".rail, .zoomctl") && !el.dataset.key) bad.push(`${el.id || name}: tooltip has no shortcut`);
      const tip = getComputedStyle(el, "::after").content;
      if (el.closest(".rail, .zoomctl") && !(tip.includes(el.dataset.tip) && tip.includes(el.dataset.key))) bad.push(`${el.id || name}: tooltip shows ${tip}`);
    }
    return bad;
  });
  for (const b of unlabelled) failures.push(`label: ${b}`);

  step("tab order and focus ring");
  const ring = await tabRing(60);
  for (const r of ring.bad) failures.push(`focus ring: ${r}`);
  expect(ring.reached.includes("btn-search") && ring.reached.includes("btn-key") && ring.reached.includes("btn-contact") && ring.nodes > 0, `tab order: missed controls (${ring.reached.join(", ")})`);
  await page.mouse.click(5, 450); // blur onto the map edge

  step("shortcuts and one layer at a time");
  const KEYS = [["f", "pop-filter"], ["l", "pop-layers"], ["i", "pop-index"], ["?", "pop-key"], ["/", "palette"]];
  for (const [k, id] of KEYS) {
    await press(k);
    const open = await openLayers();
    expect(open.length === 1 && open[0] === id, `shortcut ${k}: open layers ${JSON.stringify(open)}, want ${id}`);
  }
  await press("Escape");
  expect((await openLayers()).length === 0, "Esc: palette still open");
  expect((await active()) === "btn-search", `Esc: focus went to ${await active()}, want btn-search`);
  await press("Control+k");
  expect((await openLayers())[0] === "palette", "Ctrl+K: palette not open");
  await press("Control+k");
  expect((await openLayers()).length === 0, "Ctrl+K: palette did not toggle closed");
  await press("f");
  await page.mouse.click(720, 300);
  await page.waitForTimeout(120);
  expect((await openLayers()).length === 0, "map click: filter drawer still open");
  await press("Escape");
  for (const [k, view] of [["2", "force"], ["3", "rings"], ["1", "edge"]]) {
    await press(k, 50);
    await page.waitForFunction(() => !window.__map.views.state.moving);
    const v = await page.evaluate(() => window.__map.views.state.view);
    expect(v === view, `shortcut ${k}: view ${v}`);
  }
  const k0 = await page.evaluate(() => window.__map.graph.k);
  await press("+", 400);
  const k1 = await page.evaluate(() => window.__map.graph.k);
  await press("-", 400);
  await press("0", 550);
  const k2 = await page.evaluate(() => window.__map.graph.k);
  expect(k1 > k0 * 1.3 && Math.abs(k2 - k0) < 0.01, `zoom shortcuts: ${k0} then ${k1} then ${k2}`);
  await press("r");
  const surprise = await page.evaluate(() => ({ f: window.__map.views.state.focus, a: document.activeElement.dataset?.id }));
  expect(surprise.f && surprise.f === surprise.a, `R: focus ${surprise.f}, keyboard on ${surprise.a}`);
  await press("Escape");
  expect(!(await page.evaluate(() => window.__map.views.state.focus)), "Esc: focus not cleared");

  step("counts agree with no filter");
  await agree("no filter");

  step("filter by keyboard");
  await press("f");
  await press("Tab"); // first switch is focused on open: move to Extras / experiments
  await press("Space");
  for (let i = 0; i < 4; i++) await press("Tab"); // Works, Clients, Disciplines, Deliverables
  await press("Space");
  const year = page.locator(".ychip", { hasText: "2024" });
  await year.focus();
  await press("Enter");
  const hidden = await page.evaluate(() => window.__map.filter.hiddenKeys());
  expect(JSON.stringify(hidden) === JSON.stringify(["work:experiment", "kw:deliverable", "year:2024"]), `filter keys: ${JSON.stringify(hidden)}`);
  await agree("three groups hidden");
  if (shots) await page.screenshot({ path: join(shots, "drawer.png") });
  await press("Escape");
  expect((await active()) === "btn-filter", "Esc: focus did not return to Filter");

  step("chips");
  const chips = await page.locator(".achip:not(.achip-clear)").count();
  expect(chips === 3, `chips: ${chips}, want 3`);
  await page.locator(".achip", { hasText: "Deliverables" }).click();
  await agree("after a chip");

  step("palette");
  await press("/");
  await page.keyboard.type("coll");
  await page.waitForTimeout(100);
  const first = await page.evaluate(() => document.querySelector(".pal-opt[aria-selected='true'] .pal-label")?.textContent);
  expect(first === "COLLAB", `palette: first result ${first}`);
  await press("Enter", 500);
  const picked = await page.evaluate(() => ({
    focus: window.__map.views.state.focus,
    on: document.activeElement.dataset?.id,
    hidden: window.__map.graph.byId.get("collab").hidden,
  }));
  expect(picked.focus === "collab" && picked.on === "collab" && !picked.hidden, `palette pick of a hidden work: ${JSON.stringify(picked)}`);
  await agree("after re-showing a work");
  await press("/");
  await page.keyboard.type("sy");
  await press("ArrowDown");
  if (shots) await page.screenshot({ path: join(shots, "palette.png") });
  await press("Escape");

  step("index");
  await press("i");
  const row = await page.evaluate(() => document.activeElement.closest("tr")?.dataset.id);
  expect(!!row, "index: first row not focused on open");
  await press("Enter", 500);
  const fromIndex = await page.evaluate(() => window.__map.views.state.focus);
  expect(fromIndex === row, `index: Enter focused ${fromIndex}, want ${row}`);

  step("key");
  await page.locator(".achip-clear").click();
  await page.waitForTimeout(150);
  await agree("cleared");
  await press("?");
  if (shots) await page.screenshot({ path: join(shots, "key.png") });
  await press("Escape");
  expect((await active()) === "btn-key", "Esc: focus did not return to Key");
} catch (e) {
  failures.push(`run: ${e.message}`);
} finally {
  await browser.close();
  await server.close();
}

failures.push(...errors);
if (failures.length) {
  console.error(`check-ui: ${failures.length} problem${failures.length === 1 ? "" : "s"}`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}
console.log("check-ui: ok");

// Tabs from the top of the page and checks each stop shows a 2px ultramarine ring.
async function tabRing(max) {
  await page.evaluate(() => document.activeElement?.blur());
  const reached = [];
  const bad = [];
  let nodes = 0;
  for (let i = 0; i < max; i++) {
    await page.keyboard.press("Tab");
    const r = await page.evaluate(() => {
      const el = document.activeElement;
      const id = el.id || el.getAttribute("aria-label") || el.dataset?.id || el.tagName;
      if (el.matches(".node")) {
        const ring = el.querySelector(".ring");
        const cs = getComputedStyle(ring);
        return { id, node: true, ok: cs.display !== "none" && cs.stroke === "rgb(42, 45, 245)" && cs.strokeWidth === "2px" };
      }
      const target = el.matches(".sw-input, .seg input") ? el.nextElementSibling : el;
      const cs = getComputedStyle(target);
      return { id, ok: cs.outlineStyle === "solid" && cs.outlineWidth === "2px" && cs.outlineColor === "rgb(42, 45, 245)" };
    });
    if (r.node) nodes++;
    else reached.push(r.id);
    if (!r.ok) bad.push(r.id);
    if (nodes > 3) break;
  }
  return { reached, bad, nodes };
}

// Every count on the page against the map itself.
async function agree(tag) {
  const r = await page.evaluate(() => {
    const { graph, filter } = window.__map;
    const shownWorks = graph.works.filter((w) => getComputedStyle(w.el).display !== "none").length;
    const shownKws = graph.kws.filter((k) => getComputedStyle(k.el).display !== "none").length;
    const num = (s) => s.match(/(\d+) of (\d+)/)?.slice(1).map(Number);
    const rows = [...document.querySelectorAll("#pop-filter .sw-row")].map((r) => ({
      on: r.querySelector("input").checked,
      n: +r.querySelector(".sw-count").textContent,
      work: !!r.closest("section").querySelector("#f-work"),
    }));
    const groupLabels = graph.groups.filter((g) => getComputedStyle(g.el).display !== "none").reduce((s, g) => s + +g.count.textContent, 0);
    const readout = document.getElementById("readout").textContent;
    const badge = document.getElementById("filter-badge");
    return {
      shownWorks,
      shownKws,
      drawer: num(document.querySelector(".pop-showing").textContent),
      index: num(document.getElementById("index-count").textContent),
      indexRows: [...document.querySelectorAll("#pop-index tbody tr")].filter((tr) => !tr.hidden).length,
      readoutWorks: num(readout.split("·")[1]),
      readoutKws: num(readout.split("·")[2]),
      workRows: rows.filter((r) => r.work && r.on).reduce((s, r) => s + r.n, 0),
      kwRows: rows.filter((r) => !r.work && r.on).reduce((s, r) => s + r.n, 0),
      groupLabels,
      chips: document.querySelectorAll(".achip:not(.achip-clear):not(.achip-focus)").length,
      badge: badge.hidden ? 0 : +badge.textContent,
      hidden: filter.hiddenKeys().length,
      total: graph.works.length,
    };
  });
  const w = r.shownWorks;
  const k = r.shownKws;
  const ok =
    r.drawer?.[0] === w && r.index?.[0] === w && r.indexRows === w && r.readoutWorks?.[0] === w && r.workRows === w && r.drawer?.[1] === r.total &&
    r.readoutKws?.[0] === k && r.kwRows === k && r.groupLabels === k &&
    r.chips === r.hidden && r.badge === r.hidden;
  console.log(`    ${tag}: ${w} works, ${k} keywords, ${r.hidden} hidden groups${ok ? "" : ` MISMATCH ${JSON.stringify(r)}`}`);
  expect(ok, `counts disagree (${tag}): ${JSON.stringify(r)}`);
}
