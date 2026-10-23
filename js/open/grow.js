// Grow card: opens beside the clicked node and follows it through pan, zoom and view
// changes. Header block with the number (works) or the type icon (keywords, the name);
// title; labels in rows, each led by its type icon and set as plain text links; one
// paragraph; Expand, Full page (PDF projects only), Live site when the work links one.
import { esc, icon, src, numBlock, rows, keywordRows, workRows, oneParagraph, kindLabel, typeName, typeIcon, hasPage, meWorks, KIND_ICON, factsHTML, tagsHTML, stripHTML, detailsHTML, imgHTML } from "./content.js";
import { follow } from "./follow.js";

export function createCard({ graph, ix, edge, on }) {
  const box = document.createElement("section");
  box.className = "card";
  box.tabIndex = -1;
  box.hidden = true;
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-labelledby", "card-title");
  document.querySelector(".frame").append(box);
  let node = null;

  const track = follow(box, () => (node && !node.hidden ? node : null), { gap: 14, prefer: "right", edge });

  const btn = (act, ic, text, extra = "") => `<button type="button" class="tbtn" data-act="${act}"${extra}>${icon(ic)}${text}</button>`;

  function content(n) {
    let head;
    let title;
    let sub = "";
    let body;
    let para = "";
    let acts = btn("expand", "panel-right-open", "Expand");
    if (n.role === "work") {
      const w = n.data;
      box.dataset.level = w.size;
      const metaTxt = [kindLabel(w), w.year].filter(Boolean).join(" · ");
      title = esc(w.title);
      if (w.sub) sub = `<p class="card-sub">${esc(w.sub)}</p>`;
      if (w.size === "S") {
        // Smaller works: images, one line, facts and tags. No panel.
        head = `<span class="card-ic">${icon(KIND_ICON[w.kind])}</span><p class="card-meta mono-label">${esc(metaTxt)}</p>`;
        body = [stripHTML(w, 4, "strip card-strip"), w.copy.oneLine ? `<p class="card-text">${esc(w.copy.oneLine)}</p>` : "", factsHTML(w, ix, { year: false }), tagsHTML(w, ix), detailsHTML(w)].join("");
        acts = "";
      } else {
        head = `${numBlock(w, "card-num")}<p class="card-meta mono-label">${esc(metaTxt)}</p>`;
        const img = w.images[0];
        const line = oneParagraph(w);
        body = (img ? imgHTML(img, { cls: "card-img", sizes: "340px", lazy: false }) : "") + (line ? `<p class="card-text">${esc(line)}</p>` : "") + rows(keywordRows(w.keywords, ix));
        if (hasPage(w)) acts += btn("page", "maximize-2", "Full page");
      }
      if (w.link) acts += `<a class="tbtn" href="${esc(w.link)}" target="_blank" rel="noopener">${icon("arrow-up-right")}Live site</a>`;
    } else if (n.role === "kw") {
      delete box.dataset.level;
      const works = ix.usedBy.get(n.id);
      head = `<span class="card-ic">${icon(typeIcon(n.type))}</span><p class="card-meta mono-label">${esc(typeName(n.type))}${works.length ? ` · ${works.length} work${works.length === 1 ? "" : "s"}` : ""}</p>`;
      title = `<span class="t-${n.type}">${esc(n.data.label)}</span>`;
      body = rows(workRows(works));
    } else {
      delete box.dataset.level;
      const me = n.data;
      const cut = me.tagline1.lastIndexOf(" and ") + 5;
      head = `<span class="card-ic">${icon("user")}</span><p class="card-meta mono-label">About</p>`;
      title = esc(me.name);
      sub = `<p class="card-sub">${esc(me.tagline1.slice(0, cut))}<s>${esc(me.tagline1.slice(cut))}</s> <mark>${esc(me.tagline2)}</mark></p>`;
      body = rows(workRows(meWorks(ix)));
      para = me.bio[0];
    }
    return `<header class="card-head">${head}<button type="button" class="cbtn card-x" data-act="close" aria-label="Close" data-tip="Close" data-key="Esc">${icon("x")}</button></header>
<h2 class="card-title" id="card-title">${title}</h2>${sub}${body}${para ? `<p class="card-text">${esc(para)}</p>` : ""}
${acts ? `<footer class="card-acts">${acts}</footer>` : ""}`;
  }

  box.addEventListener("click", (e) => {
    const link = e.target.closest("[data-node]");
    if (link && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
      e.preventDefault();
      return on.link(link.dataset.node);
    }
    const act = e.target.closest("[data-act]")?.dataset.act;
    if (act) on[act]();
  });

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
      track.start();
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
