// Playwright at 1440 x 900: the open flow (CLAUDE.md, Open flow), in every view.
// - preview on hover; click opens the grow card beside the node, and it follows a zoom
// - a label link in the card opens that label; Expand opens the panel, the selected node
//   stays visible beside it with its lines in ultramarine; clicking a node updates it
// - switching view with the panel open keeps the node visible
// - Full page opens /work/<slug>/ over the map; Next moves on; browser Back steps out of
//   the page, then the panel, then the card; Esc does the same, then clears the focus
// - deep links: ?view= and #<id> (works, keywords, the name; unknown ids are ignored)
// - /work/<slug>/ and the index read with JS off; phone width shows card and panel as sheets
// - no console errors
// Exits 1 on any failure. Options: --shots <dir> saves a screenshot of each step.
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium } from "playwright";
import { serve } from "./serve.mjs";
import { readData } from "./data.mjs";

const shotsAt = process.argv.indexOf("--shots");
const shots = shotsAt > 0 ? resolve(process.argv[shotsAt + 1]) : null;
if (shots) mkdirSync(shots, { recursive: true });

const VIEWS = ["edge", "force", "rings"];
const KEY = { edge: "1", force: "2", rings: "3" };
const PANEL_W = 420;

const server = await serve();
const browser = await chromium.launch();
const errors = [];
const failures = [];
const expect = (ok, msg) => {
  if (!ok) failures.push(msg);
  return ok;
};
const step = (name) => console.log(`  ${name}`);

async function newPage(opts = {}) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, ...opts });
  page.on("console", (m) => m.type() === "error" && errors.push(`console: ${m.text()}`));
  page.on("pageerror", (e) => errors.push(`page: ${e.message}`));
  page.on("requestfailed", (r) => !/fonts\.(googleapis|gstatic)/.test(r.url()) && errors.push(`request: ${r.url()} ${r.failure()?.errorText}`));
  return page;
}
async function load(page, path) {
  await page.goto(server.url.replace(/\/$/, "") + path);
  await page.waitForFunction(() => window.__map && document.documentElement.classList.contains("map-ready"), null, { timeout: 20000 });
  await page.waitForTimeout(300);
}
const settle = (page, ms = 250) => page.waitForFunction(() => !window.__map.views.state.moving).then(() => page.waitForTimeout(ms));
const shot = async (page, name) => shots && page.screenshot({ path: join(shots, `${name}.png`) });

// Flow state, URL and what shows.
const state = (page) =>
  page.evaluate(() => ({
    layer: window.__map.flow.state.layer,
    id: window.__map.flow.state.id,
    focus: window.__map.views.state.focus,
    view: window.__map.views.state.view,
    url: location.pathname + location.search + location.hash,
    depth: history.state?.depth,
    card: !document.querySelector(".card").hidden,
    panel: !document.querySelector(".panel").hidden,
    page: !document.querySelector(".page-layer").hidden,
    inert: document.querySelector(".frame").inert,
  }));

// The node's box on screen, and whether its centre is on screen clear of the panel.
const nodeBox = (page, id) =>
  page.evaluate(
    ([id, pw]) => {
      const r = window.__map.graph.byId.get(id).hit.getBoundingClientRect();
      const right = window.innerWidth - (document.querySelector(".panel").hidden ? 0 : pw);
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      return { l: r.left, r: r.right, t: r.top, b: r.bottom, visible: cx > 0 && cx < right && cy > 0 && cy < window.innerHeight };
    },
    [id, PANEL_W],
  );

async function besideNode(page, id, tag) {
  const n = await nodeBox(page, id);
  const c = await page.evaluate(() => {
    const r = document.querySelector(".card").getBoundingClientRect();
    return { l: r.left, r: r.right, t: r.top, b: r.bottom };
  });
  const side = c.l >= n.r - 1 || c.r <= n.l + 1;
  const near = Math.min(Math.abs(c.l - n.r), Math.abs(n.l - c.r)) < 40;
  const overlapY = c.t < n.b && c.b > n.t;
  expect(side && near && overlapY, `${tag}: card not beside ${id} (card ${JSON.stringify(c)}, node ${JSON.stringify(n)})`);
}

