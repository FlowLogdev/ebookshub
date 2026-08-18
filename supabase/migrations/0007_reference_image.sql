-- Optional reference image a user uploads in the creation wizard (spec: "generate
-- images based on the image I provided"). Stored inline as a data: URI, same
-- pattern as covers.image_url, so no object-storage setup is required. Used by
-- lib/ai/image-provider.ts to condition cover/illustration generation on it.
alter table public.books add column if not exists reference_image_url text;
