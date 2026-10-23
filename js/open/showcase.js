// Behaviour for the image carousel (content.js, carouselHTML) and the project showcases
// (showcaseHTML): the CYPHER flipbook and the 16 Days of Real Talk card deck with reels.
// bindCarousels() once at boot (delegated); mountShowcases(root) after markup is added.
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

// ---- Carousel ---------------------------------------------------------------------------
function carIndex(track) {
  return Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
}
function carGo(car, i) {
  const track = car.querySelector(".car-track");
  const n = track.children.length;
  const to = (i + n) % n;
  track.scrollTo({ left: to * track.clientWidth, behavior: reduced.matches ? "auto" : "smooth" });
}
export function bindCarousels() {
  document.addEventListener("click", (e) => {
    const b = e.target.closest?.("[data-car]");
    if (!b) return;
    e.preventDefault();
    e.stopPropagation();
    const car = b.closest(".car");
    carGo(car, carIndex(car.querySelector(".car-track")) + Number(b.dataset.car));
  });
  document.addEventListener("scroll", (e) => {
    const t = e.target;
    if (!(t instanceof Element) || !t.classList.contains("car-track")) return;
    const c = t.closest(".car").querySelector("[data-car-i]");
    if (c) c.textContent = carIndex(t) + 1;
  }, true);
  document.addEventListener("keydown", (e) => {
    const t = e.target;
    if (!(t instanceof Element) || !t.classList.contains("car-track")) return;
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    e.stopPropagation();
    carGo(t.closest(".car"), carIndex(t) + (e.key === "ArrowRight" ? 1 : -1));
  }, true);
}

// ---- Flipbook ---------------------------------------------------------------------------
// Leaves turn on their left edge. Leaf 0 carries the front cover and the left page of the
// first spread; each next leaf the right page of one spread and the left page of the next;
// the last leaf the last right page and the back cover.
function flipbook(sec) {
  const books = JSON.parse(sec.dataset.books);
  const fb = sec.querySelector(".fb");
  const count = sec.querySelector(".fb-count");
  let book = 0;
  let p = 0;
  let leaves = [];

  const face = (url, half, cls) => `<div class="fb-face ${cls}${half ? ` is-${half}` : ""}" style="background-image:url('${url}')"></div>`;
  const url = (s) => `/${s}`.replace(/^\/+/, "/");
  function build() {
    const b = books[book];
    const sp = b.spreads.map(url);
    const pages = [];
    pages.push([face(url(b.front), null, "fb-front is-cover"), sp[0] ? face(sp[0], "l", "fb-back") : `<div class="fb-face fb-back is-blank"></div>`]);
    for (let i = 0; i < sp.length; i++) {
      const next = sp[i + 1] ? face(sp[i + 1], "l", "fb-back") : b.back ? face(url(b.back), null, "fb-back is-cover") : `<div class="fb-face fb-back is-blank"></div>`;
      pages.push([face(sp[i], "r", "fb-front"), next]);
    }
    fb.innerHTML = pages.map(([f, k], i) => `<div class="fb-leaf" data-i="${i}">${f}${k}</div>`).join("");
    leaves = [...fb.children];
    fb.style.setProperty("--fb-a", b.aspect ?? 1.487);
    p = 0;
    paint();
  }
  function paint() {
    const n = leaves.length;
    leaves.forEach((l, i) => {
      const on = i < p;
      l.classList.toggle("is-turned", on);
      l.style.zIndex = on ? i + 1 : n - i + 1;
    });
    fb.dataset.state = p === 0 ? "front" : p === n ? "back" : "open";
    const b = books[book];
    const label = p === 0 ? "Cover" : p === n ? (b.back ? "Back cover" : "End") : `Spread ${p} of ${b.spreads.length}`;
    count.textContent = label;
    fb.setAttribute("aria-label", `${b.label}: ${label}`);
    sec.querySelector('[data-fb="-1"]').disabled = p === 0;
    sec.querySelector('[data-fb="1"]').disabled = p === n;
  }
  const go = (d) => {
    p = Math.max(0, Math.min(leaves.length, p + d));
    paint();
  };
  sec.addEventListener("click", (e) => {
    const t = e.target.closest("[data-book]");
    if (t) {
      book = +t.dataset.book;
      for (const x of sec.querySelectorAll("[data-book]")) x.setAttribute("aria-selected", x === t);
      return build();
    }
    const b = e.target.closest("[data-fb]");
    if (b) return go(+b.dataset.fb);
    if (e.target.closest(".fb")) {
      // Closed: any click opens it. Open: the right page turns forward, the left back.
      if (fb.dataset.state === "front") return go(1);
      if (fb.dataset.state === "back") return go(-1);
      const r = fb.getBoundingClientRect();
      go(e.clientX > r.left + r.width / 2 ? 1 : -1);
    }
  });
  fb.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      e.stopPropagation();
      go(e.key === "ArrowRight" ? 1 : -1);
    }
  });
  // Swipe
  let x0 = null;
  fb.addEventListener("pointerdown", (e) => (x0 = e.clientX));
  fb.addEventListener("pointerup", (e) => {
    if (x0 !== null && Math.abs(e.clientX - x0) > 40) go(e.clientX < x0 ? 1 : -1);
    x0 = null;
  });
  build();
}

