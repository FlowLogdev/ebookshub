-- Align the database plan metadata with the enforced Free plan: one short,
-- text-only ebook. Server-side checks remain the source of enforcement.
update public.plans
set
  word_credits = 1000,
  image_credits = 0,
  max_book_pages = 5,
  features = '["1 ebook total", "Up to 5 pages / 1,000 words", "Text only — no images", "Watermarked preview"]'::jsonb
where id = 'free';
