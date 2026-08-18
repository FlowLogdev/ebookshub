-- Canva OAuth 2.0 connections (per user). Canva has no permanent API key —
-- each user authorizes EbooksHub via Authorization Code + PKCE and we store
-- the resulting access/refresh tokens, encrypted at the application layer
-- (see lib/canva/crypto.ts) before they ever reach this table.

create table if not exists public.canva_connections (
  user_id uuid primary key references auth.users (id) on delete cascade,
  access_token_encrypted text not null,
  refresh_token_encrypted text not null,
  scope text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.canva_connections enable row level security;

drop policy if exists "canva_connections: read own" on public.canva_connections;
create policy "canva_connections: read own" on public.canva_connections for select using (auth.uid() = user_id);

drop policy if exists "canva_connections: delete own" on public.canva_connections;
create policy "canva_connections: delete own" on public.canva_connections for delete using (auth.uid() = user_id);

-- Inserts/updates happen server-side only (token exchange needs the client
-- secret), via the service-role client, so no insert/update policy for
-- regular users — the service role bypasses RLS entirely.

drop trigger if exists set_updated_at on public.canva_connections;
create trigger set_updated_at before update on public.canva_connections for each row execute function public.set_updated_at();
