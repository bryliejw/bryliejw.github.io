# CLAUDE.md · bryliejw.github.io

Brylie Wilson's portfolio site. The whole site is one systems map with her name at the centre. Works sit at three levels that show different amounts: hero projects from her PDF taster folio (L), Extras (M) and smaller works (S). Disciplines, deliverables, tools, topics and values are keyword nodes that connect them. Read this file before every task.

## Content status (23 Oct 2026)

- The direction is this systems map. The `design-handoff` and `site-v1` branches (the HANDOFF rebuild) are superseded; do not build from them.
- `data/nodes.json` on branch `map-final` holds a full-fidelity content pass: names, ordered images with alt text, facts, tools, materials, tags and copy for every work. **Build it as final.** Brylie reviews afterwards and deletes what she does not want; never stop to ask her to pick projects, images or copy.
- `copyStatus` per copy field: `pdf` = verbatim from the submitted folio (never edit); `draft` = written from her own project files. Both render. `reviewFlags` are her open questions: never render them; list any you touch in your summary.
- The hard rule "never write new descriptive copy" still applies to you: use the data as it is, and leave empty fields empty.

## Hard rules

- Live URL is https://bryliejw.github.io/ and is printed in a submitted PDF. Never rename the repo or break the root URL.
- Copy comes from `assets/Wilson_Brylie_Taster-Folio_Final.pdf` (the submitted folio) and `data/nodes.json`, verbatim. Never write new descriptive copy about her work. Leave empty fields empty; list them in your summary instead.
- No em dashes anywhere in site text. No emojis anywhere. No "The" in front of titles.
- Never invent a client, collaborator, date, quote or tool. If unsure, leave a `TODO(brylie)` comment and tell her.
- Credit honestly: group work names her role, AI use is credited where the data says so.
- Do not touch anything outside this repo. Never print API keys or secrets.
- Work in small commits with plain messages. Stop at the end of each phase and show her before starting the next.

## Content facts (from the Final PDF, 15 pages)

- Sections: 01 title map, 02 About & CV, 03–05 CYPHER, 06–08 16 Days of Real Talk, 09–14 Symbiosis (process story), 15 Extras.
- Numbering: 01 CYPHER (2024), 02 16 Days of Real Talk (2025), 03 Symbiosis (2024); Extras E1 IBM × QT Hotels (2025), E2 COLLAB (2025), E3 ADHD in the Media (2024), E4 Terms of Practice (2026), E5 Audio-reactive visual exploration (2026). The PDF calls E-numbered work "Extras"; use that word on the site.
- p01 map key: Project / Extra / 00 Page / Values I design by. The values group label on the site is "Values I design by". Read p01 as an image to see which keywords it marks as values; do not guess.
- p01 keywords: Humane technology, Cultural resistance, Visual culture, Editorial design, Sociology, Attention economy, Design justice, Sociotechnical systems, Systems thinking, Interdisciplinary, Data humanism, Health equity, Energy transition, Information design, Experience design, Transition design, Creative technology, Workshop facilitation, Design research, Design strategy, Critical making, More-than-human design, Service design, Prototyping, Museum interpretation, Responsible AI, Co-design, Psychology, Gender-based violence prevention. Connections on p01 win over any earlier seed list.
- Contact (p01): brylie.j.w@gmail.com · Instagram @byBrylie https://www.instagram.com/byBrylie · LinkedIn https://www.linkedin.com/in/bryliewilson/ · bryliejw.github.io. Terms of Practice site https://bryliejw.github.io/terms-of-practice-manifesto/
- IBM × QT role (p02, p15): "Team of 4. I designed the board system and agenda, co‑facilitated the workshop and presented the playback."
- Tools line (p02): InDesign · Illustrator · Photoshop · After Effects · Premiere Pro · Lightroom · Figma · Webflow · HTML/CSS/JS · p5.js & ml5 · TouchDesigner · Miro · Notion · Claude · Perplexity.
- Images: Brylie commits her selects to `_src/<slug>/` (copied from her Folio Final promo folder and `_folio-src`). Work only from `_src/`; never delete or rewrite anything in it. This repo may be worked on in a cloud session that cannot see her computer.

## Stack

- Static site, no framework, no bundler. Vanilla ES modules in `js/`, CSS in `css/`.
- d3 v7.8.5 from cdnjs, pinned. Nothing else at runtime.
- Node scripts in `scripts/` (standard library, plus `sharp` and `lucide-static@1.52.0` as devDependencies only).
- GitHub Pages serves `main` / root. `npm run build` regenerates everything generated; generated files are committed.

## Structure

