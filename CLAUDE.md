# Umbrella Website

## About

Marketing website for Umbrella Systems (umbrellasystems.net) — outsourced IT for Minnesota charter schools. Built with Astro v6, deployed to Cloudflare Pages.

## Key Context

- **Status:** active redesign on `redesign` branch
- **Owner:** Austin VanAlstyne
- **Project tracker:** `_project.md` (local only, gitignored)
- **Design:** "Comic Book Hero" theme — Bangers + Poppins fonts, comic borders, halftone dots, diagonal clip-paths, superhero-themed copy
- **Branch:** `redesign` has the new Comic Hero theme; `main` has the original design

## Project Structure

```
_project.md          # Project tracker — status, decisions, goals
_meta/               # Project management files (gitignored)
  concepts/          # Design concept HTML prototypes (12+ files)
  reference/         # Research, specs, external docs
  deliverables/      # Final outputs, reports, exports
  notes/             # Working notes, meeting notes, scratch
src/
  layouts/BaseLayout.astro   # Theme CSS, nav, footer, animations
  pages/                     # 11 pages (home, about, schools, business, blog, contact, 4 services, 404)
  styles/global.css          # Minimal — theme CSS lives in BaseLayout
  lib/rss.ts                 # Client-side Substack RSS fetch
functions/api/feed.ts        # Cloudflare Pages proxy for Substack RSS (CORS)
public/images/               # 40+ real photos (team, schools, infrastructure)
```

## Key Files

- `src/layouts/BaseLayout.astro` — all Comic Hero theme CSS, nav with Services dropdown, footer, animation scripts
- `src/pages/index.astro` — homepage with image slideshow hero, 6 superpower cards, stats, E-Rate section, origin story
- `src/pages/about.astro` — team photos, "Why Schools" story, Phase 0 callout
- `src/pages/schools.astro` — E-Rate funding breakdown, target school profile

## Working Conventions

- Theme colors: --navy #1a1a2e, --red #ff1744, --yellow #ffd600
- All page-level hero padding must be set in the page's scoped `<style>` tag (250px top for inner pages) — global CSS gets overridden by Astro scoping
- Yellow highlights use `::after` pseudo-element with `skewX(-8deg)` for angled edges
- Copy voice is superhero-themed: "superpowers" for services, "origin story" for about, "the dispatch" for blog
- Brand copy source: `~/Documents/Projects/UmbrellaAI/Assets/Website/umbrella-website-copy.md`
- Real images only — no stock photos or AI-generated images
