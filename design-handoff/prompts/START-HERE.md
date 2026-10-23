# Web folio rebuild · start here

Branch `site-v1` on `bryliejw/bryliejw.github.io`. `main` (v0) stays live until launch.

## Order of work

| Step | Where | What | Done when |
|---|---|---|---|
| 1 | claude.ai, "Web Folio Draft" artifact | Click through the draft site. Open **Review** (top right): keep / replace, 1 to 3 stars and a note per work, plus Whole site, About, Contact. Each work lists what was drafted and what needs confirming. | Every work has a verdict |
| 2 | claude.ai, this Project | New chat: "Apply my Web Folio Draft review to site-v1". Claude reads the `review` ratings, edits `data/nodes.json` (copy, titles, lead images, published), resolves flags you answered, writes `design-handoff/REVIEW.md`, commits to `site-v1`. | `copyStatus` has no unreviewed `draft` fields you care about |
| 3 | Claude Code (cloud), branch `site-v1` | Paste `00_kickoff.md`. Stop, check, then `01` to `06`, one prompt per phase. Copy fixes during the build go in `data/nodes.json` only. | Phase 06 checks pass |
| 4 | Claude Code | `07_launch.md`, only after you say "approved for launch". | Live URL serves v1 |

## Why Claude Code comes in at step 3

- Steps 1 and 2 need the review database and your archive, which only claude.ai can reach.
- The rebuild reads `nodes.json`; starting it on unconfirmed copy means redoing pages.
- Exception: `01_system-shell.md` (tokens, nav, routing) does not depend on content. Run `00` and `01` alongside step 1 if time is short.

## Rules every session follows

- Copy comes from the folio PDF and `nodes.json`. No new descriptive copy. Empty stays empty.
- `reviewFlags` are open questions for you. Never rendered on the site, removed at launch.
- Client works stay `published:false` until permission.
- No em dashes, no emojis, no "The" before titles.
