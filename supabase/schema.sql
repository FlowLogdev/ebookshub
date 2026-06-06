-- Categories table
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  created_at timestamptz default now()
);

-- Books table
create table if not exists books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text not null default 'Fabio Almeida',
  description text not null,
  price numeric(10,2) not null,
  cover_url text,
  file_url text,
  category_id uuid references categories(id) on delete set null,
  stripe_price_id text,
  stripe_product_id text,
  published boolean default true,
  preview_pages integer default 0,
  created_at timestamptz default now()
);

-- Orders table
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  book_id uuid references books(id) on delete set null,
  customer_email text not null,
  stripe_session_id text not null unique,
  stripe_payment_intent text,
  amount numeric(10,2) not null,
  status text not null default 'pending' check (status in ('pending','completed','failed')),
  download_token text not null unique default gen_random_uuid()::text,
  download_expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz default now()
);

-- Storage bucket for books and covers
insert into storage.buckets (id, name, public) values ('covers', 'covers', true) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('books', 'books', false) on conflict do nothing;

-- Public read on covers
create policy if not exists "Public can view covers"
  on storage.objects for select
  using (bucket_id = 'covers');

-- Service role can manage all storage
create policy if not exists "Service role manages covers"
  on storage.objects for all
  using (auth.role() = 'service_role');

create policy if not exists "Service role manages books"
  on storage.objects for all
  using (auth.role() = 'service_role');

-- RLS
alter table categories enable row level security;
alter table books enable row level security;
alter table orders enable row level security;

create policy if not exists "Anyone can read categories" on categories for select using (true);
create policy if not exists "Anyone can read published books" on books for select using (published = true);
create policy if not exists "Service role manages books" on books for all using (auth.role() = 'service_role');
create policy if not exists "Service role manages categories" on categories for all using (auth.role() = 'service_role');
create policy if not exists "Service role manages orders" on orders for all using (auth.role() = 'service_role');

-- Seed default categories
insert into categories (name, slug, description) values
  ('Self-Help', 'self-help', 'Books for personal growth and development'),
  ('Health & Wellness', 'health-wellness', 'Books on mental and physical health'),
  ('Relationships', 'relationships', 'Books on love, connection, and relationships'),
  ('Business', 'business', 'Books on entrepreneurship and career'),
  ('Mindfulness', 'mindfulness', 'Books on meditation and mindfulness')
on conflict (slug) do nothing;

-- Seed initial book: Break Free from Emotional Dependence
insert into books (title, author, description, price, category_id, published)
select
  'Break Free from Emotional Dependence',
  'Fabio Almeida',
  'Discover how to break free from toxic patterns of emotional dependence and build healthy, fulfilling relationships. This transformative guide offers practical tools to recognize codependency, heal attachment wounds, and reclaim your emotional independence. Whether you struggle with love addiction, people-pleasing, or fear of abandonment—this book gives you the roadmap to lasting inner freedom.',
  19.99,
  id,
  true
from categories where slug = 'relationships'
on conflict do nothing;
