# Phase 1 · System + shell

Done when: tokens, fonts, pill nav with drawer, page transition, View cursor and routing work on empty pages

New cloud session on `site-v1`. Paste below the line.

---

Read `CLAUDE.md` and `design-handoff/HANDOFF.md`. Phase 1, system and shell, on branch `site-v1`.

1. `css/tokens.css`: the HANDOFF design system (pairing A: Anybody, Instrument Sans, Geist Mono; colours; display, label and rule styles). Families only in tokens.css so a type swap is one edit.
2. Shell: pill nav `n-pill2` (Home, Work with live count of published works, Index drawer listing every published work, About, Contact; hides on scroll down, returns on scroll up), page transition `m-reveal` (blue circle from the click point), View cursor `m-cursor` over work images only (hidden on touch).
3. Routing for Home, Work, About, Contact and case pages `/work/<slug>/`. Real URLs that work with JS off (each page is an HTML file); JS adds the transition.
4. Only works with `published: true` appear anywhere. Client works stay hidden.
5. Every animation respects prefers-reduced-motion.

Check at 1440 × 900 and 390 × 844: no console errors, no horizontal scroll, nav reachable by keyboard. Commit in small steps. Stop and show me screenshots of the shell at both widths.
