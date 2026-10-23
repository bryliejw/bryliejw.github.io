// Side panel (Expand). Scrolls as one column: a sticky bar (number or type, meta, widen,
// close), the lead image, the title block, sticky tabs, then the tab. Works: Overview
// (pull line, Brief / Insight / Response, role, credit, facts, then a gallery that opens
// to every image), Process (steps with the process images set among them), Connections
// (a mini map of the work's place in the network, its keywords as a tree with how many
// other works share each, related works with thumbnails). Drag the left edge, or use
// Widen, to resize; the map refits to the space left.
import {
  esc, icon, src, numBlock, metaHTML, copyHTML, stepsHTML, keywordOverview, keywordConnections,
  meOverview, meExperience, meWorks, workRows, rows, section, kindLabel, typeName, typeIcon, hasPage, factsHTML,
  imgHTML, kwLink, relatedWorks, workLink, KIND_ICON,
} from "./content.js";
import { GROUPS } from "../map/render.js";

export const PANEL_W = 460;
const MIN_W = 380;
const maxW = () => Math.max(MIN_W, Math.min(1100, Math.round(window.innerWidth * 0.72)));
const GALLERY_N = 6;

const TABS = {
  overview: ["Overview", "file-text"],
  process: ["Process", "workflow"],
  experience: ["Experience", "briefcase"],
  connections: ["Connections", "waypoints"],
};

