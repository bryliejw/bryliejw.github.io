// Full page for the three PDF projects, over the map: a clip-path circle grows from the
// node to the page, set from the same markup as the generated /work/<slug>/ page
// (pageHTML in content.js). Back shrinks it to the node and returns to the panel.
// While it shows, the map frame is inert.
import { pageHTML } from "./content.js";

const MS = 650;
const EASE = "cubic-bezier(0.65, 0, 0.35, 1)";
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
const TITLE = document.title;

export function createPage({ ix, on }) {
  const layer = document.createElement("div");
  layer.className = "page-layer";
  layer.hidden = true;
  layer.tabIndex = -1;
  layer.setAttribute("role", "dialog");
  layer.setAttribute("aria-modal", "true");
  layer.setAttribute("aria-labelledby", "wp-title");
  document.body.append(layer);
  const frame = document.querySelector(".frame");
  let work = null;
  let anim = null;

  const circle = ([x, y], r) => `circle(${r}px at ${x}px ${y}px)`;
  const reach = ([x, y]) => Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

  // Closing holds its last frame (fill) until the layer is hidden, so it never flashes back.
  function clip(from, to, origin) {
    anim?.cancel();
    if (reduced.matches || !origin) return Promise.resolve();
    anim = layer.animate([{ clipPath: circle(origin, from) }, { clipPath: circle(origin, to) }], { duration: MS, easing: EASE, fill: to ? "none" : "forwards" });
    return anim.finished.catch(() => {});
  }

  layer.addEventListener("click", (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
    const a = e.target.closest("[data-back], [data-page], [data-node]");
    if (!a) return;
    e.preventDefault();
    if (a.hasAttribute("data-back")) on.back();
    else if (a.dataset.page) on.next(a.dataset.page);
    else on.link(a.dataset.node);
  });

  return {
    get id() {
      return work?.id ?? null;
    },
    // origin: the node's centre on screen, where the circle starts.
    show(w, { origin } = {}) {
      const fresh = layer.hidden;
      if (work !== w || fresh) {
        layer.innerHTML = pageHTML(w, ix);
        layer.scrollTop = 0;
      }
      work = w;
      document.title = `${w.title} · Brylie Wilson`;
      layer.hidden = false;
      frame.inert = true;
      layer.focus({ preventScroll: true });
      if (fresh) clip(0, reach(origin ?? [0, 0]), origin);
      else anim?.cancel(); // reopened while closing
    },
    // origin: where the circle closes to; resolves once the page is gone.
    async hide({ origin } = {}) {
      if (layer.hidden) return;
      frame.inert = false;
      document.title = TITLE;
      work = null;
      await clip(reach(origin ?? [0, 0]), 0, origin);
      if (!work) {
        layer.hidden = true;
        anim?.cancel();
      }
    },
    get open() {
      return !layer.hidden;
    },
  };
}
