# Springville.Info — Cloudflare Pages

A standalone, dependency-free website for `springville.info`, migrated from the separately hosted Wix Headless site on November 18, 2026. **Does not modify the Christ Community PCA church website.**

## Contents
- `index.html`, `news.html`, `events.html`, `directory.html`, `story.html`, `about.html`, `share.html`: public pages
- `assets/site.css`: layout and styling
- `assets/app.js`: renders stories, events and directory from the JSON file
- `data/content.json`: editable data source for daily publishing
- `scripts/validate_content.py`: checks the data schema before publication
- `DEPLOY.md`: instructions for Cloudflare Pages and scheduled publishing

## Local preview
Run `python3 -m http.server 8000` in this directory and open `http://localhost:8000` (opening the HTML directly as a `file://` URL prevents JSON fetch). No build step, package install, paid service or API key is required to show the site.

## Editorial notes
Data was imported from the user's existing Wix Blog and CMS collection. Existing events were **not independently reverified** during the migration. Each item links to its original publisher or organizer; reverify dates, venues and source availability before promoting them.

The tip form temporarily opens the existing Wix submission form, so submissions continue to work while a replacement submission backend is not configured. An entirely independent Cloudflare form would require Cloudflare Pages Functions or an external form service.
