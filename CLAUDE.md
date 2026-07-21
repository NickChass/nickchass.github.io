# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A static personal portfolio site for Nicholai Chasseau (behavioral and social-science researcher). No build system, no dependencies, no JavaScript frameworks — just HTML files with inline CSS. Deployed via GitHub Pages at https://nickchass.github.io.

## Development

Open any `.html` file directly in a browser. No build step, no `npm install`, no server required.

## Architecture

All styling is **inlined per-file** inside `<style>` blocks — there is no shared stylesheet. Each file is fully self-contained. When updating visual styles (colors, typography, spacing), changes must be made in every file that needs them.

**Design token conventions** (defined in `:root` in every file):
- `--accent: #0D6B5E` — teal green, used for interactive elements
- `--bg: #F7F7F5` — off-white page background
- `--surface: #FFFFFF` — card/section backgrounds
- `--mono: 'DM Mono'` — used for eyebrows, labels, and numbers
- `--sans: 'Inter'` — body and UI text

**Case study color variants** — each case study card has a variant class (`v2`, `v3`, `v4`) with its own accent color applied to `.cs-card-visual`, `.cs-num`, and `.cs-bar`. Case study pages use `--accent: #0D6B5E` uniformly regardless of their card color.

## File map

- `index.html` — homepage: hero, skills strip, case study cards grid, about section, contact band
- `case-studies/fear-of-crime.html` — Case study 01 (thesis; secondary analysis of an archival dataset, n=538, SPSS mediation)
- `case-studies/alertt.html` — Case study 02 (discovery research, n=83, Trinidad)

## Case study page structure

Each case study page follows the same HTML structure:
1. Fixed nav with back arrow to `../index.html`
2. `.cs-header` — title, subtitle, metadata row, tags, action buttons
3. `.cs-body` — numbered sections using `.section-marker` + `.section-heading` + `.body-text`
4. Supporting components: `.callout` (highlighted quotes/findings), `.insight-grid`, `.stat-row`, `.next-steps`
5. Contact band and footer (same markup as `index.html`)

When adding a new case study: add the card to `index.html` with the next variant class, create the detail page using an existing case study as the template.
