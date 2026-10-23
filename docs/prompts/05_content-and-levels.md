# Phase 5 · Content and levels

Done when: every work renders at its level with its images, facts and copy; validate and check pass; screenshots of all three views and one hover and one card per level.

Start a Claude Code cloud session on `bryliejw/bryliejw.github.io`, branch `map-final`. Paste everything below the line.

---

Work on branch `map-final` only. Never push to `main`; v0 stays live until I approve the launch in phase 7.

Read `CLAUDE.md` first, especially "Content status", "Data model", "Map" and "Open flow". Then read `docs/CONTENT.md` (what every work is, its level, images and open questions).

The content is decided. `data/nodes.json`, `data/selects.json` and `_src/<slug>/` (with `images.json` alt sidecars) hold a full-fidelity pass: every work's name, level, ordered images with alt text, facts, tools, materials, tags and copy. Treat it as final and build it with full effort. I will review the finished site and delete what I don't want. Do not stop to ask me to pick projects, images or copy, and do not rewrite any copy or alt text. Empty fields stay empty; list them at the end.

1. `npm run build` (images then pages), `npm run validate`, then `npm run layout` to recompute the Edge map positions for the new node count and tile sizes, then `npm run check`.
2. Fix every overlap `check` reports: zero in Edge map, at most 3 in Force and Rings. Tune layout parameters (cell size, outward push, ring radii in `layout-rings.js`, force passes), never the data. With roughly 50 works the Edge map may need the work area to use more of the canvas or two S label sides; keep the four keyword edges as they are.
3. Check the three levels against CLAUDE.md "Open flow" in every view: L previews with thumbnails and full pages; M image tiles, card and panel; S thumbnails with the hover info card (facts and tags) and the click card (image strip, one line, facts, tags, "About this piece"). Make them feel finished: spacing, type sizes, image crops on tiles, keyboard focus, Esc order, phone sheets under 720px.
4. Key popover, filter drawer (counts per level and kind), search palette (works show level and year in the meta) and the index (grouped Projects, Extras, More work) all reflect the levels.
5. Full pages for the three L projects regenerate with facts (tools, materials) and all their images.

Stop. Show me screenshots at 1440 × 900 (Edge, Force, Rings; one hover and one card for an L, an M and an S work; one full page) and at 390px (map, an S card sheet). List: empty fields, any reviewFlags you saw that affect layout, anything you could not finish.
