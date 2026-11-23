# alex-markin.com

Personal site for alex markin. Static HTML and CSS, with no build step and no framework.

## Files
- `index.html`: page content and structure
- `coffee.html`, `coffee.css`, `coffee.js`: the coffee calculator with a fixed design. It has presets, adjustable quantities, live instructions, text copying and native picture sharing
- `louppe/`: legacy redirect to the standalone site at `louppe.eu`
- `trials/`: the trials index and the full-screen webdesign experiments
- `styles.css`: all styling, built from the tokens at the top
- `site.js`: shared page behavior, including public GitHub activity labels. It fetches dates from GitHub and caches them in the tab for 15 minutes, with no fixed fallback or embedded token
- `privacy.css`, `privacy.js`: compact privacy pop-up and opt-in analytics on every page
- `privacy.html`: redirects old links to the pop-up
- `flickr-photo.jpg`: homepage photo fallback for unavailable JavaScript or image loads
- `flickr-photos.json`, `flickr-photos/`: locally hosted album snapshot. Each homepage load picks one photo at random
- `scripts/sync-flickr-photos.py`: fetches every page of the public Flickr album. `.github/workflows/sync-flickr-photos.yml` refreshes and publishes the snapshot every three days at 06:37 UTC, subject to GitHub scheduling delays, and has a manual **Run workflow** option
- `robots.txt`: crawler permissions and sitemap discovery
- `sitemap.xml`: canonical, indexable pages submitted to search engines
- `llms.txt`: short identity and work index for answer engines
- `2c7267903a2bdde7663e587ea92e8d3f.txt`: IndexNow ownership key
- `DESIGN-SYSTEM.md`: the design source of truth for color and type tokens, layout, and
  reusable patterns. Read it before any UI change.
- `CLAUDE.md`: tells any editor, human or LLM, to read `DESIGN-SYSTEM.md` first.
- `photo.jpg`: black-and-white portrait source. The page shows it in a square frame with a 20%
  closer inner crop, blended with the appearance backdrop beneath it, at 148px on desktop and 116px on mobile
- `photo-720.webp`: 62 KB, quality-90 portrait used on the homepage and CV.
  It keeps the source aspect ratio, and CSS sets the crop and color
- `fonts.css`, `fonts/`: local font definitions, files, and licenses used throughout the site
- `favicon.svg`, `apple-touch-icon.png`: tab and home-screen icons
- `CNAME`: custom domain config for GitHub Pages, set to `alex-markin.com`

## Design
The original appearance is dark and serif, with small web-1.0 details.
It uses Source Serif 4 for reading text and IBM Plex Mono for the name, section headings,
tags and footer. The seven generative styles each have their own
fixed type identity, documented in `DESIGN-SYSTEM.md`, and load fonts locally on demand.

`DESIGN-SYSTEM.md` holds the color tokens, type scale, layout grid, and the link-row
pattern of title, dotted leader and mono tag. Don't add new
fonts, hues, or font sizes outside that spec, and extend `styles.css` via its tokens
rather than hard-coding values or using inline styles.

The homepage uses fixed fonts per style and the seeded appearance system, which has a composer, visual
layers, controls, and status. The browser keeps the active look and seed for the current session.
The coffee calculator uses fixed dark styling and separate CSS/JS; returning home restores
the homepage edition. The text copy goes straight to the clipboard. PNG sharing uses the native share menu when available,
with file downloads as a fallback. It remains static and has no build step.
Phones use an expandable appearance grid and shuffle control at the shared utility-text size.
Controls wrap and grow with larger text settings. Desktop keeps the original row of direct choices.

The trials index uses the main site system. Each experiment uses the scoped
`trials/_shared/trial.css` and `trial-ui.js` layer, so its full-screen rendering and
controls cannot affect the homepage or CV. The site has no build step.

`/trials/photo-desk/` is a public collaborative tabletop with original SVG placeholder
prints, a contact sheet, a note, coffee, and a lamp. The vendored MIT playhtml 2.15.0
client connects to `api.playhtml.fun` for persisted object state and temporary cursors.
Selection stays local. Positions, angles, sizes, layers, flips, and switches are shared.
Pointer writes are paced at 20/sec, with a final write on release. Proportional positions
and rotated footprint bounds adapt to mobile. Controls and keyboard access reach covered
objects. Reset-all asks for confirmation because it resets the arrangement for everyone.
A failed connection shows a local preview. After the first sync, writes made while disconnected queue
in the current tab. The page explains that storage is public and that visitor identity comes from the browser.
The vendor source, license, and local stylesheet patch are documented next to the bundle.

