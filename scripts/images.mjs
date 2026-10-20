// Builds the site images from Brylie's selects. For every work with a folder in
// _src/<slug>/, each original image (in file-name order) becomes
//   assets/img/<slug>/<name>.webp      1600px on the long edge
//   assets/img/<slug>/<name>-600.webp  600px on the long edge (thumb)
// Aspect ratio kept, never cropped, never enlarged, EXIF rotation applied. The work's
// images[] in data/nodes.json is rewritten in the same order with src, thumb, w, h (of the
// 1600px file), alt and white. white marks white-ground images (their border is near
// white), which get the 1px keyline.
//
// _src is read only: nothing in it is written, moved or deleted. Alt text is never
// generated: it is kept from nodes.json for an image already listed, or read from an
// optional _src/<slug>/images.json ({ "<file name>": { "alt": "...", "white": true } },
// where white overrides the detection). Images without alt are listed at the end.
// Works without a _src folder keep their images[] as it is. Generated files in
// assets/img/<slug>/ that no longer have an original are removed.
// Options: --force re-encodes every image even when its WebP files are newer.
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, unlinkSync } from "node:fs";
import { extname, join, parse } from "node:path";
import sharp from "sharp";
import { root } from "./serve.mjs";
import { readData, writeData } from "./data.mjs";

const LARGE = 1600;
const THUMB = 600;
const QUALITY = 82;
const INPUT = new Set([".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff", ".avif", ".gif", ".heic", ".heif"]);
const force = process.argv.includes("--force");

// White ground: at least 92% of the pixels in a border ring 2% wide are near white.
const WHITE_MIN = 236;
const WHITE_SHARE = 0.92;

const data = readData();
const name = (file) => parse(file).name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "image";
const byName = (a, b) => a.localeCompare(b, "en", { numeric: true, sensitivity: "base" });
const newer = (out, src) => existsSync(out) && statSync(out).mtimeMs >= statSync(src).mtimeMs;

async function isWhiteGround(file) {
  const { data: px, info } = await sharp(file).rotate().flatten({ background: "#ffffff" }).resize(200, 200, { fit: "inside" }).raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: c } = info;
  const ring = Math.max(1, Math.round(Math.max(w, h) * 0.02));
  let white = 0;
  let total = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (x >= ring && x < w - ring && y >= ring && y < h - ring) continue;
      const i = (y * w + x) * c;
      total++;
      if (Math.min(px[i], px[i + 1], px[i + 2]) >= WHITE_MIN) white++;
    }
  }
  return white / total >= WHITE_SHARE;
}

async function encode(src, out, edge) {
  if (!force && newer(out, src)) return false;
  await sharp(src).rotate().resize(edge, edge, { fit: "inside", withoutEnlargement: true }).webp({ quality: QUALITY, effort: 5 }).toFile(out);
  return true;
}

const missingAlt = [];
let made = 0;
let works = 0;
for (const w of data.works) {
  const dir = join(root, "_src", w.slug);
  if (!existsSync(dir)) continue;
  works++;
  const files = readdirSync(dir).filter((f) => INPUT.has(extname(f).toLowerCase()) && !f.startsWith(".")).sort(byName);
  const sideFile = join(dir, "images.json");
  const side = existsSync(sideFile) ? JSON.parse(readFileSync(sideFile, "utf8")) : {};
  const outDir = join(root, "assets", "img", w.slug);
  mkdirSync(outDir, { recursive: true });
  const before = new Map(w.images.map((im) => [im.src, im]));
  const used = new Map();
  const keep = new Set();
  const images = [];

  for (const f of files) {
    const src = join(dir, f);
    let base = name(f);
    // Two originals that slug the same (a.JPG and a.png) get -2, -3.
    const n = (used.get(base) ?? 0) + 1;
    used.set(base, n);
    if (n > 1) base = `${base}-${n}`;
    const large = join(outDir, `${base}.webp`);
    const thumb = join(outDir, `${base}-${THUMB}.webp`);
    if (await encode(src, large, LARGE)) made++;
    if (await encode(src, thumb, THUMB)) made++;
    keep.add(`${base}.webp`).add(`${base}-${THUMB}.webp`);
    const meta = await sharp(large).metadata();
    const rel = `assets/img/${w.slug}/${base}.webp`;
    const old = before.get(rel);
    const s = side[f] ?? {};
    const alt = s.alt ?? old?.alt ?? "";
    const white = typeof s.white === "boolean" ? s.white : await isWhiteGround(src);
    images.push({ src: rel, thumb: `assets/img/${w.slug}/${base}-${THUMB}.webp`, w: meta.width, h: meta.height, alt, white });
    if (!alt) missingAlt.push(`${w.n} ${w.title}: _src/${w.slug}/${f}`);
  }

  for (const f of readdirSync(outDir)) {
    if (f.endsWith(".webp") && !keep.has(f)) {
      unlinkSync(join(outDir, f));
      console.log(`images: removed assets/img/${w.slug}/${f} (no original)`);
    }
  }
  w.images = images;
  console.log(`images: ${w.n} ${w.title}: ${images.length} image${images.length === 1 ? "" : "s"}${images.some((i) => i.white) ? `, ${images.filter((i) => i.white).length} white-ground` : ""}`);
}

const changed = writeData(data);
console.log(`images: ${works} work folder${works === 1 ? "" : "s"} in _src, ${made} file${made === 1 ? "" : "s"} encoded, nodes.json ${changed ? "updated" : "unchanged"}`);
if (missingAlt.length) {
  console.log(`\nimages: ${missingAlt.length} without alt text (add it in _src/<slug>/images.json or nodes.json):`);
  for (const m of missingAlt) console.log(`  ${m}`);
}
