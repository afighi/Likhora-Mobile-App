-- ============================================================================
-- DO NOT RUN THIS YET.
--
-- Run this ONLY after BOTH of these are done, in order:
--   1. Firebase is added as a Third-Party Auth provider in your Supabase
--      Dashboard: Authentication -> Sign In / Providers -> Third Party Auth
--      -> Add Provider -> Firebase -> paste your Firebase Project ID
--      ("likhoraai", from src/services/firebase.ts).
--   2. The updated app (src/services/supabase.ts, which now sends the
--      current Firebase user's ID token with every Supabase request) is
--      running — i.e. you've pulled/rebuilt with that change.
--
-- Why the order matters: this script requires every request to carry a
-- valid, Supabase-verified Firebase token. If you run it before both steps
-- above are live, every roadmap/profile/notification read and write in the
-- app will start failing immediately (empty lists, failed saves) until they
-- are. Nothing here is destructive to your data — reverting is just
-- disabling RLS again — but it will look like an outage until the two
-- prerequisites are in place.
-- ============================================================================
--
-- Fixes: roadmaps, profiles, and notifications currently have no ownership
-- restriction (confirmed live: querying `roadmaps` with the app's own public
-- anon key returned all 43 rows across every user, unfiltered). The app's
-- own .eq('user_id', ...) query filters are not a security boundary — they
-- only shape what the app's own UI asks for; anyone with the anon key
-- (bundled in the app itself) could query these tables directly and bypass
-- them entirely. This migration makes the database itself enforce that a
-- user can only read or write their own rows.
--
-- Firebase ID tokens store the user's UID in the standard "sub" claim, which
-- is exactly the value this app already stores as user_id / profiles.id
-- (firebaseUser.uid). auth.uid() is NOT used here — it casts to uuid, and
-- Firebase UIDs aren't UUIDs — so ownership checks compare against
-- (auth.jwt() ->> 'sub') as text instead.

-- ---------------------------------------------------------------------------
-- roadmaps: each row belongs to exactly one user.
-- ---------------------------------------------------------------------------
alter table public.roadmaps enable row level security;

-- A pre-existing "Allow public access to roadmaps" policy (roles: public,
-- cmd: ALL) was found already on this table — almost certainly a Supabase
-- dashboard quick-start template policy created before this migration
-- existed. Postgres RLS grants access if ANY matching policy allows it, so
-- this one silently overrode every owner-only policy below on every command
-- (SELECT/INSERT/UPDATE/DELETE), for every role, including anon. It must be
-- dropped or the owner-only policies below have no effect at all.
drop policy if exists "Allow public access to roadmaps" on public.roadmaps;

drop policy if exists "roadmaps_owner_select" on public.roadmaps;
create policy "roadmaps_owner_select"
  on public.roadmaps for select
  to authenticated
  using (user_id = (auth.jwt() ->> 'sub'));

drop policy if exists "roadmaps_owner_insert" on public.roadmaps;
create policy "roadmaps_owner_insert"
  on public.roadmaps for insert
  to authenticated
  with check (user_id = (auth.jwt() ->> 'sub'));

drop policy if exists "roadmaps_owner_update" on public.roadmaps;
create policy "roadmaps_owner_update"
  on public.roadmaps for update
  to authenticated
  using (user_id = (auth.jwt() ->> 'sub'))
  with check (user_id = (auth.jwt() ->> 'sub'));

drop policy if exists "roadmaps_owner_delete" on public.roadmaps;
create policy "roadmaps_owner_delete"
  on public.roadmaps for delete
  to authenticated
  using (user_id = (auth.jwt() ->> 'sub'));

-- ---------------------------------------------------------------------------
-- profiles: each row's id IS the user's Firebase UID.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

-- Same pre-existing wide-open policy found on this table too — see the note
-- on public.roadmaps above.
drop policy if exists "Allow public access to profiles" on public.profiles;

drop policy if exists "profiles_owner_select" on public.profiles;
create policy "profiles_owner_select"
  on public.profiles for select
  to authenticated
  using (id = (auth.jwt() ->> 'sub'));

drop policy if exists "profiles_owner_insert" on public.profiles;
create policy "profiles_owner_insert"
  on public.profiles for insert
  to authenticated
  with check (id = (auth.jwt() ->> 'sub'));

drop policy if exists "profiles_owner_update" on public.profiles;
create policy "profiles_owner_update"
  on public.profiles for update
  to authenticated
  using (id = (auth.jwt() ->> 'sub'))
  with check (id = (auth.jwt() ->> 'sub'));

-- ---------------------------------------------------------------------------
-- notifications: each row belongs to exactly one user.
-- ---------------------------------------------------------------------------
alter table public.notifications enable row level security;

-- Same pre-existing wide-open policy found on this table too — see the note
-- on public.roadmaps above.
drop policy if exists "Allow public access to notifications" on public.notifications;

drop policy if exists "notifications_owner_select" on public.notifications;
create policy "notifications_owner_select"
  on public.notifications for select
  to authenticated
  using (user_id = (auth.jwt() ->> 'sub'));

drop policy if exists "notifications_owner_insert" on public.notifications;
create policy "notifications_owner_insert"
  on public.notifications for insert
  to authenticated
  with check (user_id = (auth.jwt() ->> 'sub'));

drop policy if exists "notifications_owner_update" on public.notifications;
create policy "notifications_owner_update"
  on public.notifications for update
  to authenticated
  using (user_id = (auth.jwt() ->> 'sub'))
  with check (user_id = (auth.jwt() ->> 'sub'));

-- ---------------------------------------------------------------------------
-- community_posts: browsing stays public (that's the point of Community),
-- but writes now require you to actually be the author you claim to be —
-- previously anyone with the anon key could publish or delete posts
-- attributed to any author_id, or delete someone else's shared template.
-- ---------------------------------------------------------------------------
drop policy if exists "community_posts_select_all" on public.community_posts;
create policy "community_posts_select_all"
  on public.community_posts for select
  to anon, authenticated
  using (true);

drop policy if exists "community_posts_insert_all" on public.community_posts;
drop policy if exists "community_posts_owner_insert" on public.community_posts;
create policy "community_posts_owner_insert"
  on public.community_posts for insert
  to authenticated
  with check (author_id = (auth.jwt() ->> 'sub'));

drop policy if exists "community_posts_delete_all" on public.community_posts;
drop policy if exists "community_posts_owner_delete" on public.community_posts;
create policy "community_posts_owner_delete"
  on public.community_posts for delete
  to authenticated
  using (author_id = (auth.jwt() ->> 'sub'));

-- ---------------------------------------------------------------------------
-- community_template_favorites: reading who favorited what stays open (low
-- sensitivity, and simpler for the app's existing queries), but you can only
-- create or remove favorites under your own user_id.
-- ---------------------------------------------------------------------------
drop policy if exists "community_favorites_select_all" on public.community_template_favorites;
create policy "community_favorites_select_all"
  on public.community_template_favorites for select
  to anon, authenticated
  using (true);

drop policy if exists "community_favorites_insert_all" on public.community_template_favorites;
drop policy if exists "community_favorites_owner_insert" on public.community_template_favorites;
create policy "community_favorites_owner_insert"
  on public.community_template_favorites for insert
  to authenticated
  with check (user_id = (auth.jwt() ->> 'sub'));

drop policy if exists "community_favorites_delete_all" on public.community_template_favorites;
drop policy if exists "community_favorites_owner_delete" on public.community_template_favorites;
create policy "community_favorites_owner_delete"
  on public.community_template_favorites for delete
  to authenticated
  using (user_id = (auth.jwt() ->> 'sub'));

-- ---------------------------------------------------------------------------
-- suppliers: intentionally left untouched — it's shared, non-personal
-- reference data (wholesale/market listings) meant to be publicly readable.
-- ---------------------------------------------------------------------------
