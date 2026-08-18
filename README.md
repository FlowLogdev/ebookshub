# EbooksHub

An AI book creation studio: describe an idea, review a page-accurate blueprint, then watch chapters get written,
edit anything, and export. This is **Phase 1** of a much larger product spec — see [Roadmap](#roadmap) for what's
deliberately not built yet.

## What's real here

Everything in this app is wired to a real backend — there are no fake buttons or canned "AI" responses:

- **Auth** — Supabase email/password + Google OAuth, protected routes via middleware.
- **Database** — Postgres schema with RLS (`supabase/migrations/`), one row per book/chapter/job/task.
- **AI text** — real Anthropic API calls for concept analysis, blueprint planning, chapter writing, and the
  in-editor writing assistant (`lib/ai/text-provider.ts`, `lib/book/*`).
- **AI images** — real OpenAI (`gpt-image-1`) calls for cover concepts (`lib/ai/image-provider.ts`).
- **Generation pipeline** — a DB-backed job/task queue (no Redis required) that plans a blueprint, then writes
  every chapter one at a time, grounded in a running "Book Bible" of established facts (`lib/jobs/`).
- **Editor** — chapter list, autosaving content editor, AI assist actions on selected text, version snapshots.

## Getting started

1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Create a Supabase project** at [supabase.com](https://supabase.com), then run the migrations against it —
   either paste the contents of `supabase/migrations/0001_init.sql` and `0002_seed_plans.sql` into the SQL editor,
   or with the Supabase CLI:
   ```bash
   supabase link --project-ref <your-project-ref>
   supabase db push
   ```
3. **Copy the env template** and fill in your keys:
   ```bash
   cp .env.example .env.local
   ```
   - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` — from your Supabase
     project settings.
   - Text generation needs **at least one** of `ANTHROPIC_API_KEY`, `DEEPSEEK_API_KEY`, `OPENAI_API_KEY` set — see
     [Multi-provider AI](#multi-provider-ai-text--images) below for how the app picks between them.
   - Image generation needs **at least one** of `GEMINI_API_KEY`, `HIGGSFIELD_API_KEY_ID`+`HIGGSFIELD_API_KEY_SECRET`,
     `OPENAI_API_KEY` set. Without any of them, cover generation is the only thing that won't work.
   - `JOB_WORKER_SECRET` — only needed if you set up a scheduled call to `/api/jobs/process` (see below); leave
     blank for local development.
4. **Enable Google OAuth (optional)** in Supabase Auth providers if you want the "Continue with Google" button to
   work; email/password works out of the box.
5. **Run the dev server**
   ```bash
   npm run dev
   ```

## How book generation actually runs (no external queue)

Spec section 6 calls for "queued background generation jobs." Standing up Redis/BullMQ for Phase 1 would be
infrastructure the rest of the app doesn't need yet, so instead:

- `generation_jobs` / `generation_tasks` tables (in the migration) hold job/task state — this **is** the queue.
- `POST /api/jobs/process` claims and executes exactly one waiting task, then returns.
- The blueprint-planning screen and the book-generation progress screen (`lib/hooks/use-job-runner.ts`) call that
  endpoint in a loop from the browser while they're open — each call does real work (one Anthropic call), so the
  loop is naturally paced and stops itself once the job is done.
- **Nobody has to keep the tab open for correctness.** All state lives in Postgres. If you close the tab mid-book,
  the job just stops advancing — reopening the same book's progress page resumes it exactly where it left off.
- If you want generation to keep moving with no tab open at all, point a scheduler (Vercel Cron, GitHub Actions,
  a cheap uptime pinger) at `POST /api/jobs/process` with header `x-ebookshub-worker-secret: $JOB_WORKER_SECRET` and
  body `{"jobId": "..."}` for any in-progress job.
- **Swapping in a real queue later** (BullMQ/Redis, a hosted queue, etc.) means writing a worker process that
  calls `processNextTask()` from `lib/jobs/worker.ts` instead of hitting the HTTP route — the task/job state
  machine doesn't change.

## Multi-provider AI (text & images)

**Text — 3 providers, routed by book subject** (`lib/ai/text-provider.ts`, `lib/ai/text-router.ts`):

| Provider | Used for | Model (env override) |
|---|---|---|
| Anthropic (Claude) | Creative/narrative: novels, children's books, fantasy, romance, mystery, sci-fi, poetry, memoir, biography. Also the fixed default for the in-editor AI writing assistant, regardless of book type. | `ANTHROPIC_MODEL` |
| DeepSeek | Structured/technical: nonfiction, educational, business, self-help, cookbooks, history. OpenAI-compatible API. | `DEEPSEEK_MODEL` |
| OpenAI (GPT) | General-purpose default: travel, comics, activity/coloring books, custom/unclassified. | `OPENAI_TEXT_MODEL` |

The full mapping is the `TEXT_PROVIDER_BY_BOOK_TYPE` table in `lib/ai/text-router.ts` — it's plain data, not logic,
so retuning which provider handles which genre is a one-line edit. `getTextProviderForBookType()` falls back
through the other two configured providers (in a fixed order) if the preferred one's key is missing, and only
throws if none of the three are set. A book's concept, blueprint, and every chapter all use the *same* provider
(picked once, from `book_type`) so voice stays consistent within one book.

**Images — 3 providers, tried in fallback order** (`lib/ai/image-provider.ts`):

`Gemini` (`gemini-3.1-flash-image`, aka Nano Banana 2) → `Higgsfield` (Soul standard model, async job API) →
`OpenAI` (`gpt-image-1`). `generateImageWithFallback()` tries each configured provider in that order and moves to
the next on any failure, so all 4 cover concepts in one request come from the *same* provider (stays stylistically
consistent) rather than mixing providers mid-request. Only throws if every configured provider fails.

> **Known gap:** the Higgsfield integration's request shape is verified against their published OpenAPI spec, but
> the exact field name holding the output image URL on a *completed* job wasn't confirmed from public docs at
> integration time (their docs didn't expose a full example response). `extractImageUrls()` in
> `lib/ai/image-provider.ts` defensively searches common field names (`images`, `output`, `result`, `url`, etc.)
> and throws with the raw payload attached if none match — so a schema mismatch fails loudly instead of silently
> returning a broken URL. Tighten it to the exact field once you've seen one real completed response.

**Reference-image-guided generation**: the creation wizard's final step (`app/create/page.tsx`) accepts an
optional image upload (any common image type, capped at 3MB client-side to stay under Vercel's serverless request
body limit once base64-inflated), stored on `books.reference_image_url` as a data URI. When covers are generated
(`app/api/books/[id]/covers/route.ts`), that image is decoded and passed through `GenerateImageOptions.referenceImage`
to condition generation on it — Gemini via multimodal `interactions.create` input (image part + text part), OpenAI
via `images.edit` instead of `images.generate`. Higgsfield has no image-conditioned endpoint wired up, so it silently
ignores the reference and falls back to text-only generation if it's reached in the chain.

## Architecture notes

- **AI provider abstraction** — every AI call goes through a named provider resolved from `lib/ai/text-provider.ts`
  / `lib/ai/image-provider.ts` rather than an SDK imported directly at the call site. Swapping models or vendors,
  or adding a 4th provider, means writing one new class, not touching the blueprint engine, chapter writer, or
  editor. Structured output (blueprints, chapter plans) uses each provider's native tool/function-calling with a
  Zod schema, validated before it ever reaches the database — never parsed from free-text prose.
- **Blueprint / page-planning engine** (`lib/book/blueprint.ts`) — turns a page-count target into front matter +
  chapters + back matter that actually sums close to the target, then proportionally rescales chapter budgets to
  correct drift rather than padding with filler pages.
- **Long-form consistency** (`book_bible_facts` table, `lib/book/chapter-writer.ts`) — each chapter-writing call is
  grounded in summaries of every previous chapter plus a running list of established characters/locations/rules,
  not the full manuscript text. This is what's meant to prevent a 300-page book from contradicting itself in
  chapter 40 — full continuity review/proofreading passes are a later phase (see below).
- **RLS-first authorization** — every table's Row Level Security policy checks `books.owner_id = auth.uid()`
  (directly or via a join). Route handlers use the user's own session-scoped Supabase client wherever possible;
  only the job worker's cron mode uses the service-role client.

## Canva integration (OAuth 2.0, no static API key)

Canva issues no permanent API key — every request runs as a user who has explicitly connected their
Canva account via OAuth 2.0 Authorization Code + PKCE. The flow:

1. `GET /api/canva/connect` — signed-in user only. Generates a PKCE verifier/challenge and CSRF `state`,
   stashes them in a short-lived (10 min) httpOnly cookie scoped to `/api/canva`, and redirects to Canva's
   authorize URL (`lib/canva/oauth.ts`).
2. Canva redirects back to `GET /api/canva/callback` with `code` and `state`. The route checks `state`
   against the cookie, exchanges `code` for tokens (Basic-auth'd with `CANVA_CLIENT_ID`/`CANVA_CLIENT_SECRET`),
   and stores the result via `saveConnection()`.
3. Access/refresh tokens are AES-256-GCM encrypted (`lib/canva/crypto.ts`, key from
   `CANVA_TOKEN_ENCRYPTION_KEY`) before they're written to `canva_connections` — a table with RLS that only
   lets a user read/delete their own row; inserts/updates go through the service-role client since token
   exchange needs the client secret.
4. `getValidAccessToken()` / `canvaFetch()` (`lib/canva/client.ts`) transparently refresh the token when it's
   near expiry and persist the rotated pair, so callers never handle refresh logic themselves.

`GET /api/canva/status` reports whether the current user is connected; `POST /api/canva/disconnect` removes
their row. Set up an integration at the [Canva Developer Portal](https://www.canva.com/developers), add the
redirect URL from `CANVA_REDIRECT_URI`, and enable the `design:meta:read`, `design:content:read`,
`design:content:write`, `asset:read`, `asset:write` scopes.

## Free tier: one ebook per account

The Free plan is a one-time trial, not a recurring allowance. `POST /api/books` atomically claims a
`profiles.free_ebook_used_at` slot the moment a free-plan account starts a book (`lib/plans/free-tier.ts`) — a
second attempt gets a 403 with `{ upgradeRequired: true, upgradeUrl: "/#pricing" }` instead of a new book, and
`app/create/page.tsx` shows an upgrade screen instead of the wizard once that slot is used. The book itself is
capped at `FREE_TIER_MAX_PAGES` (5 pages) / `FREE_TIER_MAX_WORDS` (1,000 words total) / `FREE_TIER_MAX_IMAGES` (5
cover images, one generation call ever) — see `lib/book/constants.ts`. Those caps are enforced at generation time,
not just at the door: `books.is_free_tier` flows into `generateBookConcept` / `generateBookBlueprint`
(`lib/book/blueprint.ts`) to force minimal front/back matter and the cheapest configured text provider/model
(`getFreeTierTextProvider()` in `lib/ai/text-router.ts` — DeepSeek first, since it's the cheapest of the three per
token), `capChapterWords()` rescales each chapter's word target so the book totals ≤1,000 words, and
`app/api/books/[id]/covers/route.ts` rejects a second cover-generation call for a free-tier book.

## Exports & Kindle publishing assistant (Pro plan only)

`GET /api/books/[id]/export?format=pdf|docx|epub` — PDF (`lib/export/pdf.ts`, via `pdfkit`), Word
(`lib/export/docx.ts`, via `docx`), and a hand-rolled Kindle-ready EPUB3 (`lib/export/epub.ts`, via `jszip`, with an
EPUB2 `toc.ncx` alongside for older-reader compatibility) all render from the same Markdown block parser
(`lib/export/markdown.ts`) so headings/bold/italic/lists come out consistent across formats. Gated to
`profile.plan_id === "pro"` — Free and Creator get `{ upgradeRequired: true }`.

`POST /api/books/[id]/kdp-assistant` — an OpenAI-powered chat (`lib/ai/kdp-assistant.ts`) that walks a Pro user
through publishing on Amazon KDP (account setup, metadata, cover, pricing/royalty, review timeline). This is
guidance only, not automation — Amazon has no public API for KDP uploads, so the assistant tells the user what to
do on kdp.amazon.com and they do the clicking. Stateless: the client resends the full message history each turn,
same as a typical chat UI; nothing is persisted server-side. Also Pro-only, same gate as exports.

## Browser co-pilot extension (Pro plan only)

A Manifest V3 Chrome extension (`extension/`, see `extension/README.md`) — "EbooksHub Assistant" — that watches
whatever page the user is on (Amazon KDP, Draft2Digital, IngramSpark) and tells them in a side panel what to
click or type next, using Claude vision on a screenshot of the active tab. **Look-and-tell only — it never fills
a field or clicks anything itself.** That's a deliberate scope decision, not a gap: Amazon's Conditions of Use
prohibit bot access to their site, and KDP signup handles tax/bank data, so autonomous form-filling there is a
real ToS and liability risk. See `extension/README.md` for the full reasoning and how to revisit it if the
product direction changes.

The extension has no cookies for this site, so it authenticates differently from everything else here:
`app/extension/connect/page.tsx` runs in the user's normal logged-in tab, mints a 12-hour token via
`POST /api/extension/token` (`lib/copilot/token.ts`, HMAC-signed, Pro-gated), and hands it to the extension
through `chrome.runtime.sendMessage` (enabled by the extension's `externally_connectable` manifest entry, which
only trusts this site's origin). The extension then calls `POST /api/copilot/suggest` with that bearer token —
verified independently of the cookie-based Supabase session everything else uses, via a service-role Supabase
client since there's no user session to scope RLS to.

Both are surfaced together on `app/books/[id]/publish/page.tsx`, linked from the preview page's "Publish" button.

## Roadmap — what Phase 1 intentionally leaves out

This app follows the phased build order from the original product spec. Phase 1 covers the foundation, the
creation wizard, the blueprint engine, chapter generation, the editor, and cover generation. Not yet built:

- **Character creator & visual consistency** (spec §8–9) — character rows exist in the schema; the UI to create/
  edit them and lock their appearance across illustrations doesn't yet.
- **Full illustration system** (§10–11) — cover generation is real; per-page illustration generation, styles, and
  an image editor (regenerate/variation/inpainting) are not built.
- **Glossary & TOC generation UI** (§14–15) — `glossary_terms` table exists; no generator or editor yet.
- **Proofreading passes, quality modes, cost/budget estimation** (§30, §50, §64) — not implemented.
- **Stripe billing, credit metering** (§39–41) — `plans` table is seeded and the Free-tier one-ebook gate and
  Pro-only export/KDP-assistant gate are both enforced (see above), but there's no Stripe checkout/webhook yet to
  actually move an account from Free to Creator/Pro, and word/image *credit* deduction (as opposed to the flat
  free-tier caps) isn't implemented.
- **Community library, sharing/collaboration, admin dashboard, analytics** (§36, §52–55) — not started.
- **Translation, multi-quality-mode generation, self-publishing export presets** (§5, §25–26, §64) — not started.

None of the above require schema rewrites to add — the tables and provider abstractions were designed with them
in mind (see `supabase/migrations/0001_init.sql` for tables like `images`, `glossary_terms`, and `usage_ledger`
that Phase 1 doesn't populate yet).

## Environment variables

See `.env.example` for the full list with descriptions.
