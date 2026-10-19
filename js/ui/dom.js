// Small DOM helpers for the interface modules.
const SPRITE = "/assets/icons.svg";
const NS = "http://www.w3.org/2000/svg";

// h("button", { class: "x", onclick: fn }, child, "text")
export function h(tag, attrs = {}, ...children) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? "" : v);
  }
  e.append(...children.flat(Infinity).filter((c) => c !== null && c !== undefined && c !== false));
  return e;
}

// <svg class="ic"><use href="/assets/icons.svg#name"/></svg>, hidden from assistive tech.
export function icon(name, cls = "ic") {
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("class", cls);
  svg.setAttribute("aria-hidden", "true");
  const use = document.createElementNS(NS, "use");
  use.setAttribute("href", `${SPRITE}#${name}`);
  svg.appendChild(use);
  return svg;
}

export function svg(attrs, ...children) {
  const e = document.createElementNS(NS, "svg");
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  for (const c of children) e.insertAdjacentHTML("beforeend", c);
  return e;
}
