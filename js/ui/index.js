// Index: the table of works generated into index.html by scripts/build.mjs.
// Without JS it is the page; here it becomes a popover from the rail. Rows follow the
// filter, and picking a row focuses that work on the map.
import { closeLayer } from "./rail.js";

export function bindIndex({ filter, select }) {
  const count = document.getElementById("index-count");
  const rows = [...document.querySelectorAll("#pop-index tbody tr")];
  for (const tr of rows) {
    const cell = tr.querySelector(".ix-t");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ix-open";
    btn.append(...cell.childNodes);
    cell.append(btn);
    btn.addEventListener("click", () => {
      closeLayer();
      select(tr.dataset.id);
    });
  }
  filter.onChange((c) => {
    const hidden = new Set(filter.hiddenWorks());
    for (const tr of rows) tr.hidden = hidden.has(tr.dataset.id);
    count.textContent = `${c.works.shown} of ${c.works.total} works showing`;
  });
}
