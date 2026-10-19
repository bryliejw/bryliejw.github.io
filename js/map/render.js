// Map SVG. One centred coordinate space (1200 x 780 viewBox, origin at the centre).
// Layers inside the zoomed group, in order: decorations, lines, nodes.
// Marks follow CLAUDE.md, Map. fit() runs after fonts load: it wraps text, measures
// every node's footprint for the layouts and sizes the hit areas from real bounding boxes.

export const W = 1200;
export const H = 780;
const NS = "http://www.w3.org/2000/svg";
const SPRITE = "/assets/icons.svg";

// Keyword groups, in map order. Icons from the CLAUDE.md Icons table.
export const GROUPS = [
  { type: "discipline", name: "Disciplines", icon: "compass" },
  { type: "deliverable", name: "Deliverables", icon: "package" },
  { type: "tool", name: "Tools", icon: "wrench" },
  { type: "topic", name: "Topics", icon: "hash" },
  { type: "value", name: "Values I design by", icon: "heart" },
];

export const VIEWS = ["edge", "force", "rings"];

// Text wrap widths for "year · subtitle".
const META_W = { L: 176, M: 168 };

export function el(tag, attrs = {}, parent) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v !== undefined && v !== null) e.setAttribute(k, v);
  if (parent) parent.appendChild(e);
  return e;
}

function text(parent, str, attrs) {
  const t = el("text", attrs, parent);
  t.textContent = str;
  return t;
}

// Nodes and derived edges. Edges are never stored in data (CLAUDE.md, Data model).
export function buildGraph(data) {
  const me = { id: "me", role: "me", data: data.me };
  const works = data.works.map((w) => ({ id: w.id, role: "work", size: w.size, data: w }));
  const kws = data.keywords.map((k) => ({ id: k.id, role: "kw", type: k.type, data: k }));
  const nodes = [me, ...works, ...kws];
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const edges = [];
  const add = (a, b, type) => edges.push({ a: byId.get(a), b: byId.get(b), type });
  for (const w of data.works) {
    for (const k of w.keywords) add(w.id, k, "kw");
    if (w.partOf) add(w.id, w.partOf, "part");
    if (w.size === "L" || w.id === "terms-of-practice") add("me", w.id, "me");
  }
  // Keyword to keyword lines drawn on p01.
  for (const k of data.keywords) for (const r of k.related ?? []) add(k.id, r, "rel");
  for (const n of nodes) Object.assign(n, { edges: [], pos: {}, lab: {}, fp: {}, x: 0, y: 0 });
  for (const e of edges) {
    e.a.edges.push(e);
    e.b.edges.push(e);
    // A line belongs to "Projects" when it touches a PDF project or the name.
    e.project = [e.a, e.b].some((n) => n.role === "me" || n.size === "L");
  }
  const groups = GROUPS.map((g) => ({ ...g, kws: kws.filter((k) => k.type === g.type), pos: {} }));
  return { me, works, kws, nodes, byId, edges, groups };
}

export const neighbours = (n) => n.edges.map((e) => (e.a === n ? e.b : e.a));

function kindWord(w) {
  if (w.kind === "project") return "project";
  if (/^E\d/.test(w.n)) return "Extra";
  return w.kind;
}

function metaLine(w) {
  return [w.year, w.sub].filter((v) => v !== null && v !== "").join(" · ");
}

export function render(svg, graph) {
  svg.setAttribute("viewBox", `${-W / 2} ${-H / 2} ${W} ${H}`);
  const zoomG = el("g", { class: "m-zoom" }, svg);
  const deco = el("g", { class: "m-deco", "aria-hidden": "true" }, zoomG);
  const linesG = el("g", { class: "m-lines", "aria-hidden": "true" }, zoomG);
  const nodesG = el("g", { class: "m-nodes" }, zoomG);

  graph.rings = [240, 370, 495].map((r) => el("circle", { r, class: "m-ring" }, deco));

  for (const g of graph.groups) {
    g.el = el("g", { class: `m-group grp-${g.type}` }, deco);
    g.inner = el("g", {}, g.el);
    el("use", { href: `${SPRITE}#${g.icon}`, class: "ic-map", x: 0, y: -9.5, width: 12, height: 12 }, g.inner);
    g.text = el("text", { x: 17, y: 0, class: "m-group-label halo" }, g.inner);
    g.text.append(`${g.name.toUpperCase()} `);
    g.count = el("tspan", { class: "m-count" }, g.text);
    g.count.textContent = g.kws.length;
  }

  for (const e of graph.edges) e.el = el("line", { class: `m-line t-${e.type}` }, linesG);

  for (const n of graph.nodes) {
    const label = ariaLabel(n);
    n.el = el("g", { class: `node r-${n.role}`, tabindex: 0, role: "button", "aria-label": label, "data-id": n.id }, nodesG);
    n.hit = el("rect", { class: "hit" }, n.el);
    n.ring = el("rect", { class: "ring" }, n.el);
    n.body = el("g", { class: "body" }, n.el);
    if (n.role === "me") drawMe(n);
    else if (n.role === "work") drawWork(n);
    else drawKeyword(n);
  }

  Object.assign(graph, { svg, zoomG, deco, linesG, nodesG });
}

