// Preview: on hover or keyboard focus, a tooltip beside the node with a meta line (kind or
// type icon), the first image, the title and the subtitle. Not shown for the node whose
// card or panel is open, nor while nodes move between views or are dragged.
import { esc, icon, src, kindLabel, KIND_ICON, typeName, typeIcon, factsHTML, tagsHTML, stripHTML, oneParagraph } from "./content.js";
import { follow } from "./follow.js";

export function createPreview({ graph, views, isOpen, edge, ix }) {
  const box = document.createElement("div");
  box.className = "preview";
  box.setAttribute("aria-hidden", "true"); // the node's aria-label already names it
  box.hidden = true;
  document.querySelector(".frame").append(box);
  let shown = null;
  let timer = 0;

  function content(n) {
    delete box.dataset.level;
    box.dataset.kw = n.role === "kw" ? n.type : "";
    if (n.role === "me") return `<p class="pv-meta mono-label">${icon("user")}About</p><p class="pv-title">${esc(n.data.name)}</p>`;
    if (n.role === "kw") {
      const works = n.edges.filter((e) => e.type === "kw").length;
      return `<p class="pv-meta mono-label">${icon(typeIcon(n.type))}${esc(typeName(n.type))}${works ? ` · ${works} work${works === 1 ? "" : "s"}` : ""}</p><p class="pv-title pv-${n.type}">${esc(n.data.label)}</p>`;
    }
    const w = n.data;
    const img = w.images[0];
    const meta = `<p class="pv-meta mono-label">${icon(KIND_ICON[w.kind])}${w.size !== "S" ? `<span class="pv-n">${esc(w.n)}</span>` : ""}${[kindLabel(w), w.year].filter(Boolean).join(" · ")}</p>`;
    box.dataset.level = w.size;
    if (w.size === "S") {
      // Smaller works: the words are the information. Thumb, title, then facts and tags.
      return [
        `<div class="pv-s-head">${img ? `<img class="pv-thumb${img.white ? " is-white" : ""}" src="${esc(src(img.thumb ?? img.src))}" alt="" width="56" height="56">` : ""}<div>${meta}<p class="pv-title">${esc(w.title)}</p>${w.sub ? `<p class="pv-sub">${esc(w.sub)}</p>` : ""}</div></div>`,
        factsHTML(w, ix),
        tagsHTML(w, ix, { links: false }),
      ].join("");
    }
    const line = oneParagraph(w);
    return [
      meta,
      img ? `<img class="pv-img${img.white ? " is-white" : ""}" src="${esc(src(img.thumb ?? img.src))}" alt="" width="${img.w}" height="${img.h}">` : "",
      `<p class="pv-title">${esc(w.title)}</p>`,
      w.sub ? `<p class="pv-sub">${esc(w.sub)}</p>` : "",
      line ? `<p class="pv-line">${esc(line)}</p>` : "",
      w.images.length > 1 ? stripHTML({ ...w, images: w.images.slice(1) }, w.size === "L" ? 4 : 3, "pv-strip") : "",
    ].join("");
  }

  const track = follow(box, () => shown, { gap: 10, prefer: "above", edge });

  function show(id) {
    const n = graph.byId.get(id);
    if (!n || n.hidden || isOpen(id) || views.state.moving) return hide();
    if (shown === n) return;
    shown = n;
    box.innerHTML = content(n);
    box.hidden = false;
    track.start();
  }
  function hide() {
    clearTimeout(timer);
    shown = null;
    box.hidden = true;
    track.stop();
  }

  // Follows views.state.hover, with a short delay for the pointer and none for the keyboard.
  views.onChange((s) => {
    const id = s.hover;
    if (!id || graph.svg.querySelector(".dragging")) return hide();
    if (shown?.id === id) return isOpen(id) || s.moving ? hide() : null;
    clearTimeout(timer);
    const keyboard = document.activeElement === graph.byId.get(id)?.el;
    if (keyboard) show(id);
    else {
      if (shown) box.hidden = true;
      timer = setTimeout(() => views.state.hover === id && show(id), 140);
    }
  });
  return { hide };
}