const clickNode = (page, id) => page.evaluate((id) => window.__map.graph.byId.get(id).el.dispatchEvent(new MouseEvent("click", { bubbles: true })), id);
const focusLines = (page) => page.evaluate(() => document.querySelectorAll(".m-line.is-focus").length);

try {
  for (const view of VIEWS) {
    const page = await newPage();
    const other = VIEWS[(VIEWS.indexOf(view) + 1) % 3];
    step(`${view}: preview, card, label, panel, page, Back`);
    await load(page, view === "edge" ? "/" : `/?view=${view}`);
    let s = await state(page);
    expect(s.view === view, `${view}: ?view= started in ${s.view}`);

    // Preview on hover.
    const tile = await nodeBox(page, "cypher");
    await page.mouse.move(tile.l + 30, tile.t + 30);
    await page.waitForTimeout(400);
    const pv = await page.evaluate(() => {
      const p = document.querySelector(".preview");
      return { shown: !p.hidden, text: p.textContent };
    });
    expect(pv.shown && pv.text.includes("CYPHER") && pv.text.includes("Magazine"), `${view}: preview ${JSON.stringify(pv)}`);
    await shot(page, `${view}-1-preview`);

    // Click: grow card beside the node, following a zoom.
    await page.mouse.click(tile.l + 30, tile.t + 30);
    await page.waitForTimeout(350);
    s = await state(page);
    expect(s.layer === "card" && s.id === "cypher" && s.card && s.focus === "cypher" && s.depth === 1, `${view}: click: ${JSON.stringify(s)}`);
    expect(await page.evaluate(() => document.querySelector(".preview").hidden), `${view}: preview still showing over the card`);
    const cardText = await page.evaluate(() => document.querySelector(".card").textContent);
    expect(["CYPHER", "Expand", "Full page", "Editorial design", "A uni assignment"].every((t) => cardText.includes(t)), `${view}: card content: ${cardText.slice(0, 200)}`);
    const rowsLed = await page.evaluate(() => [...document.querySelectorAll(".card .lrow")].every((r) => r.querySelector("dt svg.ic") && !r.querySelector("dd .lk:not(a)")));
    expect(rowsLed, `${view}: card label rows not led by an icon with links`);
    await besideNode(page, "cypher", `${view} card`);
    await shot(page, `${view}-2-card`);
    await page.evaluate(() => window.__map.zoom.by(1.3, 0));
    await page.waitForTimeout(150);
    await besideNode(page, "cypher", `${view} card after zoom`);
    await page.evaluate(() => window.__map.zoom.to(window.__map.views.home(), 0));
    await page.waitForTimeout(100);

    // A label link in the card opens that keyword's card.
    await page.click(".card a[data-node='editorial-design']");
    await page.waitForTimeout(300);
    s = await state(page);
    expect(s.layer === "card" && s.id === "editorial-design" && s.focus === "editorial-design" && s.depth === 1, `${view}: label link: ${JSON.stringify(s)}`);
    await besideNode(page, "editorial-design", `${view} keyword card`);

    // Expand: the panel; the node stays visible beside it with lines in ultramarine.
    await page.click(".card [data-act='expand']");
    await page.waitForTimeout(600);
    s = await state(page);
    expect(s.layer === "panel" && s.panel && !s.card && s.url.endsWith("#editorial-design") && s.depth === 2, `${view}: Expand: ${JSON.stringify(s)}`);
    expect((await nodeBox(page, "editorial-design")).visible, `${view}: keyword hidden behind the panel`);
    expect((await focusLines(page)) > 0, `${view}: no ultramarine lines for the panel's node`);
    await shot(page, `${view}-3-panel-keyword`);

    // Clicking a node on the map updates the panel.
    await clickNode(page, "symbiosis");
    await page.waitForTimeout(600);
    s = await state(page);
    expect(s.layer === "panel" && s.id === "symbiosis" && s.url.endsWith("#symbiosis") && s.depth === 2, `${view}: node click with panel: ${JSON.stringify(s)}`);
    expect((await nodeBox(page, "symbiosis")).visible, `${view}: symbiosis hidden behind the panel`);
    const tabs = await page.evaluate(() => [...document.querySelectorAll(".panel [role='tab']")].map((t) => `${t.textContent}${t.disabled ? "-" : ""}`).join(","));
    const imgs = await page.evaluate(() => window.__map.graph.byId.get("symbiosis").data.images.length);
    expect(tabs === `Overview,Images${imgs ? "" : "-"},Process,Connections`, `${view}: tabs ${tabs} with ${imgs} images`);
    await page.click(".panel [data-tab='process']");
    const steps = await page.evaluate(() => document.querySelectorAll(".panel .steps li").length);
    expect(steps === 18, `${view}: Process tab shows ${steps} steps`);
    await page.keyboard.press("ArrowRight");
    const sel = await page.evaluate(() => document.querySelector(".panel [aria-selected='true']").dataset.tab);
    expect(sel === "connections", `${view}: ArrowRight on the tabs went to ${sel}`);

    // Switching view with the panel open keeps the node visible.
    await page.evaluate(() => document.activeElement.blur());
    await page.keyboard.press(KEY[other]);
    await settle(page, 300);
    s = await state(page);
    expect(s.view === other && s.url.includes(other === "edge" ? "/#symbiosis" : `?view=${other}#symbiosis`), `${view}: view switch with panel: ${JSON.stringify(s)}`);
    expect((await nodeBox(page, "symbiosis")).visible, `${view}: symbiosis hidden after switching to ${other}`);
    await shot(page, `${view}-4-panel-${other}`);

    // Full page, Next, then Back out of page, panel and card.
    await page.click(".panel [data-act='page']");
    await page.waitForTimeout(800);
    s = await state(page);
    const h1 = await page.evaluate(() => document.querySelector(".page-layer h1")?.textContent);
    expect(s.layer === "page" && s.page && s.inert && s.url === "/work/symbiosis/" && h1 === "Symbiosis" && s.depth === 3, `${view}: Full page: ${JSON.stringify(s)} ${h1}`);
    await shot(page, `${view}-5-page`);
    await page.click(".page-layer .wp-nextlink >> nth=0");
    await page.waitForTimeout(300);
    s = await state(page);
    expect(s.url === "/work/cypher/" && s.id === "cypher" && (await page.evaluate(() => document.querySelector(".page-layer h1").textContent)) === "CYPHER", `${view}: Next: ${JSON.stringify(s)}`);
    await page.goBack();
    await page.waitForTimeout(800);
    s = await state(page);
    expect(s.layer === "panel" && s.id === "cypher" && !s.page && !s.inert && s.url.endsWith("#cypher"), `${view}: Back from page: ${JSON.stringify(s)}`);
    await page.goBack();
    await page.waitForTimeout(400);
    s = await state(page);
    expect(s.layer === "card" && s.id === "cypher" && s.card && !s.panel && !s.url.includes("#"), `${view}: Back from panel: ${JSON.stringify(s)}`);
    await page.goBack();
    await page.waitForTimeout(400);
    s = await state(page);
    expect(!s.layer && !s.card && s.depth === 0, `${view}: Back from card: ${JSON.stringify(s)}`);

    step(`${view}: keyboard and Esc`);
    await page.evaluate(() => window.__map.graph.byId.get("16-days-of-real-talk").el.focus());
    await page.waitForTimeout(100);
    expect(await page.evaluate(() => !document.querySelector(".preview").hidden), `${view}: no preview on keyboard focus`);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(300);
    s = await state(page);
    const inCard = await page.evaluate(() => !!document.activeElement.closest(".card"));
    expect(s.layer === "card" && s.id === "16-days-of-real-talk" && inCard, `${view}: Enter: ${JSON.stringify(s)}, focus in card ${inCard}`);
    await page.click(".card [data-act='page']");
    await page.waitForTimeout(800);
    s = await state(page);
    expect(s.layer === "page" && s.url === "/work/16-days-of-real-talk/" && s.depth === 3, `${view}: Full page from the card: ${JSON.stringify(s)}`);
    await page.keyboard.press(KEY[view === "edge" ? "rings" : "edge"]); // ignored while the page shows
    expect((await state(page)).view === s.view, `${view}: a shortcut worked behind the page`);
    const want = ["panel", "card", null];
    for (const layer of want) {
      await page.keyboard.press("Escape");
      await page.waitForTimeout(layer === "panel" ? 800 : 350);
      s = await state(page);
      expect(s.layer === layer, `${view}: Esc to ${layer}: ${JSON.stringify(s)}`);
    }
    const on = await page.evaluate(() => document.activeElement.dataset?.id);
    expect(s.focus === "16-days-of-real-talk" && on === s.focus && s.depth === 0, `${view}: Esc from card: focus ${s.focus}, keyboard on ${on}, depth ${s.depth}`);
    await page.keyboard.press("Escape");
    expect(!(await state(page)).focus, `${view}: last Esc did not clear the focus`);

    step(`${view}: About, map click, focus chip`);
    await page.click("#btn-about");
    await page.waitForTimeout(500);
    s = await state(page);
    const about = await page.evaluate(() => [...document.querySelectorAll(".panel [role='tab']")].map((t) => t.textContent).join(","));
    expect(s.layer === "panel" && s.id === "me" && s.url.endsWith("#me") && about === "Overview,Experience,Connections", `${view}: About: ${JSON.stringify(s)} ${about}`);
    await page.click(".panel [data-act='close']");
    await page.waitForTimeout(300);
    s = await state(page);
    expect(!s.layer && s.depth === 0, `${view}: About closed: ${JSON.stringify(s)}`);
    await clickNode(page, "collab");
    await page.waitForTimeout(300);
    await page.mouse.click(1300, 860);
    await page.waitForTimeout(300);
    s = await state(page);
    expect(!s.layer && !s.focus && s.depth === 0, `${view}: map click did not close the card: ${JSON.stringify(s)}`);
    await clickNode(page, "collab");
    await page.waitForTimeout(300);
    await page.click(".achip-focus");
    await page.waitForTimeout(300);
    s = await state(page);
    expect(!s.layer && !s.focus && s.depth === 0, `${view}: focus chip did not close the card: ${JSON.stringify(s)}`);
    await page.close();
  }

  step("deep links");
  {
    const page = await newPage();
    const cases = [
      ["/?view=rings#symbiosis", { view: "rings", layer: "panel", id: "symbiosis" }],
      ["/?view=force#visual-culture", { view: "force", layer: "panel", id: "visual-culture" }],
      ["/#me", { view: "edge", layer: "panel", id: "me" }],
      ["/#ibm-qt-hotels", { view: "edge", layer: "panel", id: "ibm-qt-hotels" }],
      ["/?view=force", { view: "force", layer: null, id: null }],
      ["/?view=nope#nope", { view: "edge", layer: null, id: null }],
      ["/#rings", { view: "rings", layer: null, id: null }],
    ];
    for (const [path, want] of cases) {
      await page.goto("about:blank");
      await load(page, path);
      await settle(page);
      const s = await state(page);
      const ok = s.view === want.view && s.layer === want.layer && s.id === want.id;
      expect(ok, `deep link ${path}: ${JSON.stringify(s)}`);
      if (want.id && want.id !== "me") expect((await nodeBox(page, want.id)).visible, `deep link ${path}: node not visible beside the panel`);
      if (want.layer === "panel") {
        await page.keyboard.press("Escape");
        await page.waitForTimeout(300);
        const c = await state(page);
        expect(c.layer === "card" && c.id === want.id && !c.url.includes("#"), `deep link ${path}: Esc did not step to the card: ${JSON.stringify(c)}`);
      }
    }
    // A label link followed from outside the map (a /#id link on a work page).
    await load(page, "/");
    await page.evaluate(() => {
      location.hash = "#design-research";
    });
    await page.waitForTimeout(500);
    const s = await state(page);
    expect(s.layer === "panel" && s.id === "design-research", `hash change: ${JSON.stringify(s)}`);
    await page.close();
  }

  step("work pages and index with JS off");
  {
    const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    page.on("pageerror", (e) => errors.push(`page (no JS): ${e.message}`));
    for (const [slug, title, steps] of [["cypher", "CYPHER", 2], ["16-days-of-real-talk", "16 Days of Real Talk", 6], ["symbiosis", "Symbiosis", 18]]) {
      const res = await page.goto(`${server.url}work/${slug}/`);
      const r = await page.evaluate(() => ({
        h1: document.querySelector("h1")?.textContent,
        size: parseFloat(getComputedStyle(document.querySelector("h1")).fontSize),
        steps: document.querySelectorAll(".steps li").length,
        links: document.querySelectorAll(".wp a.lk[href^='/#']").length,
        next: [...document.querySelectorAll(".wp-nextlink")].map((a) => a.getAttribute("href")),
        back: document.querySelector(".wp-back")?.getAttribute("href"),
        overflow: document.documentElement.scrollWidth > window.innerWidth,
      }));
      const ok = res.ok() && r.h1 === title && r.size > 40 && r.steps === steps && r.links > 5 && r.next.length === 2 && r.back === `/#${slug}` && !r.overflow;
      expect(ok, `/work/${slug}/ without JS: ${JSON.stringify(r)}`);
      if (shots) await page.screenshot({ path: join(shots, `nojs-${slug}.png`), fullPage: true });
    }
    await page.goto(server.url);
    const ix = await page.evaluate(() => ({
      rows: [...document.querySelectorAll("#pop-index tbody tr")].filter((tr) => tr.offsetParent).length,
      pages: [...document.querySelectorAll("#pop-index a.ix-open")].map((a) => a.getAttribute("href")),
    }));
    expect(ix.rows === readData().works.length && ix.pages.join() === "/work/cypher/,/work/16-days-of-real-talk/,/work/symbiosis/", `index without JS: ${JSON.stringify(ix)}`);
    await ctx.close();
  }

  step("phone: card and panel as sheets");
  {
    const page = await newPage({ viewport: { width: 390, height: 844 } });
    await load(page, "/");
    await clickNode(page, "symbiosis");
    await page.waitForTimeout(300);
    const card = await page.evaluate(() => {
      const r = document.querySelector(".card").getBoundingClientRect();
      return [r.left, r.top, r.width, r.height];
    });
    expect(card[0] === 0 && card[1] === 0 && card[2] === 390 && card[3] === 844, `phone card: ${card}`);
    await shot(page, "phone-card");
    await page.click(".card [data-act='expand']");
    await page.waitForTimeout(300);
    const panel = await page.evaluate(() => document.querySelector(".panel").getBoundingClientRect().width);
    expect(panel === 390, `phone panel width ${panel}`);
    await shot(page, "phone-panel");
    await page.close();
  }
} catch (e) {
  failures.push(`run: ${e.message}`);
} finally {
  await browser.close();
  await server.close();
}

failures.push(...errors);
if (failures.length) {
  console.error(`check-open: ${failures.length} problem${failures.length === 1 ? "" : "s"}`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}
console.log("check-open: ok");
