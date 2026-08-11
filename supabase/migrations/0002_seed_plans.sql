-- Seed the default plan tiers (section 39). Admin tooling to edit these
-- without redeploying is a later phase — for now, edit rows directly or via
-- the Supabase dashboard.

insert into public.plans (id, name, price_cents, billing_interval, word_credits, image_credits, max_book_pages, features, sort_order)
values
  ('free', 'Free', 0, 'month', 20000, 10, 30,
    '["1 active project", "Standard AI writing", "Watermarked export"]'::jsonb, 0),
  ('creator', 'Creator', 1900, 'month', 150000, 100, 150,
    '["Unlimited projects", "Character creator", "PDF & ePub export", "No watermark"]'::jsonb, 1),
  ('pro', 'Pro', 4900, 'month', 600000, 500, 300,
    '["300-page books", "Premium image models", "Priority generation", "Commercial export"]'::jsonb, 2)
on conflict (id) do update set
  name = excluded.name,
  price_cents = excluded.price_cents,
  billing_interval = excluded.billing_interval,
  word_credits = excluded.word_credits,
  image_credits = excluded.image_credits,
  max_book_pages = excluded.max_book_pages,
  features = excluded.features,
  sort_order = excluded.sort_order;
