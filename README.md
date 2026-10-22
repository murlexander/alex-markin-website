# alex-markin.com

Personal site for alex markin. Static HTML + CSS, no build step, no framework.

## Files
- `index.html` — page content and structure
- `coffee.html`, `coffee.css`, `coffee.js` — the fixed-design coffee calculator; presets, adjustable quantities, live instructions, and text copying and native picture sharing
- `louppe/` — legacy redirect to the standalone site at `louppe.eu`
- `trials/` — the site-native trials index and immersive webdesign experiments
- `styles.css` — all styling; everything derives from the tokens at the top
- `site.js` — shared page behavior, including public GitHub activity labels; dates are fetched from GitHub and cached in the tab for 15 minutes, with no fixed fallback or embedded token
- `privacy.css`, `privacy.js` — compact privacy pop-up and opt-in analytics on every page
- `privacy.html` — redirects old links to the pop-up
- `flickr-photo.jpg` — homepage photo fallback for unavailable JavaScript or image loads
- `flickr-photos.json`, `flickr-photos/` — locally hosted album snapshot; one photo is chosen randomly on each homepage load
- `scripts/sync-flickr-photos.py` — fetch every page of the public Flickr album; `.github/workflows/sync-flickr-photos.yml` refreshes and publishes the snapshot every three days (06:37 UTC, subject to GitHub scheduling delays), with a manual **Run workflow** option
- `robots.txt` — crawler permissions and sitemap discovery
- `sitemap.xml` — canonical, indexable pages submitted to search engines
- `llms.txt` — concise identity and work index for answer engines
- `2c7267903a2bdde7663e587ea92e8d3f.txt` — IndexNow ownership key
- `DESIGN-SYSTEM.md` — the design source of truth: color/type tokens, layout, and the
  reusable patterns. Read this before any UI change.
- `CLAUDE.md` — instructs any editor (human or LLM) to read `DESIGN-SYSTEM.md` first.
- `photo.jpg` — black-and-white portrait source; square-framed with a 20% closer inner crop
  and blended with the real appearance backdrop beneath it (148px desktop, 116px mobile)
- `photo-720.webp` — 62 KB, quality-90 portrait used on the homepage and CV;
  preserves the source aspect ratio and lets CSS own the crop and color
- `fonts.css`, `fonts/` — local font definitions, files, and licenses used throughout the site
- `favicon.svg`, `apple-touch-icon.png` — tab/home-screen icons
- `CNAME` — custom domain config for GitHub Pages (contains `alex-markin.com`)

## Design
The original appearance is dark, serif, and quiet, with subtle web-1.0 details:
**Source Serif 4** for reading text and **IBM Plex Mono** for the "machine voice"
(name, section headings, tags, footer). The seven generative styles each have their own
fixed type identity, documented in `DESIGN-SYSTEM.md`, and load fonts locally on demand.

All the specifics — color tokens, type scale, layout grid, and the signature link-row
pattern (title, dotted leader, mono tag) — live in `DESIGN-SYSTEM.md`. Don't add new
fonts, hues, or font sizes outside that spec, and extend `styles.css` via its tokens
rather than hard-coding values or using inline styles.

The homepage uses fixed fonts per style and the seeded appearance system: composer, visual
layers, controls, and status. The active look and seed are held for the current browsing session.
The coffee calculator uses fixed dark styling and separate CSS/JS; returning home restores
the homepage edition. Text copies directly to the clipboard. PNG sharing uses the native share menu when available,
with file downloads as a fallback. It remains static and has no build step.
Phones use an expandable appearance grid and shuffle control at the shared utility-text size.
Controls wrap and grow with larger text settings; desktop always keeps the original direct-choice row.

The trials index uses the main site system. Individual experiments use the scoped
`trials/_shared/trial.css` and `trial-ui.js` layer so their full-screen rendering and
controls cannot affect the homepage or CV. The site remains build-free.

`/trials/photo-desk/` is a public collaborative tabletop with original SVG placeholder
prints, a contact sheet, a note, coffee, and a lamp. The vendored MIT playhtml 2.15.0
client connects to `api.playhtml.fun` for persisted object state and temporary cursors.
Selection stays local; positions, angles, sizes, layers, flips, and switches are shared.
Pointer writes are paced at 20/sec, with a final write on release. Proportional positions
and rotated footprint bounds adapt to mobile. Controls and keyboard access reach covered
objects. Reset-all asks for confirmation because it resets the arrangement for everyone.
Connection failures show a local preview; after the first sync, disconnected writes queue
in the current tab. The page describes public storage and browser visitor identity.
Vendor source, license, and the local stylesheet patch are documented alongside the bundle.

## Flickr album sync

The homepage picks uniformly from the complete locally hosted album on each load.
Every three days the workflow downloads new photos, updates titles and album membership, commits
changes, and explicitly requests a Pages build (bot commits alone do not trigger one).
Visitors only download the selected local image, never the entire album or Flickr API data.
Repeated photos are possible with independent random selection.