function ariaLabel(n) {
  if (n.role === "me") return `${n.data.name}. ${n.data.tagline1}, ${n.data.tagline2}`;
  if (n.role === "work") {
    const w = n.data;
    return [`${w.n} ${w.title}`, w.year, kindWord(w)].filter(Boolean).join(", ");
  }
  const group = GROUPS.find((g) => g.type === n.type);
  return `${n.data.label}, ${n.type === "value" ? "value I design by" : group.name.toLowerCase().replace(/s$/, "")}`;
}

function drawMe(n) {
  const d = n.data;
  n.bg = el("rect", { class: "me-bg" }, n.body);
  n.nameEl = text(n.body, d.name, { class: "me-name", x: 0, y: -4, "text-anchor": "middle" });
  // tagline1 is set on two lines as on p01; its last words are struck through.
  const cut = d.tagline1.lastIndexOf(" and ") + 5;
  n.tag1 = text(n.body, d.tagline1.slice(0, cut).trim(), { class: "me-tag halo", x: 0, y: 18, "text-anchor": "middle" });
  n.tag2 = text(n.body, d.tagline1.slice(cut), { class: "me-tag me-struck", y: 34 });
  n.tag3bg = el("rect", { class: "me-mark" }, n.body);
  n.tag3 = text(n.body, d.tagline2, { class: "me-tag me-marked", y: 34 });
}

function drawWork(n) {
  const w = n.data;
  const b = n.body;
  if (w.size === "L") {
    el("rect", { class: "tile tile-l", x: -48, y: -48, width: 96, height: 96 }, b);
    const img = w.images[0];
    if (img) {
      const clip = `clip-${w.id}`;
      el("rect", { x: -48, y: -48, width: 96, height: 96 }, el("clipPath", { id: clip }, b));
      el("image", { href: img.src, x: -48, y: -48, width: 96, height: 96, preserveAspectRatio: "xMidYMid slice", "clip-path": `url(#${clip})` }, b);
      el("rect", { class: "tile-key", x: -48, y: -48, width: 96, height: 96 }, b);
    }
    el("rect", { class: "chip", x: -48, y: -48, width: 26, height: 17 }, b);
    text(b, w.n, { class: "chip-n", x: -35, y: -36.2, "text-anchor": "middle" });
    n.title = text(b, w.title, { class: "w-title-l halo", x: -48, y: 67 });
    n.meta = text(b, metaLine(w), { class: "w-meta halo", x: -48, y: 82 });
  } else if (w.size === "M") {
    el("rect", { class: "tile tile-m", x: -24, y: -24, width: 48, height: 48 }, b);
    text(b, w.n, { class: "tile-n", x: 0, y: 4.5, "text-anchor": "middle" });
    n.title = text(b, w.title, { class: "w-title-m halo", x: 32, y: -3 });
    n.meta = text(b, metaLine(w), { class: "w-meta halo", x: 32, y: 12 });
  } else {
    el("rect", { class: `sq sq-${w.kind}`, x: -5, y: -5, width: 10, height: 10 }, b);
    if (w.kind === "client") el("rect", { class: "sq-dot", x: -2, y: -2, width: 4, height: 4 }, b);
    n.title = text(b, w.title, { class: "w-title-s halo", x: 11, y: 3.8 });
  }
}

function drawKeyword(n) {
  el("rect", { class: `tick tick-${n.type}`, x: -3, y: -3, width: 6, height: 6 }, n.body);
  n.labG = el("g", { class: "lab" }, n.body);
  const str = n.type === "tool" ? n.data.label.toUpperCase() : n.data.label;
  n.label = text(n.labG, str, { class: `kw-label kw-${n.type} halo` });
}

