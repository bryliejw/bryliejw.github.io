# CLAUDE.md · bryliejw.github.io

Brylie Wilson's portfolio site. The whole site is one systems map with her name at the centre. Projects from her PDF taster folio are large nodes; smaller works sit around them; disciplines, deliverables, tools, topics and values are keyword nodes that connect them. Read this file before every task.

## Direction change (20 Oct 2026)

`design-handoff/HANDOFF.md` is the current design brief. It supersedes the Structure, Design tokens, Icons, Page layout, Map, Open flow and Shortcuts sections below, which describe the earlier systems-map build. Hard rules, Content facts and Data model still apply. Update this file to match once Brylie confirms the phase 1 plan.

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
- `works[]`: id, slug, n, title, sub, year|null, size L|M|S, kind project|experiment|work|client, context, team, partOf, link, keywords[], images[{src,w,h,alt}], copy{brief,insight,pull,response,role,credit,oneLine}, steps[[label,text]], pos{edge:[x,y]}.
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
- Views: Edge map (default; keywords on the four edges in PDF edge-strip positions; ticks on the inner side of labels; works at the mean of their keywords pushed 45% outward, snapped to a free 20px cell; precomputed into pos.edge), Force (precomputed 360 ticks plus 240 rectangle overlap passes using each node's full footprint; drag only in this view), Rings (name centre, PDF work r 240, smaller works r 370, keywords r 495 in typed arcs with rotated labels).
- Switching views animates nodes 750ms cubic in-out; keyword labels fade and reappear in their new orientation.
- Group labels on the map carry their keyword icon, name and live count.
- Marks: L 96px image tile with 26 × 17 ultramarine number chip, 15px title, "year · subtitle"; M 48px white tile with ink keyline and blue number; S square by kind (filled work, outlined experiment, outlined with centre client) with 11px 600 label; keywords 6px tick by type (ink discipline, outlined deliverable, ink-3 tool in mono caps, ultramarine topic, dashed value in italics).
- Every SVG label has a 4px paper halo (paint-order: stroke). Lines 1px line colour at rest, 1.25px ink-3 for the hovered node, 1.5px ultramarine for the focused node.
- Labels Auto: all keyword labels in Edge map; Force shows them at zoom 1.25 or on hover; Rings at zoom 0.95 or on hover.

## Open flow

1. Hover or focus: preview tooltip (meta line with kind icon, image, title, subtitle).
2. Click: grow card beside the node, follows it through pan, zoom and view changes. Header block with number or type icon; title; labels grouped in rows, each row led by its type icon and set as plain text links (no boxed chips); one paragraph; Expand, Full page (L only), Live site when linked.
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