The daily scheduler checks a three-day UTC cadence anchored to 12 October 2026,
so it stays three days apart across month boundaries. Manual runs refresh immediately
without changing the cadence.

Images use Flickr’s 640px display size (or a smaller available preview), never the
full-resolution original. The current 22 previews are 43–215 KB each (about 1.9 MB
in total); a visitor loads one selected preview. No extra compression is applied.

The sync uses `flickr.photosets.getPhotos`, follows all API pages (500 items per page),
and verifies the total and unique IDs before publishing. It obtains Flickr’s current
short-lived public site key from the album HTML; no account login or stored secret is
required. If Flickr changes that HTML, a `FLICKR_API_KEY` environment variable can be
used for a registered API key. API, completeness, or download failures leave the previous
manifest intact and fail the workflow. Only publicly accessible photographs are included.
Removed album entries leave the selection; old local image files are retained.

For an immediate local refresh: `python3 scripts/sync-flickr-photos.py`, then commit
and push. Run sync regression checks with
`python3 -m unittest discover -s scripts -p 'test_flickr_sync.py'` and homepage checks
with `node --test scripts/test-flickr-photo.cjs`.

API and deployment references: [Flickr album API](https://www.flickr.com/services/api/flickr.photosets.getPhotos.html),
[GitHub token and Pages builds](https://docs.github.com/en/actions/concepts/security/github_token),
[request a Pages build](https://docs.github.com/en/rest/pages/pages#request-a-github-pages-build).

## Navigation prefetch

`prefetch.js` fetches internal HTML after 100 ms of hover or keyboard focus, or immediately on an unmodified primary pointer press (including touch). It uses Speculation Rules when available, then supported `rel=prefetch` hints; other browsers keep ordinary navigation. It does not render pages or execute their scripts. Each page requests at most eight unique destinations, skips external links, downloads, assets, same-page anchors, redirect routes, and query parameters other than `look` and `seed`, and respects offline state, data saver, and 2G connections. Add `data-no-prefetch` to a link or ancestor to opt out.

This gives the next document a head start; it does not fetch page images, fonts, or API data. Benefits depend on hover time, network latency, and browser caching. No measured speedup is claimed. The independently hosted sites keep the same script and behavior tests.

Run `node --test scripts/prefetch.test.mjs`. Sources: [Chrome navigation prefetch guidance](https://developer.chrome.com/docs/web-platform/prerender-pages#prefetch) and [web.dev resource prefetch guidance](https://web.dev/articles/link-prefetch).

Local verification, 8 October 2026: 18 automated tests pass. Chromium 151 confirmed hover requests and navigation cache reuse (`deliveryType: navigational-prefetch`); keyboard focus also exercised the resource-hint fallback. Louppe checks included an Arabic article. No Safari or Firefox browser run was performed.

## Memory and resource lifetimes

Homepage textures use edition-owned SVG object URLs with unchanged source bytes and
raster resolution. Appearance changes revoke the previous edition's URLs; `pagehide`
also cancels queued frames, disconnects the document observer, and releases artwork.
`pageshow` restores an edition from history synchronously. Hidden tabs pause decorative
animations without resetting their phase. Browsers without object URL support keep
the original data-URI fallback.

Grain uses a smaller filtered surface while preserving its tile position and movement.
Paper texture height follows content geometry, allowing it to shrink after layout changes.
The coffee calculator releases canvas backing stores after PNG encoding and revokes
download URLs on departure; the compressed PNG stays ready for native sharing.

Run `node --test scripts/*.cjs scripts/*.mjs` and
`python3 -m unittest discover -s scripts -p 'test_flickr_sync.py'`.
See [the 22 October verification](docs/performance/2026-10-22-memory.md) for measurements
and browser coverage limits.

## Analytics

`privacy.js` loads GA4 `G-6JZ3GQEVFL` only on HTTPS `alex-markin.com` after consent.
Local previews and other hostnames never load the tag. Consented email-link clicks
send `contact_click`, marked as a GA4 key event; email addresses are not included.

Historical data in `alex-markin-personal` also includes local previews and Louppe
traffic. Use the saved `alex-markin.com only` comparison for personal-site history,
or `louppe.eu historical traffic` for Louppe's older records. New Louppe traffic is
in the separate `Louppe Media Culler` property. Key-event configuration applies
to future events and does not rewrite history.

## Hosting
Served by **GitHub Pages** from the `main` branch of this repo. Every push to `main`
redeploys automatically — no build step, no manual deploy.

The root `.nojekyll` marker publishes the static tree verbatim. Keep it in place so
underscore-prefixed asset directories such as `trials/_shared/` are not omitted.

DNS (at Namecheap) points the apex `alex-markin.com` at GitHub Pages via four `A` records
(`185.199.108–111.153`). The site is apex-only — there is intentionally no `www` record.

## Preview locally

Check activity fetching, caching, and failure behavior with `node --test scripts/test-site-activity.cjs`.

```
python3 -m http.server 8787
# open http://localhost:8787
```
