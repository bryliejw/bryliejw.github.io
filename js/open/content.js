// Markup shared by the open flow and scripts/build.mjs: the grow card, the side panel and
// the full page are all set from these strings, so the overlay page in the map and the
// generated /work/<slug>/ page are the same layout. Pure functions of data/nodes.json:
// no DOM, no window, so Node can import this module too.
// Every word here is a UI label (tab and section names, as in CLAUDE.md and the PDF);
// all copy about the work comes from the data, verbatim.
import { GROUPS, kindWord } from "../map/render.js";

export const SPRITE = "/assets/icons.svg";
export const PDF = "/assets/Wilson_Brylie_Taster-Folio_Final.pdf";

export const KIND_ICON = { project: "book-open", experiment: "flask-conical", work: "file", client: "briefcase" };

export const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
export const icon = (name, cls = "ic") => `<svg class="${cls}" aria-hidden="true"><use href="${SPRITE}#${name}"/></svg>`;
export const src = (s) => (/^(\/|https?:)/.test(s) ? s : `/${s}`);
const cap = (s) => s[0].toUpperCase() + s.slice(1);

export const kindLabel = (w) => cap(kindWord(w));
export const typeName = (type) => (type === "value" ? "Value I design by" : GROUPS.find((g) => g.type === type).name.replace(/s$/, ""));
export const typeIcon = (type) => GROUPS.find((g) => g.type === type).icon;

// Lookups over the data, built once per page.
export function indexData(data) {
  const kw = new Map(data.keywords.map((k) => [k.id, k]));
  const works = new Map(data.works.map((w) => [w.id, w]));
  const usedBy = new Map(data.keywords.map((k) => [k.id, data.works.filter((w) => w.keywords.includes(k.id))]));
  return { data, kw, works, usedBy, projects: data.works.filter((w) => w.kind === "project") };
}

export const pageHref = (w) => `/work/${w.slug}/`;
export const hasPage = (w) => w.kind === "project";

// Links to nodes. href is the map with that node's panel open; in the map the click is
// taken over (data-node) and opens the node in the layer that is showing.
export function kwLink(k) {
  return `<a class="lk lk-${k.type}" href="/#${esc(k.id)}" data-node="${esc(k.id)}">${esc(k.label)}</a>`;
}
export function workLink(w) {
  return `<a class="lk lk-work" href="/#${esc(w.id)}" data-node="${esc(w.id)}"><span class="lk-n">${esc(w.n)}</span>${esc(w.title)}</a>`;
}

// One row per group: led by its icon (and a hidden name), then plain text links.
function row(ic, name, links) {
  if (!links.length) return "";
  return `<div class="lrow"><dt>${icon(ic)}<span class="sr-only">${esc(name)}</span></dt><dd>${links.join(" ")}</dd></div>`;
}

// Keyword rows in map order (disciplines, deliverables, tools, topics, values).
export function keywordRows(ids, ix) {
  const kws = ids.map((id) => ix.kw.get(id)).filter(Boolean);
  return GROUPS.map((g) => row(g.icon, g.name, kws.filter((k) => k.type === g.type).map(kwLink))).join("");
}

// Works as rows by kind.
export function workRows(works) {
  const kinds = ["project", "experiment", "work", "client"];
  const names = { project: "PDF projects", experiment: "Extras / experiments", work: "Works", client: "Clients" };
  return kinds.map((k) => row(KIND_ICON[k], names[k], works.filter((w) => w.kind === k).map(workLink))).join("");
}

export const rows = (inner, cls = "") => (inner ? `<dl class="lrows ${cls}">${inner}</dl>` : "");

// "year · team" over "context", as on the PDF openers.
export function metaHTML(w) {
  const first = [w.year != null ? `<b>${w.year}</b>` : "", esc(w.team)].filter(Boolean).join(" · ");
  return [first, esc(w.context)].filter(Boolean).join("<br>");
}

