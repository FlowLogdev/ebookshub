# EbooksHub Assistant (browser co-pilot)

A Manifest V3 Chrome extension, Pro plan only. Reads whatever page the user is currently on (typically
Amazon KDP during account setup or book upload, also scoped for Draft2Digital/IngramSpark) and tells them,
in a side panel, exactly what to click or type next.

## Scope decision: look-and-tell, not automation

This extension **never fills a field, clicks a button, or submits a form itself.** It captures a screenshot +
visible text of the active tab and asks the backend (`app/api/copilot/suggest`) for plain-language guidance,
which it displays for the human to act on.

That's deliberate, not a missing feature — see the conversation that scoped this (also documented in the main
README's "Exports & Kindle publishing assistant" section for context). Two reasons:

1. **Amazon's Conditions of Use** prohibit automated/bot access to their site outside official APIs. An agent
   that autonomously fills and submits KDP forms risks getting a customer's seller account flagged or
   suspended — catastrophic for a product whose pitch is "we help you publish on Amazon."
2. **KDP signup includes a tax interview (SSN/EIN) and bank details.** Having an AI pipeline autonomously fill
   and submit those is a liability surface even if it works perfectly.

If this ever needs to become more autonomous, re-evaluate both of those tradeoffs explicitly before building —
don't drift into it by adding `chrome.scripting` click/fill calls to `background.js` incrementally.

## How it works

- **Auth handoff**: the extension has no cookies for ebookhubs.com. `app/extension/connect/page.tsx` runs in
  the user's normal logged-in browser tab, mints a short-lived token via `POST /api/extension/token`
  (Pro-gated, see `lib/copilot/token.ts`), and hands it to the extension via
  `chrome.runtime.sendMessage(extensionId, ...)` — enabled by this extension's `externally_connectable`
  manifest entry, which only trusts `ebookhubs.com` / `localhost:3000`. `background.js` stores it in
  `chrome.storage.local`.
- **Page context**: when the user asks something in the side panel, `background.js` captures a screenshot
  (`chrome.tabs.captureVisibleTab`) and the page's visible text (`chrome.scripting.executeScript`) of the
  active tab, and `sidepanel.js` POSTs both plus the bearer token to `POST /api/copilot/suggest`.
- **The model**: `lib/ai/copilot-vision.ts` calls Anthropic directly (vision input — screenshot) with a system
  prompt that hard-restricts it to describing what the *user* should do, in second person, and never to
  transcribe sensitive field values back.

## Permissions

`host_permissions` is scoped to `ebookhubs.com`, `localhost:3000` (dev), and the Amazon/KDP/Draft2Digital/
IngramSpark domains — not `<all_urls>`. `activeTab` covers any other site the user explicitly invokes the
extension on. Broadening this list is fine but re-triggers a Chrome Web Store permissions review; don't add
domains speculatively.

## Local development

1. Set `NEXT_PUBLIC_EXTENSION_ID` in the Next.js app's `.env.local` — for an unpacked dev load, Chrome assigns
   a random ID unless you pin one with a `"key"` field in `manifest.json` (Chrome → Extensions → Developer
   mode → "Pack extension" once, then reuse the generated public key so the ID stays stable across reloads).
2. In `sidepanel.js`, change `API_BASE` to `http://localhost:3000` (and use that origin in
   `externally_connectable`/`host_permissions`, both already include it).
3. Chrome → `chrome://extensions` → Developer mode → "Load unpacked" → select this `extension/` folder.
4. Sign in to the app locally as a Pro-plan user, visit `/extension/connect` to hand off a token, then click
   the extension's toolbar icon to open the side panel.

## Publishing

Package via Chrome Web Store Developer Dashboard. Once published, the extension ID becomes fixed — update
`NEXT_PUBLIC_EXTENSION_ID` in production to match, and remove the dev `"key"` field from `manifest.json` if
one was added for local testing.
