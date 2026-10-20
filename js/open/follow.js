// Keeps a floating box beside a node on screen. Runs every animation frame while the box
// shows, so it follows pan, zoom, view changes and Force physics without hooks into them.
// prefer: "right" (the grow card: beside the node, flipping left when there is no room)
// or "above" (the preview: over the node, flipping below). edge(): CSS px covered on the
// right of the viewport, by the side panel.
const clamp = (v, lo, hi) => Math.max(lo, Math.min(v, hi));

export function follow(box, target, { gap = 12, prefer = "right", edge = () => 0 } = {}) {
  let raf = 0;

  function place() {
    const n = target();
    if (!n) return;
    const r = n.hit.getBoundingClientRect();
    const vw = window.innerWidth - edge();
    const vh = window.innerHeight;
    const w = box.offsetWidth;
    const h = box.offsetHeight;
    let x;
    let y;
    let side;
    if (prefer === "above") {
      side = "above";
      y = r.top - gap - h;
      if (y < 8) {
        side = "below";
        y = r.bottom + gap;
      }
      x = clamp(r.left, 8, vw - w - 8);
      y = clamp(y, 8, vh - h - 8);
    } else {
      side = "right";
      x = r.right + gap;
      if (x + w > vw - 16) {
        side = "left";
        x = r.left - gap - w;
      }
      x = clamp(x, 16, vw - w - 16);
      y = clamp(r.top, 16, vh - h - 16);
    }
    box.style.left = `${Math.round(x)}px`;
    box.style.top = `${Math.round(y)}px`;
    box.dataset.side = side;
  }

  function frame() {
    if (!target()) return stop();
    place();
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    cancelAnimationFrame(raf);
    raf = 0;
  }
  return {
    place,
    start() {
      stop();
      frame();
    },
    stop,
  };
}
