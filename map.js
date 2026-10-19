// Systems map (lite). Hand-placed positions in a 1200 x 780 space.
// Keyword links follow the p01 map of the taster folio.
(function () {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";
  var W = 1200, H = 780, CX = 600, CY = 372;

  // size L = PDF project, S = Extra. [x, y] is the centre of the number chip.
  var works = [
    { id: "cypher",    n: "01", title: "CYPHER",                            year: 2024, size: "L", row: "work-cypher",    pos: [236, 168] },
    { id: "days",      n: "02", title: "16 Days of Real Talk",              year: 2025, size: "L", row: "work-16-days",   pos: [770, 664] },
    { id: "symbiosis", n: "03", title: "Symbiosis",                         year: 2024, size: "L", row: "work-symbiosis", pos: [262, 612] },
    { id: "ibmqt",     n: "E1", title: "IBM × QT Hotels",                   year: 2025, size: "S", row: "work-ibm-qt",    pos: [900, 540] },
    { id: "collab",    n: "E2", title: "COLLAB",                            year: 2025, size: "S", row: "work-collab",    pos: [940, 98] },
    { id: "adhd",      n: "E3", title: "ADHD in the Media",                 year: 2024, size: "S", row: "work-adhd",      pos: [128, 452] },
    { id: "terms",     n: "E4", title: "Terms of Practice",                 year: 2026, size: "S", row: "work-terms",     pos: [560, 152] },
    { id: "audio",     n: "E5", title: "Audio-reactive visual exploration", year: 2026, size: "S", row: "work-audio",     pos: [470, 526] }
  ];

  // t: label tier from p01 (1 large, 2 medium, 3 small). a: label side of the dot (r, l, t, b).
  var keywords = [
    { id: "humane-technology",      label: "Humane technology",                t: 1, value: true, pos: [720, 74],  a: "t" },
    { id: "design-justice",         label: "Design justice",                   t: 1, value: true, pos: [452, 242], a: "l" },
    { id: "more-than-human-design", label: "More-than-human design",           t: 1, value: true, pos: [330, 724], a: "b" },
    { id: "cultural-resistance",    label: "Cultural resistance",              t: 3, pos: [330, 84],  a: "t" },
    { id: "visual-culture",         label: "Visual culture",                   t: 2, pos: [116, 214], a: "l" },
    { id: "editorial-design",       label: "Editorial design",                 t: 3, pos: [300, 262], a: "l" },
    { id: "sociology",              label: "Sociology",                        t: 2, pos: [44, 300],  a: "r" },
    { id: "psychology",             label: "Psychology",                       t: 2, pos: [64, 382],  a: "r" },
    { id: "health-equity",          label: "Health equity",                    t: 3, pos: [44, 530],  a: "r" },
    { id: "attention-economy",      label: "Attention economy",                t: 2, pos: [872, 200], a: "r" },
    { id: "responsible-ai",         label: "Responsible AI",                   t: 2, pos: [792, 272], a: "r" },
    { id: "co-design",              label: "Co-design",                        t: 2, pos: [508, 306], a: "r" },
    { id: "systems-thinking",       label: "Systems thinking",                 t: 1, pos: [900, 362], a: "r" },
    { id: "sociotechnical-systems", label: "Sociotechnical systems",           t: 2, pos: [1000, 282], a: "r" },
    { id: "interdisciplinary",      label: "Interdisciplinary",                t: 2, pos: [1060, 424], a: "r" },
    { id: "transition-design",      label: "Transition design",                t: 2, pos: [960, 448], a: "b" },
    { id: "energy-transition",      label: "Energy transition",                t: 3, pos: [1110, 330], a: "b" },
    { id: "data-humanism",          label: "Data humanism",                    t: 2, pos: [330, 346], a: "t" },
    { id: "information-design",     label: "Information design",               t: 2, pos: [252, 412], a: "r" },
    { id: "prototyping",            label: "Prototyping",                      t: 3, pos: [392, 470], a: "t" },
    { id: "creative-technology",    label: "Creative technology",              t: 2, pos: [700, 482], a: "r" },
    { id: "service-design",         label: "Service design",                   t: 2, pos: [1080, 462], a: "t" },
    { id: "workshop-facilitation",  label: "Workshop facilitation",            t: 3, pos: [1040, 586], a: "b" },
    { id: "experience-design",      label: "Experience design",                t: 1, pos: [150, 576], a: "t" },
    { id: "museum-interpretation",  label: "Museum interpretation",            t: 3, pos: [96, 690],  a: "b" },
    { id: "critical-making",        label: "Critical making",                  t: 2, pos: [520, 700], a: "r" },
    { id: "design-research",        label: "Design research",                  t: 1, pos: [620, 640], a: "t" },
    { id: "design-strategy",        label: "Design strategy",                  t: 1, pos: [1060, 700], a: "t" },
    { id: "gender-based-violence-prevention", label: "Gender-based violence prevention", t: 3, pos: [800, 742], a: "r" }
  ];

  // Work to keyword, as joined on p01. COLLAB (E2) has no keywords on p01.
  var links = {
    cypher:    ["cultural-resistance", "visual-culture", "editorial-design"],
    terms:     ["humane-technology", "design-justice", "attention-economy"],
    adhd:      ["psychology", "health-equity"],
    audio:     ["prototyping", "creative-technology"],
    ibmqt:     ["service-design", "workshop-facilitation"],
    symbiosis: ["experience-design", "museum-interpretation", "more-than-human-design"],
    days:      ["design-research", "design-strategy", "gender-based-violence-prevention"],
    collab:    []
  };

  // Keyword to keyword, as joined on p01.
  var kwLinks = [
    ["humane-technology", "responsible-ai"],
    ["humane-technology", "attention-economy"],
    ["design-justice", "co-design"],
    ["more-than-human-design", "critical-making"],
    ["visual-culture", "sociology"],
    ["sociology", "psychology"],
    ["systems-thinking", "sociotechnical-systems"],
    ["systems-thinking", "interdisciplinary"],
    ["systems-thinking", "transition-design"],
    ["data-humanism", "information-design"],
    ["prototyping", "creative-technology"]
  ];

  var TIER = { 1: 17, 2: 13.5, 3: 11.5 };
  var byId = {};
  works.forEach(function (w) { byId[w.id] = w; });
  keywords.forEach(function (k) { byId[k.id] = k; k.works = []; k.kws = []; });
  Object.keys(links).forEach(function (wid) {
    links[wid].forEach(function (kid) { byId[kid].works.push(byId[wid]); });
  });
  kwLinks.forEach(function (p) { byId[p[0]].kws.push(p[1]); byId[p[1]].kws.push(p[0]); });

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

  function el(name, attrs, parent) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  function openRow(rowId, focusIt) {
    var row = document.getElementById(rowId);
    if (!row) return;
    row.open = true;
    row.scrollIntoView({ behavior: reduce.matches ? "auto" : "smooth", block: "start" });
    if (focusIt) row.querySelector("summary").focus({ preventScroll: true });
    if (history.replaceState) history.replaceState(null, "", "#" + rowId);
  }

  function buildMap(frame) {
    var svg = el("svg", { viewBox: "0 0 " + W + " " + H, role: "group", "aria-label": "Systems map: projects, Extras and the keywords that join them" });
    var gLines = el("g", { "aria-hidden": "true" }, svg);
    var gNodes = el("g", {}, svg);
    var lineEls = [];

    function line(a, b, ids) {
      var l = el("line", { x1: a[0], y1: a[1], x2: b[0], y2: b[1], "class": "m-line" }, gLines);
      l._ids = ids;
      lineEls.push(l);
    }

    Object.keys(links).forEach(function (wid) {
      links[wid].forEach(function (kid) { line(byId[wid].pos, byId[kid].pos, [wid, kid]); });
    });
    kwLinks.forEach(function (p) { line(byId[p[0]].pos, byId[p[1]].pos, [p[0], p[1]]); });

    // Centre node
    var me = el("a", { href: "#about", "class": "m-me", "aria-label": "Brylie Wilson. Designer, strategist and chronic over-thinker, systems thinker. About" }, gNodes);
    var name = el("text", { x: CX, y: CY, "text-anchor": "middle", "class": "m-name halo" }, me);
    name.textContent = "Brylie Wilson";
    var t1 = el("text", { x: CX, y: CY + 28, "text-anchor": "middle", "class": "m-tag halo" }, me);
    t1.appendChild(document.createTextNode("Designer, strategist and chronic over-thinker"));
    el("tspan", { "class": "ast" }, t1).textContent = "*";
    var t2 = el("text", { x: CX, y: CY + 46, "text-anchor": "middle", "class": "m-tag halo" }, me);
    el("tspan", { "class": "ast" }, t2).textContent = "*";
    t2.appendChild(document.createTextNode("systems thinker"));
    me._ring = el("rect", { "class": "focus-ring" }, me);

    // Keywords
    keywords.forEach(function (k) {
      var fs = TIER[k.t];
      var names = k.works.map(function (w) { return w.n + " " + w.title; });
      var g = el("g", {
        "class": "m-kw t" + k.t + (k.value ? " value" : ""),
        tabindex: "0",
        "aria-label": k.label + (k.value ? ", value I design by" : "") + (names.length ? ". " + names.join(", ") : "")
      }, gNodes);
      g._id = k.id;
      el("circle", { cx: k.pos[0], cy: k.pos[1], r: k.t === 1 ? 4 : 3 }, g);
      var tx = k.pos[0], ty = k.pos[1] + fs * 0.34, anchor = "start";
      if (k.a === "r") { tx += 9; }
      else if (k.a === "l") { tx -= 9; anchor = "end"; }
      else if (k.a === "t") { ty = k.pos[1] - 10; anchor = "middle"; }
      else if (k.a === "b") { ty = k.pos[1] + fs + 6; anchor = "middle"; }
      var t = el("text", { x: tx, y: ty, "text-anchor": anchor, "class": "halo" }, g);
      t.textContent = k.label;
      g._ring = el("rect", { "class": "focus-ring" }, g);
      k.el = g;
      g.addEventListener("mouseenter", function () { focusOn(k.id); });
      g.addEventListener("mouseleave", clear);
      g.addEventListener("focus", function () { focusOn(k.id); });
      g.addEventListener("blur", clear);
    });

    // Works
    works.forEach(function (w) {
      var L = w.size === "L";
      var a = el("a", {
        href: "#" + w.row,
        "class": "m-work" + (L ? "" : " extra"),
        "aria-label": w.n + " " + w.title + ", " + w.year + ", " + (L ? "project" : "Extra")
      }, gNodes);
      a._id = w.id;
      var cw = 26, ch = 18, x = w.pos[0], y = w.pos[1];
      el("rect", { x: x - cw / 2, y: y - ch / 2, width: cw, height: ch, "class": "chip" }, a);
      el("text", { x: x, y: y + 4, "text-anchor": "middle", "class": "chip-n" }, a).textContent = w.n;
      var t = el("text", { x: x + cw / 2 + 8, y: y + (L ? 6 : 5), "class": "w-title halo" }, a);
      t.appendChild(document.createTextNode(w.title));
      el("tspan", { "class": "w-yr", dx: "8" }, t).textContent = String(w.year);
      a._ring = el("rect", { "class": "focus-ring" }, a);
      w.el = a;
      a.addEventListener("click", function (e) { e.preventDefault(); openRow(w.row, true); });
      a.addEventListener("mouseenter", function () { focusOn(w.id); });
      a.addEventListener("mouseleave", clear);
      a.addEventListener("focus", function () { focusOn(w.id); });
      a.addEventListener("blur", clear);
    });

    function focusOn(id) {
      var n = byId[id];
      var on = {};
      on[id] = true;
      if (n.works) { // keyword
        n.works.forEach(function (w) { on[w.id] = true; });
        n.kws.forEach(function (kid) { on[kid] = true; });
      } else {
        links[id].forEach(function (kid) { on[kid] = true; });
      }
      svg.classList.add("is-focus");
      keywords.forEach(function (k) {
        k.el.classList.toggle("on", !!on[k.id]);
        k.el.classList.toggle("hot", k.id === id);
      });
      works.forEach(function (w) { w.el.classList.toggle("on", !!on[w.id]); });
      lineEls.forEach(function (l) { l.classList.toggle("on", l._ids.indexOf(id) !== -1); });
    }

    function clear() {
      svg.classList.remove("is-focus");
      svg.querySelectorAll(".on, .hot").forEach(function (e) { e.classList.remove("on", "hot"); });
    }

    frame.appendChild(svg);

    // Focus rings sized to each node once fonts are in.
    function sizeRings() {
      [me].concat(keywords.map(function (k) { return k.el; }), works.map(function (w) { return w.el; })).forEach(function (g) {
        var r = g._ring;
        r.setAttribute("width", 0);
        var b = g.getBBox();
        r.setAttribute("x", b.x - 5); r.setAttribute("y", b.y - 4);
        r.setAttribute("width", b.width + 10); r.setAttribute("height", b.height + 8);
      });
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(sizeRings); else sizeRings();
  }

  // Under 720px the map becomes a vertical keyword list.
  function buildList(box) {
    var head = document.createElement("div");
    head.className = "kw-me";
    head.innerHTML = '<p class="m-name-h">Brylie Wilson</p>' +
      '<p>Designer, strategist and chronic over-thinker<span class="ast">*</span><br><span class="ast">*</span>systems thinker</p>';
    box.appendChild(head);

    function group(title, items) {
      var h = document.createElement("h2");
      h.className = "mono";
      h.textContent = title;
      box.appendChild(h);
      var ul = document.createElement("ul");
      items.forEach(function (k) {
        var li = document.createElement("li");
        if (k.value) li.className = "value";
        var lab = document.createElement("span");
        lab.className = "kw-label";
        lab.textContent = k.label;
        li.appendChild(lab);
        if (k.works.length) {
          var ls = document.createElement("span");
          ls.className = "kw-links";
          k.works.forEach(function (w) {
            var a = document.createElement("a");
            a.href = "#" + w.row;
            a.innerHTML = '<span class="mono">' + w.n + "</span>";
            a.appendChild(document.createTextNode(w.title));
            a.addEventListener("click", function (e) { e.preventDefault(); openRow(w.row, true); });
            ls.appendChild(a);
          });
          li.appendChild(ls);
        }
        ul.appendChild(li);
      });
      box.appendChild(ul);
    }

    var linked = keywords.filter(function (k) { return k.works.length; });
    group("Values I design by", linked.filter(function (k) { return k.value; }));
    group("Keywords", linked.filter(function (k) { return !k.value; }));
  }

  function init() {
    var frame = document.getElementById("map-frame");
    var box = document.getElementById("kw-list");
    if (frame) buildMap(frame);
    if (box) buildList(box);
    var h = location.hash.slice(1);
    if (h && /^work-/.test(h)) {
      var row = document.getElementById(h);
      if (row && row.tagName === "DETAILS") row.open = true;
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
