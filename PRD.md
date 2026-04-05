# Cardvark Product Requirements Document

## Feature 1: Coffee Prompt at 2 Scans

### Problem
The current donation prompt fires at 3, 10, and 20 scans. Most casual users at an event scan 2-5 cards. By the time the prompt shows at 3, many users have already gotten value and left. The first prompt needs to land earlier while still feeling earned.

### Solution
Change the first donation threshold from 3 to 2. Rewrite the message to feel like a friendly aside, not a paywall. Keep the 10 and 20 thresholds as-is with escalating urgency.

### Requirements

**Threshold change:**
- First prompt triggers after 2 successful scans (was 3)
- Thresholds become: `[2, 10, 20]`

**Message rewrite (scan 2):**
- Tone: warm, casual, zero guilt. Acknowledge the user is busy (they're at an event).
- Copy: "Hey, nice — Cardvark just saved you some typing. This tool costs about $0.20 per scan to run. If it's useful, a quick coffee helps keep it free."
- Keep the existing messages for 10 and 20 as-is.

**UX behavior (unchanged):**
- Modal overlay with Buy Me a Coffee link + "Maybe later" dismiss
- Modal closes on overlay click or dismiss button
- No block — user can always dismiss and keep scanning
- Session-only counter (resets on page reload, no localStorage persistence)

### Out of Scope
- Persistent donation tracking across sessions
- Payment processing beyond Buy Me a Coffee link
- Gating or limiting scans for non-donors

### Success Metric
- More users see the prompt (shifted from scan 3 → 2)
- Buy Me a Coffee click-through (track via BMAC dashboard)

### Implementation Notes
- Change: `donationThresholds` from `[3, 10, 20]` to `[2, 10, 20]`
- Change: `donationMessages[3]` → `donationMessages[2]` with new copy
- ~5 lines of code changed. No new UI, no new dependencies.

---

## Feature 2: Email Follow-Up Templates

### Problem
Scanning a business card is step 1. The real value is step 2: reaching out. Right now, after scanning, the user can download a vCard or add to batch — but there's no path to immediately act on the new contact. The card sits in their phone until they forget about it.

### Solution
Add a "Send Follow-Up" button to the contact card result screen. Tapping it shows a template picker (3 pre-written + 1 custom). Selecting a template opens the user's default mail app via `mailto:` with pre-filled subject and body, personalized with the contact's name and company.

### Requirements

**New UI element — "Send Follow-Up" button:**
- Appears on the contact card after a successful scan, alongside existing "Add & Scan Next" / "Download vCard" buttons
- Positioned prominently — this is the highest-value action
- Only enabled when at least one email address was extracted
- If no email found, button is hidden (not disabled/grayed)

**Template picker overlay:**
- Appears when "Send Follow-Up" is tapped
- Shows 4 options as tappable cards:

| Template | Subject | Body |
|----------|---------|------|
| **Quick Connect** | "Great meeting you, {{first_name}}" | "Hi {{first_name}},\n\nGreat connecting with you. I'd love to stay in touch — let me know if there's ever anything I can help with.\n\nBest,\n" |
| **Follow Up on Chat** | "Following up — {{first_name}}" | "Hi {{first_name}},\n\nReally enjoyed our conversation. I wanted to follow up while it's fresh — would love to continue the discussion.\n\nLooking forward to it,\n" |
| **Request a Meeting** | "Let's connect, {{first_name}}" | "Hi {{first_name}},\n\nIt was great meeting you. I'd love to set up a time to chat more about what you're doing at {{company}}. Would you have 15 minutes this week?\n\nBest,\n" |
| **Custom** | (user types) | (user types) |

**Template personalization:**
- `{{first_name}}` → extracted first name (fallback: empty string)
- `{{company}}` → extracted company name (fallback: "your company")
- Personalization happens before opening mailto link

**Custom template:**
- Tapping "Custom" shows two inline text inputs: Subject and Body
- Pre-fill body with: "Hi {{first_name}},\n\n"
- "Open in Email" button below the inputs

**mailto: behavior:**
- On template select (or "Open in Email" for custom), construct mailto link:
  `mailto:{{email}}?subject={{encoded_subject}}&body={{encoded_body}}`
- If contact has multiple emails, use the first one
- Opens in user's default mail app (works on iOS, Android, desktop)
- After opening mailto, show brief "Email draft opened!" success status

**Template picker UI:**
- Same visual language as existing modal (dark card, rounded corners)
- Each template is a tappable card showing the template name and a 1-line preview
- "Cancel" link at bottom to dismiss
- Closes after template selection (mailto fires)

### Out of Scope
- Saving/editing templates across sessions
- Sending email from within the app (always hands off to native mail)
- SMS or other messaging channels (future feature)
- Tracking whether the email was actually sent

### Success Metric
- % of scans that result in a follow-up email opened
- Qualitative: users report faster follow-up after events

### Implementation Notes
- New HTML: template picker modal (similar pattern to donation modal)
- New JS: `openFollowUpPicker()`, `sendFollowUp(templateId)`, `buildMailtoUrl(contact, subject, body)`
- New CSS: template card styles within picker modal
- No external dependencies. No API calls. Pure client-side.
- Estimated: ~150 lines added (HTML + CSS + JS)

---

## Feature 3: Card → LinkedIn + Follow

### Problem
Email follow-up is good, but LinkedIn is where B2B relationships actually live. After scanning a card, most people want to connect on LinkedIn within 24 hours — but the friction of searching, finding the right profile, and writing a connection note means most people never do it. Cardvark can bridge the physical card to the digital connection.

### Solution
Add a "Connect on LinkedIn" button to the contact card. Tapping it searches for the person on LinkedIn (via a Google search query that targets LinkedIn profiles), shows a preview of the likely match, and lets the user open LinkedIn with context to send a connection request. Include a pre-written connection note they can copy.

### Requirements

**New UI element — "Connect on LinkedIn" button:**
- Appears on the contact card after a successful scan
- Positioned alongside "Send Follow-Up" and existing buttons
- Uses LinkedIn brand color (`#0a66c2`) for recognition
- Always visible (LinkedIn search works even without a LinkedIn URL on the card)

**Two paths based on extracted data:**

**Path A — LinkedIn URL found on card:**
- If the scan extracted a `linkedin` field, the button opens that URL directly
- Before opening, show a connection note template the user can copy

**Path B — No LinkedIn URL (most common):**
- Button opens a Google search scoped to LinkedIn:
  `https://www.google.com/search?q={{first_name}}+{{last_name}}+{{company}}+site:linkedin.com/in/`
- This is intentionally a Google search, not a LinkedIn search, because:
  - No LinkedIn API needed (API requires partnership approval)
  - No authentication required
  - Google indexes LinkedIn profiles reliably
  - Works in any browser, no LinkedIn login required to see results

**Connection note template:**
- Shown in a small copyable text box before the LinkedIn link opens
- Three options (tappable to copy to clipboard):

| Template | Note |
|----------|------|
| **Event Connect** | "Hi {{first_name}}, great meeting you! Wanted to connect here to stay in touch." |
| **Professional** | "Hi {{first_name}}, I came across your work at {{company}} and would love to connect." |
| **Brief** | "Hi {{first_name}} — let's connect!" |

- "Copied!" toast confirmation when tapped
- User manually pastes into LinkedIn's "Add a note" field after opening

**UX flow:**
1. User taps "Connect on LinkedIn"
2. Modal appears with:
   - Name + company shown for confirmation
   - 3 connection note templates (tap to copy)
   - "Open LinkedIn" button (opens Path A or Path B URL)
3. User copies note → taps "Open LinkedIn" → finds profile → pastes note → sends request

**Why not direct-link to LinkedIn connect?**
- LinkedIn connection requests require being logged in and on the exact profile page
- The "Add a note" dialog can't be pre-filled via URL parameters
- Copy-to-clipboard + open search is the most reliable cross-platform approach
- This works whether the user has the LinkedIn app or just a browser

### Out of Scope
- LinkedIn API integration (requires partnership program)
- Automated connection requests (violates LinkedIn ToS)
- Profile scraping or enrichment
- Storing LinkedIn profile matches
- In-app LinkedIn profile preview (would require API)

### Freemium Gate (future consideration)
- Free: 5 LinkedIn lookups per session
- Paid: unlimited + additional note templates
- Not implemented in v1 — ship ungated first, add limits after usage data

### Success Metric
- % of scans that trigger a LinkedIn lookup
- Qualitative: users report connecting on LinkedIn faster after events

### Implementation Notes
- New HTML: LinkedIn modal (similar to email template picker)
- New JS: `openLinkedInConnect()`, `buildLinkedInSearchUrl(contact)`, `copyConnectionNote(text)`
- New CSS: LinkedIn button style, copy-to-clipboard toast
- Clipboard API: `navigator.clipboard.writeText()` (supported in all modern browsers, requires HTTPS — already satisfied by PWA)
- No external APIs. No authentication. No backend changes.
- Estimated: ~120 lines added (HTML + CSS + JS)
- Cloudflare Worker: no changes needed
