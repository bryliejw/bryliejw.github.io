// View cursor and image viewer. A blue "View" disc follows the pointer over work tiles on
// the map and over images in cards, the panel and full pages (pointer devices only).
// Clicking one of those images opens it full size; a click or Esc closes it.
const IMAGES = ".card figure img, .strip img, .panel .img img, .page-layer .img img, .page-layer .wp-hero img";
const TILES = ".node.r-work";
const coarse = window.matchMedia("(hover: none), (pointer: coarse)");

export function bindCursor() {
  const disc = document.createElement("div");
  disc.className = "vcur";
  disc.setAttribute("aria-hidden", "true");
  disc.textContent = "View";
  document.body.append(disc);

  const viewer = document.createElement("div");
  viewer.className = "viewer";
  viewer.hidden = true;
  viewer.setAttribute("role", "dialog");
  viewer.setAttribute("aria-modal", "true");
  viewer.setAttribute("aria-label", "Image");
  viewer.tabIndex = -1;
  viewer.innerHTML = '<img alt=""><p class="viewer-alt"></p>';
  document.body.append(viewer);
  let back = null;

  document.addEventListener("pointermove", (e) => {
    if (coarse.matches || !viewer.hidden) return disc.classList.remove("on");
    const on = !!e.target.closest?.(`${IMAGES}, ${TILES}`);
    disc.style.left = `${e.clientX}px`;
    disc.style.top = `${e.clientY}px`;
    disc.classList.toggle("on", on);
  });
  document.addEventListener("pointerleave", () => disc.classList.remove("on"));

  function open(img) {
    back = document.activeElement;
    const full = img.currentSrc && img.srcset ? img.srcset.split(",").pop().trim().split(" ")[0] : img.src;
    viewer.querySelector("img").src = full || img.src;
    viewer.querySelector("img").alt = img.alt;
    viewer.querySelector(".viewer-alt").textContent = img.alt;
    viewer.hidden = false;
    disc.classList.remove("on");
    viewer.focus();
  }
  function close() {
    viewer.hidden = true;
    back?.focus?.({ preventScroll: true });
  }
  document.addEventListener("click", (e) => {
    const img = e.target.closest?.(IMAGES);
    if (!img || e.target.closest("a")) return;
    e.preventDefault();
    e.stopPropagation();
    open(img);
  }, true);
  viewer.addEventListener("click", close);
  // Esc closes the viewer before any other layer.
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || viewer.hidden) return;
    e.stopImmediatePropagation();
    e.preventDefault();
    close();
  }, true);
}
