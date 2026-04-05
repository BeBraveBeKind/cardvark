# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Cardvark is a Progressive Web App that scans business cards via phone camera and extracts contact information using Claude's Vision API. No build tools, no framework — everything is vanilla HTML/CSS/JS in a single `index.html` file.

## Architecture

- **index.html** — The entire app: styles, markup, and all JavaScript (~1040 lines). Camera capture, Claude Vision API call, contact display, vCard generation, batch management, and CSV export.
- **sw.js** — Service worker for PWA offline caching. Bump `CACHE_NAME` version when deploying changes.
- **install.html** — Static page with iOS/Android home-screen install instructions.
- **manifest.json** — PWA manifest for standalone mode.

## Key Details

- **API proxy**: All Claude API calls go through a Cloudflare Worker at `claude-proxy.michael-eb0.workers.dev`. The app sends base64 JPEG images to Claude Sonnet for structured JSON extraction.
- **No server/database**: All state is in-memory JavaScript variables. Contacts exist only in the current session until exported.
- **Deployment**: Static files served as a PWA. The app is hosted at `cardvark.rise-above.net`.
- **Branding**: Rise Above Partners. Dark theme (`#1a1a2e`), Bungee font for wordmark, blue accent (`#4a6cf7`).

## Development

No build step. Open `index.html` in a browser or serve with any static server:

```
npx serve .
```

To test PWA features (service worker, manifest), serve over HTTPS or use localhost.

## When Editing

- All app logic is inline in `index.html` `<script>` tag — there are no external JS files.
- When changing cached assets, increment the `CACHE_NAME` version in `sw.js` (currently `cardvark-v3`).
- The Claude Vision API prompt at line ~695 defines the JSON schema for extracted contacts. Changes there affect all downstream display, vCard, and CSV logic.
- `escapeHtml()` is used for XSS protection when rendering contact data — maintain this pattern for any new user-facing fields.
