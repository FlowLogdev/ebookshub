-- Support tickets: EHUB-{seq}{year}-{MMDD} ticket numbers, sequence resets
-- to 1000 every January 1st. next_ticket_number() does the increment
-- atomically (insert-or-update under the row lock) so concurrent
-- submissions never collide.
create table if not exists public.support_ticket_counters (
  year int primary key,
  next_seq int not null default 1000
);
alter table public.support_ticket_counters enable row level security;
revoke all on public.support_ticket_counters from anon, authenticated;

create or replace function public.next_ticket_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  current_year int := extract(year from now())::int;
  seq int;
begin
  insert into public.support_ticket_counters (year, next_seq)
  values (current_year, 1000)
  on conflict (year) do update set next_seq = public.support_ticket_counters.next_seq + 1
  returning next_seq into seq;

  return 'EHUB-' || seq::text || current_year::text || '-' || to_char(now(), 'MMDD');
end;
$$;

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_number text not null unique,
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  email text not null,
  subject text not null,
  message text not null,
  status text not null default 'open',
  created_at timestamptz not null default now()
);
alter table public.support_tickets enable row level security;

create policy "Users can view their own tickets"
  on public.support_tickets for select
  using (auth.uid() = user_id);

-- Ticket creation always goes through the service-role client (so
-- unauthenticated visitors on /support can open tickets too) — no insert
-- policy for anon/authenticated, only the select-own policy above.

-- Explicit "this user canceled" marker, independent of Stripe's own
-- subscription_status column — the cancel-membership webhook round-trip
-- (e.g. cancel_at_period_end) can leave Stripe's status as "active" for the
-- rest of the paid period, but the product requirement is that dashboard
-- access is revoked the instant the user clicks cancel, not at period end.
alter table public.profiles add column if not exists account_canceled_at timestamptz;
alter table public.profiles add column if not exists subscription_started_at timestamptz;
