// Filter: hide groups of works (by kind), groups of keywords (by type) and years.
// A work shows when its kind and its year are on (works without a year follow their kind).
// A keyword shows when its type is on and at least one of its works shows (keywords on
// p01 lines alone, with no works, follow their type only).
// Every count on the page (drawer, chips, filter badge, index, readout, map group labels)
// comes from counts() here, so they always agree.
import { GROUPS } from "../map/render.js";
import { h, icon } from "./dom.js";

export const WORK_GROUPS = [
  { kind: "project", name: "PDF projects", icon: "book-open" },
  { kind: "experiment", name: "Extras / experiments", icon: "flask-conical" },
  { kind: "work", name: "Works", icon: "file" },
  { kind: "client", name: "Clients", icon: "briefcase" },
];

export function createFilter(graph, views) {
  const hidden = new Set(); // "work:<kind>", "kw:<type>", "year:<year>"
  const listeners = new Set();
  const years = [...new Set(graph.works.map((w) => w.data.year).filter((y) => y != null))].sort();
  let counts = null;

  const workOn = (w) => !hidden.has(`work:${w.data.kind}`) && (w.data.year == null || !hidden.has(`year:${w.data.year}`));
  // Keywords tied only by p01 keyword lines (no works) are always live.
  const kwLive = (k) => {
    const works = k.edges.filter((e) => e.type === "kw").map((e) => (e.a === k ? e.b : e.a));
    return !works.length || works.some((w) => !w.hidden);
  };

  function apply({ announce = true } = {}) {
    for (const w of graph.works) w.hidden = !workOn(w);
    const byType = {};
    for (const k of graph.kws) {
      const live = kwLive(k);
      byType[k.type] = (byType[k.type] ?? 0) + (live ? 1 : 0);
      k.hidden = !live || hidden.has(`kw:${k.type}`);
    }
    const byKind = {};
    for (const g of WORK_GROUPS) {
      byKind[g.kind] = graph.works.filter((w) => w.data.kind === g.kind && (w.data.year == null || !hidden.has(`year:${w.data.year}`))).length;
    }
    for (const g of graph.groups) {
      g.count.textContent = byType[g.type];
      g.el.classList.toggle("is-filtered", hidden.has(`kw:${g.type}`) || !byType[g.type]);
    }
    counts = {
      works: { shown: graph.works.filter((w) => !w.hidden).length, total: graph.works.length },
      kws: { shown: graph.kws.filter((k) => !k.hidden).length, total: graph.kws.length },
      byKind,
      byType,
      hidden: hidden.size,
    };
    const focus = views.state.focus && graph.byId.get(views.state.focus);
    if (focus?.hidden) views.state.focus = null;
    if (views.state.hover && graph.byId.get(views.state.hover)?.hidden) views.state.hover = null;
    views.paint();
    for (const fn of listeners) fn(counts, { announce });
  }

  const api = {
    hidden,
    years,
    counts: () => counts,
    isHidden: (key) => hidden.has(key),
    hiddenWorks: () => graph.works.filter((w) => w.hidden).map((w) => w.id),
    toggle(key) {
      if (hidden.has(key)) hidden.delete(key);
      else hidden.add(key);
      apply();
    },
    show(...keys) {
      for (const k of keys) hidden.delete(k);
      apply();
    },
    reset() {
      hidden.clear();
      apply();
    },
    // Makes a node show again, turning back on only the groups it needs.
    reveal(n) {
      if (!n.hidden) return;
      if (n.role === "work") return api.show(`work:${n.data.kind}`, `year:${n.data.year}`);
      const works = n.edges.filter((e) => e.type === "kw").map((e) => (e.a === n ? e.b : e.a));
      const keys = [`kw:${n.type}`];
      if (!works.some((w) => !w.hidden)) keys.push(`work:${works[0].data.kind}`, `year:${works[0].data.year}`);
      api.show(...keys);
    },
    // Label for a hidden-group key, as on its chip.
    label(key) {
      const [kind, v] = key.split(":");
      if (kind === "work") return WORK_GROUPS.find((g) => g.kind === v).name;
      if (kind === "kw") return GROUPS.find((g) => g.type === v).name;
      return v;
    },
    // Hidden keys in drawer order: work groups, keyword groups, years.
    hiddenKeys() {
      const order = [...WORK_GROUPS.map((g) => `work:${g.kind}`), ...GROUPS.map((g) => `kw:${g.type}`), ...years.map((y) => `year:${y}`)];
      return order.filter((k) => hidden.has(k));
    },
    onChange: (fn) => listeners.add(fn),
    apply,
  };
  apply({ announce: false });
  return api;
}

// The drawer: Work and Keywords as switch rows (icon, label, count), Year chips,
// "x of y works showing" and Reset.
export function bindFilterDrawer(filter) {
  const pop = document.getElementById("pop-filter");
  const btn = document.getElementById("btn-filter");
  const badge = document.getElementById("filter-badge");
  const rows = new Map();

  const row = (key, name, ic) => {
    const input = h("input", { type: "checkbox", role: "switch", class: "sw-input", checked: true, onchange: () => filter.toggle(key) });
    const count = h("span", { class: "sw-count" });
    const label = h("label", { class: "sw-row" }, icon(ic), h("span", { class: "sw-label" }, name), count, input, h("span", { class: "sw", "aria-hidden": "true" }));
    rows.set(key, { input, count, label });
    return label;
  };
  const yearBtns = filter.years.map((y) =>
    h("button", { type: "button", class: "ychip", "aria-pressed": "true", "data-key": `year:${y}`, onclick: () => filter.toggle(`year:${y}`) }, String(y)),
  );
  const showing = h("p", { class: "pop-showing mono-label" });
  const reset = h("button", { type: "button", class: "tbtn", onclick: () => filter.reset() }, icon("rotate-ccw"), "Reset");

  pop.append(
    h("section", { class: "pop-sec", "aria-labelledby": "f-work" }, h("h2", { class: "mono-label", id: "f-work" }, "Work"), WORK_GROUPS.map((g) => row(`work:${g.kind}`, g.name, g.icon))),
    h("section", { class: "pop-sec", "aria-labelledby": "f-kw" }, h("h2", { class: "mono-label", id: "f-kw" }, "Keywords"), GROUPS.map((g) => row(`kw:${g.type}`, g.name, g.icon))),
    h("section", { class: "pop-sec", "aria-labelledby": "f-year" }, h("h2", { class: "mono-label", id: "f-year" }, "Year"), h("div", { class: "ychips", role: "group", "aria-labelledby": "f-year" }, yearBtns)),
    h("footer", { class: "pop-foot" }, showing, reset),
  );

  // A group with nothing in it at all (no client work is published) is left out.
  const c0 = filter.counts();
  for (const [key, { label }] of rows) {
    const [kind, v] = key.split(":");
    if (!(kind === "work" ? c0.byKind[v] : c0.byType[v])) label.hidden = true;
  }
  filter.onChange((c) => {
    for (const [key, { input, count, label }] of rows) {
      const [kind, v] = key.split(":");
      input.checked = !filter.isHidden(key);
      count.textContent = kind === "work" ? c.byKind[v] : c.byType[v];
    }
    for (const b of yearBtns) b.setAttribute("aria-pressed", String(!filter.isHidden(b.dataset.key)));
    showing.textContent = `${c.works.shown} of ${c.works.total} works showing`;
    badge.hidden = !c.hidden;
    badge.textContent = c.hidden;
    btn.setAttribute("aria-label", c.hidden ? `Filter, ${c.hidden} hidden group${c.hidden === 1 ? "" : "s"}` : "Filter");
  });
}