// ---- Card deck ---------------------------------------------------------------------------
// The top card flies off and goes to the bottom of the deck. Drag it or press Next card.
function deck(sec) {
  const dk = sec.querySelector(".dk");
  let cards = [...dk.querySelectorAll(".dk-card")];
  const n = cards.length;
  let order = cards.map((_, i) => i);
  let top = 0; // index into order of the card on top
  const counter = sec.querySelector("[data-dk-i]");
  function paint() {
    order.forEach((ci, k) => {
      const depth = (k - top + n) % n; // 0 = top
      const c = cards[ci];
      c.style.zIndex = n - depth;
      const shown = Math.min(depth, 3);
      c.style.setProperty("--d", shown);
      c.classList.toggle("is-hidden", depth > 3);
    });
    counter.textContent = order[top] + 1;
  }
  function draw(dir = 1) {
    const c = cards[order[top]];
    c.classList.add(dir > 0 ? "is-out" : "is-out-l");
    const done = () => {
      c.classList.remove("is-out", "is-out-l");
      top = (top + 1) % n;
      paint();
    };
    if (reduced.matches) done();
    else setTimeout(done, 380);
  }
  function shuffle() {
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    top = 0;
    dk.classList.remove("is-shuffling");
    void dk.offsetWidth;
    dk.classList.add("is-shuffling");
    paint();
  }
  sec.addEventListener("click", (e) => {
    const b = e.target.closest("[data-dk]");
    if (b) return b.dataset.dk === "draw" ? draw() : shuffle();
    if (e.target.closest(".dk") && !dragged) draw();
  });
  dk.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " " || e.key === "ArrowRight") {
      e.preventDefault();
      e.stopPropagation();
      draw();
    }
  });
  // Drag the top card; let go past a third of its width to throw it.
  let drag = null;
  let dragged = false;
  dk.addEventListener("pointerdown", (e) => {
    const c = cards[order[top]];
    if (!c.contains(e.target) && e.target !== dk) return;
    drag = { x: e.clientX, c };
    dragged = false;
    dk.setPointerCapture(e.pointerId);
  });
  dk.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (Math.abs(dx) > 4) dragged = true;
    drag.c.style.transform = `translate(${dx}px, 0) rotate(${dx / 14}deg)`;
  });
  const end = (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    drag.c.style.transform = "";
    if (Math.abs(dx) > drag.c.offsetWidth / 3) draw(dx > 0 ? 1 : -1);
    drag = null;
    setTimeout(() => (dragged = false), 0);
  };
  dk.addEventListener("pointerup", end);
  dk.addEventListener("pointercancel", end);
  paint();

  // Reels play while hovered or focused, and on tap.
  for (const v of sec.querySelectorAll(".reel video")) {
    const fig = v.closest(".reel");
    const play = () => v.play().catch(() => {});
    const stop = () => v.pause();
    fig.addEventListener("pointerenter", play);
    fig.addEventListener("pointerleave", stop);
    fig.addEventListener("click", () => (v.paused ? play() : stop()));
  }
}

export function mountShowcases(root) {
  for (const sec of root.querySelectorAll("[data-showcase]:not([data-mounted])")) {
    sec.dataset.mounted = "";
    if (sec.dataset.showcase === "flipbook") flipbook(sec);
    else if (sec.dataset.showcase === "deck") deck(sec);
  }
}
