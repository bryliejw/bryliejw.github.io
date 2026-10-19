// Readout, bottom-left in mono caps: view, works and keywords showing, zoom.
// Filter results are also announced to screen readers through a polite live region.
const VIEW_NAME = { edge: "Edge map", force: "Force", rings: "Rings" };

export function bindReadout({ graph, views, filter }) {
  const out = document.getElementById("readout");
  const live = document.getElementById("announce");
  let last = "";

  function render() {
    const c = filter.counts();
    const text = [
      VIEW_NAME[views.state.view],
      `${c.works.shown} of ${c.works.total} works`,
      `${c.kws.shown} of ${c.kws.total} keywords`,
      `${Math.round(graph.k * 100)}%`,
    ].join("  ·  ");
    if (text !== last) out.textContent = last = text;
  }

  views.onChange(render);
  filter.onChange((c, { announce }) => {
    render();
    if (announce) live.textContent = `${c.works.shown} of ${c.works.total} works showing, ${c.kws.shown} of ${c.kws.total} keywords`;
  });
  render();
}
