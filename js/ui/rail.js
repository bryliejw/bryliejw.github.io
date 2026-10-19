// Left rail: view buttons (active = ultramarine fill) and the popover controls.
// Popovers are anchored to their control; only one is open at a time.
let open = null;

export function closePopover() {
  if (!open) return false;
  const { pop, btn } = open;
  pop.hidden = true;
  btn.setAttribute("aria-expanded", "false");
  open = null;
  return true;
}

export function togglePopover(btn) {
  const pop = document.getElementById(btn.getAttribute("aria-controls"));
  const wasOpen = open?.pop === pop;
  closePopover();
  if (wasOpen) return;
  const r = btn.getBoundingClientRect();
  pop.style.left = `${r.right + 8}px`;
  pop.style.top = `${r.top}px`;
  pop.hidden = false;
  btn.setAttribute("aria-expanded", "true");
  open = { pop, btn };
  pop.querySelector("input:checked, input, button")?.focus();
}

export function bindRail(views) {
  const buttons = [...document.querySelectorAll(".rail [data-view]")];
  const sync = () => {
    for (const b of buttons) b.setAttribute("aria-pressed", String(b.dataset.view === views.state.view));
  };
  for (const b of buttons) b.addEventListener("click", () => views.setView(b.dataset.view));
  for (const b of document.querySelectorAll(".rail [aria-controls]")) b.addEventListener("click", () => togglePopover(b));
  document.addEventListener("pointerdown", (e) => {
    if (open && !open.pop.contains(e.target) && !open.btn.contains(e.target)) closePopover();
  });
  views.onChange(sync);
  sync();
}
