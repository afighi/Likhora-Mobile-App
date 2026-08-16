-- Run once in the Supabase SQL Editor.
-- Supports roadmap CRUD, shareable community templates, and notification Realtime.

-- Older versions of the roadmaps table required an ID but did not generate one.
-- This lets Postgres assign a UUID when a client inserts a new roadmap task.
create extension if not exists pgcrypto;

alter table public.roadmaps
  alter column id set default gen_random_uuid();

alter table public.roadmaps
  add column if not exists client_key text,
  add column if not exists sub_steps jsonb not null default '[]'::jsonb;

update public.roadmaps
set client_key = coalesce(client_key, id::text)
where client_key is null;

alter table public.roadmaps
  alter column client_key set not null;

alter table public.suppliers
  add column if not exists price_range text default 'Contact supplier for current prices';

create unique index if not exists roadmaps_user_client_key_unique
  on public.roadmaps (user_id, client_key);

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  author_id text not null,
  author_name text not null,
  business_name text not null,
  business_type text not null default '',
  location text not null default '',
  summary text not null default '',
  image_url text not null default '',
  template_data jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.community_posts
  add column if not exists image_url text not null default '';

create index if not exists community_posts_created_at_idx
  on public.community_posts (created_at desc);

create table if not exists public.community_template_favorites (
  user_id text not null,
  post_id uuid not null references public.community_posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

-- One example of a founder-created, shareable roadmap template.
insert into public.community_posts (author_id, author_name, business_name, business_type, location, summary, image_url, template_data)
select
  'likhai-example-founder',
  'Mika Santos',
  'Weekend Coffee Cart',
  'Food & Beverage',
  'Quezon City, Metro Manila',
  'A practical four-step plan for testing a small weekend coffee cart before committing to a permanent location.',
  '',
  '[
    {"client_key":"coffee-1","user_id":"template","title":"Validate the weekend market","category":"Research","status":"Pending","desc":"Visit three weekend markets and record foot traffic, competing drink prices, and stall fees.","step_order":1,"sub_steps":[]},
    {"client_key":"coffee-2","user_id":"template","title":"Cost the starter menu","category":"Finance","status":"Pending","desc":"Cost three drinks, including cups, ice, milk, syrups, and 20% wastage.","step_order":2,"sub_steps":[]},
    {"client_key":"coffee-3","user_id":"template","title":"Secure permits and stall requirements","category":"Permits","status":"Pending","desc":"Confirm barangay, market, and food-handling requirements before operating.","step_order":3,"sub_steps":[]},
    {"client_key":"coffee-4","user_id":"template","title":"Run a two-weekend pilot","category":"Launch","status":"Pending","desc":"Track sales by drink, best-selling hours, and customer feedback before expanding.","step_order":4,"sub_steps":[]}
  ]'::jsonb
where not exists (select 1 from public.community_posts where author_id = 'likhai-example-founder' and business_name = 'Weekend Coffee Cart');

do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.community_posts;
exception when duplicate_object then null;
end $$;
