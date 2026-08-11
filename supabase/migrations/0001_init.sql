-- EbooksHub — core schema (Phase 1)
-- Run against a Supabase Postgres project. Safe to re-run: every statement
-- is guarded with IF NOT EXISTS / OR REPLACE.

create extension if not exists "pgcrypto";

-- ── Enums ────────────────────────────────────────────────────────────────

do $$ begin
  create type book_status as enum ('draft', 'blueprint_ready', 'generating', 'complete', 'published', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type chapter_status as enum ('waiting', 'planning', 'writing', 'illustrating', 'reviewing', 'complete', 'failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type job_status as enum ('queued', 'running', 'complete', 'failed', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type job_type as enum ('BLUEPRINT', 'FULL_BOOK', 'CHAPTER', 'COVER', 'GLOSSARY', 'PROOFREAD');
exception when duplicate_object then null; end $$;

do $$ begin
  create type credit_type as enum ('text', 'image');
exception when duplicate_object then null; end $$;

-- ── Profiles ─────────────────────────────────────────────────────────────
-- One row per auth.users, created automatically by the trigger below.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  author_name text,
  avatar_url text,
  bio text,
  website text,
  language text not null default 'en',
  country text,
  plan_id text not null default 'free',
  text_credits_remaining integer not null default 20000,
  image_credits_remaining integer not null default 10,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Plans (admin-configurable pricing/limits; seeded, not hard-coded) ─────

create table if not exists public.plans (
  id text primary key,
  name text not null,
  price_cents integer not null default 0,
  billing_interval text not null default 'month',
  word_credits integer not null default 0,
  image_credits integer not null default 0,
  max_book_pages integer not null default 30,
  features jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  sort_order integer not null default 0
);

-- ── Books ────────────────────────────────────────────────────────────────

create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'Untitled Book',
  subtitle text,
  author_name text,
  book_type text not null default 'custom',
  genre text,
  subgenre text,
  language text not null default 'en',
  target_audience text,
  target_age text,
  reading_level text,
  tone text,
  writing_style text,
  point_of_view text,
  page_count_target integer not null default 30,
  word_count_target integer,
  illustration_frequency text default 'ai_recommended',
  image_style text default 'storybook_watercolor',
  dimensions text default '6x9',
  status book_status not null default 'draft',
  source_prompt text,
  selected_cover_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint books_page_count_target_range check (page_count_target between 5 and 300)
);

create index if not exists books_owner_id_idx on public.books (owner_id);

-- ── Book blueprints ──────────────────────────────────────────────────────
-- The page-planning output (section 3 of the spec): how the requested page
-- count is allocated across front matter, chapters, and back matter.

create table if not exists public.book_blueprints (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete cascade,
  concept jsonb not null default '{}'::jsonb, -- title/subtitle/description/audience/characters/setting suggestions
  front_matter jsonb not null default '[]'::jsonb, -- [{ "section": "title_page", "pages": 1 }, ...]
  back_matter jsonb not null default '[]'::jsonb,
  total_pages_target integer not null,
  total_pages_planned integer not null,
  approved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists book_blueprints_book_id_idx on public.book_blueprints (book_id);

-- ── Chapters ─────────────────────────────────────────────────────────────

create table if not exists public.chapters (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete cascade,
  blueprint_id uuid references public.book_blueprints (id) on delete set null,
  order_index integer not null,
  chapter_number integer,
  title text not null,
  subtitle text,
  summary text,
  target_pages integer not null default 5,
  target_words integer,
  status chapter_status not null default 'waiting',
  word_count integer not null default 0,
  content text, -- markdown
  content_html text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists chapters_book_id_idx on public.chapters (book_id);
create unique index if not exists chapters_book_order_idx on public.chapters (book_id, order_index);

create table if not exists public.chapter_versions (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters (id) on delete cascade,
  content text not null,
  word_count integer not null default 0,
  label text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists chapter_versions_chapter_id_idx on public.chapter_versions (chapter_id);

-- ── Characters ───────────────────────────────────────────────────────────

create table if not exists public.characters (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete cascade,
  name text not null,
  age text,
  gender text,
  role text,
  personality text,
  appearance jsonb not null default '{}'::jsonb, -- hair/eyes/skin/clothing/height/body/accessories
  relationships text,
  notes text,
  reference_image_url text,
  image_style text,
  consistency_lock boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists characters_book_id_idx on public.characters (book_id);

-- ── Book Bible facts ─────────────────────────────────────────────────────
-- Long-form consistency memory (section 7): grounding facts fed back into
-- the model before writing the next chapter.

create table if not exists public.book_bible_facts (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete cascade,
  fact_type text not null, -- character | location | timeline | object | rule | vocabulary
  subject text not null,
  description text not null,
  source_chapter_id uuid references public.chapters (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists book_bible_facts_book_id_idx on public.book_bible_facts (book_id);

-- ── Generation jobs & tasks (DB-backed queue) ──────────────────────────────
-- No external queue in Phase 1: a job fans out into one task per unit of
-- work (one per chapter, etc). /api/jobs/process claims and executes the
-- next pending task. Swapping in BullMQ/Redis later means pointing the same
-- claim query at a real broker — the state machine here doesn't change.

create table if not exists public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete cascade,
  job_type job_type not null,
  status job_status not null default 'queued',
  progress_percent integer not null default 0,
  error text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

create index if not exists generation_jobs_book_id_idx on public.generation_jobs (book_id);

create table if not exists public.generation_tasks (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.generation_jobs (id) on delete cascade,
  book_id uuid not null references public.books (id) on delete cascade,
  chapter_id uuid references public.chapters (id) on delete cascade,
  task_type text not null, -- plan_blueprint | write_chapter | generate_cover | generate_glossary | proofread
  status chapter_status not null default 'waiting',
  order_index integer not null default 0,
  attempts integer not null default 0,
  error text,
  output jsonb,
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists generation_tasks_job_id_idx on public.generation_tasks (job_id);
create index if not exists generation_tasks_claim_idx on public.generation_tasks (status, created_at) where status = 'waiting';

-- ── Covers & images ──────────────────────────────────────────────────────

create table if not exists public.covers (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete cascade,
  image_url text not null,
  prompt text,
  style text,
  is_selected boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists covers_book_id_idx on public.covers (book_id);

alter table public.books
  add constraint books_selected_cover_id_fkey
  foreign key (selected_cover_id) references public.covers (id) on delete set null;

create table if not exists public.images (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete cascade,
  chapter_id uuid references public.chapters (id) on delete cascade,
  url text not null,
  prompt text,
  negative_prompt text,
  style text,
  aspect_ratio text default '1:1',
  provider text,
  status text not null default 'complete',
  created_at timestamptz not null default now()
);

create index if not exists images_book_id_idx on public.images (book_id);

-- ── Glossary ─────────────────────────────────────────────────────────────

create table if not exists public.glossary_terms (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete cascade,
  term text not null,
  definition text not null,
  created_at timestamptz not null default now()
);

create index if not exists glossary_terms_book_id_idx on public.glossary_terms (book_id);

-- ── Usage ledger (credit accounting; billing wired in a later phase) ─────

create table if not exists public.usage_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  book_id uuid references public.books (id) on delete set null,
  credit_type credit_type not null,
  amount integer not null,
  reason text not null,
  created_at timestamptz not null default now()
);

create index if not exists usage_ledger_user_id_idx on public.usage_ledger (user_id);

-- ── updated_at triggers ──────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
declare
  t text;
begin
  foreach t in array array['profiles', 'books', 'book_blueprints', 'chapters', 'characters', 'generation_tasks']
  loop
    execute format(
      'drop trigger if exists set_updated_at on public.%I; create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at();',
      t, t
    );
  end loop;
end $$;

-- ── New user → profile row ───────────────────────────────────────────────

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (new.id, new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'avatar_url')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Row Level Security ───────────────────────────────────────────────────

alter table public.profiles enable row level security;
alter table public.plans enable row level security;
alter table public.books enable row level security;
alter table public.book_blueprints enable row level security;
alter table public.chapters enable row level security;
alter table public.chapter_versions enable row level security;
alter table public.characters enable row level security;
alter table public.book_bible_facts enable row level security;
alter table public.generation_jobs enable row level security;
alter table public.generation_tasks enable row level security;
alter table public.covers enable row level security;
alter table public.images enable row level security;
alter table public.glossary_terms enable row level security;
alter table public.usage_ledger enable row level security;

drop policy if exists "profiles: read own" on public.profiles;
create policy "profiles: read own" on public.profiles for select using (auth.uid() = id);
drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles for update using (auth.uid() = id);

drop policy if exists "plans: readable by anyone" on public.plans;
create policy "plans: readable by anyone" on public.plans for select using (is_active);

drop policy if exists "books: owner full access" on public.books;
create policy "books: owner full access" on public.books for all
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- Every child table follows the same shape: access allowed iff the parent
-- book belongs to the caller.
drop policy if exists "book_blueprints: via book ownership" on public.book_blueprints;
create policy "book_blueprints: via book ownership" on public.book_blueprints for all
  using (exists (select 1 from public.books b where b.id = book_id and b.owner_id = auth.uid()))
  with check (exists (select 1 from public.books b where b.id = book_id and b.owner_id = auth.uid()));

drop policy if exists "chapters: via book ownership" on public.chapters;
create policy "chapters: via book ownership" on public.chapters for all
  using (exists (select 1 from public.books b where b.id = book_id and b.owner_id = auth.uid()))
  with check (exists (select 1 from public.books b where b.id = book_id and b.owner_id = auth.uid()));

drop policy if exists "chapter_versions: via chapter/book ownership" on public.chapter_versions;
create policy "chapter_versions: via chapter/book ownership" on public.chapter_versions for all
  using (exists (
    select 1 from public.chapters c join public.books b on b.id = c.book_id
    where c.id = chapter_id and b.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.chapters c join public.books b on b.id = c.book_id
    where c.id = chapter_id and b.owner_id = auth.uid()
  ));

drop policy if exists "characters: via book ownership" on public.characters;
create policy "characters: via book ownership" on public.characters for all
  using (exists (select 1 from public.books b where b.id = book_id and b.owner_id = auth.uid()))
  with check (exists (select 1 from public.books b where b.id = book_id and b.owner_id = auth.uid()));

drop policy if exists "book_bible_facts: via book ownership" on public.book_bible_facts;
create policy "book_bible_facts: via book ownership" on public.book_bible_facts for all
  using (exists (select 1 from public.books b where b.id = book_id and b.owner_id = auth.uid()))
  with check (exists (select 1 from public.books b where b.id = book_id and b.owner_id = auth.uid()));

drop policy if exists "generation_jobs: via book ownership" on public.generation_jobs;
create policy "generation_jobs: via book ownership" on public.generation_jobs for all
  using (exists (select 1 from public.books b where b.id = book_id and b.owner_id = auth.uid()))
  with check (exists (select 1 from public.books b where b.id = book_id and b.owner_id = auth.uid()));

drop policy if exists "generation_tasks: via book ownership" on public.generation_tasks;
create policy "generation_tasks: via book ownership" on public.generation_tasks for all
  using (exists (select 1 from public.books b where b.id = book_id and b.owner_id = auth.uid()))
  with check (exists (select 1 from public.books b where b.id = book_id and b.owner_id = auth.uid()));

drop policy if exists "covers: via book ownership" on public.covers;
create policy "covers: via book ownership" on public.covers for all
  using (exists (select 1 from public.books b where b.id = book_id and b.owner_id = auth.uid()))
  with check (exists (select 1 from public.books b where b.id = book_id and b.owner_id = auth.uid()));

drop policy if exists "images: via book ownership" on public.images;
create policy "images: via book ownership" on public.images for all
  using (exists (select 1 from public.books b where b.id = book_id and b.owner_id = auth.uid()))
  with check (exists (select 1 from public.books b where b.id = book_id and b.owner_id = auth.uid()));

drop policy if exists "glossary_terms: via book ownership" on public.glossary_terms;
create policy "glossary_terms: via book ownership" on public.glossary_terms for all
  using (exists (select 1 from public.books b where b.id = book_id and b.owner_id = auth.uid()))
  with check (exists (select 1 from public.books b where b.id = book_id and b.owner_id = auth.uid()));

drop policy if exists "usage_ledger: read own" on public.usage_ledger;
create policy "usage_ledger: read own" on public.usage_ledger for select using (auth.uid() = user_id);

-- Note: generation_tasks/jobs are normally written by the service-role
-- worker (lib/supabase/server.ts#createServiceRoleClient), which bypasses
-- RLS entirely — the policies above only govern direct client access.
