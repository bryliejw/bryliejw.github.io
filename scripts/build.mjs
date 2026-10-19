// Regenerates the generated parts of the site from data/nodes.json.
// Now: the index table in index.html (between the index:start and index:end markers),
// so the map page lists every work without JS. Work pages and images come in later phases.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { root } from "./serve.mjs";

const data = JSON.parse(readFileSync(join(root, "data", "nodes.json"), "utf8"));
const file = join(root, "index.html");
const html = readFileSync(file, "utf8");

// Kind icons and words, as in js/ui/filter.js and js/map/render.js.
const ICON = { project: "book-open", experiment: "flask-conical", work: "file", client: "briefcase" };
const kindWord = (w) => (w.kind === "project" ? "Project" : /^E\d/.test(w.n) ? "Extra" : w.kind[0].toUpperCase() + w.kind.slice(1));
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const icon = (name) => `<svg class="ic" aria-hidden="true"><use href="/assets/icons.svg#${name}"/></svg>`;

const rows = data.works.map((w) => {
  const sub = w.sub ? `<span class="ix-sub">${esc(w.sub)}</span>` : "";
  return (
    `        <tr data-id="${esc(w.id)}" data-kind="${w.kind}">` +
    `<td class="ix-n">${esc(w.n)}</td>` +
    `<td class="ix-t"><span class="ix-title">${esc(w.title)}</span>${sub}</td>` +
    `<td class="ix-y">${w.year ?? ""}</td>` +
    `<td class="ix-k">${icon(ICON[w.kind])}${kindWord(w)}</td></tr>`
  );
});

const table = [
  `    <table class="ix">`,
  `      <thead><tr><th scope="col">No.</th><th scope="col">Title</th><th scope="col">Year</th><th scope="col">Type</th></tr></thead>`,
  `      <tbody>`,
  ...rows,
  `      </tbody>`,
  `    </table>`,
].join("\n");

const re = /(<!-- index:start[^>]*-->\n)[\s\S]*?(\n<!-- index:end -->)/;
if (!re.test(html)) throw new Error("index.html: index:start / index:end markers not found");
const next = html.replace(re, `$1${table}$2`);
writeFileSync(file, next);
console.log(`build: index table, ${rows.length} works${next === html ? " (unchanged)" : ""}`);