// The card's one paragraph: the first copy field the work has.
export function oneParagraph(w) {
  const c = w.copy;
  return c.oneLine || c.brief || c.response || c.role || "";
}

// Brief, Insight, the pull line, Response and Role, each only when the data has it.
// h: heading level of the labels (2 on the full page, 3 in the panel).
export function copyHTML(w, { credit = true, h = 3 } = {}) {
  const c = w.copy;
  const block = (label, text) => (text ? `<div class="cp"><h${h} class="cp-label">${label}</h${h}><p>${esc(text)}</p></div>` : "");
  const out = [block("Brief", c.brief), block("Insight", c.insight)];
  if (c.pull) out.push(`<p class="cp-pull">${esc(c.pull)}</p>`);
  out.push(block("Response", c.response), block("Role", c.role));
  if (!c.brief && !c.insight && !c.pull && !c.response && !c.role && c.oneLine) out.push(`<div class="cp"><p>${esc(c.oneLine)}</p></div>`);
  if (credit && c.credit) out.push(`<p class="cp-credit">${esc(c.credit)}</p>`);
  return out.join("");
}

export function stepsHTML(w) {
  if (!w.steps.length) return "";
  return `<ol class="steps">${w.steps.map(([label, text]) => `<li><p class="mono-label st-label">${esc(label)}</p><p class="st-text">${esc(text)}</p></li>`).join("")}</ol>`;
}

// One image: the 1600px file with the 600px thumb in srcset. White-ground images
// get the 1px keyline (is-white).
export function imgHTML(im, { cls = "img", sizes = "(max-width: 719px) 100vw, 420px", lazy = true } = {}) {
  const set = im.thumb ? ` srcset="${esc(src(im.thumb))} ${THUMB_W(im)}w, ${esc(src(im.src))} ${im.w}w" sizes="${sizes}"` : "";
  return `<figure class="${cls}${im.white ? " is-white" : ""}"><img src="${esc(src(im.src))}"${set} width="${im.w}" height="${im.h}" alt="${esc(im.alt)}"${lazy ? ' loading="lazy"' : ""}></figure>`;
}
// Width of the 600px thumb (600 on the long edge, aspect kept).
const THUMB_W = (im) => Math.round(im.w * Math.min(1, 600 / Math.max(im.w, im.h)));

export function imagesHTML(w, opts) {
  if (!w.images.length) return "";
  return `<div class="imgs">${w.images.map((im) => imgHTML(im, opts)).join("")}</div>`;
}

// Works tied to a work: part of, its parts, and works that share keywords (most shared first).
export function relatedWorks(w, ix) {
  const part = w.partOf ? [ix.works.get(w.partOf)] : [];
  const parts = ix.data.works.filter((o) => o.partOf === w.id);
  const shared = ix.data.works
    .filter((o) => o !== w && !part.includes(o) && !parts.includes(o))
    .map((o) => [o, o.keywords.filter((k) => w.keywords.includes(k)).length])
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([o]) => o);
  return { part, parts, shared };
}

export function workConnections(w, ix) {
  const { part, parts, shared } = relatedWorks(w, ix);
  const tie = [
    part.length ? `<div class="lrow"><dt class="mono-label">Part of</dt><dd>${part.map(workLink).join(" ")}</dd></div>` : "",
    parts.length ? `<div class="lrow"><dt class="mono-label">Parts</dt><dd>${parts.map(workLink).join(" ")}</dd></div>` : "",
  ].join("");
  return [
    section("Keywords", rows(keywordRows(w.keywords, ix))),
    section(null, rows(tie, "lrows-ties")),
    shared.length ? section("Shares keywords with", rows(workRows(shared))) : "",
  ].join("");
}

export const section = (title, body) => (body ? `<section class="sec">${title ? `<h3 class="sec-title mono-label">${title}</h3>` : ""}${body}</section>` : "");

