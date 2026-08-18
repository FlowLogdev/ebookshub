-- Free tier: one ebook per account, ever. `free_ebook_used_at` is claimed at
-- book-creation time (not completion) so a user can't open two tabs and
-- start a second free book before the first finishes generating.
alter table public.profiles add column if not exists free_ebook_used_at timestamptz;

-- Marks a book as created under free-tier constraints (cheap model, 5-page/
-- 1,000-word/5-image caps — see lib/plans/free-tier.ts). Kept on the book
-- itself, independent of the owner's current plan, so the generation
-- pipeline still enforces the caps that were promised at creation time even
-- if the user upgrades mid-generation.
alter table public.books add column if not exists is_free_tier boolean not null default false;
