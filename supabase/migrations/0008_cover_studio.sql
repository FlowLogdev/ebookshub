-- Cover design studio: template variants (with/without background), a
-- source label so the UI can distinguish AI/Canva/manual-edited covers,
-- and a back-cover flag so back covers live in the same table as front
-- covers instead of a parallel one.
alter table public.covers add column if not exists variant text not null default 'with_background';
alter table public.covers add column if not exists source text not null default 'ai';
alter table public.covers add column if not exists overlay_text jsonb;
alter table public.covers add column if not exists is_back_cover boolean not null default false;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'covers_variant_check') then
    alter table public.covers add constraint covers_variant_check
      check (variant in ('with_background', 'no_background'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'covers_source_check') then
    alter table public.covers add constraint covers_source_check
      check (source in ('ai', 'canva', 'manual'));
  end if;
end $$;

alter table public.books add column if not exists selected_back_cover_id uuid references public.covers(id) on delete set null;