// The PDF opener number block.
export const numBlock = (w, cls = "num") => `<span class="${cls}" aria-hidden="true">${esc(w.n)}</span>`;

// The full page for a PDF project, shared by the overlay and /work/<slug>/.
export function pageHTML(w, ix) {
  const topics = w.keywords.map((id) => ix.kw.get(id)).filter((k) => k?.type === "topic");
  const disciplines = w.keywords.map((id) => ix.kw.get(id)).filter((k) => k?.type === "discipline");
  const tools = w.keywords.map((id) => ix.kw.get(id)).filter((k) => k?.type === "tool");
  const hero = w.images[0];
  const at = ix.projects.indexOf(w);
  const next = [...ix.projects.slice(at + 1), ...ix.projects.slice(0, at)];
  return `<article class="wp" aria-labelledby="wp-title">
  <header class="wp-bar">
    <a class="wp-back tbtn" href="/#${esc(w.id)}" data-back>${icon("arrow-left")}Back</a>
    <a class="wp-name" href="/">Brylie Wilson</a>
    <nav class="wp-nav" aria-label="Site">
      <a class="navlink" href="${PDF}" target="_blank" rel="noopener">${icon("file-down")}<span class="navtext">Folio PDF</span></a>
      <a class="navlink" href="mailto:${esc(ix.data.me.contact.email)}">${icon("mail")}<span class="navtext">Contact</span></a>
    </nav>
  </header>
  <div class="wp-open">
    <div class="wp-lead">
      <div class="wp-top">${numBlock(w, "wp-num")}<p class="wp-meta"><span class="sr-only">${esc(w.n)} · </span>${metaHTML(w)}</p></div>
      <h1 class="wp-title" id="wp-title">${esc(w.title)}</h1>
      ${w.sub ? `<p class="wp-sub">${esc(w.sub)}</p>` : ""}
      ${topics.length ? `<ul class="wp-topics">${topics.map((k) => `<li>${kwLink(k)}</li>`).join("")}</ul>` : ""}
      <div class="wp-tags">
        ${disciplines.length ? `<ul class="wp-disc">${disciplines.map((k) => `<li>${kwLink(k)}</li>`).join("")}</ul>` : ""}
        ${tools.length ? `<ul class="wp-tools">${tools.map((k) => `<li>${kwLink(k)}</li>`).join("")}</ul>` : ""}
      </div>
    </div>
    <div class="wp-body">
      ${hero ? imgHTML(hero, { cls: "wp-hero", sizes: "(max-width: 719px) 100vw, 55vw", lazy: false }) : ""}
      ${copyHTML(w, { h: 2 })}
    </div>
  </div>
  ${w.images.length > 1 ? `<section class="wp-sec" aria-labelledby="wp-images"><h2 class="wp-h mono-label" id="wp-images">${icon("image")}Images</h2>${imagesHTML({ ...w, images: w.images.slice(1) }, { sizes: "(max-width: 719px) 100vw, 50vw" })}</section>` : ""}
  ${w.steps.length ? `<section class="wp-sec" aria-labelledby="wp-process"><h2 class="wp-h mono-label" id="wp-process">${icon("workflow")}Process</h2>${stepsHTML(w)}</section>` : ""}
  <section class="wp-sec" aria-labelledby="wp-conn"><h2 class="wp-h mono-label" id="wp-conn">${icon("waypoints")}Connections</h2>${workConnections(w, ix)}</section>
  <nav class="wp-next" aria-label="Next">
    ${next.map((p) => `<a class="wp-nextlink" href="${pageHref(p)}" data-page="${esc(p.id)}"><span class="mono-label">Next</span><span class="wp-nextn">${esc(p.n)}</span><span class="wp-nextt">${esc(p.title)}</span>${icon("arrow-right")}</a>`).join("")}
  </nav>
</article>`;
}