## Flickr album sync

The homepage picks uniformly from the complete locally hosted album on each load.
Every three days the workflow downloads new photos, updates titles and album membership, commits
changes, and requests a Pages build, because bot commits alone do not trigger one.
Visitors only download the selected local image, never the entire album or Flickr API data.
Repeated photos are possible with independent random selection.

The daily scheduler checks a three-day UTC cadence anchored to 12 October 2026,
so it stays three days apart across month boundaries. Manual runs refresh immediately
without changing the cadence.

Images use Flickr's 640px display size, or a smaller preview when that is all Flickr has, never the
full-resolution original. The current 22 previews are 43 to 215 KB each, about 1.9 MB
in total. A visitor loads one selected preview. No extra compression is applied.

The sync uses `flickr.photosets.getPhotos`, follows all API pages at 500 items per page,
and verifies the total and unique IDs before publishing. It obtains Flickr's current
short-lived public site key from the album HTML; no account login or stored secret is
required. If Flickr changes that HTML, a `FLICKR_API_KEY` environment variable can be
used for a registered API key. If the API call, completeness check or a download fails, the workflow fails and the previous
manifest stays in place. Only publicly accessible photographs are included.
Removed album entries leave the selection; old local image files are retained.

For an immediate local refresh: `python3 scripts/sync-flickr-photos.py`, then commit
and push. Run sync regression checks with
`python3 -m unittest discover -s scripts -p 'test_flickr_sync.py'` and homepage checks
with `node --test scripts/test-flickr-photo.cjs`.

API and deployment references: [Flickr album API](https://www.flickr.com/services/api/flickr.photosets.getPhotos.html),
[GitHub token and Pages builds](https://docs.github.com/en/actions/concepts/security/github_token),
[request a Pages build](https://docs.github.com/en/rest/pages/pages#request-a-github-pages-build).

## Navigation prefetch

`prefetch.js` fetches internal HTML after 100 ms of hover or keyboard focus, or immediately on an unmodified primary pointer press (including touch). It uses Speculation Rules when available, then supported `rel=prefetch` hints. Other browsers keep ordinary navigation. It does not render pages or execute their scripts. Each page requests at most eight unique destinations, skips external links, downloads, assets, same-page anchors, redirect routes, and query parameters other than `look` and `seed`, and respects offline state, data saver, and 2G connections. Add `data-no-prefetch` to a link or ancestor to opt out.

The next page's HTML starts downloading early. The script does not fetch page images, fonts, or API data. Benefits depend on hover time, network latency, and browser caching. No measured speedup is claimed. The independently hosted sites keep the same script and behavior tests.

Run `node --test scripts/prefetch.test.mjs`. Sources: [Chrome navigation prefetch guidance](https://developer.chrome.com/docs/web-platform/prerender-pages#prefetch) and [web.dev resource prefetch guidance](https://web.dev/articles/link-prefetch).

Local verification on 8 October 2026: 18 automated tests pass. Chromium 151 confirmed hover requests and navigation cache reuse (`deliveryType: navigational-prefetch`); keyboard focus also exercised the resource-hint fallback. Louppe checks included an Arabic article. No Safari or Firefox browser run was performed.

## Memory and resource lifetimes

Homepage textures use SVG object URLs owned by each edition, with unchanged source bytes and
raster resolution. Appearance changes revoke the previous edition's URLs; `pagehide`
also cancels queued frames, disconnects the document observer, and releases artwork.
`pageshow` restores an edition from history synchronously. Hidden tabs pause decorative
animations without resetting their phase. Browsers without object URL support keep
the original data-URI fallback.

Grain uses a smaller filtered area and keeps its tile position and movement.
Paper texture height follows content geometry, so it can shrink after layout changes.
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
GitHub Pages serves the site from the `main` branch of this repo. Every push to `main`
redeploys it, with no build step or manual deploy.

The root `.nojekyll` marker publishes the static tree verbatim. Keep it in place so
underscore-prefixed asset directories such as `trials/_shared/` are not omitted.

DNS (at Namecheap) points the apex `alex-markin.com` at GitHub Pages via four `A` records
(`185.199.108–111.153`). The site is apex-only, and has no `www` record on purpose.

## Preview locally

Check activity fetching, caching, and failure behavior with `node --test scripts/test-site-activity.cjs`.

```
python3 -m http.server 8787
# open http://localhost:8787
```
