# Design handoff · web folio rebuild

Prepared 20 Oct 2026 from the Web Folio Lab (claude.ai artifact, private) and Brylie's ratings in it. This folder is the brief for rebuilding the site. Read all of it before writing code.

## What is in this folder

| Path                                | What it is                                                                                                                                                                                                                                         |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `HANDOFF.md`                        | This brief. Wins over anything in `CLAUDE.md` about design, layout or the old systems map.                                                                                                                                                         |
| `lab.html`                          | The Lab, a single self-contained page. Open it in a browser (`npx serve design-handoff` or any static server). Every option is live and clickable. Section 09 is the site to build. Rating buttons will say "Not saved in this view"; ignore them. |
| `img/`                              | Assets the Lab uses: drawing cutouts (`d-*.webp`), photo cutouts (`cut-*.webp`), bloom frames (`bloom/a00–a17.webp`), Prototype 3 test clip (`v-sq.mp4` + poster), Lab thumbnails.                                                                 |
| `story/index.html` + `story/media/` | The Symbiosis process story page (presented at the Week 12 pin-up). Becomes `work/symbiosis/`.                                                                                                                                                     |
| `picks.json`                        | Brylie's ratings per Lab option: stars 0–3, verdict keep/replace, notes. Read it; it explains every decision below.                                                                                                                                |

How to find a component in `lab.html`: search for its option id, e.g. `id:'h-maplist'`. Each option is `opt({sec, id, name, src, why, cls, frame, html(), init(f)})` with its CSS in the `<style>` block under a matching comment. Shared helpers (`mapList`, `netLayout`, `ringsHTML`, `burst`, `lean`, `loop`, `onScreen`) are plain functions near the option that first uses them. The assembled site is `id:'x-site'`.

## Build this (section 09, "Assembled site")

Rebuild `x-site` as the real site, full viewport, not inside a frame. Same pages, same behaviour, production quality.