export function createPanel({ ix, graph, on, onResize = () => {} }) {
  const box = document.createElement("aside");
  box.className = "panel";
  box.tabIndex = -1;
  box.hidden = true;
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-labelledby", "panel-title");
  document.querySelector(".frame").append(box);
  let node = null;
  let tab = "overview";
  let width = PANEL_W;
  let wide = false;

  const setWidth = (w, { notify = true } = {}) => {
    width = Math.round(Math.max(MIN_W, Math.min(maxW(), w)));
    box.style.width = `${width}px`;
    const frame = document.querySelector(".frame");
    frame.style.setProperty("--panel-w", `${width}px`);
    frame.classList.toggle("is-tight", window.innerWidth - width < 820);
    wide = width > PANEL_W + 40;
    const b = box.querySelector("[data-act='widen']");
    if (b) {
      b.innerHTML = icon(wide ? "chevrons-right" : "chevrons-left");
      b.setAttribute("aria-label", wide ? "Narrow the panel" : "Widen the panel");
      b.dataset.tip = wide ? "Narrow" : "Widen";
    }
    if (notify) onResize(width);
  };

  // ---- Overview ----------------------------------------------------------------------
  function gallery(w, skip) {
    const ims = w.images.filter((im, i) => i !== skip && im.use !== "process");
    if (!ims.length) return "";
    const more = ims.length > GALLERY_N;
    return `<section class="sec pg" data-open="false"><h3 class="sec-title mono-label">${icon("images")}Images <span class="pg-n">${ims.length}</span></h3>
<div class="pg-grid">${ims.map((im, i) => `<figure class="img pg-it${im.white ? " is-white" : ""}"${i >= GALLERY_N ? " data-extra" : ""}><img src="${esc(src(im.thumb ?? im.src))}" data-full="${esc(src(im.src))}" width="${im.w}" height="${im.h}" alt="${esc(im.alt)}" loading="lazy"></figure>`).join("")}</div>
${more ? `<button type="button" class="tbtn pg-more" data-act="gallery">${icon("chevron-down")}<span>Show all ${ims.length} images</span></button>` : ""}</section>`;
  }

  // ---- Process -----------------------------------------------------------------------
  function process(w) {
    const pics = w.images.filter((im) => im.use === "process");
    if (!w.steps.length && !pics.length) return "";
    const fig = (im) => `<figure class="img ps-img${im.white ? " is-white" : ""}"><img src="${esc(src(im.thumb ?? im.src))}" data-full="${esc(src(im.src))}" width="${im.w}" height="${im.h}" alt="${esc(im.alt)}" loading="lazy"><figcaption>${esc(im.alt)}</figcaption></figure>`;
    if (!w.steps.length) return `<div class="ps">${pics.map(fig).join("")}</div>`;
    // Process images sit among the steps, spread evenly through them.
    const at = new Map();
    pics.forEach((im, i) => {
      const k = Math.min(w.steps.length - 1, Math.round(((i + 1) * w.steps.length) / (pics.length + 1)) - 1);
      at.set(Math.max(0, k), [...(at.get(Math.max(0, k)) ?? []), im]);
    });
    return `<ol class="steps ps-steps">${w.steps.map(([label, text], i) => `<li><p class="mono-label st-label">${esc(label)}</p><p class="st-text">${esc(text)}</p>${(at.get(i) ?? []).map(fig).join("")}</li>`).join("")}</ol>`;
  }

  // ---- Connections -------------------------------------------------------------------
  // Mini map: every node at its place in the current view; this node, its lines and its
  // neighbours lifted. Click a mark to go there.
  function minimap(n) {
    const ns = graph.nodes.filter((o) => !o.hidden);
    const xs = ns.map((o) => o.x);
    const ys = ns.map((o) => o.y);
    const x0 = Math.min(...xs) - 30;
    const y0 = Math.min(...ys) - 30;
    const w = Math.max(...xs) + 30 - x0;
    const h = Math.max(...ys) + 30 - y0;
    const near = new Set([n, ...n.edges.map((e) => (e.a === n ? e.b : e.a))]);
    const lines = graph.edges
      .filter((e) => !e.a.hidden && !e.b.hidden)
      .map((e) => {
        const on = e.a === n || e.b === n;
        return `<line x1="${e.a.x}" y1="${e.a.y}" x2="${e.b.x}" y2="${e.b.y}" class="mm-l${on ? " is-on" : ""}"/>`;
      });
    lines.sort((a, b) => a.includes("is-on") - b.includes("is-on"));
    const mark = (o) => {
      const cls = `mm-n mm-${o.role}${o.role === "kw" ? ` mm-${o.type}` : ""}${o === n ? " is-me" : near.has(o) ? " is-near" : ""}`;
      const label = o.role === "work" ? `${o.data.n} ${o.data.title}` : o.role === "kw" ? o.data.label : o.data.name;
      const s = o.role === "work" ? { L: 26, M: 17, S: 11 }[o.size] : o.role === "me" ? 14 : 7;
      const shape = o.role === "kw" ? `<circle r="${s / 2}"/>` : `<rect x="${-s / 2}" y="${-s / 2}" width="${s}" height="${s}"/>`;
      return `<g class="${cls}" transform="translate(${o.x},${o.y})" data-node="${esc(o.id)}" role="link" tabindex="-1"><title>${esc(label)}</title>${shape}</g>`;
    };
    const order = [...ns].sort((a, b) => near.has(a) - near.has(b) || (a === n) - (b === n));
    return `<figure class="mm"><svg viewBox="${x0} ${y0} ${w} ${h}" role="img" aria-label="Where ${esc(n.role === "work" ? n.data.title : n.data.label ?? n.data.name)} sits in the network">${lines.join("")}${order.map(mark).join("")}</svg>
<figcaption class="mono-label">${near.size - 1} connections · ${{ force: "Force", rings: "Rings", edge: "Edge map" }[graph.svg.dataset.view] ?? ""} view</figcaption></figure>`;
  }

  // Keywords as a tree under the work, grouped by type, each with the number of other works.
  function tree(w) {
    const kws = w.keywords.map((id) => ix.kw.get(id)).filter(Boolean);
    const groups = GROUPS.map((g) => ({ g, ks: kws.filter((k) => k.type === g.type) })).filter((x) => x.ks.length);
    if (!groups.length) return "";
    const count = (k) => ix.usedBy.get(k.id).filter((o) => o.id !== w.id).length;
    return `<div class="kt"><p class="kt-root">${w.n ? `<span class="lk-n">${esc(w.n)}</span>` : ""}${esc(w.title)}</p><ul class="kt-groups">${groups
      .map(({ g, ks }) => `<li><p class="kt-g mono-label">${icon(g.icon)}${esc(g.name)}</p><ul class="kt-leaves">${ks.map((k) => `<li>${kwLink(k)}<span class="kt-c" title="${count(k)} other works">${count(k)}</span></li>`).join("")}</ul></li>`)
      .join("")}</ul></div>`;
  }

  function related(w) {
    const { part, parts, shared } = relatedWorks(w, ix);
    const n = (o) => o.keywords.filter((k) => w.keywords.includes(k)).length;
    const max = Math.max(1, ...shared.map(n));
    const item = (o, note) => `<li><a class="rw" href="/#${esc(o.id)}" data-node="${esc(o.id)}">${o.images[0] ? `<img src="${esc(src(o.images[0].thumb ?? o.images[0].src))}" alt="" loading="lazy">` : `<span class="rw-ph"></span>`}<span class="rw-t"><span class="lk-n">${esc(o.n)}</span>${esc(o.title)}</span><span class="rw-m mono-label">${note}</span></a></li>`;
    const ties = [...part.map((o) => item(o, "Part of")), ...parts.map((o) => item(o, "Part"))];
    const top = shared.slice(0, 8).map((o) => item(o, `<span class="rw-bar" style="--v:${n(o) / max}"></span>${n(o)} shared`));
    return [ties.length ? section("Part of the same work", `<ul class="rws">${ties.join("")}</ul>`) : "", top.length ? section("Shares the most keywords with", `<ul class="rws">${top.join("")}</ul>`) : ""].join("");
  }

  function parts(n) {
    // Sticky bar: number or type, meta, and the title once the title block scrolls away;
    // previous and next work, widen, close.
    const bar = (lead, meta, title, steps = "") => `<div class="panel-bar">${lead}<div class="panel-bar-id"><p class="card-meta mono-label">${meta}</p><p class="panel-bar-t" aria-hidden="true">${title}</p></div><span class="panel-bar-acts">${steps}<button type="button" class="cbtn" data-act="widen" aria-label="Widen the panel" data-tip="Widen" data-key="">${icon(wide ? "chevrons-right" : "chevrons-left")}</button><button type="button" class="cbtn card-x" data-act="close" aria-label="Close" data-tip="Close" data-key="Esc">${icon("x")}</button></span></div>`;
    const stepBtns = (w) => {
      const list = graph.works.filter((o) => !o.hidden);
      if (list.length < 2) return "";
      const i = list.findIndex((o) => o.id === w.id);
      const prev = list[(i - 1 + list.length) % list.length].data;
      const next = list[(i + 1) % list.length].data;
      return `<button type="button" class="cbtn" data-act="prev" aria-label="Previous work: ${esc(prev.title)}" data-tip="${esc(prev.title)}" data-key="[">${icon("chevron-left")}</button><button type="button" class="cbtn" data-act="next" aria-label="Next work: ${esc(next.title)}" data-tip="${esc(next.title)}" data-key="]">${icon("chevron-right")}</button><span class="sep-v" aria-hidden="true"></span>`;
    };
    if (n.role === "work") {
      const w = n.data;
      const hero = w.images[0];
      return {
        bar: bar(w.size === "S" ? `<span class="card-ic">${icon(KIND_ICON[w.kind])}</span>` : numBlock(w, "card-num"), esc([kindLabel(w), w.year].filter(Boolean).join(" · ")), esc(w.title), stepBtns(w)),
        hero: hero ? imgHTML(hero, { cls: "panel-hero", sizes: `${width}px`, lazy: false }) : "",
        title: esc(w.title),
        sub: [w.sub ? `<p class="card-sub">${esc(w.sub)}</p>` : "", `<p class="panel-meta">${metaHTML(w)}</p>`].join(""),
        acts: [
          hasPage(w) ? `<button type="button" class="tbtn tbtn-primary" data-act="page">${icon("maximize-2")}Full page</button>` : "",
          w.link ? `<a class="tbtn" href="${esc(w.link)}" target="_blank" rel="noopener">${icon("arrow-up-right")}Live site</a>` : "",
        ].join(""),
        counts: { process: w.steps?.length || 0, connections: w.keywords.length },
        tabs: {
          overview: copyHTML(w) + factsHTML(w, ix, { compact: true }) + gallery(w, 0),
          process: process(w),
          connections: section("In the network", minimap(n)) + section("Keywords", tree(w)) + related(w),
        },
      };
    }
    if (n.role === "kw") {
      const k = n.data;
      const works = ix.usedBy.get(k.id);
      return {
        bar: bar(`<span class="card-ic">${icon(typeIcon(k.type))}</span>`, `${esc(typeName(k.type))}${works.length ? ` · ${works.length} work${works.length === 1 ? "" : "s"}` : ""}`, esc(k.label)),
        hero: "",
        title: `<span class="t-${k.type}">${esc(k.label)}</span>`,
        sub: "",
        acts: "",
        tabs: { overview: keywordOverview(k, ix), connections: section("In the network", minimap(n)) + keywordConnections(k, ix) },
      };
    }
    const me = n.data;
    const cut = me.tagline1.lastIndexOf(" and ") + 5;
    return {
      bar: bar(`<span class="card-ic">${icon("user")}</span>`, "About", esc(me.name)),
      hero: "",
      title: esc(me.name),
      sub: `<p class="card-sub">${esc(me.tagline1.slice(0, cut))}<s>${esc(me.tagline1.slice(cut))}</s> <mark>${esc(me.tagline2)}</mark></p>`,
      acts: "",
      tabs: { overview: meOverview(me), experience: meExperience(me), connections: section(null, rows(workRows(meWorks(ix)))) },
    };
  }

  function render(n) {
    const p = parts(n);
    const keys = Object.keys(p.tabs);
    if (!p.tabs[tab]) tab = "overview";
    const tabBtn = (key) => {
      const [label, ic] = TABS[key];
      const empty = !p.tabs[key];
      const n = p.counts?.[key];
      return `<button type="button" role="tab" class="tab" id="tab-${key}" data-tab="${key}" aria-controls="panel-body" aria-selected="${key === tab}" tabindex="${key === tab ? 0 : -1}"${empty ? " disabled" : ""}>${icon(ic)}<span>${label}</span>${n ? `<span class="tab-n" aria-hidden="true">${n}</span>` : ""}</button>`;
    };
    box.innerHTML = `<div class="panel-grip" role="separator" aria-orientation="vertical" aria-label="Resize the panel" tabindex="0" title="Drag to resize"></div>
<div class="panel-scroll">
${p.bar}
${p.hero}
<header class="panel-head">
  <h2 class="panel-title" id="panel-title">${p.title}</h2>${p.sub}
  ${p.acts ? `<div class="card-acts">${p.acts}</div>` : ""}
</header>
<div class="tabs" role="tablist" aria-label="Sections">${keys.map(tabBtn).join("")}</div>
<div class="panel-body" id="panel-body" role="tabpanel" aria-labelledby="tab-${tab}" tabindex="0">${p.tabs[tab]}</div>
</div>`;
    box.dataset.role = n.role;
    setWidth(width, { notify: false });
    // Once the title scrolls under the bar, the bar shows it.
    const sc = box.querySelector(".panel-scroll");
    const t = box.querySelector(".panel-title");
    const bh = box.querySelector(".panel-bar").offsetHeight;
    const stuck = () => box.classList.toggle("is-scrolled", sc.scrollTop > t.offsetTop + t.offsetHeight - bh);
    sc.addEventListener("scroll", stuck, { passive: true });
    stuck();
  }

  function select(key, { focus = false } = {}) {
    if (!node) return;
    tab = key;
    const sc = () => box.querySelector(".panel-scroll");
    const top = box.querySelector(".tabs").offsetTop - box.querySelector(".panel-bar").offsetHeight;
    const keep = sc().scrollTop > top;
    render(node);
    if (keep) sc().scrollTop = box.querySelector(".tabs").offsetTop - box.querySelector(".panel-bar").offsetHeight;
    if (focus) box.querySelector(`#tab-${key}`)?.focus({ preventScroll: true });
  }

  box.addEventListener("click", (e) => {
    const link = e.target.closest("[data-node]");
    if (link && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
      e.preventDefault();
      return on.link(link.dataset.node);
    }
    const t = e.target.closest("[data-tab]");
    if (t && !t.disabled) return select(t.dataset.tab, { focus: true });
    const act = e.target.closest("[data-act]")?.dataset.act;
    if (act === "gallery") {
      const g = e.target.closest(".pg");
      const open = g.dataset.open !== "true";
      g.dataset.open = open;
      e.target.closest("button").querySelector("span").textContent = open ? "Show fewer" : `Show all ${g.querySelectorAll(".pg-it").length} images`;
      return;
    }
    if (act === "widen") return setWidth(wide ? PANEL_W : maxW());
    if (act === "prev" || act === "next") return on.step(act === "next" ? 1 : -1);
    if (act) on[act]();
  });

  // Arrow keys, Home and End move along the enabled tabs; arrows on the edge resize.
  box.addEventListener("keydown", (e) => {
    if (e.target.matches(".panel-grip") && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
      e.preventDefault();
      return setWidth(width + (e.key === "ArrowLeft" ? 40 : -40));
    }
    const t = e.target.closest("[role='tab']");
    if (!t) return;
    const tabs = [...box.querySelectorAll("[role='tab']:not([disabled])")];
    const i = tabs.indexOf(t);
    const to = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    select(tabs[(to + tabs.length) % tabs.length].dataset.tab, { focus: true });
  });

  // Drag the left edge to resize.
  box.addEventListener("pointerdown", (e) => {
    if (!e.target.matches(".panel-grip") || e.button) return;
    e.preventDefault();
    const x0 = e.clientX;
    const w0 = width;
    e.target.setPointerCapture(e.pointerId);
    box.classList.add("is-resizing");
    const move = (ev) => setWidth(w0 + (x0 - ev.clientX), { notify: false });
    const up = () => {
      box.classList.remove("is-resizing");
      e.target.removeEventListener("pointermove", move);
      e.target.removeEventListener("pointerup", up);
      onResize(width);
    };
    e.target.addEventListener("pointermove", move);
    e.target.addEventListener("pointerup", up);
  });

  return {
    get id() {
      return node?.id ?? null;
    },
    get tab() {
      return tab;
    },
    get width() {
      return width;
    },
    show(n, { focus = true } = {}) {
      // A fresh panel, or a different kind of node, starts on Overview.
      if (box.hidden || node?.role !== n.role) tab = "overview";
      if (node !== n || box.hidden) {
        node = n;
        render(n);
      }
      box.hidden = false;
      document.querySelector(".frame").classList.add("has-panel");
      if (focus) box.focus({ preventScroll: true });
    },
    hide() {
      node = null;
      box.hidden = true;
      document.querySelector(".frame").classList.remove("has-panel");
    },
    select,
    contains: (el) => box.contains(el),
  };
}
