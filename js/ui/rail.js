// Left rail: view buttons (active = ultramarine fill), the popover controls and Surprise me.
// Popovers are anchored to their control. Only one layer (popover or the search palette)
// is open at a time; Esc or a click outside it, on the map included, closes it.
let open = null; // { el, btn, onClose }

export const isOpen = (el) => open?.el === el;
export const openLayer = () => open;

// Closes the open layer. restore: give keyboard focus back to the control that opened it.
export function closeLayer({ restore = false } = {}) {
  if (!open) return false;
  const { el, btn, onClose } = open;
  open = null;
  el.hidden = true;
  btn?.setAttribute("aria-expanded", "false");
  onClose?.();
  if (restore) btn?.focus();
  return true;
}

// Opens a layer and closes any other. focus: the element to focus inside it.
export function showLayer(el, btn, { onClose, focus } = {}) {
  closeLayer();
  el.hidden = false;
  btn?.setAttribute("aria-expanded", "true");
  open = { el, btn, onClose };
  (focus ?? firstFocusable(el) ?? el).focus({ preventScroll: true });
}

// The first focusable element that is showing, checked inputs first.
const firstFocusable = (el, sel = "input:checked, input, button, a[href], [tabindex='0']") =>
  [...el.querySelectorAll(sel)].find((e) => e.checkVisibility()) ?? null;

// Anchors a popover to its control. data-anchor on the control: right (rail, default),
// left (bottom-right controls, bottom edges aligned) or below (top-right site nav).
// Kept inside the viewport.
function place(pop, btn) {
  const r = btn.getBoundingClientRect();
  const side = btn.dataset.anchor ?? "right";
  pop.style.maxHeight = "";
  const w = pop.offsetWidth;
  const vh = window.innerHeight;
  const vw = window.innerWidth;
  let left;
  let top;
  if (side === "right") {
    left = r.right + 8;
    top = r.top;
  } else if (side === "left") {
    left = r.left - 8 - w;
    top = r.bottom - pop.offsetHeight;
  } else {
    left = r.right - w;
    top = r.bottom + 8;
  }
  top = Math.max(16, Math.min(top, vh - 16 - pop.offsetHeight));
  left = Math.max(16, Math.min(left, vw - 16 - w));
  pop.style.left = `${left}px`;
  pop.style.top = `${top}px`;
  pop.style.maxHeight = `${vh - top - 16}px`;
}

export function togglePopover(btn) {
  const pop = document.getElementById(btn.getAttribute("aria-controls"));
  if (isOpen(pop)) return closeLayer({ restore: true });
  showLayer(pop, btn);
  place(pop, btn);
}

export function bindRail({ views, select, graph }) {
  const buttons = [...document.querySelectorAll(".rail [data-view]")];
  const sync = () => {
    for (const b of buttons) b.setAttribute("aria-pressed", String(b.dataset.view === views.state.view));
  };
  for (const b of buttons) b.addEventListener("click", () => views.setView(b.dataset.view));
  for (const b of document.querySelectorAll("[aria-controls^='pop-']")) {
    b.addEventListener("click", (e) => {
      e.preventDefault();
      togglePopover(b);
    });
  }
  document.getElementById("btn-surprise").addEventListener("click", () => surprise({ views, select, graph }));
  document.addEventListener("pointerdown", (e) => {
    if (open && !open.el.contains(e.target) && !open.btn?.contains(e.target)) closeLayer();
  });
  window.addEventListener("resize", () => {
    if (open && open.el.classList.contains("pop")) place(open.el, open.btn);
  });
  views.onChange(sync);
  sync();
}

// Surprise me: a random work that is showing, never the one already focused.
export function surprise({ views, select, graph }) {
  const pool = graph.works.filter((w) => !w.hidden && w.id !== views.state.focus);
  if (!pool.length) return;
  select(pool[Math.floor(Math.random() * pool.length)].id);
}
