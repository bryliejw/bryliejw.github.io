// Active filter chips beside the rail: the focused node in ultramarine, then each hidden
// group in ink, each removable, plus Clear all. Hidden when there is nothing to show.
import { h, icon } from "./dom.js";

export function nodeName(n) {
  if (n.role === "me") return n.data.name;
  if (n.role === "work") return `${n.data.n} ${n.data.title}`;
  return n.data.label;
}

export function bindActives({ graph, views, filter }) {
  const box = document.getElementById("actives");
  let sig = "";

  function render() {
    const focus = views.state.focus && graph.byId.get(views.state.focus);
    const keys = filter.hiddenKeys();
    const next = [focus?.id ?? "", ...keys].join("|");
    if (next === sig) return;
    // Keep keyboard focus in the row when a chip removes itself.
    const at = [...box.children].indexOf(document.activeElement);
    sig = next;
    box.replaceChildren();
    if (focus) {
      const name = nodeName(focus);
      box.append(chip(name, `Clear focus: ${name}`, "achip achip-focus", () => views.set("focus", null)));
    }
    for (const k of keys) {
      const name = filter.label(k);
      box.append(chip(name, `Show ${name}`, "achip", () => filter.show(k)));
    }
    if (box.children.length) {
      box.append(
        h("button", { type: "button", class: "achip achip-clear", onclick: () => {
          views.state.focus = null;
          filter.reset();
        } }, "Clear all"),
      );
    }
    box.hidden = !box.children.length;
    if (at >= 0) (box.children[Math.min(at, box.children.length - 1)] ?? document.getElementById("btn-filter")).focus();
  }

  const chip = (text, label, cls, onclick) => h("button", { type: "button", class: cls, "aria-label": label, onclick }, h("span", {}, text), icon("x"));

  views.onChange(render);
  filter.onChange(render);
  render();
}
