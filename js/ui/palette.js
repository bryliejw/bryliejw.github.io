// Search palette (/ or Cmd+K): results grouped Work, Keywords, About, each with its icon and
// a mono meta line. Arrow keys move, Enter opens, Esc closes. Picking a hidden work or
// keyword shows it again.
import { GROUPS, kindWord } from "../map/render.js";
import { WORK_GROUPS } from "./filter.js";
import { closeLayer, isOpen, showLayer } from "./rail.js";
import { h, icon } from "./dom.js";
import { src } from "../open/content.js";

export function bindPalette({ graph, data, filter, select, actions }) {
  const box = document.getElementById("palette");
  const input = document.getElementById("palette-input");
  const list = document.getElementById("palette-list");
  const btn = document.getElementById("btn-search");

  const kwCount = (k) => k.edges.filter((e) => e.type === "kw").length;
  const items = [
    ...graph.works.map((w) => ({
      group: "Work",
      icon: WORK_GROUPS.find((g) => g.kind === w.data.kind).icon,
      n: w.data.n,
      thumb: w.data.images[0] ? src(w.data.images[0].thumb ?? w.data.images[0].src) : null,
      label: w.data.title,
      meta: () => [w.data.year, kindWord(w.data), w.hidden && "hidden"].filter(Boolean).join(" · "),
      text: [w.data.n, w.data.title, w.data.sub, w.data.year].join(" "),
      run: () => {
        filter.reveal(w);
        select(w.id);
      },
    })),
    ...graph.kws.map((k) => {
      const g = GROUPS.find((x) => x.type === k.type);
      const type = k.type === "value" ? "value" : g.name.replace(/s$/, "");
      return {
        group: "Keywords",
        icon: g.icon,
        label: k.data.label,
        meta: () => [type, kwCount(k) && `${kwCount(k)} work${kwCount(k) === 1 ? "" : "s"}`, k.hidden && "hidden"].filter(Boolean).join(" · "),
        text: k.data.label,
        run: () => {
          filter.reveal(k);
          select(k.id);
        },
      };
    }),
    { group: "About", icon: "user", label: data.me.name, meta: () => "About", text: `about ${data.me.name}`, run: actions.about },
    { group: "About", icon: "file-down", label: "Folio PDF", meta: () => "PDF", text: "folio pdf", run: actions.folio },
    { group: "About", icon: "mail", label: "Contact", meta: () => data.me.contact.email, text: `contact email ${data.me.contact.email}`, run: actions.contact },
    { group: "About", icon: "arrow-up-right", label: "Instagram", meta: () => data.me.contact.instagram.label, text: `instagram ${data.me.contact.instagram.label}`, run: () => window.open(data.me.contact.instagram.url, "_blank", "noopener") },
    { group: "About", icon: "arrow-up-right", label: "LinkedIn", meta: () => data.me.contact.linkedin.label, text: `linkedin ${data.me.contact.linkedin.label}`, run: () => window.open(data.me.contact.linkedin.url, "_blank", "noopener") },
  ];
  items.forEach((it, i) => (it.id = `pal-${i}`));
  const GROUP_ICON = { Work: "file", Keywords: "hash", About: "user" };

  let shown = [];
  let active = 0;

  function search(q) {
    q = q.trim().toLowerCase();
    if (!q) return items;
    const hits = items.filter((it) => it.text.toLowerCase().includes(q));
    // Label starts with the query first, then the rest in map order, groups kept together.
    const rank = (it) => (it.label.toLowerCase().startsWith(q) ? 0 : 1);
    const order = ["Work", "Keywords", "About"];
    return hits.sort((a, b) => order.indexOf(a.group) - order.indexOf(b.group) || rank(a) - rank(b));
  }

  function render() {
    shown = search(input.value);
    active = Math.min(active, Math.max(0, shown.length - 1));
    list.replaceChildren();
    for (const group of ["Work", "Keywords", "About"]) {
      const its = shown.filter((it) => it.group === group);
      if (!its.length) continue;
      const head = h("div", { class: "pal-head mono-label", id: `pal-g-${group}`, role: "presentation" }, icon(GROUP_ICON[group]), group, h("span", { class: "pal-count" }, String(its.length)));
      list.append(
        h("div", { role: "group", "aria-labelledby": head.id }, head, its.map((it) =>
          h("div", { role: "option", id: it.id, class: "pal-opt", "aria-selected": "false", onpointermove: () => setActive(shown.indexOf(it)), onclick: () => pick(it) },
            it.thumb ? h("img", { class: "pal-thumb", src: it.thumb, alt: "", loading: "lazy" }) : icon(it.icon),
            it.n ? h("span", { class: "pal-n" }, it.n) : null,
            h("span", { class: "pal-label" }, it.label),
            h("span", { class: "pal-meta mono-label" }, it.meta()),
          ),
        )),
      );
    }
    if (!shown.length) list.append(h("p", { class: "pal-empty" }, "No results"));
    setActive(active);
  }

  function setActive(i) {
    if (i < 0 || i === undefined) return;
    active = i;
    for (const o of list.querySelectorAll("[aria-selected='true']")) o.setAttribute("aria-selected", "false");
    const it = shown[active];
    if (!it) return input.removeAttribute("aria-activedescendant");
    const el = document.getElementById(it.id);
    el.setAttribute("aria-selected", "true");
    input.setAttribute("aria-activedescendant", it.id);
    el.scrollIntoView({ block: "nearest" });
  }

  function pick(it) {
    closeLayer();
    it.run();
  }

  input.addEventListener("input", () => {
    active = 0;
    render();
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (shown.length) setActive((active + (e.key === "ArrowDown" ? 1 : -1) + shown.length) % shown.length);
    } else if (e.key === "Home" || e.key === "End") {
      if (!shown.length || input.value) return;
      e.preventDefault();
      setActive(e.key === "Home" ? 0 : shown.length - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (shown[active]) pick(shown[active]);
    } else if (e.key === "Tab") {
      e.preventDefault(); // aria-modal: focus stays in the palette
    }
  });
  btn.addEventListener("click", () => toggle());
  // A click on the scrim closes the palette.
  box.addEventListener("pointerdown", (e) => {
    if (e.target === box) closeLayer({ restore: true });
  });

  function open() {
    input.value = "";
    active = 0;
    render();
    showLayer(box, btn, { focus: input });
  }
  function toggle() {
    if (isOpen(box)) closeLayer({ restore: true });
    else open();
  }
  return { open, toggle };
}
