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

## Roadmap — what Phase 1 intentionally leaves out

This app follows the phased build order from the original product spec. Phase 1 covers the foundation, the
creation wizard, the blueprint engine, chapter generation, the editor, and cover generation. Not yet built:

- **Character creator & visual consistency** (spec §8–9) — character rows exist in the schema; the UI to create/
  edit them and lock their appearance across illustrations doesn't yet.
- **Full illustration system** (§10–11) — cover generation is real; per-page illustration generation, styles, and
  an image editor (regenerate/variation/inpainting) are not built.
- **Glossary & TOC generation UI** (§14–15) — `glossary_terms` table exists; no generator or editor yet.
- **Multi-format export** (§24) — PDF/ePub/DOCX export engines are not implemented; today's "export" is the
  in-app preview only.
- **Proofreading passes, quality modes, cost/budget estimation** (§30, §50, §64) — not implemented.
- **Stripe billing, credit metering, plan enforcement** (§39–41) — `plans` table is seeded; no Stripe integration,
  no credit deduction on generation yet (the columns exist on `profiles` but aren't enforced).
- **Community library, sharing/collaboration, admin dashboard, analytics** (§36, §52–55) — not started.
- **Translation, multi-quality-mode generation, self-publishing export presets** (§5, §25–26, §64) — not started.

None of the above require schema rewrites to add — the tables and provider abstractions were designed with them
in mind (see `supabase/migrations/0001_init.sql` for tables like `images`, `glossary_terms`, and `usage_ledger`
that Phase 1 doesn't populate yet).

## Environment variables

See `.env.example` for the full list with descriptions.
