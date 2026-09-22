-- Run this once in the Supabase SQL Editor (after 08_fix_firebase_authenticated_role.sql,
-- which is already live). Same auth pattern as every migration since 05: policies compare
-- (auth.jwt() ->> 'sub') — the Firebase UID — against a text owner column, scoped "to public"
-- because Firebase ID tokens don't carry a Postgres `role` claim (see 08's header comment).
--
-- Adds the schema for three things:
--   1. An admin flag on profiles, so a Web Admin Portal can be told apart from a regular user.
--   2. Real ownership/write control on `suppliers` — today it has ZERO RLS (intentionally, per
--      05_secure_user_data.sql's closing note, "shared, non-personal reference data"), which
--      also means anyone holding the app's anon key can currently insert/edit/delete supplier
--      rows directly. This migration keeps suppliers publicly readable but restricts writes to
--      admins only, matching the "admin-curated supplier discovery" objective.
--   3. New tables for AI market/location analysis results and AI-assisted business portfolios,
--      both owner-only like `roadmaps`/`user_templates`.

-- ---------------------------------------------------------------------------
-- profiles.is_admin — a single boolean flag. No separate admin_users table:
-- one flag on the row that already is the user's identity is simpler to
-- check from both RLS policies and the admin portal's login gate.
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- ---------------------------------------------------------------------------
-- suppliers: keep public read (that's the point of Supplier Discovery), but
-- writes now require the caller's profile to have is_admin = true.
-- ---------------------------------------------------------------------------
alter table public.suppliers
  add column if not exists curated_by text,
  add column if not exists status text not null default 'published';

alter table public.suppliers
  add constraint suppliers_status_check
  check (status in ('published', 'hidden'));

alter table public.suppliers enable row level security;

drop policy if exists "suppliers_select_all" on public.suppliers;
create policy "suppliers_select_all"
  on public.suppliers for select
  to public
  using (true);

drop policy if exists "suppliers_admin_insert" on public.suppliers;
create policy "suppliers_admin_insert"
  on public.suppliers for insert
  to public
  with check (
    exists (
      select 1 from public.profiles
      where id = (auth.jwt() ->> 'sub') and is_admin = true
    )
  );

drop policy if exists "suppliers_admin_update" on public.suppliers;
create policy "suppliers_admin_update"
  on public.suppliers for update
  to public
  using (
    exists (
      select 1 from public.profiles
      where id = (auth.jwt() ->> 'sub') and is_admin = true
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where id = (auth.jwt() ->> 'sub') and is_admin = true
    )
  );

drop policy if exists "suppliers_admin_delete" on public.suppliers;
create policy "suppliers_admin_delete"
  on public.suppliers for delete
  to public
  using (
    exists (
      select 1 from public.profiles
      where id = (auth.jwt() ->> 'sub') and is_admin = true
    )
  );

-- ---------------------------------------------------------------------------
-- market_analyses: one row per (user, business, location) analysis run.
-- Competitor density/rating/review-count fields are real Google Places
-- aggregates fetched by the app, never AI-invented; the jsonb fields hold the
-- AI's reasoning over those aggregates plus the user's own edits.
-- ---------------------------------------------------------------------------
create table if not exists public.market_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  business_type text not null default '',
  location_label text not null default '',
  location_lat double precision,
  location_lng double precision,
  competitor_count int not null default 0,
  avg_competitor_rating numeric,
  avg_review_count int,
  saturation_signal text not null default 'unknown',
  suggested_target_market jsonb not null default '{}'::jsonb,
  user_target_market_override jsonb,
  demographic_breakdown jsonb not null default '[]'::jsonb,
  source text not null default 'khora-ai',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists market_analyses_user_id_idx
  on public.market_analyses (user_id, created_at desc);

alter table public.market_analyses enable row level security;

drop policy if exists "market_analyses_owner_select" on public.market_analyses;
create policy "market_analyses_owner_select"
  on public.market_analyses for select
  to public
  using (user_id = (auth.jwt() ->> 'sub'));

drop policy if exists "market_analyses_owner_insert" on public.market_analyses;
create policy "market_analyses_owner_insert"
  on public.market_analyses for insert
  to public
  with check (user_id = (auth.jwt() ->> 'sub'));

drop policy if exists "market_analyses_owner_update" on public.market_analyses;
create policy "market_analyses_owner_update"
  on public.market_analyses for update
  to public
  using (user_id = (auth.jwt() ->> 'sub'))
  with check (user_id = (auth.jwt() ->> 'sub'));

drop policy if exists "market_analyses_owner_delete" on public.market_analyses;
create policy "market_analyses_owner_delete"
  on public.market_analyses for delete
  to public
  using (user_id = (auth.jwt() ->> 'sub'));

-- ---------------------------------------------------------------------------
-- business_portfolios: a user's compiled output (chosen name/description,
-- plus snapshots of their roadmap/costing/suppliers at export time).
-- Snapshots are copies (like community_posts.template_data), not live
-- references, so a portfolio stays stable even if the source roadmap changes
-- later.
-- ---------------------------------------------------------------------------
create table if not exists public.business_portfolios (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  business_name text not null default '',
  business_description text not null default '',
  ai_name_suggestions jsonb not null default '[]'::jsonb,
  selected_roadmap_snapshot jsonb not null default '[]'::jsonb,
  selected_costing_snapshot jsonb not null default '[]'::jsonb,
  selected_suppliers jsonb not null default '[]'::jsonb,
  exported_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists business_portfolios_user_id_idx
  on public.business_portfolios (user_id, created_at desc);

alter table public.business_portfolios enable row level security;

drop policy if exists "business_portfolios_owner_select" on public.business_portfolios;
create policy "business_portfolios_owner_select"
  on public.business_portfolios for select
  to public
  using (user_id = (auth.jwt() ->> 'sub'));

drop policy if exists "business_portfolios_owner_insert" on public.business_portfolios;
create policy "business_portfolios_owner_insert"
  on public.business_portfolios for insert
  to public
  with check (user_id = (auth.jwt() ->> 'sub'));

drop policy if exists "business_portfolios_owner_update" on public.business_portfolios;
create policy "business_portfolios_owner_update"
  on public.business_portfolios for update
  to public
  using (user_id = (auth.jwt() ->> 'sub'))
  with check (user_id = (auth.jwt() ->> 'sub'));

drop policy if exists "business_portfolios_owner_delete" on public.business_portfolios;
create policy "business_portfolios_owner_delete"
  on public.business_portfolios for delete
  to public
  using (user_id = (auth.jwt() ->> 'sub'));

-- ---------------------------------------------------------------------------
-- admin_audit_log: append-only trail of admin actions (supplier curation,
-- future moderation). Only admins can read or write it — regular users have
-- no policy at all here, so RLS denies them by default.
-- ---------------------------------------------------------------------------
create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id text not null,
  action text not null,
  target_table text not null,
  target_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_log_created_at_idx
  on public.admin_audit_log (created_at desc);

alter table public.admin_audit_log enable row level security;

drop policy if exists "admin_audit_log_admin_select" on public.admin_audit_log;
create policy "admin_audit_log_admin_select"
  on public.admin_audit_log for select
  to public
  using (
    exists (
      select 1 from public.profiles
      where id = (auth.jwt() ->> 'sub') and is_admin = true
    )
  );

drop policy if exists "admin_audit_log_admin_insert" on public.admin_audit_log;
create policy "admin_audit_log_admin_insert"
  on public.admin_audit_log for insert
  to public
  with check (
    admin_id = (auth.jwt() ->> 'sub')
    and exists (
      select 1 from public.profiles
      where id = (auth.jwt() ->> 'sub') and is_admin = true
    )
  );

-- ---------------------------------------------------------------------------
-- After running this file, flag your own account as admin so the Web Admin
-- Portal will let you in (replace with your actual Firebase UID — the same
-- id you'll see as profiles.id / roadmaps.user_id for your account):
--
--   update public.profiles set is_admin = true where id = '<your-firebase-uid>';
-- ---------------------------------------------------------------------------
