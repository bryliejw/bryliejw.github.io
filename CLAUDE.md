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

## Design tokens (web folio system, from the Web Folio Draft)

- Fonts (Google Fonts): Anybody (display: name, titles, numbers; variable width 50..150, weights to 900), Instrument Sans (text and map labels), Geist Mono (caps labels, numbers). Families live in `css/tokens.css` only (`--font-display`, `--font-sans`, `--font-mono`).
- Colours: paper #FFFFFF, ink #0B0C10, ink-deep #16181F, ink-2 #5C606B, ink-3 #9DA1AC, line and rule #DADCE2, tint #EEEFF2, ultramarine #2A2DF5, blue-light #AAACFF (on ink and blue), blue-soft #E4E5FF. White ground; dark elements are ink.
- Type: name Anybody 900 34px, width 82; display Anybody 900, line-height .82 to .86, tracking −.03em, width 86 at rest and stretched (130 to 135) on hover for page titles, panel titles and the next band; titles Anybody 800 width 88; body Instrument Sans 16/1.5 at 50 to 60 characters; map labels 11px; mono Geist Mono 10 to 11.5px caps tracked .06em.
- Shape: sharp corners, 1 to 2px rules, no shadows, no gradients, no card outlines on pages. Floating controls (rail, zoom, site nav) are ink blocks with white icons and mono caps labels; active and hover states in ultramarine.
- Ultramarine for numbers, the active view, selection, focus lines, topics, links, chips, the next-project band and the view cursor.
- Full page: back link, "Case 0n / 03" counter, very large title, subtitle, one ruled row (Year, Context, Team, Field, Tools), lead image on tint, pull line with a 4px ultramarine rule, Brief / Insight / Response columns, role, credit and materials, images, process, connections, a two-band fields marquee (ink and ultramarine), then the blue next band. Motion respects prefers-reduced-motion.
- View cursor: a 72px ultramarine "View" disc over work tiles and images (pointer devices only); clicking an image opens it full size on ink.

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
- Top-right site nav: About, Folio PDF, Contact (icon + mono caps text on ink; icons only under 760px).
- Top-left beside the rail: active filter chips (focused node in ultramarine, hidden groups in ink, each with ×, plus Clear all).
- Bottom-left: readout in mono caps. Bottom-right: zoom in, zoom out, Fit, Key.
- Popovers are anchored to their control; only one open at a time; Esc or a map click closes.
- Filter drawer: Work (switch rows with icon, label, count), Keywords (same), Year chips, "x of y works showing", Reset.
- Labels & lines popover: Labels Auto / All / Off; Lines Auto / All / Projects / On hover. Defaults Auto and Auto (Auto lines: all in Force, projects in Rings, on hover in Edge map).
- Search palette (/ or Cmd+K): grouped results Work, Keywords, About, each with its icon and a mono meta; arrow keys and Enter; picking a hidden work re-shows it.
- Key popover: node shapes, keyword icons, shortcuts.

## Map

- One centred coordinate space, one d3-zoom (0.4 to 4), name fixed at the centre in every view. The map fills the visible area: on resize, and when the panel opens or is resized, Force and Edge map re-lay out to the area's aspect ratio (when it changes by more than 4%) and every view refits so the name stays centred.
- Views, in rail order (keys 1 2 3): Force (default; precomputed 360 ticks, stretched to the area's aspect, then 240 rectangle overlap passes on tile footprints; drag only in this view), Rings (name centre, L r 215, M r 335, S r 450, keywords r 565 in typed arcs with rotated labels), Edge map (keywords on the four edges as an index strip, typed groups with counts; works at the mean of their keywords pushed outward and snapped to a free 10px cell; width 1200, height from the aspect). ?view= is omitted from the URL for Force.
- Switching views animates nodes 750ms cubic in-out; keyword labels fade and reappear in their new orientation.
- Group labels on the map carry their keyword icon, name and live count.
- Marks by level (`TILE` in render.js): L 112px image tile with 28 × 18 ultramarine number chip, 15px title, "year · subtitle" below; M 64px image tile with 24 × 15 E-number chip, 13px title and meta to the side; S 30px image thumbnail with a 7px kind mark in the corner (filled work, outlined experiment) and an 11px 600 label; keywords 6px tick by type (ink discipline, outlined deliverable, ink-3 tool in mono caps, ultramarine topic, dashed value in italics). Image tiles crop to fill on the map only; everywhere else images keep their ratio.
- Every SVG label has a paper halo (paint-order: stroke). Line weight and colour change by view and state (site.css "lines per view"); while a node is hovered or focused everything not connected to it steps back, and a copy of that node is drawn above the rest (`.m-top` `<use>`, so DOM and tab order never change).
- Labels Auto, by zoom relative to the view's fitted zoom (views.js): L titles always; M titles and metas from 1.2; S titles from 1.55; keyword labels always in Edge map, from 1.45 in Force and 1.25 in Rings; any node's labels on hover or focus. Labels, ticks and kind marks counter-scale (`--lz` = zoom^-0.75), so zooming in gives them room. A greedy pass places them in order (active, L, M, S, keywords) and hides any that would touch another label or another node's tile; an M or L whose meta will not fit shows its title alone.

## Open flow

Each level shows a different amount. The words carry S works; L works get the most images and a full page.

1. Hover or focus: preview. L 300px: meta, image, title, subtitle, one line, up to four more thumbnails. M 260px: meta, image, title, subtitle, one line, up to three more thumbnails. S 300px info card: 56px thumb with meta, title and subtitle, then facts (context, team, tools, materials, part of) and tags as plain words.
2. Click: grow card beside the node, follows it through pan, zoom and view changes until dragged by its header; then it stays where it was dropped for every node until docked (pin-off button). Resizable from the corner on both axes; content reflows by container queries. L and M: number block, title, subtitle, lead image with a thumbnail row that swaps the lead (counter), one paragraph, keyword rows led by type icons as plain text links; Expand, Full page (L only), Live site when linked. S: kind icon, title, subtitle, a strip of up to 4 images, one line, facts, tags; Expand. Keywords and the name (About) also Expand.
3. Expand: side panel, 460px default, resizable by its grip (380px to 72vw) and widened with the chevrons; the map refits beside it with the selected node visible and its lines in ultramarine. One scroll column: sticky bar (number or kind, meta, widen, close), hero image, title block and actions, sticky tabs. Overview: copy (brief, insight, response, role, credit), facts, gallery of 6 with "Show all N". Process: steps with their process images inline (or process figures with captions). Connections: a mini map of the node and its neighbours from current positions, keyword tree by type with counts, related works by shared keywords. Clicking any node or label while open updates the panel.
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
