-- Run once in the Supabase SQL Editor.
--
-- Fixes: the Community tab shows zero posts for every user, including the
-- 35 templates from week6_community_templates.sql, even though the rows
-- exist in the table (confirmed via SQL Editor). Root cause: Row Level
-- Security is blocking every anon-key read on these tables, most likely
-- because RLS is enabled with no SELECT policy ever defined for them.
--
-- This app authenticates through Firebase, not Supabase Auth, so an
-- auth.uid()-based policy could never work here anyway — there is no
-- Supabase Auth session for these requests to match against. The app's
-- real access control is enforced in application code instead (e.g.
-- deleteCommunityPost only deletes rows matching the caller's author_id).
-- So these two community-facing tables get fully open policies, matching
-- their intended purpose: public, shareable templates.

alter table public.community_posts enable row level security;
alter table public.community_template_favorites enable row level security;

drop policy if exists "community_posts_select_all" on public.community_posts;
create policy "community_posts_select_all"
  on public.community_posts for select
  to anon, authenticated
  using (true);

drop policy if exists "community_posts_insert_all" on public.community_posts;
create policy "community_posts_insert_all"
  on public.community_posts for insert
  to anon, authenticated
  with check (true);

drop policy if exists "community_posts_delete_all" on public.community_posts;
create policy "community_posts_delete_all"
  on public.community_posts for delete
  to anon, authenticated
  using (true);

drop policy if exists "community_favorites_select_all" on public.community_template_favorites;
create policy "community_favorites_select_all"
  on public.community_template_favorites for select
  to anon, authenticated
  using (true);

drop policy if exists "community_favorites_insert_all" on public.community_template_favorites;
create policy "community_favorites_insert_all"
  on public.community_template_favorites for insert
  to anon, authenticated
  with check (true);

drop policy if exists "community_favorites_delete_all" on public.community_template_favorites;
create policy "community_favorites_delete_all"
  on public.community_template_favorites for delete
  to anon, authenticated
  using (true);
