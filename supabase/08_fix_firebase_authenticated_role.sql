-- Run this once in the Supabase SQL Editor.
--
-- Fixes: every owner-only RLS policy added in 05_secure_user_data.sql
-- and 06_user_templates.sql was scoped "to authenticated" — but Firebase
-- ID tokens don't carry a `role` claim the way Supabase's own auth tokens
-- do, so PostgREST has been resolving every request from this app as the
-- `anon` Postgres role instead, even with the Firebase Third-Party Auth
-- provider correctly connected (confirmed live: profile writes were
-- throwing 42501 "new row violates row-level security policy" on every
-- attempt, while reads were silently coming back empty instead of erroring
-- — RLS SELECT policies filter rows rather than raising an error, so a
-- request running as the wrong role just looks like "no data found").
--
-- Fix: re-scope these policies "to public" (Postgres's built-in "all
-- roles" pseudo-role) instead of "to authenticated", so they apply
-- regardless of which Postgres role the request resolves to. This does NOT
-- weaken the security boundary — every policy's actual check still
-- requires (auth.jwt() ->> 'sub') to equal the row's owner id/user_id, and
-- that claim is only ever populated from a Supabase-verified Firebase ID
-- token. A request with no valid token has a null `sub`, and `id = null`
-- is never true in SQL, so unauthenticated access is still fully blocked.

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
drop policy if exists "profiles_owner_select" on public.profiles;
create policy "profiles_owner_select"
  on public.profiles for select
  to public
  using (id = (auth.jwt() ->> 'sub'));

drop policy if exists "profiles_owner_insert" on public.profiles;
create policy "profiles_owner_insert"
  on public.profiles for insert
  to public
  with check (id = (auth.jwt() ->> 'sub'));

drop policy if exists "profiles_owner_update" on public.profiles;
create policy "profiles_owner_update"
  on public.profiles for update
  to public
  using (id = (auth.jwt() ->> 'sub'))
  with check (id = (auth.jwt() ->> 'sub'));

-- ---------------------------------------------------------------------------
-- roadmaps
-- ---------------------------------------------------------------------------
drop policy if exists "roadmaps_owner_select" on public.roadmaps;
create policy "roadmaps_owner_select"
  on public.roadmaps for select
  to public
  using (user_id = (auth.jwt() ->> 'sub'));

drop policy if exists "roadmaps_owner_insert" on public.roadmaps;
create policy "roadmaps_owner_insert"
  on public.roadmaps for insert
  to public
  with check (user_id = (auth.jwt() ->> 'sub'));

drop policy if exists "roadmaps_owner_update" on public.roadmaps;
create policy "roadmaps_owner_update"
  on public.roadmaps for update
  to public
  using (user_id = (auth.jwt() ->> 'sub'))
  with check (user_id = (auth.jwt() ->> 'sub'));

drop policy if exists "roadmaps_owner_delete" on public.roadmaps;
create policy "roadmaps_owner_delete"
  on public.roadmaps for delete
  to public
  using (user_id = (auth.jwt() ->> 'sub'));

-- ---------------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------------
drop policy if exists "notifications_owner_select" on public.notifications;
create policy "notifications_owner_select"
  on public.notifications for select
  to public
  using (user_id = (auth.jwt() ->> 'sub'));

drop policy if exists "notifications_owner_insert" on public.notifications;
create policy "notifications_owner_insert"
  on public.notifications for insert
  to public
  with check (user_id = (auth.jwt() ->> 'sub'));

drop policy if exists "notifications_owner_update" on public.notifications;
create policy "notifications_owner_update"
  on public.notifications for update
  to public
  using (user_id = (auth.jwt() ->> 'sub'))
  with check (user_id = (auth.jwt() ->> 'sub'));

-- ---------------------------------------------------------------------------
-- community_posts: select_all was already "to anon, authenticated" (fine,
-- unaffected) — only the owner-only insert/delete need the same fix.
-- ---------------------------------------------------------------------------
drop policy if exists "community_posts_owner_insert" on public.community_posts;
create policy "community_posts_owner_insert"
  on public.community_posts for insert
  to public
  with check (author_id = (auth.jwt() ->> 'sub'));

drop policy if exists "community_posts_owner_delete" on public.community_posts;
create policy "community_posts_owner_delete"
  on public.community_posts for delete
  to public
  using (author_id = (auth.jwt() ->> 'sub'));

-- ---------------------------------------------------------------------------
-- community_template_favorites: select_all was already "to anon,
-- authenticated" (fine, unaffected) — only owner-only insert/delete need it.
-- ---------------------------------------------------------------------------
drop policy if exists "community_favorites_owner_insert" on public.community_template_favorites;
create policy "community_favorites_owner_insert"
  on public.community_template_favorites for insert
  to public
  with check (user_id = (auth.jwt() ->> 'sub'));

drop policy if exists "community_favorites_owner_delete" on public.community_template_favorites;
create policy "community_favorites_owner_delete"
  on public.community_template_favorites for delete
  to public
  using (user_id = (auth.jwt() ->> 'sub'));

-- ---------------------------------------------------------------------------
-- user_templates
-- ---------------------------------------------------------------------------
drop policy if exists "user_templates_owner_select" on public.user_templates;
create policy "user_templates_owner_select"
  on public.user_templates for select
  to public
  using (user_id = (auth.jwt() ->> 'sub'));

drop policy if exists "user_templates_owner_insert" on public.user_templates;
create policy "user_templates_owner_insert"
  on public.user_templates for insert
  to public
  with check (user_id = (auth.jwt() ->> 'sub'));

drop policy if exists "user_templates_owner_update" on public.user_templates;
create policy "user_templates_owner_update"
  on public.user_templates for update
  to public
  using (user_id = (auth.jwt() ->> 'sub'))
  with check (user_id = (auth.jwt() ->> 'sub'));

drop policy if exists "user_templates_owner_delete" on public.user_templates;
create policy "user_templates_owner_delete"
  on public.user_templates for delete
  to public
  using (user_id = (auth.jwt() ->> 'sub'));
