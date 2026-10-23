// Derived images for the showcases and node frames (data/showcase.json), cut from the
// selects in _src. _src is read only. Writes:
//   assets/img/cypher/book/      flat covers and spreads for the flipbook, and the front
//                                cover the CYPHER node uses
//   assets/img/16-days-of-real-talk/cards/  the 30 card fronts, cut from the card grid
// Run: node scripts/derive.mjs  (part of npm run build)
import sharp from "sharp";
import { mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = (p) => join(root, "_src", p);
const out = (p) => {
  const f = join(root, "assets/img", p);
  mkdirSync(dirname(f), { recursive: true });
  return f;
};

async function webp(input, output, { width, height, extract } = {}) {
  if (!existsSync(input)) throw new Error(`derive: ${input} not found`);
  let img = sharp(input);
  if (extract) img = img.extract(extract);
  if (width || height) img = img.resize({ width, height, fit: "inside", withoutEnlargement: true });
  await img.webp({ quality: 82 }).toFile(output);
}

// CYPHER: flat covers and spreads, in page order. The Placemaking spread is left out.
const BOOK = [
  ["01-All__0-COVER.jpg", "front"],
  ["02-All__21-BACK-COVER.jpg", "back"],
  ["03-All__1-2.jpg", "s01-02"],
  ["06-All__9-10-mid.jpg", "s09-10"],
  ["f08-04_Final__Spread-Mocks__All-Together_fc5c__p004.jpg", "s-egd"],
  ["04-All__17-in2-18.jpg", "s17-18"],
  ["05-All__19-20.jpg", "s19-20"],
  ["11-FINALS__SG-T2__p001.jpg", "sg-cover"],
  ["f09-04_Final__Style-Guide-Mocks__SG_MOCK_0001_0-1_d877__p001.jpg", "sg-00-01"],
  ["f10-04_Final__Style-Guide-Mocks__SG_MOCK_0003_4-5_6696__p001.jpg", "sg-04-05"],
  ["f11-04_Final__Style-Guide-Mocks__SG_MOCK_0009_16-17_94bc__p001.jpg", "sg-16-17"],
];
for (const [f, name] of BOOK) {
  const portrait = !name.startsWith("s") || name === "sg-cover";
  await webp(src(`cypher/${f}`), out(`cypher/book/${name}.webp`), portrait ? { height: 1200 } : { width: 1800 });
}

// 16 Days of Real Talk: the card grid slide is 6 columns by 5 rows of card fronts.
const GRID = "16-days-of-real-talk/f04-cx-figma__FINAL-PRESENTATION__slide22_fd7c.jpg";
const COLS = [129, 332, 534, 738, 941, 1143];
const ROWS = [41, 192, 342, 494, 646];
let i = 0;
for (const top of ROWS) {
  for (const left of COLS) {
    i++;
    await webp(src(GRID), out(`16-days-of-real-talk/cards/card-${String(i).padStart(2, "0")}.webp`), { extract: { left, top, width: 184, height: 131 } });
  }
}
console.log(`derive: ${BOOK.length} CYPHER pages, ${i} cards`);
