// Keyboard shortcuts. Keys are ignored while typing in an input.
import { closePopover, togglePopover } from "./rail.js";

export function bindShortcuts({ views, zoom }) {
  document.addEventListener("keydown", (e) => {
    const t = e.target;
    if (t.closest?.("input, textarea, select, [contenteditable='true']") && e.key !== "Escape") return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key;
    if (k === "1" || k === "2" || k === "3") views.setView(["edge", "force", "rings"][+k - 1]);
    else if (k === "l" || k === "L") togglePopover(document.getElementById("btn-layers"));
    else if (k === "+" || k === "=") zoom.by(1.4, 250);
    else if (k === "-" || k === "_") zoom.by(1 / 1.4, 250);
    else if (k === "0") zoom.to(views.home(), 400);
    else if (k === "Escape") {
      if (closePopover()) document.getElementById("btn-layers").focus();
      else if (views.state.focus) views.set("focus", null);
      else return;
    } else return;
    e.preventDefault();
  });
}
