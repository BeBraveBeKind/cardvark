# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Cardvark is a Progressive Web App that scans business cards via phone camera and extracts contact information using Claude's Vision API. No build tools, no framework — everything is vanilla HTML/CSS/JS in a single `index.html` file.

## Architecture

- **index.html** — The entire app: styles, markup, and all JavaScript (~1,900 lines). Four screens switched by `showView()`: **Scan** (camera or photo upload; the read starts automatically on capture), **Review** (editable fields, Save / Discard; also used for editing a saved contact), **Contact detail** (follow-up actions: email templates, LinkedIn connect, vCard), and **Contacts** (saved list, CSV export). A bottom tab bar switches between Scan and Contacts.
- **sw.js** — Service worker for PWA offline caching. Bump `CACHE_NAME` version when deploying changes.
- **install.html** — Static page with iOS/Android home-screen install instructions.
- **manifest.json** — PWA manifest for standalone mode.

## Key Details

- **API proxy**: All Claude API calls go through a Cloudflare Worker at `claude-proxy.michael-eb0.workers.dev`. The app sends base64 JPEG images to Claude Sonnet for structured JSON extraction.
- **No server/database**: Saved contacts live in `localStorage` (`cardvark_contacts`) on the user's device, so a reload or a trip to the mail app can't lose a batch. Card photos are never stored. Public copy says "your scanned list stays on this device", not "nothing stored".
- **Naming**: the saved collection is always "your Cardvark list" / "My list" in the UI, never "contacts", so it can't be mistaken for the phone's address book. "Contacts" is reserved for the phone ("Add to phone", "your phone's contacts").
- **Proxy origin lock**: the Worker only accepts requests from `https://cardvark.rise-above.net`, so scans fail on localhost and Netlify deploy previews. Append `?demo` to the URL to get a sample card back instead of calling the API.
- **Deployment**: Static files on Netlify via GitHub (BeBraveBeKind/cardvark). Push to `main` auto-deploys to `cardvark.rise-above.net`. No build command.
- **Branding**: Rise Above Partners tokens in `:root` (charcoal `#2D3436`, signal `#6D98BA`, sage `#6B8F71`; Outfit / Satoshi / IBM Plex Mono). Filled buttons use dark `--ink` text and small text uses `--signal-text` / `--smoke` so everything passes WCAG AA contrast — keep that when adding UI.

## Development

No build step. Open `index.html` in a browser or serve with any static server:

```
npx serve .
```

To test PWA features (service worker, manifest), serve over HTTPS or use localhost.

## When Editing

- All app logic is inline in `index.html` `<script>` tag — there are no external JS files.
- When changing cached assets, increment the `CACHE_NAME` version in `sw.js` (currently `cardvark-v11`).
- The Claude Vision API prompt (in `parseBusinessCard()`, mirrored in `worker/src/index.js`) defines the JSON schema for extracted contacts. Changes there affect `normalizeContact()`, the review form, vCard, and CSV logic.
- Follow-up actions work on `activeContact()` (a saved contact), never on an unsaved scan. Keep it that way: saving comes first.
- Tap targets are at least 44px and inputs are 16px (prevents iOS zoom). Don't re-add `user-scalable=no`.
- Navigation uses `history.pushState`, so the phone's back button moves between screens.
- `escapeHtml()` is used for XSS protection when rendering contact data — maintain this pattern for any new user-facing fields.
- Bottom sheet modals use `openPicker()`/`closePicker()` with CSS transitions — don't toggle `hidden` class directly.
- Email follow-up uses `mailto:` via temporary `<a>` tag (not `window.location.href`) for mobile PWA reliability.

## Project Phase

**Updated:** 2026-11-11
- **2026-11-11 redesign:** rebuilt the post-capture flow as Scan → Review → Saved → Contacts; auto-read on capture, editable fields, on-device storage, follow-up from the saved list, photo-upload fallback, accessibility pass.
- Features shipped: camera scan, vCard, CSV export, batch mode, email follow-up templates, LinkedIn connect, donation prompts
- Deployment: Netlify connected to GitHub (BeBraveBeKind/cardvark), auto-deploy on push
- **2026-06-24 hotfix:** model `claude-sonnet-4-20250514` was retired 2026-06-15 → scans 404'd. Swapped to `claude-sonnet-4-6` (verified live). Also fixed the service worker — it was cache-first (served a stale `index.html`, masking the deploy) → now **network-first + clients.claim, cache v8**.
- Awaiting: mobile device testing, Netlify GitHub OAuth completion
- Next: Conference Mode (B2B), Smart Contact Card (QR share), usage analytics
- Model retirements are now monitored automatically by **model-watch** (`~/Scripts/model-watch/`).
