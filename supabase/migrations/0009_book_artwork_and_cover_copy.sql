-- Creator-selected artwork and short cover copy. Images remain in the existing
-- images table; the new source/slot fields make user uploads and AI artwork
-- distinguishable and keep their order stable in the finished book.
alter table public.books
  add column if not exists requested_image_count integer not null default 0,
  add column if not exists image_source text not null default 'ai',
  add column if not exists front_cover_copy text,
  add column if not exists back_cover_copy text;

alter table public.books drop constraint if exists books_requested_image_count_range;
alter table public.books add constraint books_requested_image_count_range
  check (requested_image_count between 0 and 10);
alter table public.books drop constraint if exists books_image_source_check;
alter table public.books add constraint books_image_source_check
  check (image_source in ('ai', 'upload', 'mixed'));
alter table public.books drop constraint if exists books_front_cover_copy_word_count;
alter table public.books add constraint books_front_cover_copy_word_count
  check (front_cover_copy is null or cardinality(regexp_split_to_array(trim(front_cover_copy), '\\s+')) <= 100);
alter table public.books drop constraint if exists books_back_cover_copy_word_count;
alter table public.books add constraint books_back_cover_copy_word_count
  check (back_cover_copy is null or cardinality(regexp_split_to_array(trim(back_cover_copy), '\\s+')) <= 100);

alter table public.images
  add column if not exists source text not null default 'ai',
  add column if not exists slot_index integer;
alter table public.images drop constraint if exists images_source_check;
alter table public.images add constraint images_source_check check (source in ('ai', 'upload'));
create unique index if not exists images_book_slot_idx
  on public.images (book_id, slot_index) where slot_index is not null;
