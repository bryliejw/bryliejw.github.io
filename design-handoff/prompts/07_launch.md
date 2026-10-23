# Phase 7 · Launch

Done when: site-v1 is merged to main and https://bryliejw.github.io/ serves it

Only after I say "approved for launch". New cloud session on `site-v1`. Paste below the line.

---

Read `CLAUDE.md`. I approve launching site-v1.

1. On `site-v1` first: delete `design-handoff/` (it stays in branch history) and strip `reviewFlags`, `copyConfidence` and `_meta.contentDraft` from `data/nodes.json`; commit. These are working notes, not site content.
2. Fetch main, merge `site-v1` into `main` (no force push). Keep `/terms-of-practice-manifesto/` and `assets/Wilson_Brylie_Taster-Folio_Final.pdf` working at the same URLs.
3. Push, wait for GitHub Pages, then check https://bryliejw.github.io/ returns 200 and the home, work, a case page, about and contact load with no console errors.
4. Tag the commit `v1`.

Stop and tell me the live URL checks.