// Wraps a single-line <text> into tspans no wider than maxW.
function wrap(t, maxW, lineH) {
  const words = t.textContent.split(" ");
  const x = t.getAttribute("x");
  t.textContent = "";
  let span = el("tspan", { x }, t);
  let line = [];
  for (const word of words) {
    line.push(word);
    span.textContent = line.join(" ");
    if (span.getComputedTextLength() > maxW && line.length > 1) {
      line.pop();
      span.textContent = line.join(" ");
      line = [word];
      span = el("tspan", { x, dy: lineH }, t);
      span.textContent = word;
    }
  }
}

const box = (b) => ({ x: b.x, y: b.y, w: b.width, h: b.height });

// Label placement for keywords: anchor, offset, rotation (degrees) around the tick.
export function orientKeyword(n, spec) {
  const mono = n.type === "tool";
  n.label.setAttribute("text-anchor", spec.anchor);
  n.label.setAttribute("x", spec.x);
  n.label.setAttribute("y", spec.y + (spec.baseline ? (mono ? 3.3 : 3.8) : 0));
  n.labG.setAttribute("transform", spec.rot ? `rotate(${spec.rot})` : "");
  n.orient = spec;
}

// Label side for M and S works: 1 to the right of the mark (default), -1 to the left.
export function orientWork(n, side = 1) {
  if (n.size === "L" || n.side === side) return;
  const s = n.size === "M" ? 32 : 11;
  for (const t of [n.title, n.meta].filter(Boolean)) {
    t.setAttribute("text-anchor", side < 0 ? "end" : "start");
    t.setAttribute("x", side * s);
    for (const sp of t.querySelectorAll("tspan")) sp.setAttribute("x", side * s);
  }
  n.side = side;
}

export const KW_SPEC = {
  left: { anchor: "end", x: -9, y: 0, baseline: true },
  right: { anchor: "start", x: 9, y: 0, baseline: true },
  top: { anchor: "middle", x: 0, y: -8 },
  bottom: { anchor: "middle", x: 0, y: 16 },
};

// After fonts load: wrap text, lay out the name block, measure footprints.
export function fit(graph) {
  const me = graph.me;
  {
    const w2 = me.tag2.getComputedTextLength();
    const w3 = me.tag3.getComputedTextLength();
    const total = w2 + 8 + w3 + 6;
    const x0 = -total / 2;
    me.tag2.setAttribute("x", x0);
    me.tag3.setAttribute("x", x0 + w2 + 11);
    const tb = me.tag3.getBBox();
    Object.entries({ x: tb.x - 3, y: tb.y - 1, width: tb.width + 6, height: tb.height + 2 }).forEach(([k, v]) => me.tag3bg.setAttribute(k, v));
    const b = me.body.getBBox();
    Object.entries({ x: b.x - 10, y: b.y - 6, width: b.width + 20, height: b.height + 12 }).forEach(([k, v]) => me.bg.setAttribute(k, v));
    me.fp = Object.fromEntries(VIEWS.map((v) => [v, box(me.body.getBBox())]));
  }

  for (const n of graph.works) {
    if (n.meta && n.meta.textContent) wrap(n.meta, META_W[n.size], 13);
    n.side = 1;
    if (n.size === "L") {
      const f = box(n.body.getBBox());
      n.fpSide = { 1: f, [-1]: f };
    } else {
      const right = box(n.body.getBBox());
      orientWork(n, -1);
      const left = box(n.body.getBBox());
      orientWork(n, 1);
      n.fpSide = { 1: right, [-1]: left };
    }
  }

  for (const n of graph.kws) n.labelW = n.label.getComputedTextLength();
  for (const g of graph.groups) g.size = box(g.inner.getBBox());
}

// Footprint of a keyword for a label spec, measured from the DOM.
export function measureKeyword(n, spec) {
  orientKeyword(n, spec);
  return box(n.body.getBBox());
}

// Hit area and focus ring from the node's current bounding box.
export function sizeHit(n) {
  const b = n.body.getBBox();
  const set = (r, pad) => Object.entries({ x: b.x - pad, y: b.y - pad, width: b.width + 2 * pad, height: b.height + 2 * pad }).forEach(([k, v]) => r.setAttribute(k, v));
  set(n.hit, 2);
  set(n.ring, 4);
}
