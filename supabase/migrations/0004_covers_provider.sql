-- Track which image provider actually produced each cover (Gemini /
-- Higgsfield / OpenAI fallback chain — see lib/ai/image-provider.ts).
alter table public.covers add column if not exists provider text;
