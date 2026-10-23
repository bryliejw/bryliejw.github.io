// Grow card: opens beside the clicked node and follows it through pan, zoom and view
// changes. Drag it by its header and it stays where it is dropped (for every node it
// shows) until docked again; resize it from the corner and its content reflows.
// Works: number or kind block, the images (a carousel of every image but the process ones),
// title, subtitle, one paragraph, facts and tags for smaller works, keyword rows for the
// rest; Expand, Full page (projects), Live site when linked, previous and next.
import { esc, icon, numBlock, rows, keywordRows, workRows, oneParagraph, kindLabel, typeName, typeIcon, hasPage, meWorks, KIND_ICON, factsHTML, tagsHTML, carouselHTML, carouselImages } from "./content.js";
import { follow } from "./follow.js";

const clamp = (v, lo, hi) => Math.max(lo, Math.min(v, hi));

export function createCard({ graph, ix, edge, on }) {
  const box = document.createElement("section");
  box.className = "card";
  box.tabIndex = -1;
  box.hidden = true;
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-labelledby", "card-title");
  document.querySelector(".frame").append(box);
  let node = null;
  let pinned = null; // { x, y } once the card has been dragged

  const track = follow(box, () => (node && !node.hidden && !pinned ? node : null), { gap: 14, prefer: "right", edge });

  const btn = (act, ic, text, primary = false) => `<button type="button" class="tbtn${primary ? " tbtn-primary" : ""}" data-act="${act}">${icon(ic)}${text}</button>`;

  function content(n) {
    let head;
    let title;
    let sub = "";
    let media = "";
    let info = "";
    let acts = btn("expand", "panel-right-open", "Expand", true);
    if (n.role === "work") {
      const w = n.data;
      box.dataset.level = w.size;
      box.dataset.kw = "";
      const metaTxt = [kindLabel(w), w.year].filter(Boolean).join(" · ");
      title = esc(w.title);
      if (w.sub) sub = `<p class="card-sub">${esc(w.sub)}</p>`;
      if (w.size === "S") {
        head = `<span class="card-ic">${icon(KIND_ICON[w.kind])}</span><p class="card-meta mono-label">${esc(metaTxt)}</p>`;
        media = carouselHTML(carouselImages(w), { cls: "card-car", label: w.title });
        info = [w.copy.oneLine ? `<p class="card-text">${esc(w.copy.oneLine)}</p>` : "", factsHTML(w, ix), tagsHTML(w, ix)].join("");
      } else {
        head = `${numBlock(w, "card-num")}<p class="card-meta mono-label">${esc(metaTxt)}</p>`;
        media = carouselHTML(carouselImages(w), { cls: "card-car", label: w.title });
        const line = oneParagraph(w);
        info = (line ? `<p class="card-text">${esc(line)}</p>` : "") + rows(keywordRows(w.keywords, ix));
        if (hasPage(w)) acts += btn("page", "maximize-2", "Full page");
      }
      if (w.link) acts += `<a class="tbtn" href="${esc(w.link)}" target="_blank" rel="noopener">${icon("arrow-up-right")}Live site</a>`;
      if (graph.works.filter((o) => !o.hidden).length > 1) acts += `<span class="card-steps"><button type="button" class="cbtn" data-act="prev" aria-label="Previous work" data-tip="Previous" data-key="[">${icon("chevron-left")}</button><button type="button" class="cbtn" data-act="next" aria-label="Next work" data-tip="Next" data-key="]">${icon("chevron-right")}</button></span>`;
    } else if (n.role === "kw") {
      delete box.dataset.level;
      box.dataset.kw = n.type;
      const works = ix.usedBy.get(n.id);
      head = `<span class="card-ic">${icon(typeIcon(n.type))}</span><p class="card-meta mono-label">${esc(typeName(n.type))}${works.length ? ` · ${works.length} work${works.length === 1 ? "" : "s"}` : ""}</p>`;
      title = `<span class="t-${n.type}">${esc(n.data.label)}</span>`;
      info = rows(workRows(works));
    } else {
      delete box.dataset.level;
      box.dataset.kw = "";
      const me = n.data;
      const cut = me.tagline1.lastIndexOf(" and ") + 5;
      head = `<span class="card-ic">${icon("user")}</span><p class="card-meta mono-label">About</p>`;
      title = esc(me.name);
      sub = `<p class="card-sub">${esc(me.tagline1.slice(0, cut))}<s>${esc(me.tagline1.slice(cut))}</s> <mark>${esc(me.tagline2)}</mark></p>`;
      info = `<p class="card-text">${esc(me.bio[0])}</p>` + rows(workRows(meWorks(ix)));
    }
    const dock = `<button type="button" class="cbtn card-dock" data-act="dock" aria-label="Dock to the node" data-tip="Dock" data-key=""${pinned ? "" : " hidden"}>${icon("pin-off")}</button>`;
    return `<header class="card-head" data-drag title="Drag to move">${head}<span class="card-grip" aria-hidden="true">${icon("grip-horizontal")}</span>${dock}<button type="button" class="cbtn card-x" data-act="close" aria-label="Close" data-tip="Close" data-key="Esc">${icon("x")}</button></header>
<div class="card-body">${media}<div class="card-info"><h2 class="card-title" id="card-title">${title}</h2>${sub}${info}</div></div>
${acts ? `<footer class="card-acts">${acts}</footer>` : ""}`;
  }

  box.addEventListener("click", (e) => {
    const link = e.target.closest("[data-node]");
    if (link && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
      e.preventDefault();
      return on.link(link.dataset.node);
    }
    const act = e.target.closest("[data-act]")?.dataset.act;
    if (act === "dock") return dockCard();
    if (act === "prev" || act === "next") return on.step(act === "next" ? 1 : -1);
    if (act) on[act]();
  });

  // Drag by the header. Once moved, the card stays put for every node until docked.
  box.addEventListener("pointerdown", (e) => {
    const handle = e.target.closest("[data-drag]");
    if (!handle || e.target.closest("button, a") || e.button) return;
    if (window.matchMedia("(max-width: 719px)").matches) return;
    e.preventDefault();
    const frame = box.offsetParent.getBoundingClientRect();
    const start = { x: e.clientX, y: e.clientY, left: box.offsetLeft, top: box.offsetTop };
    box.setPointerCapture(e.pointerId);
    box.classList.add("is-dragging");
    track.stop();
    const move = (ev) => {
      const x = clamp(start.left + ev.clientX - start.x, 0, frame.width - 80);
      const y = clamp(start.top + ev.clientY - start.y, 0, frame.height - 48);
      box.style.left = `${x}px`;
      box.style.top = `${y}px`;
      pinned = { x, y };
    };
    const up = () => {
      box.classList.remove("is-dragging");
      box.removeEventListener("pointermove", move);
      box.removeEventListener("pointerup", up);
      box.removeEventListener("pointercancel", up);
      box.querySelector(".card-dock")?.removeAttribute("hidden");
      box.dataset.pinned = pinned ? "true" : "";
    };
    box.addEventListener("pointermove", move);
    box.addEventListener("pointerup", up);
    box.addEventListener("pointercancel", up);
  });

  function dockCard() {
    pinned = null;
    box.dataset.pinned = "";
    box.querySelector(".card-dock")?.setAttribute("hidden", "");
    track.start();
  }

  return {
    get id() {
      return node?.id ?? null;
    },
    show(n, { focus = true } = {}) {
      const same = node === n && !box.hidden;
      node = n;
      if (!same) {
        box.innerHTML = content(n);
        box.classList.remove("is-growing");
        void box.offsetWidth; // restart the grow
        box.classList.add("is-growing");
      }
      box.hidden = false;
      if (pinned) {
        box.style.left = `${pinned.x}px`;
        box.style.top = `${pinned.y}px`;
        track.stop();
      } else track.start();
      if (focus) box.focus({ preventScroll: true });
    },
    hide() {
      node = null;
      box.hidden = true;
      track.stop();
    },
    contains: (el) => box.contains(el),
  };
}
