// Side panel (Expand). Scrolls as one column: a sticky bar (number or type, meta, the title
// once it scrolls away, previous and next, widen, close), the images (a carousel of every
// image but the process ones), the title block, sticky tabs, then the tab. Works: Overview
// (the showcase when the project has one, Brief / Insight / pull line / Response / Role,
// credit, facts), Process (steps with the process images among them), Connections (the
// node's own network, switchable to a tree, then related works). Every node opens on
// Overview at the top. Drag the left edge, or use Widen, to resize; the map refits.
import {
  esc, icon, src, numBlock, metaHTML, copyHTML, stepsHTML, keywordOverview, keywordConnections,
  meOverview, meExperience, meWorks, workRows, rows, section, kindLabel, typeName, typeIcon, hasPage, factsHTML,
  imgHTML, kwLink, relatedWorks, workLink, KIND_ICON, carouselHTML, carouselImages, showcaseHTML, processHTML, SPRITE,
} from "./content.js";
import { mountShowcases } from "./showcase.js";
import { GROUPS } from "../map/render.js";

export const PANEL_W = 460;
const MIN_W = 380;
const maxW = () => Math.max(MIN_W, Math.min(1100, Math.round(window.innerWidth * 0.72)));

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

  // ---- Connections -------------------------------------------------------------------
  // The node's own network: only the node and what it connects to, around it by type.
  // Works show as image thumbnails, keywords as their map marks. Hover lifts a line, click
  // opens that node. A switch shows the same connections as a tree.
  function ego(n, treeHTML) {
    const TYPE_ORDER = ["me", "work", "discipline", "deliverable", "topic", "value", "tool"];
    const kindOf = (o) => (o.role === "kw" ? o.type : o.role);
    const ns = [...new Set(n.edges.map((e) => (e.a === n ? e.b : e.a)))].filter((o) => !o.hidden);
    ns.sort((a, b) => TYPE_ORDER.indexOf(kindOf(a)) - TYPE_ORDER.indexOf(kindOf(b)) || label(a).localeCompare(label(b)));
    if (!ns.length) return treeHTML ? section("Connections", treeHTML) : "";
    const R = ns.length > 16 ? 150 : 128;
    const W2 = R + 175;
    const H2 = R + 46;
    const start = -Math.PI / 2;
    const pos = ns.map((o, i) => {
      const a = start + (i / ns.length) * Math.PI * 2;
      return { o, a, x: Math.cos(a) * R, y: Math.sin(a) * R };
    });
    const mark = (o) => {
      if (o.role === "work") {
        const im = o.data.images[0];
        const s = { L: 30, M: 24, S: 18 }[o.size];
        return im ? `<image href="${esc(src(im.thumb ?? im.src))}" x="${-s / 2}" y="${-s / 2}" width="${s}" height="${s}" preserveAspectRatio="xMidYMid slice"/><rect class="eg-key" x="${-s / 2}" y="${-s / 2}" width="${s}" height="${s}"/>` : `<rect class="eg-key" x="-8" y="-8" width="16" height="16"/>`;
      }
      if (o.role === "me") return `<rect class="eg-me" x="-7" y="-7" width="14" height="14"/>`;
      if (o.type === "topic" || o.type === "tool") return `<circle class="eg-${o.type}" r="${o.type === "tool" ? 3 : 5}"/>`;
      if (o.type === "value") return `<use class="eg-value" href="${SPRITE}#heart" x="-6" y="-6" width="12" height="12"/>`;
      return `<rect class="eg-${o.type}" x="-5" y="-5" width="10" height="10"/>`;
    };
    const lines = pos.map(({ o, x, y }) => `<line class="eg-l" data-to="${esc(o.id)}" x1="0" y1="0" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`).join("");
    const nodes = pos.map(({ o, a, x, y }) => {
      const right = Math.cos(a) > 0.15;
      const left = Math.cos(a) < -0.15;
      const off = (o.role === "work" ? { L: 21, M: 18, S: 15 }[o.size] : 11);
      const tx = right ? off : left ? -off : 0;
      const ty = !right && !left ? (Math.sin(a) < 0 ? -off - 2 : off + 9) : 4;
      const anchor = right ? "start" : left ? "end" : "middle";
      const t = o.role === "work" ? `${o.data.n} ${o.data.title}` : label(o);
      return `<g class="eg-n eg-${kindOf(o)}-n" transform="translate(${x.toFixed(1)},${y.toFixed(1)})" data-node="${esc(o.id)}" data-eg="${esc(o.id)}" role="link" tabindex="0" aria-label="${esc(t)}">${mark(o)}<text x="${tx}" y="${ty}" text-anchor="${anchor}">${esc(t.length > 26 ? `${t.slice(0, 24)}…` : t)}</text></g>`;
    }).join("");
    const centre = n.role === "work" ? n.data.images[0] : null;
    const cmark = centre ? `<image href="${esc(src(centre.thumb ?? centre.src))}" x="-26" y="-26" width="52" height="52" preserveAspectRatio="xMidYMid slice"/><rect class="eg-ckey" x="-26" y="-26" width="52" height="52"/>` : `<rect class="eg-c" x="-9" y="-9" width="18" height="18"/>`;
    const svg = `<svg class="eg-svg" viewBox="${-W2} ${-H2} ${W2 * 2} ${H2 * 2}" role="img" aria-label="${ns.length} connections">${lines}<g class="eg-centre">${cmark}</g>${nodes}</svg>`;
    return `<section class="ego" data-mode="network">
<div class="ego-head"><h3 class="ego-t mono-label">${icon("waypoints")}Connections <span>${ns.length}</span></h3><div class="ego-tabs" role="tablist" aria-label="Show as"><button type="button" role="tab" data-ego="network" aria-selected="true">Network</button><button type="button" role="tab" data-ego="tree" aria-selected="false">Tree</button></div></div>
<div class="ego-net">${svg}</div>
<div class="ego-tree">${treeHTML}</div>
</section>`;
  }
  const label = (o) => (o.role === "work" ? o.data.title : o.role === "kw" ? o.data.label : o.data.name);

  // Keywords as a tree under the work, grouped by type, each with the number of other works.
  function tree(w) {
    // Tools are listed in the facts, so the tree leaves them out.
    const kws = w.keywords.map((id) => ix.kw.get(id)).filter((k) => k && k.type !== "tool");
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
        hero: carouselHTML(carouselImages(w), { cls: "panel-hero", sizes: `${width}px`, label: w.title }),
        title: esc(w.title),
        sub: [w.sub ? `<p class="card-sub">${esc(w.sub)}</p>` : "", `<p class="panel-meta">${[esc(w.team), esc(w.context)].filter(Boolean).join("<br>")}</p>`].join(""),
        acts: [
          hasPage(w) ? `<button type="button" class="tbtn tbtn-primary" data-act="page">${icon("maximize-2")}Full page</button>` : "",
          w.link ? `<a class="tbtn" href="${esc(w.link)}" target="_blank" rel="noopener">${icon("arrow-up-right")}Live site</a>` : "",
        ].join(""),
        counts: { process: w.steps?.length || 0, connections: w.keywords.length },
        tabs: {
          overview: showcaseHTML(w, ix.data.showcase?.showcases?.[w.id]) + copyHTML(w) + factsHTML(w, ix, { compact: true }),
          process: processHTML(w),
          connections: ego(n, tree(w)) + related(w),
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
        tabs: { overview: keywordOverview(k, ix), connections: ego(n, keywordConnections(k, ix)) },
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
      tabs: { overview: meOverview(me), experience: meExperience(me), connections: ego(n, section(null, rows(workRows(meWorks(ix))))) },
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
    mountShowcases(box);
    box.dataset.role = n.role;
    box.dataset.kw = n.role === "kw" ? n.type : "";
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
    const eg = e.target.closest("[data-ego]");
    if (eg) {
      const sec = eg.closest(".ego");
      sec.dataset.mode = eg.dataset.ego;
      for (const b of sec.querySelectorAll("[data-ego]")) b.setAttribute("aria-selected", b === eg);
      return;
    }
    const t = e.target.closest("[data-tab]");
    if (t && !t.disabled) return select(t.dataset.tab, { focus: true });
    const act = e.target.closest("[data-act]")?.dataset.act;
    if (act === "widen") return setWidth(wide ? PANEL_W : maxW());
    if (act === "prev" || act === "next") return on.step(act === "next" ? 1 : -1);
    if (act) on[act]();
  });

  // The network: hovering or focusing a node lifts its line.
  const lift = (e) => {
    const g = e.target.closest?.("[data-eg]");
    for (const l of box.querySelectorAll(".eg-l.is-on")) l.classList.remove("is-on");
    box.querySelector(".ego-net")?.classList.toggle("has-on", !!g);
    if (g) box.querySelector(`.eg-l[data-to="${CSS.escape(g.dataset.eg)}"]`)?.classList.add("is-on");
  };
  box.addEventListener("pointerover", lift);
  box.addEventListener("focusin", lift);

  // Arrow keys, Home and End move along the enabled tabs; arrows on the edge resize.
  box.addEventListener("keydown", (e) => {
    if (e.target.matches?.("[data-eg]") && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      return on.link(e.target.dataset.eg);
    }
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
      // Every node opens on Overview, at the top.
      if (box.hidden || node !== n) tab = "overview";
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
