import { VIEWS } from "../map/render.js";
// Keyboard shortcuts (CLAUDE.md, Shortcuts). [ and ] step to the previous or next work in the card or panel. Keys are ignored while typing in an input,
// except Esc and Cmd+K. Esc closes the top layer: the palette or a popover, then the page,
// panel or card, then focus. While the full page covers the map, only Esc works.
import { closeLayer, surprise, togglePopover } from "./rail.js";

const pop = (id) => togglePopover(document.getElementById(id));

export function bindShortcuts({ views, zoom, palette, select, graph, flow }) {
  document.addEventListener("keydown", (e) => {
    const k = e.key;
    if (flow.blocking && k !== "Escape") return;
    if ((e.metaKey || e.ctrlKey) && !e.altKey && k.toLowerCase() === "k") {
      e.preventDefault();
      palette.toggle();
      return;
    }
    const t = e.target;
    if (t.closest?.("input:not([type='checkbox']):not([type='radio']), textarea, select, [contenteditable='true']") && k !== "Escape") return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (k === "1" || k === "2" || k === "3") views.setView(VIEWS[+k - 1]);
    else if (k === "/") palette.open();
    else if (k === "f" || k === "F") pop("btn-filter");
    else if (k === "l" || k === "L") pop("btn-layers");
    else if (k === "i" || k === "I") pop("btn-index");
    else if (k === "?") pop("btn-key");
    else if (k === "r" || k === "R") surprise({ views, select, graph });
    else if (k === "+" || k === "=") zoom.by(1.4, 250);
    else if (k === "-" || k === "_") zoom.by(1 / 1.4, 250);
    else if (k === "0") zoom.to(views.home(), 400);
    else if (k === "[" || k === "]") {
      if (!flow.step(k === "]" ? 1 : -1)) return;
    }
    else if (k === "Escape") {
      if (!closeLayer({ restore: true }) && !flow.escape()) {
        if (!views.state.focus) return;
        views.set("focus", null);
      }
    } else return;
    e.preventDefault();
  });
}
