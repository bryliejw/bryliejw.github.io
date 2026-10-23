# Phase 7 · Polish and launch

Done when: merged to main, links checked, live URL serves the map.

Only after I say "approved for launch". New cloud session on `map-final`. Paste below the line.

---

Read `CLAUDE.md`. I approve launching `map-final`.

1. On `map-final`: remove `reviewFlags`, `copyConfidence`, `archive` and `_meta` from `data/nodes.json` (working notes, not site content; the repo is public) and update `validate.mjs` if it expects them. Commit.
2. One load sequence per visit (lines 700ms, nodes stagger about 9ms apart, L first, then M, then S). Open Graph image 1200 × 630 rendered from the Edge map. Favicon: an ultramarine square. 404 page in the same system. Meta description from the bio line. README explaining how to add a work at each level (data fields, selects, \_src, alt sidecar).
3. Check every external link and that `/terms-of-practice-manifesto/` and `/assets/Wilson_Brylie_Taster-Folio_Final.pdf` still load at the same URLs.
4. Merge `map-final` into `main` (no force push), wait for GitHub Pages, check https://bryliejw.github.io/ returns 200 with no console errors, tag `v1`.

Tell me the final URLs for the PDF, LinkedIn and Instagram.
