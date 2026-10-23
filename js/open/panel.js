// Side panel (Expand): 420px on the right. Header with the number or type icon, title and
// actions; a tab strip (Overview, Images, Process, Connections for works; Overview,
// Experience, Connections for the name; Overview, Connections for keywords); the tab
// content scrolls within the panel. A tab with nothing in it is disabled. Showing another
// node keeps the tab when that node has it.
import {
  esc, icon, numBlock, metaHTML, copyHTML, imagesHTML, stepsHTML, workConnections, keywordOverview, keywordConnections,
  meOverview, meExperience, meWorks, workRows, rows, section, kindLabel, typeName, typeIcon, hasPage, factsHTML,
} from "./content.js";

export const PANEL_W = 420;

const TABS = {
  overview: ["Overview", "file-text"],
  images: ["Images", "image"],
  process: ["Process", "workflow"],
  experience: ["Experience", "briefcase"],
  connections: ["Connections", "waypoints"],
};

export function createPanel({ ix, on }) {
  const box = document.createElement("aside");
  box.className = "panel";
  box.tabIndex = -1;
  box.hidden = true;
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-labelledby", "panel-title");
  document.querySelector(".frame").append(box);
  let node = null;
  let tab = "overview";

  function parts(n) {
    if (n.role === "work") {
      const w = n.data;
      return {
        head: `${numBlock(w, "card-num")}<p class="card-meta mono-label">${[kindLabel(w), w.year].filter(Boolean).join(" · ")}</p>`,
        title: esc(w.title),
        sub: [w.sub ? `<p class="card-sub">${esc(w.sub)}</p>` : "", `<p class="panel-meta">${metaHTML(w)}</p>`].join(""),
        acts: [
          hasPage(w) ? `<button type="button" class="tbtn" data-act="page">${icon("maximize-2")}Full page</button>` : "",
          w.link ? `<a class="tbtn" href="${esc(w.link)}" target="_blank" rel="noopener">${icon("arrow-up-right")}Live site</a>` : "",
        ].join(""),
        tabs: {
          overview: copyHTML(w) + factsHTML(w, ix, { compact: true }),
          images: imagesHTML(w),
          process: stepsHTML(w),
          connections: workConnections(w, ix),
        },
      };
    }
    if (n.role === "kw") {
      const k = n.data;
      const works = ix.usedBy.get(k.id);
      return {
        head: `<span class="card-ic">${icon(typeIcon(k.type))}</span><p class="card-meta mono-label">${esc(typeName(k.type))}${works.length ? ` · ${works.length} work${works.length === 1 ? "" : "s"}` : ""}</p>`,
        title: `<span class="t-${k.type}">${esc(k.label)}</span>`,
        sub: "",
        acts: "",
        tabs: { overview: keywordOverview(k, ix), connections: keywordConnections(k, ix) },
      };
    }
    const me = n.data;
    const cut = me.tagline1.lastIndexOf(" and ") + 5;
    return {
      head: `<span class="card-ic">${icon("user")}</span><p class="card-meta mono-label">About</p>`,
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
      return `<button type="button" role="tab" class="tab" id="tab-${key}" data-tab="${key}" aria-controls="panel-body" aria-selected="${key === tab}" tabindex="${key === tab ? 0 : -1}"${empty ? " disabled" : ""}>${icon(ic)}<span>${label}</span></button>`;
    };
    box.innerHTML = `<header class="panel-head">
  <div class="card-head">${p.head}<button type="button" class="cbtn card-x" data-act="close" aria-label="Close" data-tip="Close" data-key="Esc">${icon("x")}</button></div>
  <h2 class="panel-title" id="panel-title">${p.title}</h2>${p.sub}
  ${p.acts ? `<div class="card-acts">${p.acts}</div>` : ""}
</header>
<div class="tabs" role="tablist" aria-label="Sections">${keys.map(tabBtn).join("")}</div>
<div class="panel-body" id="panel-body" role="tabpanel" aria-labelledby="tab-${tab}" tabindex="0">${p.tabs[tab]}</div>`;
    box.dataset.role = n.role;
  }

  function select(key, { focus = false } = {}) {
    if (!node) return;
    tab = key;
    render(node);
    if (focus) box.querySelector(`#tab-${key}`)?.focus();
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
    if (act) on[act]();
  });

  // Arrow keys, Home and End move along the enabled tabs.
  box.addEventListener("keydown", (e) => {
    const t = e.target.closest("[role='tab']");
    if (!t) return;
    const tabs = [...box.querySelectorAll("[role='tab']:not([disabled])")];
    const i = tabs.indexOf(t);
    const to = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    select(tabs[(to + tabs.length) % tabs.length].dataset.tab, { focus: true });
  });

  return {
    get id() {
      return node?.id ?? null;
    },
    get tab() {
      return tab;
    },
    show(n, { focus = true } = {}) {
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
