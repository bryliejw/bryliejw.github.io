// Key popover: node shapes, keyword ticks with their group icons, lines, and shortcuts.
// The shapes reuse the map's own classes so they always match the marks.
import { GROUPS } from "../map/render.js";
import { h, icon, svg } from "./dom.js";

const mark = (w, hgt, ...shapes) => svg({ class: "key-mark", viewBox: `0 0 ${w} ${hgt}`, width: w, height: hgt, "aria-hidden": "true" }, ...shapes);

const SHAPES = [
  ["Project", mark(28, 28, '<rect class="tile-l" x="0.5" y="0.5" width="27" height="27"/><rect class="chip" x="0.5" y="0.5" width="11" height="7"/>')],
  ["Extra", mark(28, 28, '<rect class="tile-m" x="4.5" y="4.5" width="19" height="19"/><text class="tile-n key-n" x="14" y="17.5" text-anchor="middle">E</text>')],
  ["Work", mark(28, 28, '<rect class="sq sq-work" x="9" y="9" width="10" height="10"/>')],
  ["Experiment", mark(28, 28, '<rect class="sq sq-experiment" x="9" y="9" width="10" height="10"/>')],
  ["Client", mark(28, 28, '<rect class="sq sq-client" x="9" y="9" width="10" height="10"/><rect class="sq-dot" x="12" y="12" width="4" height="4"/>')],
];

const LINES = [
  ["Connection", mark(28, 12, '<line class="m-line key-line" x1="0" y1="6" x2="28" y2="6"/>')],
  ["Part of", mark(28, 12, '<line class="m-line t-part key-line" x1="0" y1="6" x2="28" y2="6"/>')],
  ["Selected", mark(28, 12, '<line class="m-line is-focus" x1="0" y1="6" x2="28" y2="6"/>')],
];

export const SHORTCUTS = [
  [["1", "2", "3"], "Views"],
  [["/", "⌘K"], "Search"],
  [["F"], "Filter"],
  [["L"], "Labels & lines"],
  [["I"], "Index"],
  [["R"], "Surprise me"],
  [["+", "−", "0"], "Zoom in, out, fit"],
  [["?"], "Key"],
  [["Esc"], "Close"],
];

export function bindKey() {
  const pop = document.getElementById("pop-key");
  const item = (graphic, label) => h("li", {}, graphic, h("span", {}, label));
  pop.tabIndex = -1;
  const section = (id, title, body) => h("section", { class: "pop-sec", "aria-labelledby": id }, h("h2", { class: "mono-label", id }, title), body);
  const kwItem = (g) => item(h("span", { class: "key-kw" }, mark(10, 10, `<rect class="tick tick-${g.type}" x="2" y="2" width="6" height="6"/>`), icon(g.icon)), g.name);
  const keys = SHORTCUTS.map(([ks, label]) => [h("dt", {}, ks.map((k) => h("kbd", {}, k))), h("dd", {}, label)]);
  pop.append(
    h("div", { class: "key-col" },
      section("k-nodes", "Nodes", h("ul", { class: "key-list" }, SHAPES.map(([label, g]) => item(g, label)))),
      section("k-kw", "Keywords", h("ul", { class: "key-list" }, GROUPS.map(kwItem))),
    ),
    h("div", { class: "key-col" },
      section("k-lines", "Lines", h("ul", { class: "key-list" }, LINES.map(([label, g]) => item(g, label)))),
      section("k-keys", "Shortcuts", h("dl", { class: "key-keys" }, keys)),
    ),
  );
}
