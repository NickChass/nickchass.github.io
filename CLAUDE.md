# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A static personal portfolio site for Nicholai Chasseau (behavioral and social-science researcher). No build system, no dependencies, no JavaScript frameworks, just HTML files with inline CSS. Deployed via GitHub Pages at https://nickchass.github.io.

## Development

Open any `.html` file directly in a browser. No build step, no `npm install`, no server required.

## Architecture

All styling is **inlined per-file** inside `<style>` blocks. There is no shared stylesheet. Each file is fully self-contained. When updating visual styles (colors, typography, spacing), changes must be made in every file that needs them.

**Design token conventions** (defined in `:root` in every file):
- `--accent: #0D6B5E` is the teal green used for interactive elements
- `--bg: #F7F7F5` is the off-white page background
- `--surface: #FFFFFF` is the card and section background
- `--mono: 'DM Mono'` is used for eyebrows, labels, and numbers
- `--sans: 'Inter'` is body and UI text

**Case study color variants**: each case study card has a variant class (`v2`, `v3`, `v4`) with its own accent color applied to `.cs-card-visual`, `.cs-num`, and `.cs-bar`. Case study pages use `--accent: #0D6B5E` uniformly regardless of their card color.

## File map

- `index.html` is the homepage: hero, skills strip, featured product band, case study cards grid, about section, contact band
- `case-studies/fear-of-crime.html` is Case study 01 (thesis; secondary analysis of an archival dataset, n=538, SPSS mediation)
- `case-studies/alertt.html` is Case study 02 (discovery research, n=83, Trinidad)
- `alertt/` is the working app that combines case studies 02 and 03 (see below)

## The `alertt/` app

The one part of the site that is an application rather than a document. It merges
the AlerTT discovery research (case study 02) with the crime-data pipeline (case
study 03) into four tabs: Feed, Map, Report, Context.

**The two-layer split is the product idea and the styling enforces it.** Red
(`--live`, `#CC1F1F`, from the Expo app's `src/theme.js`) is the community layer:
live, unverified reports. Teal (`--official`, `#0D9488`) is the official layer:
published CSO statistics. Nothing crowdsourced is ever shown as verified, and
nothing official is ever adjusted or estimated. Keep that separation in any edit.

**This page is the one exception to the site's no-dependencies rule.** The Map tab
loads Leaflet 1.9.4 and CARTO Voyager raster tiles from a CDN (SRI-pinned; if you
bump the version you must recompute the `integrity` hashes or the tags silently
fail to load). If Leaflet is unavailable, `renderMap()` falls back to
`renderSvgMap()`, the self-contained SVG renderer, which draws the same data from
the Natural Earth coastline in `data.js`. Test that path by removing the Leaflet
`<script>`. Do not assume it works.

Note that `hidden` is an `HTMLElement` property: `svgEl.hidden = false` sets a stray
JS property and leaves the attribute in place. Use the `showEl()` helper, which
toggles the attribute, for anything involving `#map-svg`.

Unlike the rest of the site this page is three files, not one: CSS stays inline in
`index.html`, but `app.js` holds the logic and `data.js` is **generated. Do not
hand-edit it.** It is produced from `db/alertt.sqlite` in the `alertt-data` repo,
and carries the murder series, per-division figures, and a Natural Earth coastline.
Regenerate it by re-running the export against that database if the pipeline gains
a year of data.

Community alerts are a seeded demonstration set in `app.js` (`SEED`). Reports filed
through the Report tab go to `localStorage` only and always enter with
`status: 'pending'`.

**The invented alerts are disclosed in three places and all three must stay.** The
red `#demo-banner` ("Every alert in this app is invented"), a `sample` tag on every
seeded card, and the word "sample" in the feed count. The banner is hidden on the
Context tab only, because that tab contains no invented content. The one line that
must never be softened alongside them is the teal "The crime statistics are real".
the disclosure has to make the alerts unmistakably fake without casting doubt on the
CSO figures.

Chart colours were validated for colourblind separation (deutan ΔE 13.6). Re-run
that check before changing them. Axis ticks come from `niceScale()`; don't
hand-place them.

## Case study page structure

Each case study page follows the same HTML structure:
1. Fixed nav with back arrow to `../index.html`
2. `.cs-header` holds title, subtitle, metadata row, tags, action buttons
3. `.cs-body` holds numbered sections using `.section-marker` + `.section-heading` + `.body-text`
4. Supporting components: `.callout` (highlighted quotes/findings), `.insight-grid`, `.stat-row`, `.next-steps`
5. Contact band and footer (same markup as `index.html`)

When adding a new case study: add the card to `index.html` with the next variant class, create the detail page using an existing case study as the template.
