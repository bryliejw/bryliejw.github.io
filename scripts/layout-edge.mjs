// Precomputes the Edge map: loads the map in Playwright with ?relayout (real fonts, real
// footprints), runs js/map/layout-edge.js and writes each work's position into
// data/nodes.json as pos.edge. Keyword strips are rebuilt the same way at load.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import { serve, root } from "./serve.mjs";

const file = join(root, "data", "nodes.json");
const server = await serve();
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on("pageerror", (e) => {
    throw e;
  });
  await page.goto(`${server.url}?relayout`);
  await page.waitForFunction(() => window.__map, null, { timeout: 20000 });
  const pos = await page.evaluate(() => window.__map.edgePositions());

  const data = JSON.parse(readFileSync(file, "utf8"));
  let changed = 0;
  for (const w of data.works) {
    const p = pos[w.id].map((v) => Math.round(v));
    if (JSON.stringify(w.pos.edge) !== JSON.stringify(p)) changed++;
    w.pos.edge = p;
  }
  // pos.edge stays on one line: "edge": [x, y]
  const json = JSON.stringify(data, null, 2).replace(/"edge": \[\s+(-?\d+),\s+(-?\d+)\s+\]/g, '"edge": [$1, $2]');
  writeFileSync(file, json + "\n");
  console.log(`layout-edge: ${data.works.length} works placed, ${changed} changed`);
} finally {
  await browser.close();
  await server.close();
}
