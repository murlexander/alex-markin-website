# alex-markin.com design system

Quiet, typographic, and lowercase, with subtle web-1.0 details. The homepage uses a seeded generative
edition for the current browsing session. The coffee calculator and all other standard pages
use fixed dark serif/mono styling.
Static HTML + CSS, no build step.
This file is the source of truth. If you (human or LLM) are editing the site, read this first;
every visual decision below is deliberate.

## voice

- **all lowercase, everywhere** — headings, name, links, tags, footer. The only exception is
  proper nouns inside descriptions where lowercase would be confusing.
- Compact, understated, no exclamation marks, no emoji.

## base color tokens (defined in `styles.css :root`)

These are the permanent palette for the cv and trials catalogue and the starting palette for
the homepage's `simple` appearance. Homepage editions may override them only through the
bounded palettes in `appearance.js` and `appearances.css`.

| token | value | use |
|---|---|---|
| `--bg` | `#000000` | base page background |
| `--ink` | `#ccc6b9` | body text and link default |
| `--ink-bright` | `#eae5da` | display text (the name) only |
| `--ink-hover` | `#ffffff` | link hover |
| `--muted` | `#847e70` | descriptions, taglines, secondary text |
| `--faint` | `#66614f` | mono tags, metadata |
| `--footnote` | `#5c574a` | footer text |
| `--accent` | `#7d8f5c` | olive. section headings and compact meta/subheader lines ONLY. never for body text or backgrounds |
| `--hairline` | `#35322a` | dotted leader lines |
| `--rule` | `#24221d` | solid horizontal rules |
| `--border` | `#2a2822` | 1px borders on images and chips |
| `--chip-bg` | `#131311` | chip/inset backgrounds |

Rules for non-generative pages:
- The palette is warm grey on black plus one olive accent. Do not introduce new hues.
- Need a new shade? Stay between `--footnote` and `--ink-bright` on the same warm axis.
- Accent is scarce by design — if more than headings + compact meta lines are olive, it's wrong.

## type tokens

The original pages use two locally hosted families:
- `--serif` = **Source Serif 4** — all reading text (links, descriptions, taglines).
- `--mono` = **IBM Plex Mono** — the "machine voice": the name, section headings, tags,
  metadata, footer. Anything that annotates rather than reads.

