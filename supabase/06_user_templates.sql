-- Run this ONLY after the Firebase Third-Party Auth setup from
-- 05_secure_user_data.sql is live (Supabase Dashboard -> Authentication
-- -> Sign In / Providers -> Third Party Auth -> Firebase, plus the app's
-- updated src/services/supabase.ts). Same reasoning as week8: policies here
-- require every request to carry a Supabase-verified Firebase ID token, so
-- running this first means nobody can read or save templates until that
-- setup is done.
--
-- Adds a personal template library separate from a user's single active
-- roadmap: src/app/template-builder.tsx now saves each built template here
-- instead of only being able to overwrite your one active roadmap, and the
-- Community "Share" flow lets you pick which saved template (or your
-- current active roadmap) to publish, instead of always publishing
-- whatever your active roadmap happens to be.

create table if not exists public.user_templates (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  name text not null,
  business_type text not null default '',
  summary text not null default '',
  image_url text not null default '',
  template_data jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_templates_user_id_idx
  on public.user_templates (user_id, created_at desc);

alter table public.user_templates enable row level security;

drop policy if exists "user_templates_owner_select" on public.user_templates;
create policy "user_templates_owner_select"
  on public.user_templates for select
  to authenticated
  using (user_id = (auth.jwt() ->> 'sub'));

drop policy if exists "user_templates_owner_insert" on public.user_templates;
create policy "user_templates_owner_insert"
  on public.user_templates for insert
  to authenticated
  with check (user_id = (auth.jwt() ->> 'sub'));

drop policy if exists "user_templates_owner_update" on public.user_templates;
create policy "user_templates_owner_update"
  on public.user_templates for update
  to authenticated
  using (user_id = (auth.jwt() ->> 'sub'))
  with check (user_id = (auth.jwt() ->> 'sub'));

drop policy if exists "user_templates_owner_delete" on public.user_templates;
create policy "user_templates_owner_delete"
  on public.user_templates for delete
  to authenticated
  using (user_id = (auth.jwt() ->> 'sub'));