```
index.html            map page (works without JS: shows the index table)
work/<slug>/index.html generated full pages for the 3 PDF projects
css/tokens.css        design tokens (below), the only place colours and fonts are defined
css/site.css          components
js/main.js            boot, routing
js/map/               render.js, layout-edge.js, layout-force.js, layout-rings.js, views.js, zoom.js
js/ui/                rail.js, filter.js, layers.js, palette.js, index.js, key.js, readout.js, actives.js, shortcuts.js
js/open/              preview.js, grow.js, panel.js, page.js
data/nodes.json       single source of truth
assets/icons.svg      generated sprite of the Lucide icons listed below
assets/img/<slug>/    WebP images, 1600px long edge plus 600px thumbs
_src/<slug>/          her original selects, committed, never published as pages
scripts/              validate.mjs, layout-edge.mjs, icons.mjs, images.mjs, build.mjs, check-overlaps.mjs
```

## Data model (data/nodes.json)

- `me`: name, tagline1 "Designer, strategist and chronic over-thinker", tagline2 "systems thinker", bio paragraphs, education, certification (IBM Enterprise Design Thinking Practitioner, Credly https://www.credly.com/badges/d8601100-d8ed-445e-9cbc-0cb08019e05d), experience, standpoint, contact.
- `works[]`: id, slug, n, title, sub, year|null, size L|M|S, kind project|experiment|work|client, context, team, partOf, link, keywords[], tools[] (names, shown in facts; a tool used by two or more works is also a tool keyword), materials[] (materials, formats, techniques), images[{src,thumb,w,h,alt,white}] (written by images.mjs from `data/selects.json` and the `_src/<slug>/images.json` alt sidecars; white = white ground, gets the 1px keyline; alt was drafted in the content pass and is Brylie's to edit, never generate new alt), copy{brief,insight,pull,response,role,credit,oneLine}, copyStatus, reviewFlags, steps[[label,text]], pos{edge:[x,y]}.
- Only published works are in `nodes.json`. Client work and anything held back stays out of the repo (it is public).
- `keywords[]`: id, label, type discipline|deliverable|tool|topic|value, proposed (values stay proposed until she confirms).
- Ids are unique across works AND keywords. `validate.mjs` fails the build on a duplicate (photo, td and zine have collided before).
- Edges are derived, never stored: work to keyword, work to partOf (dashed), size L works and Terms of Practice to `me`.

## Design tokens (match the PDF)

- Fonts: Archivo (Google Fonts, variable wdth 62..125, wght 400..800) for everything; IBM Plex Mono 400/500/600 only for numbers and caps labels.
- Colours: paper #FFFFFF, ink #141414, ink-2 #5E5E5E, ink-3 #8A8A86, line #E4E4E0, rule #D9D9D6, tint #F2F2EF, ultramarine #2A2DF5, blue-soft #E9EAFE, keyline #CFCFCB. White ground only.
- Type: name 800 30px −0.035em; display 800 −0.03em lh .92; title 700 −0.025em; body 16/1.5 at 50 to 60 characters; map labels 11px; mono 9.5 to 11px caps tracked .05em.
- Shape: sharp corners, 1px rules, no shadows, no gradients. Floating controls are paper boxes with a 1px ink outline.
- Ultramarine only for: numbers, the active view, selection, focus lines, topics, links, badges.

## Icons

- Lucide via `lucide-static@1.52.0` (ISC), built into `assets/icons.svg` by `scripts/icons.mjs` with only the icons below. Use `<svg class="ic"><use href="/assets/icons.svg#name"/></svg>`.
- Rendering: 18px in controls, 14px inline, stroke 1.75, `stroke-linecap: square`, `stroke-linejoin: miter`, currentColor.
- Rule: icons in the interface, shapes on the map. Map nodes stay geometric; icons go on controls, group labels, cards, filters, the palette and the key.
- Every icon-only button has an aria-label and a tooltip showing its name and shortcut.
- No brand icons. Instagram and LinkedIn are text links with `arrow-up-right`.

| Use                                                            | Icon                                                                     |
| -------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Views: Edge map, Force, Rings                                  | frame, share-2, target                                                   |
| Search, Filter, Labels & lines, Index, Surprise me             | search, sliders-horizontal, layers, list, shuffle                        |
| Zoom in, Zoom out, Fit, Key                                    | plus, minus, scan, info                                                  |
| About, Folio PDF, Contact                                      | user, file-down, mail                                                    |
| PDF project, Extra / experiment, Work, Client                  | book-open, flask-conical, file, briefcase                                |
| Discipline, Deliverable, Tool, Topic, Value                    | compass, package, wrench, hash, heart                                    |
| Expand, Full page, Close, Back, External, Next                 | panel-right-open, maximize-2, x, arrow-left, arrow-up-right, arrow-right |
| Panel tabs: Overview, Images, Process, Connections; Experience | file-text, image, workflow, waypoints; briefcase                         |
| Reset filters                                                  | rotate-ccw                                                               |

## Page layout (map frame, full viewport)

- Left rail, top-left: three view buttons (active = ultramarine fill), divider, Search, Filter (badge with number of hidden groups), Labels & lines, Index, divider, Surprise me.
- Top-right site nav: About, Folio PDF, Contact (icon + text; icons only under 760px).
- Top-left beside the rail: active filter chips (focused node in ultramarine, hidden groups in ink, each with ×, plus Clear all).
- Bottom-left: readout in mono caps. Bottom-right: zoom in, zoom out, Fit, Key.
- Popovers are anchored to their control; only one open at a time; Esc or a map click closes.
- Filter drawer: Work (switch rows with icon, label, count), Keywords (same), Year chips, "x of y works showing", Reset.
- Labels & lines popover: Keyword labels Auto / All / Off; Lines All / Projects / On hover. Defaults Auto and Projects.
- Search palette (/ or Cmd+K): grouped results Work, Keywords, About, each with its icon and a mono meta; arrow keys and Enter; picking a hidden work re-shows it.
- Key popover: node shapes, keyword icons, shortcuts.

## Map

- One centred coordinate space (1200 × 780 viewBox), one d3-zoom (0.4 to 4), name fixed at the centre in every view.
- Views: Edge map (default; keywords on the four edges in PDF edge-strip positions; ticks on the inner side of labels; works at the mean of their keywords pushed 45% outward, snapped to a free 20px cell; precomputed into pos.edge), Force (precomputed 360 ticks plus 240 rectangle overlap passes using each node's full footprint; drag only in this view), Rings (name centre, L r 180, M r 320, S r 430, keywords r 545 in typed arcs with rotated labels).
- Switching views animates nodes 750ms cubic in-out; keyword labels fade and reappear in their new orientation.
- Group labels on the map carry their keyword icon, name and live count.
- Marks by level (`TILE` in render.js): L 112px image tile with 28 × 18 ultramarine number chip, 15px title, "year · subtitle" below; M 64px image tile with 24 × 15 E-number chip, 13px title and meta to the side; S 30px image thumbnail with a 7px kind mark in the corner (filled work, outlined experiment) and an 11px 600 label; keywords 6px tick by type (ink discipline, outlined deliverable, ink-3 tool in mono caps, ultramarine topic, dashed value in italics). Image tiles crop to fill on the map only; everywhere else images keep their ratio.
- Every SVG label has a 4px paper halo (paint-order: stroke). Lines 1px line colour at rest, 1.25px ink-3 for the hovered node, 1.5px ultramarine for the focused node.
- Labels Auto: all keyword labels in Edge map; Force shows them at zoom 1.25 or on hover; Rings at zoom 0.95 or on hover.

## Open flow

Each level shows a different amount. The words carry S works; L works get the most images and a full page.

1. Hover or focus: preview. L 300px: meta, image, title, subtitle, one line, three more thumbnails. M 260px: meta, image, title, subtitle, one line. S 300px info card: 56px thumb with meta, title and subtitle, then facts (context, team, tools, materials, part of) and tags as plain words.
2. Click: grow card beside the node, follows it through pan, zoom and view changes. L and M: number block, title, subtitle, lead image, one paragraph, keyword rows led by type icons as plain text links; Expand, Full page (L only), Live site when linked. S: kind icon, title, subtitle, a strip of up to 4 images, one line, facts, tags, and an "About this piece" disclosure with brief, insight, response, role and credit when the data has them; no Expand.
3. Expand: 420px side panel; map pans so the selected node stays visible with its lines in ultramarine; tab strip (Overview, Images, Process, Connections) scrolls within the panel; clicking any node or label while open updates the panel.
4. Full page (CYPHER, 16 Days of Real Talk, Symbiosis): clip-path circle reveal from the node to /work/<slug>/ in the PDF opener layout; Back returns to the panel.

- Esc closes the top layer: palette, popover, page, panel or card, focus.

## Shortcuts

1 2 3 views · / or Cmd+K search · F filter · L labels & lines · I index · R surprise · + − 0 zoom · ? key · Esc close. Ignore keys while typing in an input.

## Accessibility and performance

- Every node focusable (me, L, M, S, keywords), Enter or Space opens, aria-label like "03 Symbiosis, 2024, project". 2px ultramarine focus ring. AA contrast.
- prefers-reduced-motion: no animation, no live physics.
- Under 720px: keyword groups as an accordion above the index, bottom tab bar (map, list, sliders-horizontal, user), card and panel as full-screen sheets.
- Lighthouse performance and accessibility at least 90; 60fps with 90 nodes.

## Checks before every commit

- `npm run validate` (schema, unique ids, every keyword used, no em dashes in data).
- `npm run check` (Playwright at 1440 × 900: zero label or tile overlaps in Edge map, at most 3 in Force and Rings, no console errors).