Scale (don't invent sizes; pick the closest):
- `--fs-display` 44px / mono 600 / lowercase — the name (32px on mobile)
- `--fs-body` 16px / serif 400 / line-height 1.55 — links, body
- `--fs-desc` 14.5px / serif — descriptions under links
- `--fs-heading` 12px / mono 500 / letter-spacing 0.14em / lowercase — section headings
- `--fs-meta` 11.5px / mono / letter-spacing 0.08em — header meta line
- `--fs-tag` 11px / mono — leader-line tags
- `--fs-footer` 10.5px / mono / letter-spacing 0.06em — footer

The generative homepage uses one responsive semantic scale across every
appearance. Each appearance has fixed families, weights, tracking, case treatment, and line
height; none of these changes when an edition is regenerated. A role's size stays shared. The homepage identity name is the sole exception: its display
size is a ceiling and may fluidly reduce to remain inside the actual text space beside the
portrait. The scale is `44 / 17 / 15.5 / 13 / 12.5 / 12 / 11.5px`
for display, body, description, heading, meta, tag, and footer on wide screens (`840px+`);
`40 / 16.5 / 15 / 12.5 / 12 / 11.5 / 11px` on medium screens (`641–839px`); and
`32 / 16 / 14.5 / 12 / 11.5 / 11 / 10.5px` on compact screens (`640px` and below).
The scale is expressed in `rem`, so the values above describe the default 16px browser
text setting and grow with a visitor’s text-size preference. The shared `font-size-adjust` target normalizes the x-height of the different appearance
typefaces so equal semantic sizes remain optically comparable, including 70mm's film serifs.

## layout

- `.page`: max-width 1100px, centered, padding 36px 48px 12px (36/24/12 mobile). The
  12px bottom padding mirrors the footer's 12px divider-to-text spacing.
- `.page--narrow`: max-width 780px with the same padding and mobile behaviour. Use it for
  a single reading or catalogue column that should not stretch across a wide display.
- On the homepage and cv, the identity header keeps its side-by-side desktop layout, then
  centers the portrait, name, tagline, and meta line as one stacked block at 640px and below.
- `.columns`: CSS grid, `repeat(auto-fit, minmax(340px, 1fr))`, gap 44px 64px, for
  standard pages. New sections go inside `.columns` as another `<section>`.
- The generative homepage adds `.page--home`: its column count is never seeded. The six compact
  appearances use one column below `840px` and exactly two above it. Paper keeps one column below
  `1120px`, then exactly two, so its larger editorial type retains a readable measure. Appearances
  may still vary column gap and row gap, but never the count at a given screen width.
- Every homepage appearance draws its seeded canvas width from the same inclusive `950–1180px`
  bracket. The generator may select any whole-pixel width inside it; no appearance owns a private
  width range. Narrow viewports still cap the canvas naturally at the available screen width.
- Spacing rhythm: 48px between major blocks, 14px after headings, 8px between list rows,
  18px between publication entries.

## core patterns (copy these verbatim)

### link row with dotted leader + tag
The signature pattern. Title left, dotted line fills the middle, lowercase mono tag right.

```html
<li class="row"><a href="…">title of thing</a><span class="leader"></span><span class="tag">tag</span></li>
```

- Tags are one lowercase word: `phone` `mail` `ig` `photos` `social` `books` `work`
  `code` `project` `press` `video` `film` `cv` `bar` `brew` `service` `guests`
  `photo`. Reuse before inventing.
- The first link's hit area covers the full row, including the dotted leader and tag.
- Links: no underline, `--ink`, hover to pure white. Nothing else changes on hover. External
  links append a compact mono `↗︎` marker with a narrow gap and the Unicode text-presentation
  selector; never permit emoji presentation. Deliberate internal navigation uses
  `.internal-link` and a mono `→`; identity, image, and back links remain unmarked because their
  direction is already clear. Photo links are also unmarked because the image signals interaction.

### publication entry (row + description)
```html
<li>
  <div class="row"><a href="…">title</a><span class="leader"></span><span class="tag">press</span></div>
  <div class="desc">one-line lowercase description</div>
</li>
```
Inline links inside `.desc` render in `--accent`.

The homepage bio ends with a `.desc.bio-postscript` linking to sibling websites.
It uses the existing description scale with an 18px gap; its links inherit the muted
prose color and retain the standard external markers and appearance hover/focus treatments.

### identity header (`/` and `/cv` only)
The portrait-and-name identity block belongs only on the homepage and cv. On the cv, the
portrait and name link back to `/`. Product and catalogue pages omit the identity block and
use the footer's `alex-markin.com` link as their route home.

```html
<!-- generative homepage -->
<span class="appearance-image appearance-image--portrait">
  <img class="photo" src="photo-720.webp?v=YYYYMMDD-N" alt="…" />
</span>

<!-- non-generative cv -->
<a class="photo-link" href="/"><img class="photo" src="photo-720.webp?v=YYYYMMDD-N" alt="…" /></a>
<h1 class="name"><a href="/">alex markin</a></h1>
```

The anchors are layout-neutral: `.photo-link` is `display: block; flex: none; line-height: 0`
so the portrait keeps its square, and `.name a` inherits `--ink-bright` rather than the
default link `--ink`, hovering to white like everything else. The portrait itself gets no
hover treatment — its grayscale and border are unchanged.

### cv entry (`cv.html`)
Role on the left, dotted leader, date range on the right; the workplace on the line
below, then optional detail lines. Used by both `experience` and `education`.

```html
<li>
  <div class="row"><span>barista</span><span class="leader"></span><span class="dates">jun 2025 – present</span></div>
  <div class="desc">darcy's kaffe, copenhagen</div>
  <ul class="notes">
    <li>one lowercase point per line</li>
  </ul>
</li>
```

- `.dates` occupies the `.tag` slot and shares its mono `--faint` voice, but holds
  free-form text instead of a one-word tag, so it never wraps. Use it only for date
  ranges — a categorical label is still a `.tag`.
- `.entries` shares the `.pubs` 18px rhythm; the two are one rule in `styles.css`.
- `.notes` are `.desc` voice with no bullet markers. Keep each to one line where possible.
- A `.row` does not need a link. Without one it simply loses the full-row hit area —
  used by the cv `skills` list, where the row is a statement, not a destination.

### coffee calculator (`coffee.html`)

The coffee page is a fixed utility, scoped by `.coffee-page` and loaded only through `coffee.css`, with local
Source Serif 4 and IBM Plex Mono. It does not load `appearance.js`, visual layers, or
appearance controls. Incoming look/seed parameters have no visual effect; navigating back
home restores the homepage's own session appearance. Keep the canonical `/coffee` URL.

Use one preset selector, grouped ratio/temperature fields followed by quantity fields, then one live method.
On desktop the method sits beside the calculator; below 840px it follows the controls.
Keep the desktop rhythm dense enough for the complete default recipe and actions to fit in one
common laptop viewport without reducing type or control sizes. Compact screens may scroll naturally.
Center the calculator title at the top with the home link immediately below it. The coffee page has no
tagline, adjustment helper copy, or footer; its only route home is the link below the title.
Use existing color/type tokens, rem-based type, 44px minimum controls, clear focus outlines,
and no decorative motion. Both action buttons use the same outlined button treatment.

Authored recipes live once in inert `<template>` elements. `coffee.js` reads their annotated
specs and clones only the selected method, substituting current quantities and temperature.
Defaults remain 15g coffee at each authored ratio (1:10, 1:8:8, 1:16.6). Amount edits scale the
batch; ratio edits keep coffee fixed. Zero is valid for amounts, ratios, and temperature.
The V60 preset calculates its bloom as 2.5× the coffee dose and splits the remaining water evenly
between the two later pours.
Temperature accepts a number or ascending range and has no helper or validation copy.
Keyboard arrows change coffee by 1g, water/ice by 25g, and ratios by 0.5. Invalid amount entries
show an inline message; all invalid entries prevent sharing until corrected or reset. Reset restores
the selected preset.
Headings are `preset`, `adjust`, and `brew`; the `adjust` heading has no adjacent state qualifier.
The `copy as text` and `share as picture`
buttons are always visible below the method and note, with no extra share toggle. Text copies directly to the
clipboard, changes the button label to `copied!` for one second without changing its dimensions, and retains a legacy clipboard fallback. Pictures use the native
Web Share API when supported. Picture sharing prepares a PNG recipe card from current state before the
choice is clicked, preserving browser user activation. The triggering button stays active while the native share
sheet is open so platform popovers can retain the control as their anchor; an in-progress guard prevents duplicate
requests. Text and picture include current specs,
adjusted method, note, and source URL. Unsupported picture sharing downloads PNG with a visible
save link; cancellation is silent, and other errors expose a save fallback. Invalid inputs disable sharing;
an active share request is guarded against duplicates, and a picture being prepared disables only that choice.

There is no separate recipe catalogue, appearance chooser, about section, or duplicate page
copy action. The calculator intentionally
starts at the default preset on reload; saved preferences can be considered after review.

### section
```html
<section>
  <h2 class="heading">section name</h2>
  <ul class="links">…</ul>
</section>
```

On the homepage, creative work is divided semantically into two separate sections: `projects`
contains louppe, webdesign trials, and the coffee calculator; `publications` contains the authored,
edited, or filmed pieces. Do not merge these headings into one list.

### stacked sections in one column
Two short sections sharing a single grid cell (e.g. contact above social).
Wrap them in `.stack`; it stacks with the standard `--gap-row` (44px) between them.

```html
<div class="stack">
  <section>…</section>
  <section>…</section>
</div>
```

### footer
Solid `--rule` top border and a three-column mono grid: an `upd YYYY-MM-DD` link to the
site repository at left, the document utilities centered, and an optional affiliation or return
link at right. The trials catalogue uses `alex-markin.com` to return home. Update the date when
you ship a change. Footer links
inherit the muted footer color and turn white on hover. The privacy button sits beside
`copy as markdown`; `privacy.js` groups the controls in the center. Once analytics is enabled,
the privacy pop-up offers `turn off analytics` in place of `no thanks`. The copy control uses a
thin `--border` outline with no fill; the outline, pointer cursor, and color-only hover make it
legible as clickable without drawing focus. On mobile it reads `copy`, then switches to a copy
glyph only when the measured footer cannot fit all three groups on one line; a narrow viewport
uses a deliberate second row rather than allowing text to collide. It builds its
output from the live semantic HTML at click time; do not add or maintain a separate Markdown copy
of the page.

### images
Source photographs are black-and-white. On generative homepage images, wrap the `<img>` in
`.appearance-image`; add `.appearance-image--portrait` to the identity portrait. The wrapper
owns the standard 1px `--border`, 2px radius, and crop, while the image stays semantically real
and source-resolution independent. The portrait remains a 148px square (116px mobile).
Non-generative pages retain the standard slight `grayscale(0.25)` image treatment.

Keep `photo.jpg` as the full-resolution source and metadata image. Visible portraits use
`photo-720.webp`: 720 × 1080, WebP quality 90, 62,000 bytes. Preserve the complete source
composition without baked-in cropping or color changes. The user prefers a 50–70 KB
portrait for detail retention; do not restore the smaller 16–27 KB variants. The existing
CSS continues to own the crop, frame dimensions, and every appearance treatment. Regenerate
and version the derivative when the source changes.

## web-1.0 flavor — the boundaries

Allowed (subtle, typographic): dotted leaders, mono tags and timestamps,
"upd" footer, optional visitor-counter chip
(`<span class="counter-chip">004821</span>`).

**"How long ago" timestamp (`.ago`)** — a mono `--faint` span placed inside a
`.row` between the link and the `.leader`. `site.js` formats its authored
`data-fallback-updated="<ISO timestamp>"` without contacting another service.
Refresh that timestamp when the site is shipped.
Minute values use the compact `min` abbreviation for both singular and plural (e.g.
`upd 1 min ago`, `upd 3 min ago`), never `minute` or `minutes`. Live update statuses use
the compact `upd` prefix, never `updated`; the footer uses `upd YYYY-MM-DD`.
The span starts empty and `.ago:empty` hides it, so a failed or slow fetch leaves no gap.

**Live local clock (`.clock`)** — an empty span at the end of the header `.meta` line,
filled by the same inline script in compact 12-hour form (for example ` · 1:13pm`) in
`Europe/Copenhagen` time (copenhagen
and berlin share a timezone) and re-ticked every 30s. Inherits the meta line's mono olive;
add no color. Empty (and invisible) if `Intl` is unavailable.

The `.flickr-latest` section chooses a random locally hosted photograph from `flickr-photos.json`
on each homepage load, independently of the appearance seed. The image, caption, alt text,
dimensions, and both Flickr links update together after the chosen image loads. The authored
`flickr-photo.jpg` remains a fallback when JavaScript or loading fails. Refresh the album snapshot
with `python3 scripts/sync-flickr-photos.py` after changing the album, then commit and push it.
Visitors make no requests to Flickr. The displayed image follows the standard content-photo
border, radius, and grayscale treatment.
Not allowed: bevels, marquees, animated gifs, table layouts, coloured link-visited states,
under-construction banners. The nostalgia is a seasoning, not the dish.

## seeded appearances

The homepage separates content from presentation. `appearance.js` composes an edition before CSS
paints, and `appearances.css` renders it. Do not duplicate, reorder, or rewrite content for an appearance.
The homepage includes the complete appearance controls and visual layers. The active look and seed
live in `sessionStorage`, so reloads and returning from other pages restore the edition. Query
parameters override the stored session edition. The coffee calculator loads neither appearance
asset and does not read or change that session state.

Seven appearances have equal default probability.

### fixed typographic identities

| appearance | body | name / headings / annotations |
|---|---|---|
| simple | Source Serif 4, 400 | IBM Plex Mono: name 600, headings 500, annotations 400 |
| paper | Newsreader, 400 | Newsreader: name/headings 600, annotations 400 |
| blob | Jost Book, 400 | Jost Medium: name/headings 500, annotations 400 |
| eno | Montserrat, 400 | Montserrat: name/headings 600, annotations 400 |
| 70mm | Georgia, 400 | Courier Prime: name/headings 700, annotations 400 |
| crt | VT323, 400 | VT323, 400 (no synthetic bold) |
| terminal | Departure Mono, 400 | Departure Mono: name/headings/annotations 400 (no synthetic bold) |

The homepage and coffee calculator use local `fonts.css` definitions, retaining font licenses
in `fonts/`. Unicode ranges and browser font matching load only the active families and
weights. No Google Fonts request or speculative loading of unused looks is needed.
Georgia uses the system font; other scripts outside the provided Latin/Latin Extended
subsets use system fallbacks. Non-generative pages retain their original typography.
The composer consumes the former font-choice random draws without applying them, preserving
all non-typographic values of historical seeds. Fixed reading line heights are simple/blob/CRT
1.55, paper 1.62, Eno/70mm 1.64, terminal 1.6. Paper always uses roman headings.


Every generated edition also chooses one coherent **rule grammar**. It applies to every link
leader, the appearance-control divider, and the footer divider together: a fine solid, dotted,
or short dashed line where that medium permits it. The randomize-appearance and copy controls
use a matching outline treatment. This is edition-level typography, never independent per-row
decoration: content order, line lengths, click targets, and divider placement remain fixed. Film
keeps its perforation/gate boundaries instead of generic rules; CRT chooses either one-pixel scan
rules or a coarser two-pixel block signal; terminal pairs its existing prompt with a solid, dotted,
or dashed command-line grammar and matching square utilities.

Only `paper` uses serif display or section headings, and it alone may use serif for body,
display, and annotation together. Every other appearance keeps headers sans or mono; a serif
body may still pair with that non-serif header voice.

- `smpl` (`simple` internally) — the original Source Serif + IBM Plex Mono layout, with seeded olive, slate blue,
  muted terracotta, dusty violet, or aged brass palettes and bounded changes to width,
  and spacing.
- `paper` — an all-Newsreader editorial edition on ivory, cream, or newsprint stock, with
  bounded ink temperature and solid, dotted, or dashed print rules. Its generated
  `feTurbulence` grain is always a top layer over the complete edition. A second, much lighter
  seeded SVG stock texture is chosen independently from three families: directional `laid`
  fibres, smooth `vellum` pulp, or softly lit `watercolour` tooth. An explicit layer follows the
  full rendered document height, so it scrolls with the sheet while printing consistently over
  text and photographs; it never tracks the viewport. The stock field is remapped toward
  paper-white before a `multiply` pass, keeping the sheet bright while selective fibres remain
  legible. Texture opacity stays within `0.10–0.23`; laid stock uses the quietest range, while
  vellum receives larger pulp variation and watercolour the strongest shallow relief.
- `blob` (`blobs` internally) — Jost Book reading text over 3–5 diffuse color fields.
  Jost Medium supplies the name and headings, while annotations remain Book. Its accent is
  independently chosen from readable violet, blue, mint, coral, rose, gold, or sage families.
  Every blob
  independently varies in hue, saturation, lightness, opacity, size, blur, and autonomous
  drift path. As on `louppe.eu`, autonomous drift runs on a cached inner surface, while a
  lightweight outer track compensates page scroll so each blob travels at its seeded `0.45–0.85`
  scroll-speed multiplier. Keeping those compositor layers separate prevents large blurred
  fields from being re-rasterized on mobile scroll. Mobile editions reveal one or two additional seeded fields from a
  seven-field pool to cover their longer document. A separate atmospheric grain layer prints over all content. Both
  motions become static under `prefers-reduced-motion`. Text and image links bloom on hover/focus
  using only the selected edition accent; near strength, far strength, and radius are tightly seeded.
- `eno` — the complete responsive document is one luminous lightbox rather than a collection of
  decorative objects. Its only shape is a concentric core-and-halo bullseye — a small solid
  core circle inside a larger soft-edged halo ring, both centered near the middle of the frame
  over a flat wash background — echoing the Brian Eno & Beatie Wolfe "Liminal/Luminal/Lateral"
  cover art, though never limited to that trio's exact colors: no bands, quarters, windows, or
  scattered shapes. One light or dark contrast family; each edition seeds its own saturation
  ceiling within `40–70%` and draws every color's saturation from a `20`-point window below
  that ceiling, so some editions run muted throughout and others stay vivid up to the cap; the
  curated schemes are turquoise/pink/crimson, amber/orange/red, green/lime/cyan, or
  blue/violet/magenta. The core-to-halo and halo-to-background transitions are each a separate,
  independently seeded soft edge (tighter than the composition's first pass, so the bullseye
  reads less diffuse), and three related core/halo/background color states crossfade over
  `180–480s`, each of the three colors independently seeded within `±24°` hue travel per state
  rather than all three moving together. A continuous, independent `hue-rotate` drift sweeps the
  whole composition through a full turn every `120–300s`, so the palette keeps sliding rather
  than settling on the three seeded states — closer to the never-quite-repeating drift of an
  actual Brian Eno light work. Montserrat supplies the geometric
  album-art voice: the display name and headings render uppercase through CSS with wide
  tracking, while authored content remains lowercase. Text colors remain fixed inside the
  selected contrast family. The absolute lightbox recalculates to the body's full height at
  every mobile, tablet, and desktop layout, so scrolling travels through one continuous artwork
  instead of keeping a viewport-sized pattern fixed behind the content. The root repeats the
  first state only as an elastic-overscroll fallback. Controls remain transparent so the
  lightbox itself is their fill. A fine topmost diffuser grain remains visible at a restrained
  `0.035–0.060` opacity. Reduced motion shows the first seeded state with no hue drift.
- `70mm` — one exposed projected-film frame held between full-width black film-stock header and
  footer regions. The appearance selector and seed/status sit in the upper stock; footer utilities
  sit in the lower stock; both stocks also carry small seeded, decorative, `aria-hidden` edge print
  (a frame counter, a keykode-style line) that may render uppercase even though authored content
  stays lowercase. Full-width perforation strips divide stock from frame: holes are a dim, seeded
  warm or neutral fill rather than black, with a soft edge halo allowed to spill past the strip.
  Each aperture is one flat rounded rectangle with four equal corners and no bright top-edge lip
  (the approved clean-punched treatment). Its subdued fill blends the stock hue toward silver
  before dimming to 30–38%; the existing gate fade and halo keep the stock-to-frame join soft.
  Stock, perforation, and the unexposed frame base are three progressively lighter blacks, so the
  punched edge and the image area both read against a genuinely darker rebate rather than three
  indistinguishable blacks. The frame fades to dead black at its own top and bottom edge before
  meeting the stock through a soft, non-linear falloff into a black rebate, with no visible
  horizontal seam. The topmost grain has its own intersected alpha masks matching the vertical
  and horizontal gate falloff, so texture fades smoothly on all four edges and corners. Mask
  only the decorative grain; keep semantic content and photographs unmasked. The exposed frame alone holds the
  generated palette, image development, vignette, and high-resolution grain, plus independent,
  mostly-absent analog damage systems: three blurred radial light fields anchored to the frame
  edge; zero to two elongated linear streaks, the directional counterpart to the radial leaks;
  zero to two soft, irregular development stains, multiplied against the frame rather than
  glowing; sparse surface dust (a seeded SVG tile, mixing dark flecks and a few bright ones); and
  zero to three faint hairline scratches. Each system rolls its own count and parameters per seed,
  so most editions show a little wear, a few show none, and a few show a lot. It grows with its
  semantic content; no image layer, grain, or light leak may enter the stock regions or overscroll.
  Every seed independently chooses one restrained tungsten, warm-print, or silver palette.
  Typography stays fixed: Georgia for reading and Courier Prime for names, headings, and
  annotations. The upper-stock rebate between the appearance controls and the perforation strip
  varies from `8–18px`, keeping the film compact while avoiding a mechanically fixed join. Page
  width, spacing, grain, vignette, bloom, red halation radius,
  gate falloff distance, perforation pitch, hole geometry, edge halo, leak/streak/stain placement
  and count, scratch count and placement, dust density, and image development vary inside bounded
  brackets. Bright display elements receive a quiet white bloom; link hover/focus and utility-button
  hover/focus use a brighter white core with a restrained red Cinestill-like halation fringe. Stock
  controls carry that halation only while hovered or focused; at rest — including a selected
  appearance option — they stay the same plain amber-accent voice as every other look, since
  unexposed stock only answers where light is actually landing.
- `crt` — VT323 bitmap type throughout, using a hardware-aligned signal treatment based on
  `/trials/scanline/`: one-device-pixel horizontal beam gaps and vertical RGB phosphor cells
  (a minority of editions double the cell for a coarser, cheaper-monitor read across scanlines
  and grille alike), a visible rolling refresh band, restrained seeded per-phosphor
  convergence/bloom and signal noise, tube vignette, and a square-cell pixel pointer filled with
  the edition's bright phosphor rather than a fixed color. The glass glare streak, the vignette's
  tube aspect, and the refresh band's height are all independently seeded per edition. The refresh
  band always rolls top to bottom. The seed chooses one of nine phosphor
  families — green, amber, blue, violet, rose, cyan-phosphor, cool monochrome, hot magenta, or
  acid lime — anchored at fixed hues but expanded per edition with roughly ±12–14° hue jitter and
  independently seeded saturation/lightness per token role, so no two editions of the same family
  render identically. All families retain tested text contrast (body ink ≥ 11:1, accent ≥ 6.5:1
  against the background); the hot magenta and acid lime families intentionally run a higher
  saturation ceiling than the original seven for a punchier, more web-1.0-leaning character. The
  red/blue phosphor fringe and the RGB grille triad stripes are also seeded per edition, with
  small hue/saturation/lightness jitter around true red, green, and blue so the signal still
  reads unambiguously as an RGB phosphor mask. Each edition rotates the RGB-cell phase and moves
  only the red/blue phosphor fringes by one physical cell, with a minority of editions extending
  to two; layout and source glyphs never move.
  Native text selection uses the RGB inverse of the selected accent. Each edition chooses either one-pixel
  scan rules or a coarser two-pixel block signal for its leaders and dividers; the latter adds a
  restrained inset phosphor frame to the two utility controls. The page is never passed through a whole-page filter:
  glyphs are pixel-shaped at the source, the portrait is rendered at half resolution with
  nearest-neighbour expansion, and the screen grid sits directly on device-pixel boundaries.
  Text links invert into a clear phosphor selection block on hover/focus, and their unchanged
  text-presentation `↗︎` / `→` markers render at body scale. Footer selection blocks remain
  content-width instead of stretching across their grid cells; the `appearance ↻` and `copy as
  markdown` utilities receive bounded phosphor glow. A fixed seed-colored signal layer covers
  elastic overscroll outside the document; reduced motion removes the rolling band. Never add
  flicker or text displacement.
- `>...` (`terminal` internally) — Departure Mono supplies a fixed early-computing identity.
  Name, headings, reading text, and annotations use its regular face without synthetic bold.
  The shared responsive scale and x-height adjustment keep it optically aligned with the
  other appearances. Quiet prompt prefixes, solid/dotted/dashed
  leaders, restrained green/blue/amber palettes, slight grain, and compact column spacing vary independently. Text
  links invert against the selected terminal accent on hover/focus, using a content-width
  selection block without CRT glow. Its prompt also annotates the desktop edition status, while
  matching square utility controls echo the selected divider treatment.

Grain must use the procedural system shared with `/trials/background/` and `louppe.eu`: a
seeded SVG `feTurbulence` tile, never a repeating dot or halftone gradient. The shared reference
is a 512px seamless sRGB `fractalNoise` tile at `0.65` base frequency and four octaves, processed
near `contrast(2.4) brightness(0.72)` and shifted in discrete steps around every `840ms`.
Every tile is at least 512 CSS pixels, uses four or five octaves, and is internally rasterized at
four times that resolution without changing its apparent noise size. Noise is converted to
monochrome before blending to prevent colored raster artifacts; lower-resolution grain is not
allowed. Each grain-bearing edition independently randomizes tile size, noise frequency, octave
count, contrast, brightness, strength, and stepped shift rate inside tight brackets around that
reference. Paper uses a slightly lower `0.50–0.62` frequency range for larger physical grain and blends the
grain over the complete page with `multiply`; blobs use a topmost `screen` surface;
Eno uses a very light, slightly finer topmost diffuser grain; 70mm uses a visible projected-film
surface; terminal and CRT keep their lighter surface treatment.
Reduced motion freezes the tile.

The shared random brackets are: `512–560px` tile, `0.60–0.72` frequency, four or five
octaves, `2.20–2.60` contrast, `0.68–0.78` brightness, and `720–960ms` step rate. Paper
may extend to `576px`; 70mm's tile stays `512–580px` — its grain layer is edge-to-edge on
mobile with no page gutter, so the tile must stay reliably narrower than a small phone
viewport or the background tiles incorrectly on WebKit — but 70mm uses a wider `0.46–0.78`
frequency for visibly coarser-or-finer grain between editions. Eno uses `0.65–0.76`, CRT
uses `0.62–0.76`, and terminal uses `0.58–0.72`. Opacity stays appearance-specific:
paper `0.10–0.17`, blob `0.08–0.14`, Eno `0.035–0.060`, 70mm `0.10–0.16`, CRT `0.026–0.042`, and
terminal `0.030–0.055`.

All random values are derived from one edition seed. `?seed=<value>` reproduces an edition;
`?look=<name>&seed=<value>` pins both its appearance and values. Both the displayed aliases
(`smpl`, `blob`, `70mm`, `>...`) and the existing internal names remain accepted so old links keep working.
The first unparameterized generative page loaded in a tab creates a new edition; subsequent
homepage loads in that tab restore it. The homepage utility row switches immediately, saves the new edition for the
current tab, and removes pinned parameters. Shuffle generates another look and seed without
reloading. Desktop always retains the original direct-choice row, wrapping its choices when needed.

On phones only (640px and below),
show two controls: `appearance: <full style name>` with a CSS chevron, and `shuffle ↻`.
Both use the shared utility size (`--fs-footer`, 0.65625rem / 10.5px at the default phone setting),
regular weight, and centered label/icon groups. The chevron and shuffle icon never grow
independently of the text. Padding supplies a minimum 32px target; height stays automatic.
The controls share a row when space permits and stack at enlarged text sizes. They never
shrink type to make it fit. Labels wrap and remain centered in their buttons.

The appearance toggle opens an in-flow responsive grid of all seven full names, usually
three columns on larger phones, two on narrower phones, and one with enlarged text. Each
choice uses the same utility size, a minimum 32px hit area, a centered label/selection-indicator group,
and `aria-pressed`. Selecting a style closes the list and returns focus to the toggle;
Escape does the same. Shuffle remains available while the list is open. The grid grows
with its content and the page scrolls normally, with no fixed-height overlay. The toggle
exposes `aria-expanded` / `aria-controls`; collapsed items are hidden from focus and
accessibility traversal. Status/seed text is hidden in the compact layout, and the toggle
always names the active style. Re-evaluate the phone breakpoint on viewport resize.
Never switch desktop to the expandable chooser based on content width or font size. Footer copy keeps its own original compact dimensions.

Readability is not random: semantic order, links, click areas, responsive behaviour, accessible
contrast, and the minimum type sizes stay fixed. Decorative noise never receives pointer events.
Every text link on the generative homepage changes tone or color on hover/focus; do not add
underlines or baseline effects because the layout already uses leader lines and rules. Image links
answer with an accent border. CRT uses a phosphor selection block, Terminal uses a clean selection
inversion, Blob adds its documented seed-colored bloom, and 70mm uses red halation.
The blob layer never contains content. The homepage column count follows the fixed responsive
rule above; seeded widths and gaps may change the available measure, so long rows may wrap instead
of clipping. The display name uses the shared responsive size as its ceiling and scales against
its actual identity text container; if container units are unavailable, it wraps safely instead.
The homepage uses `viewport-fit=cover`: visual layers
paint through mobile safe areas, while page padding incorporates every safe-area inset so content
remains clear of device controls. The root and `theme-color` remain pure black as a browser-owned
outer frame; Safari may tint its translucent URL controls from this color, but the page cannot
style those controls directly. Keep stronger texture reduced on small screens and honor the
visitor's motion preference.

Image geometry is invariant across appearances: retain the standard border, radius, crop, and
dimensions from `styles.css`. Color development is appearance-aware and operates non-destructively
on the black-and-white source. The wrapper is transparent and must not isolate blending or
reconstruct a miniature appearance inside the frame. Paper uses `multiply` against the actual
stock beneath it, replacing photographic whites with paper while the page grain prints across
the image. Blob, Eno, and 70mm use `luminosity` against the real pixels physically behind the image, so
color appears only where the live page artwork is present at that position. Simple applies only
the baseline black-and-white conversion: no contrast, opacity, tint, or blend treatment. CRT and
terminal retain bounded monochrome development, with the CRT page mask above the result. The
homepage portrait alone uses a `120%` absolutely positioned inner image inside its clipped,
unchanged frame for a closer face crop; do not use a transformed image layer. Do not
use per-file color edits or change image-frame geometry for a look.

## pages

- `/` → `index.html` — the generative identity page. It loads the shared appearance composer,
  visual layers, and manual control.
- `/cv` → `cv.html` — the working cv. GitHub Pages resolves the extensionless `/cv` to
  `cv.html` on its own; no redirect or folder is needed. Reachable from the homepage
  `contact` list via the `cv` tag.
- `/coffee` → `coffee.html` — the fixed-design coffee calculator, with its own `coffee.css`
  and `coffee.js`. Presets supply editable quantities and a live method, with text/PNG sharing.
- `/louppe/` → `louppe/index.html` — legacy redirect to the standalone louppe site at
  `https://louppe.eu/`. The homepage project entry links directly to the new domain.
- `/trials/` → `trials/index.html` — a standalone, one-column catalogue of interactive
  webdesign experiments. It omits the portrait and personal identity block so the trials
  remain the page's only subject. It uses the narrow page shell, one muted explanatory line,
  standard publication rows, and an `alex-markin.com` footer link back to the homepage.
- `/trials/<name>/` → an immersive experiment. These pages use the scoped
  `trials/_shared/` layer described below.

## immersive experiment pages

Experiments are artwork presented by the site, not alternate site shells. Their chrome
uses the site's black, warm-grey, olive, Source Serif, and IBM Plex Mono tokens, while the
rendered effect may introduce whatever colors, gradients, or motion its concept requires.

To protect the experiment and the rest of the site from each other:

- Load only `trials/_shared/trial.css` and `trial-ui.js`; never load them on `/`, `/cv`,
  or `/trials/`, and never load the main `styles.css` inside an immersive experiment.
- Keep experiment-specific CSS and rendering JavaScript in that experiment's page.
- Build panel ranges, color pickers, text fields, and toggles through `TrialUI` so labels,
  reset syncing, keyboard focus, and disabled states remain consistent across experiments.
- Use the minimal `← trials` link back to the collection. The standard identity header
  and footer are intentionally omitted on these full-screen or effect-led pages.
- Use the main favicon, local fonts, `privacy.js`, canonical metadata, and lowercase voice.
- Keep experimental colors inside the effect. Site chrome and controls stay within the
  main palette.

### photo desk (`/trials/photo-desk/`)

A shared tabletop experiment uses the immersive trial shell, with a compact header,
the desk as the main artwork, and object controls below it. Site chrome keeps the
standard palette and type; paper stock, shadows, the coffee cup, and the switchable
lamp belong only to the tabletop artwork. Drawn SVG placeholders are original assets.

Object positions are proportional to their available travel inside the desk. The
rotated/scaled footprint remains reachable on mobile; a picker makes every object
accessible even when covered. Pointer dragging, keyboard arrows, rotation, resizing,
flipping, layering, and reset operate on the same shared state. Selection is local.
Resetting the complete desk uses a dialog explaining that it affects everyone.

The locally served MIT playhtml 2.15.0 distribution supplies persistence and live
cursors through its public service. Its automatic stylesheet link is pinned locally,
as documented beside the vendor files. Keep connection state and public-data details
visible on the experiment; no visitor text or uploaded images are accepted here.

## shared behaviour (`site.js`)

Standard page behaviour lives in `site.js`: the authored `.ago` timestamps,
the header clock, random album photograph, and `copy as markdown`. Each block no-ops when its elements
are absent. Do not re-inline this script into a page; add to `site.js` instead,
and bump its `?v=` when it changes. `privacy.js` handles analytics consent on every
page, including immersive experiments.

`copy as markdown` walks the live semantic HTML, so a new page is handled automatically
provided it uses the documented patterns. It reads a row's right-hand annotation from
either `.tag` or `.dates`, renders `.notes` as nested bullets, and picks up a
`section > .tagline`, `section > .meta`, or `section > .desc` as prose. A product
section may use `.name` instead of `.heading` for its display-sized subject; the copier
recognizes either.

Immersive experiments are the exception: their shared panel construction lives in
`trials/_shared/trial-ui.js`, which is never loaded by standard site pages.

Generative-page appearance behaviour is a second deliberate exception: it lives in
`appearance.js` because it must run synchronously in the document head before CSS paints. Do not
merge it into the deferred shared behaviour in `site.js`.

## adding a new page

1. Copy `cv.html`'s standard `<head>` (fonts + `styles.css` + `privacy.css`) and `.page`
   shell, and load `site.js` and `privacy.js` at the end of `<body>`.
2. Reuse `.columns` / `.heading` / `.row` patterns, and `.intro` only for identity pages —
   do not write new CSS unless a pattern is genuinely missing.
3. If a new pattern is needed: build it from tokens only, add it to `styles.css` under a
   commented section, and document it in this file.
4. Use the shared footer format, except the calculator, which has no footer.

## search metadata and links

Keep each public page's title and description specific to its actual content; use the
same wording in its Open Graph, Twitter, and page-level structured data. Visible headings
and prose keep their own concise voice. The homepage Person description retains the full bio.
The homepage identifies the WebSite and author shared by the calculator and trials;
`sameAs` contains Alex's own profiles, while `sibling` identifies the linked family members.

`sitemap.xml` lists only canonical, indexable pages. Update the affected entry's `lastmod`
and any page `dateModified` after significant content, link, or metadata changes.
The CV remains deliberately `noindex`; privacy and legacy Louppe redirects stay out of the sitemap.
Regular editorial links remain followed, with `noopener` on new-tab links. Prefer direct
destination URLs over short-link redirects, and retain descriptive surrounding text.

## cache-busting

`index.html` links the stylesheet as `styles.css?v=YYYYMMDD` (append `-N` for additional
changes shipped on the same day). GitHub Pages serves
`styles.css` with `Cache-Control: max-age=600`, so without the query a returning visitor
can load new HTML against a stale cached stylesheet. **Bump the `?v=` date whenever you
edit `styles.css`** (keep it in sync with the footer's `upd` date).

Apply the same dated `?v=` convention to `trials/_shared/trial.css` and `trial-ui.js` on
every immersive experiment page whenever either shared trial asset changes.

The homepage additionally versions `appearance.js` and `appearances.css`. Bump each asset’s
dated query there whenever it changes. The coffee calculator separately versions `coffee.css`
and `coffee.js`; neither calculator asset is loaded by any other page.
The profile photograph uses the same dated query in the visible HTML and structured data; bump
both occurrences together whenever `photo.jpg` is replaced. Social cards use the independent
`social-preview.png` asset so its crop and typography can remain stable when the live portrait
changes. That preview places `#arts #photography #specialty-coffee` in white serif type across the
top of the photograph. Version its Open Graph and X metadata URL independently whenever it changes.

## don'ts

- On non-generative pages, no new fonts, hues, or font sizes outside the base scale.
- No borders/underlines on links (hover is a color change only).
- No rounded corners beyond `--radius: 2px`, shadows, gradients, or uppercase on non-generative
  pages. The bounded `blobs`, `70mm`, and `crt` appearances are documented exceptions.
- Authored content remains lowercase everywhere; CRT and Eno may render the name and headings
  uppercase with CSS only.
- Don't restyle with inline `style=""` attributes — extend `styles.css` via tokens.
- Experimental gradients, colors, and motion are allowed inside immersive trial effects and the
  documented generative homepage appearances only.
