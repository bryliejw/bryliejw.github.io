// View cursor and image viewer. A blue "View" disc follows the pointer over work images
// (pointer devices only). Clicking one opens the viewer: the image's whole set on
// ultramarine, the current image centred and its neighbours turned away on a curved wall,
// fading out at the sides. Click a neighbour or a side, use the arrow keys or swipe to move;
// Esc, the close button or a click on the ground closes it.
const IMAGES = ".car-it img, .ps-img img, .imgs img, .panel .img img, .page-layer .img img, .page-layer .wp-hero img";
const coarse = window.matchMedia("(hover: none), (pointer: coarse)");
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
const SPRITE = "/assets/icons.svg";
const ic = (n) => `<svg class="ic" aria-hidden="true"><use href="${SPRITE}#${n}"/></svg>`;

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
  viewer.setAttribute("aria-label", "Images");
  viewer.tabIndex = -1;
  viewer.innerHTML = `<div class="vw-stage"><div class="vw-track"></div></div>
<p class="vw-count mono-label" aria-live="polite"></p>
<button type="button" class="vw-x" aria-label="Close" data-tip="Close" data-key="Esc">${ic("x")}</button>
<button type="button" class="vw-nav vw-prev" aria-label="Previous image" data-tip="Previous" data-key="←">${ic("chevron-left")}</button>
<button type="button" class="vw-nav vw-next" aria-label="Next image" data-tip="Next" data-key="→">${ic("chevron-right")}</button>
<p class="vw-alt"></p>`;
  document.body.append(viewer);
  const track = viewer.querySelector(".vw-track");
  let set = [];
  let at = 0;
  let back = null;

  document.addEventListener("pointermove", (e) => {
    if (coarse.matches || !viewer.hidden) return disc.classList.remove("on");
    const on = !!e.target.closest?.(IMAGES);
    disc.style.left = `${e.clientX}px`;
    disc.style.top = `${e.clientY}px`;
    disc.classList.toggle("on", on);
  });
  document.addEventListener("pointerleave", () => disc.classList.remove("on"));

  const full = (img) => img.dataset.full || (img.srcset ? img.srcset.split(",").pop().trim().split(" ")[0] : img.src);

  function open(img) {
    back = document.activeElement;
    const box = img.closest("[data-set]");
    const imgs = box ? [...box.querySelectorAll("img")].filter((i) => i.matches(IMAGES)) : [img];
    set = imgs.map((i) => ({ src: full(i), alt: i.alt, w: +i.getAttribute("width") || 4, h: +i.getAttribute("height") || 3 }));
    at = Math.max(0, imgs.indexOf(img));
    track.innerHTML = set.map((s, i) => `<figure class="vw-it" data-i="${i}" style="--a:${(s.w / s.h).toFixed(3)}"><img src="${s.src}" alt="${s.alt.replace(/"/g, "&quot;")}" draggable="false"></figure>`).join("");
    viewer.classList.toggle("is-single", set.length < 2);
    viewer.hidden = false;
    disc.classList.remove("on");
    paint(false);
    viewer.focus();
  }
  function paint(animate = true) {
    const its = [...track.children];
    viewer.classList.toggle("no-anim", !animate || reduced.matches);
    // Lay the set out in a row, centre the current image, turn the others away.
    const vw = window.innerWidth;
    const h = Math.min(window.innerHeight * 0.68, 900);
    let x = 0;
    const lefts = its.map((it, i) => {
      const w = Math.min(h * set[i].w / set[i].h, vw * 0.7);
      it.style.width = `${w}px`;
      it.style.height = `${h}px`;
      const l = x;
      x += w + 40;
      return [l, w];
    });
    const [cl, cw] = lefts[at];
    track.style.transform = `translateX(${vw / 2 - cl - cw / 2}px)`;
    its.forEach((it, i) => {
      const d = i - at;
      it.classList.toggle("is-on", d === 0);
      it.style.setProperty("--d", Math.max(-3, Math.min(3, d)));
      it.setAttribute("aria-hidden", d !== 0);
    });
    viewer.querySelector(".vw-count").textContent = `${String(at + 1).padStart(2, "0")} / ${String(set.length).padStart(2, "0")}`;
    viewer.querySelector(".vw-alt").textContent = set[at].alt;
    viewer.querySelector(".vw-prev").disabled = at === 0;
    viewer.querySelector(".vw-next").disabled = at === set.length - 1;
  }
  const go = (d) => {
    const to = Math.max(0, Math.min(set.length - 1, at + d));
    if (to === at) return;
    at = to;
    paint();
  };
  function close() {
    viewer.hidden = true;
    track.innerHTML = "";
    back?.focus?.({ preventScroll: true });
  }
  document.addEventListener("click", (e) => {
    const img = e.target.closest?.(IMAGES);
    if (!img || e.target.closest("a") || !viewer.hidden) return;
    e.preventDefault();
    e.stopPropagation();
    open(img);
  }, true);
  viewer.addEventListener("click", (e) => {
    if (e.target.closest(".vw-x")) return close();
    if (e.target.closest(".vw-prev")) return go(-1);
    if (e.target.closest(".vw-next")) return go(1);
    const it = e.target.closest(".vw-it");
    if (it && !it.classList.contains("is-on")) return go(+it.dataset.i - at);
    if (it) return;
    // The ground: left or right third moves, the middle closes.
    const x = e.clientX / window.innerWidth;
    if (x < 0.3 && at > 0) go(-1);
    else if (x > 0.7 && at < set.length - 1) go(1);
    else close();
  });
  let x0 = null;
  viewer.addEventListener("pointerdown", (e) => (x0 = e.clientX));
  viewer.addEventListener("pointerup", (e) => {
    if (x0 !== null && Math.abs(e.clientX - x0) > 50) go(e.clientX < x0 ? 1 : -1);
    x0 = null;
  });
  window.addEventListener("resize", () => !viewer.hidden && paint(false));
  // Esc closes the viewer before any other layer; arrows move.
  document.addEventListener("keydown", (e) => {
    if (viewer.hidden) return;
    if (e.key === "Escape") {
      e.stopImmediatePropagation();
      e.preventDefault();
      close();
    } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.stopImmediatePropagation();
      e.preventDefault();
      go(e.key === "ArrowRight" ? 1 : -1);
    }
  }, true);
}