| Page / piece                    | Lab option ids                                        | Rating                        | Notes                                                                                                                                                                                                                                                    |
| ------------------------------- | ----------------------------------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home: Map · Rings · List switch | `h-maplist` (uses `h-orbit`, `h-rings`, list network) | F 2★, rings keep 2★, split 2★ | Brylie's note: she liked the list beside a network map from the first iteration (`h-split`). List view = list of works left, dark field network right; hover a work to light its fields and lines; click a field to filter the list. Default view: Map.  |
| Persistent nav                  | `n-pill2`                                             | 2★                            | Floating dark pill: Home, Work (count), Index drawer, About, Contact. Hides on scroll down, returns on scroll up. Index opens a drawer of every work.                                                                                                    |
| Work index                      | `w-table2`                                            | 3★ (also `w-table` 3★)        | The highest-rated piece. Grouped Selected projects / Extras, thumbnail per row, sortable No / Title / Year, field filter chips with counts, rows expand in place (pull line + images), Table/Grid switch. In the site, row title links to the case page. |
| Case page opener                | `c-meta`                                              | spacing liked                 | Back link + "Case 03 / 08" counter, very large title, subtitle, one ruled row of Year / Context / Team / Field, then images. Keep this spacing.                                                                                                          |
| Case page end                   | `m-marquee` + `f-next`                                | 2★ each                       | Fields marquee band (that work's fields), then the blue next-project band that stretches on hover.                                                                                                                                                       |
| About                           | `a-map` + `m-name`                                    | 2★ each                       | Visual bio with grouped keywords that light the works they connect to; CV in ruled columns with the IBM badge in blue. Name uses the letter-by-letter width lean (`lean()` helper).                                                                      |
| Contact                         | `x-site` contact page, `burst()`                      | from `f-mail`                 | Giant selectable email, copy button that throws field chips (`burst`), LinkedIn / Instagram / Terms of Practice links.                                                                                                                                   |
| Cursor                          | `m-cursor`                                            | 2★                            | Blue "View" disc over work images only. Hidden on touch.                                                                                                                                                                                                 |
| Page transition                 | `m-reveal`                                            | 2★                            | Blue circle grows from the click point, page swaps, overlay fades.                                                                                                                                                                                       |
| Symbiosis extra                 | `m-bloom`                                             | 2★                            | Bloom scrub (her p5.js frames) as a small moment on the Symbiosis case page or story. Optional, ask Brylie where.                                                                                                                                        |

## Keep in reserve (rated, not in v1)

`h-field` 2★, `h-wall` 2★, `h-play` 2★ (note: "maybe for other things"), `n-pill` 2★ (superseded by `n-pill2`), `f-next` (used inside case pages). Do not build these now.

## Do not build (replaced or 1★)

Replaced: `h-flood`, `t-c` Schibsted pairing, `n-corner`, `c-bir`, `m-stretch`, `n-progress`, `n-dock`, `m-stamp`.
1★: `h-type`, `n-menu`, `a-state`, `f-mail` (only its giant email survives on Contact), `w-tier`, `m-trail`.
Unrated, leave out unless Brylie says otherwise: `h-threads`, `n-palette`, `c-bleed`, `c-cut`, `c-split`, `a-map2`, `a-time`, `f-map`.

## Design system

Bold and ultramarine are the only things carried from before. The old Archivo / IBM Plex Mono tokens in `CLAUDE.md` are superseded.

- **Type (PROPOSED, type options were not rated):** Anybody (display, variable width 50–150, weights to 900) · Instrument Sans (body) · Geist Mono (labels and numbers). All Google Fonts. This is pairing A, the one the process story already uses. Put families in `css/tokens.css` only, so a swap to Archivo (B), Bricolage Grotesque (C) or Familjen Grotesk (D) is one edit.
- **Colour:** white `#FFFFFF`, ink `#0B0C10`, ink 2 `#16181F`, grey `#EEEFF2`, rule `#DADCE2`, muted `#5C606B`, muted 2 `#9DA1AC`, ultramarine `#2A2DF5`, light blue on dark `#AAACFF`, blue tint `#E4E5FF`. Ultramarine for numbers, active states, selection, links, chips and the blue bands. Single look (no dark mode); dark sections are ink.
- **Display type:** 900 weight, line-height .82–.92, letter-spacing −.03em, width condensed at rest and stretched on hover where the Lab does it.
- **Labels:** Geist Mono 10.5–12px, uppercase, tracked .06–.07em.
- **Shape:** sharp corners, 1–2px rules, no shadows, no gradients, no card outlines.
- **Motion:** every animation respects `prefers-reduced-motion` (the Lab already branches on `RM`). Passive motion only while on screen (`loop()` uses IntersectionObserver).

## Data

- `data/nodes.json` is the single source of truth. Keep its content; do not rewrite copy. The Lab's `W` array was a stand-in built from the PDF. Map its fields like this: `n`→`n`, `t`→`title`, `sub`→`sub`, `y`→`year`, `k` Project/Extra→`size` L / M, `img`/`more`→`images[]`, `ctx`→`context`, `kw`→`keywords[]` (ids, look up `keywords[].label`), `line`→`copy.pull` or `copy.oneLine`, `disc`→first of `labels`, `link`→`link`.
- Keyword types and which ones are values come from `data/nodes.json` (`type`, `proposed`), not from the Lab's `VALUES` list.
- **Which works show where (PROPOSED, confirm with Brylie):** Home map, rings and list network show size L and M works (the 8 folio works). The work index shows L and M, plus size S works in a third group "More work".
- **Client works stay hidden.** `kind: "client"` (LBW20, Ashham Advisory, Ashham Agencies, Secure Books) must not render anywhere until Brylie confirms client permission. Add a `published` flag defaulting to false for them.
- Leave empty fields empty and list them in your summary.

## Symbiosis process story

- Port `story/index.html` to `work/symbiosis/index.html` with its media under `assets/img/symbiosis/story/` (or keep relative paths, your call, but no broken links).
- Remove the review layer (the `window.claude` db code and the Review button); it only works inside claude.ai. Keep Present mode (arrow keys, 2:30 timer).
- The CYPHER and 16 Days case pages use the `c-meta` opener with their `nodes.json` images and copy.
- The Lab's "Read the full process story" link pointed at a private claude.ai page. On the site it goes to `/work/symbiosis/`.

## Rules (from `CLAUDE.md`, still in force)

- Live URL https://bryliejw.github.io/ is printed in the submitted PDF. Never break the root URL. Work on this branch; merge to `main` only when Brylie says so.
- Copy comes verbatim from the PDF and `data/nodes.json`. Never write new descriptive copy about her work. Never invent a client, collaborator, date, quote or tool; leave `TODO(brylie)` instead.
- No em dashes, no emojis, no "The" in front of titles.
- Credit honestly: group work names her role, AI use credited where the data says so.
- Testers in images and video appear only from behind or as traced silhouettes. Do not add photos of faces.
- Never delete or rewrite anything in `_src/`.
- Small commits with plain messages. Stop at the end of each phase and show Brylie.

## Phases (stop after each)

1. **Set up.** Read this file, `picks.json`, `CLAUDE.md` hard rules and `data/nodes.json`. Open `lab.html` and click through section 09. Update `CLAUDE.md` design sections to point here. Propose the file structure and confirm with Brylie.
2. **System + shell.** `css/tokens.css`, fonts, pill nav with drawer, page transition, view cursor, routing for Home / Work / About / Contact / case pages.
3. **Home.** Map · Rings · List from `data/nodes.json`. Network layout from `netLayout()` (fields placed by the works they share, labels pushed apart, recomputed on resize).
4. **Work index.** `w-table2` in full, links into case pages.
5. **Case pages.** CYPHER and 16 Days with the `c-meta` opener, marquee and next band; Symbiosis = ported story.
6. **About + Contact.** `a-map`, name lean, CV, giant email with copy burst.
7. **Check.** No console errors, no horizontal scroll at 390px and 1440px, keyboard reachable (pill, view switch, index rows, network fields), reduced-motion pass, Lighthouse performance and accessibility at least 90.

## Open and unverified

- Lab keyword links were approximated from PDF p01. `data/nodes.json` wins wherever they differ.
- Garden Chair "cast-iron" and "1870" are unverified; leave them out of new copy.
- The type pairing is proposed, not decided.
- Timeline, threads and other unrated options are not part of v1.
