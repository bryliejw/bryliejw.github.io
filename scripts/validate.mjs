// Validates data/nodes.json: schema, unique ids across works and keywords,
// every keyword used, no em dashes or emojis in any string.
// Prints counts on success. --empty also lists every empty copy field.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const data = JSON.parse(readFileSync(join(root, "data", "nodes.json"), "utf8"));
const errors = [];
const fail = (where, msg) => errors.push(`${where}: ${msg}`);

const SIZES = ["L", "M", "S"];
const KINDS = ["project", "experiment", "work", "client"];
const TYPES = ["discipline", "deliverable", "tool", "topic", "value"];
const COPY = ["brief", "insight", "pull", "response", "role", "credit", "oneLine"];
const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const isStr = (v) => typeof v === "string";
const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const isNum = (v) => typeof v === "number" && Number.isFinite(v);

function str(where, v, { empty = true } = {}) {
  if (!isStr(v)) return fail(where, "must be a string");
  if (!empty && !v.trim()) fail(where, "must not be empty");
}
function strOrNull(where, v) {
  if (v !== null) str(where, v, { empty: false });
}
function url(where, v) {
  if (v === null) return;
  if (!isStr(v) || !/^https:\/\//.test(v)) fail(where, "must be an https URL or null");
}
function keys(where, obj, required) {
  for (const k of required) if (!(k in obj)) fail(where, `missing field "${k}"`);
}

// me
const me = data.me;
if (!isObj(me)) fail("me", "missing");
else {
  keys("me", me, ["name", "tagline1", "tagline2", "bio", "education", "certification", "experience", "standpoint", "contact"]);
  str("me.name", me.name, { empty: false });
  str("me.tagline1", me.tagline1, { empty: false });
  str("me.tagline2", me.tagline2, { empty: false });
  if (!Array.isArray(me.bio) || !me.bio.length) fail("me.bio", "must be a non-empty array of paragraphs");
  else me.bio.forEach((p, i) => str(`me.bio[${i}]`, p, { empty: false }));
  for (const [i, e] of (me.education ?? []).entries()) for (const k of ["title", "org", "years"]) str(`me.education[${i}].${k}`, e[k], { empty: false });
  if (isObj(me.certification)) {
    for (const k of ["title", "org"]) str(`me.certification.${k}`, me.certification[k], { empty: false });
    url("me.certification.link", me.certification.link);
  } else fail("me.certification", "must be an object");
  for (const [i, e] of (me.experience ?? []).entries()) for (const k of ["years", "title", "text"]) str(`me.experience[${i}].${k}`, e[k], { empty: false });
  if (isObj(me.standpoint)) {
    str("me.standpoint.quote", me.standpoint.quote, { empty: false });
    url("me.standpoint.link", me.standpoint.link);
  } else fail("me.standpoint", "must be an object");
  if (isObj(me.contact)) {
    str("me.contact.email", me.contact.email, { empty: false });
    for (const k of ["instagram", "linkedin", "website"]) {
      if (!isObj(me.contact[k])) fail(`me.contact.${k}`, "must be { label, url }");
      else {
        str(`me.contact.${k}.label`, me.contact[k].label, { empty: false });
        url(`me.contact.${k}.url`, me.contact[k].url);
      }
    }
  } else fail("me.contact", "must be an object");
}

// keywords
const keywords = Array.isArray(data.keywords) ? data.keywords : (fail("keywords", "must be an array"), []);
const kwById = new Map(keywords.map((k) => [k.id, k]));
for (const [i, k] of keywords.entries()) {
  const w = `keywords[${i}] ${k.id ?? ""}`.trim();
  keys(w, k, ["id", "label", "type", "proposed"]);
  if (!isStr(k.id) || !ID.test(k.id)) fail(w, "id must be lowercase-kebab");
  str(`${w}.label`, k.label, { empty: false });
  if (!TYPES.includes(k.type)) fail(w, `type must be one of ${TYPES.join("|")}`);
  if (typeof k.proposed !== "boolean") fail(w, "proposed must be true or false");
  if (k.related !== undefined) {
    if (!Array.isArray(k.related)) fail(`${w}.related`, "must be an array of keyword ids");
    else for (const r of k.related) {
      if (!kwById.has(r)) fail(`${w}.related`, `unknown keyword "${r}"`);
      if (r === k.id) fail(`${w}.related`, "links to itself");
    }
  }
}

// works
const works = Array.isArray(data.works) ? data.works : (fail("works", "must be an array"), []);
const workIds = new Set(works.map((w) => w.id));
for (const [i, w] of works.entries()) {
  const at = `works[${i}] ${w.id ?? ""}`.trim();
  keys(at, w, ["id", "slug", "n", "title", "sub", "year", "size", "kind", "context", "team", "partOf", "link", "keywords", "images", "copy", "steps", "pos"]);
  if (!isStr(w.id) || !ID.test(w.id)) fail(at, "id must be lowercase-kebab");
  if (!isStr(w.slug) || !ID.test(w.slug)) fail(at, "slug must be lowercase-kebab");
  str(`${at}.n`, w.n, { empty: false });
  str(`${at}.title`, w.title, { empty: false });
  if (isStr(w.title) && /^the\s/i.test(w.title)) fail(`${at}.title`, 'no "The" in front of titles');
  str(`${at}.sub`, w.sub);
  if (w.year !== null && !(Number.isInteger(w.year) && w.year >= 2000 && w.year <= 2100)) fail(`${at}.year`, "must be a year or null");
  if (!SIZES.includes(w.size)) fail(`${at}.size`, `must be one of ${SIZES.join("|")}`);
  if (!KINDS.includes(w.kind)) fail(`${at}.kind`, `must be one of ${KINDS.join("|")}`);
  str(`${at}.context`, w.context, { empty: false });
  str(`${at}.team`, w.team);
  if (w.partOf !== null && !workIds.has(w.partOf)) fail(`${at}.partOf`, `unknown work "${w.partOf}"`);
  if (w.partOf === w.id) fail(`${at}.partOf`, "points at itself");
  url(`${at}.link`, w.link);
  if (!Array.isArray(w.keywords) || !w.keywords.length) fail(`${at}.keywords`, "must be a non-empty array");
  else {
    for (const k of w.keywords) if (!kwById.has(k)) fail(`${at}.keywords`, `unknown keyword "${k}"`);
    if (new Set(w.keywords).size !== w.keywords.length) fail(`${at}.keywords`, "has duplicates");
  }
  if (!Array.isArray(w.images)) fail(`${at}.images`, "must be an array");
  else for (const [j, img] of w.images.entries()) {
    const ia = `${at}.images[${j}]`;
    if (!isObj(img)) { fail(ia, "must be { src, w, h, alt }"); continue; }
    str(`${ia}.src`, img.src, { empty: false });
    if (!isNum(img.w) || !isNum(img.h)) fail(ia, "w and h must be numbers");
    str(`${ia}.alt`, img.alt, { empty: false });
    if (isStr(img.src) && !existsSync(join(root, img.src.replace(/^\//, "")))) fail(`${ia}.src`, `file not found: ${img.src}`);
  }
  if (!isObj(w.copy)) fail(`${at}.copy`, "must be an object");
  else {
    keys(`${at}.copy`, w.copy, COPY);
    for (const k of Object.keys(w.copy)) {
      if (!COPY.includes(k)) fail(`${at}.copy`, `unknown field "${k}"`);
      str(`${at}.copy.${k}`, w.copy[k]);
    }
  }
  if (!Array.isArray(w.steps)) fail(`${at}.steps`, "must be an array");
  else for (const [j, s] of w.steps.entries()) {
    if (!Array.isArray(s) || s.length !== 2 || !isStr(s[0]) || !isStr(s[1]) || !s[0] || !s[1]) fail(`${at}.steps[${j}]`, "must be [label, text]");
  }
  if (!isObj(w.pos)) fail(`${at}.pos`, "must be an object");
  else if (w.pos.edge !== null && !(Array.isArray(w.pos.edge) && w.pos.edge.length === 2 && w.pos.edge.every(isNum))) fail(`${at}.pos.edge`, "must be [x, y] or null");
  if (w.todo !== undefined) str(`${at}.todo`, w.todo, { empty: false });
}

// unique ids across works and keywords, unique slugs and numbers
function unique(label, list) {
  const seen = new Map();
  for (const [where, v] of list) {
    if (seen.has(v)) fail(label, `"${v}" used by ${seen.get(v)} and ${where}`);
    else seen.set(v, where);
  }
}
unique("duplicate id", [...works.map((w) => [`work ${w.id}`, w.id]), ...keywords.map((k) => [`keyword ${k.label}`, k.id])]);
unique("duplicate slug", works.map((w) => [w.id, w.slug]));
unique("duplicate number", works.map((w) => [w.id, w.n]));
unique("duplicate keyword label", keywords.map((k) => [k.id, k.label.toLowerCase()]));

// every keyword used, by a work or by a p01 keyword-to-keyword line
const used = new Set(works.flatMap((w) => w.keywords ?? []));
const related = new Set();
for (const k of keywords) for (const r of k.related ?? []) { related.add(k.id); related.add(r); }
for (const k of keywords) if (!used.has(k.id) && !related.has(k.id)) fail(`keyword ${k.id}`, "not used by any work or keyword line");
const pairs = new Set();
for (const k of keywords) for (const r of k.related ?? []) {
  const key = [k.id, r].sort().join(" ");
  if (pairs.has(key)) fail(`keyword ${k.id}.related`, `line to "${r}" listed twice`);
  pairs.add(key);
}

// no em dashes or emojis in any string
const EMOJI = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{FE0F}]/u;
(function walk(v, path) {
  if (isStr(v)) {
    if (v.includes("—")) fail(path, "contains an em dash");
    if (EMOJI.test(v)) fail(path, "contains an emoji");
  } else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}[${i}]`));
  else if (isObj(v)) for (const [k, x] of Object.entries(v)) walk(x, path ? `${path}.${k}` : k);
})(data, "");

if (errors.length) {
  console.error(`validate: ${errors.length} problem${errors.length === 1 ? "" : "s"}`);
  for (const e of errors) console.error(`  ${e}`);
  process.exit(1);
}

// counts
const count = (list, key) => list.reduce((m, x) => ((m[x[key]] = (m[x[key]] ?? 0) + 1), m), {});
const fmt = (m) => Object.entries(m).map(([k, v]) => `${k} ${v}`).join(", ");
const wk = works.reduce((n, w) => n + w.keywords.length, 0);
const partOf = works.filter((w) => w.partOf).length;
const toMe = works.filter((w) => w.size === "L" || w.id === "terms-of-practice").length;
console.log(`validate: ok`);
console.log(`  works     ${works.length} (${fmt(count(works, "size"))}; ${fmt(count(works, "kind"))})`);
console.log(`  keywords  ${keywords.length} (${fmt(count(keywords, "type"))}; ${keywords.filter((k) => k.proposed).length} proposed)`);
console.log(`  edges     ${wk + partOf + toMe} derived (${wk} work to keyword, ${partOf} partOf, ${toMe} to me); ${pairs.size} keyword lines from p01`);
console.log(`  ids       ${works.length + keywords.length} unique across works and keywords`);

if (process.argv.includes("--empty")) {
  console.log("\nEmpty fields:");
  for (const w of works) {
    const empty = [
      ...["sub", "team"].filter((k) => !w[k]),
      ...(w.year === null ? ["year"] : []),
      ...(w.images.length ? [] : ["images"]),
      ...COPY.filter((k) => !w.copy[k]).map((k) => `copy.${k}`),
      ...(w.steps.length ? [] : ["steps"]),
      ...(w.pos.edge ? [] : ["pos.edge"]),
    ];
    console.log(`  ${w.n.padEnd(4)}${w.title}: ${empty.join(", ") || "none"}${w.todo ? `  [${w.todo}]` : ""}`);
  }
}
