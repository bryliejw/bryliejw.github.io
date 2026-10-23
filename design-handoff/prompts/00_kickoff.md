# Phase 0 · Kickoff and plan

Done when: CLAUDE.md design sections point to the handoff, a file plan is agreed, nothing is built yet

Start a Claude Code cloud session on `bryliejw/bryliejw.github.io`, branch `site-v1`. Paste everything below the line.

---

Work on branch `site-v1` only. Never push to `main`; the live URL https://bryliejw.github.io/ is printed in my submitted folio and v0 stays live until I approve the launch.

Read, in this order: `CLAUDE.md` (Hard rules, Content facts, Data model), `design-handoff/HANDOFF.md` (the design brief, it wins on design), `design-handoff/CONTENT.md` (the content draft: which works show where, featured images, copy levels), `design-handoff/picks.json` (my ratings), `data/nodes.json`. Serve the repo root locally (`npx serve .`), click through `/design-handoff/lab.html` section 09 (`x-site`), and open `/design-handoff/preview/` (the content draft wired into x-site; it reads images from `assets/img/`).

Then:
1. Rewrite the superseded sections of `CLAUDE.md` (Structure, Design tokens, Icons, Page layout, Map, Open flow, Shortcuts) in place so they describe the HANDOFF build. Keep Hard rules, Content facts and Data model; add the new fields from CONTENT.md (`published`, `featured`, `copyStatus`, `reviewFlags`, `copyConfidence`) to Data model. `reviewFlags` are open questions for me; never render them on the site. Remove the "Direction change" note once the sections are rewritten.
2. Propose the file structure for the rebuild (pages, css, js modules, scripts you keep from the map build such as `images.mjs` and `validate.mjs`, scripts you retire). Say what happens to the old systems-map code.
3. List every empty copy field, every `copyStatus: draft` field and every unresolved `reviewFlags` entry per work. If `design-handoff/REVIEW.md` exists (my ratings exported from the draft review), apply what it says first and tell me what changed.

Stop. Show me the CLAUDE.md diff, the structure proposal and the two lists. Do not write site code yet.