// Works as a readable list: number, title, subtitle, year.
export function workList(works) {
  if (!works.length) return "";
  return `<ul class="wlist">${works
    .map((w) => `<li><a href="/#${esc(w.id)}" data-node="${esc(w.id)}"><span class="wl-n">${esc(w.n)}</span><span class="wl-t"><span class="wl-title">${esc(w.title)}</span>${w.sub ? `<span class="wl-sub">${esc(w.sub)}</span>` : ""}</span><span class="wl-y">${w.year ?? ""}</span></a></li>`)
    .join("")}</ul>`;
}

// Keyword panel: the works that use it; keywords tied to it by p01 lines or shared works.
export function keywordOverview(k, ix) {
  return section("Works", workList(ix.usedBy.get(k.id)));
}
export function keywordConnections(k, ix) {
  const lines = ix.data.keywords.filter((o) => o.related?.includes(k.id) || k.related?.includes(o.id)).map((o) => o.id);
  const count = new Map();
  for (const w of ix.usedBy.get(k.id)) for (const id of w.keywords) if (id !== k.id) count.set(id, (count.get(id) ?? 0) + 1);
  const shared = [...count].sort((a, b) => b[1] - a[1]).map(([id]) => id);
  return [section("Linked on the map", rows(keywordRows(lines, ix))), section("Shares works with", rows(keywordRows(shared, ix))), section("Works", rows(workRows(ix.usedBy.get(k.id))))].join("");
}

// The name's panel (About): bio, standpoint and contact; experience; connected works.
export const meWorks = (ix) => ix.data.works.filter((w) => w.size === "L" || w.id === "terms-of-practice");

export function meOverview(me) {
  const s = me.standpoint;
  const c = me.contact;
  const ext = (href, text) => `<a class="lk" href="${esc(href)}" target="_blank" rel="noopener">${esc(text)}${icon("arrow-up-right")}</a>`;
  return [
    `<div class="cp">${me.bio.map((p) => `<p>${esc(p)}</p>`).join("")}</div>`,
    s ? `<figure class="cp standpoint"><blockquote class="cp-pull">${esc(s.quote)}</blockquote><figcaption>${s.link ? ext(s.link, s.source) : esc(s.source)}</figcaption></figure>` : "",
    section(
      "Contact",
      `<dl class="contact"><dt class="mono-label">Email</dt><dd><a class="lk" href="mailto:${esc(c.email)}">${esc(c.email)}</a></dd><dt class="mono-label">Instagram</dt><dd>${ext(c.instagram.url, c.instagram.label)}</dd><dt class="mono-label">LinkedIn</dt><dd>${ext(c.linkedin.url, c.linkedin.label)}</dd></dl>`,
    ),
  ].join("");
}

export function meExperience(me) {
  const cert = me.certification;
  const xp = `<ol class="xp">${me.experience.map((e) => `<li><span class="xp-y">${esc(e.years)}</span><p><b>${esc(e.title)}</b><br>${esc(e.text)}</p></li>`).join("")}</ol>`;
  const edu = `<ol class="xp">${me.education.map((e) => `<li><span class="xp-y">${esc(e.years)}</span><p><b>${esc(e.title)}</b><br>${esc(e.org)}</p></li>`).join("")}</ol>`;
  const cer = `<div class="cert">${cert.badge ? `<img src="${esc(src(cert.badge))}" width="56" height="56" alt="">` : ""}<p><b>${esc(cert.title)}</b><br>${esc(cert.org)}${cert.year ? ` · ${cert.year}` : ""}<br>${cert.link ? `<a class="lk mono-label" href="${esc(cert.link)}" target="_blank" rel="noopener">${esc(cert.linkLabel || cert.link)}${icon("arrow-up-right")}</a>` : ""}</p></div>`;
  const tools = me.tools?.length ? `<p class="tools">${me.tools.map(esc).join(" · ")}</p>` : "";
  return [section("Experience", xp), section("Education", edu), section("Certification", cer), section("Tools", tools)].join("");
}
