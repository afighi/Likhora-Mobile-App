-- ============================================================================
-- Run this in the Supabase SQL Editor.
-- Fixes Postgres Error 42P17 (infinite recursion detected in policy for relation "profiles")
-- and enables complete admin controls across profiles, user roadmaps, notifications, and forums.
-- ============================================================================

-- 1. Drop the recursive policies on profiles immediately to restore login
drop policy if exists "profiles_admin_select" on public.profiles;
drop policy if exists "profiles_admin_update" on public.profiles;

-- 2. Create a SECURITY DEFINER helper function.
-- Because this function is SECURITY DEFINER, it queries public.profiles with the
-- privileges of the function creator (postgres/superuser), bypassing caller RLS.
-- This completely avoids infinite recursion loop when profiles RLS is evaluated.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select is_admin from public.profiles where id = (auth.jwt() ->> 'sub') limit 1),
    false
  );
$$;

grant execute on function public.is_admin() to public, anon, authenticated;

-- 3. Safely allow admins to view all user profiles in the Admin Directory
create policy "profiles_admin_select"
  on public.profiles for select
  to public
  using (public.is_admin());

create policy "profiles_admin_update"
  on public.profiles for update
  to public
  using (public.is_admin())
  with check (public.is_admin());

-- 4. roadmaps: Admins can inspect and inject/modify roadmap steps for any user
drop policy if exists "roadmaps_admin_select" on public.roadmaps;
create policy "roadmaps_admin_select"
  on public.roadmaps for select
  to public
  using (public.is_admin());

drop policy if exists "roadmaps_admin_insert" on public.roadmaps;
create policy "roadmaps_admin_insert"
  on public.roadmaps for insert
  to public
  with check (public.is_admin());

drop policy if exists "roadmaps_admin_update" on public.roadmaps;
create policy "roadmaps_admin_update"
  on public.roadmaps for update
  to public
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "roadmaps_admin_delete" on public.roadmaps;
create policy "roadmaps_admin_delete"
  on public.roadmaps for delete
  to public
  using (public.is_admin());

-- 5. notifications: Admins can send notification events to user inboxes
drop policy if exists "notifications_admin_insert" on public.notifications;
create policy "notifications_admin_insert"
  on public.notifications for insert
  to public
  with check (public.is_admin());

-- 6. Community Forums (Kapihan Q&A & Discussions)
create table if not exists public.community_forum_posts (
  id uuid primary key default gen_random_uuid(),
  author_id text not null,
  author_name text not null,
  author_avatar_url text,
  business_type text not null default '',
  topic text not null default 'Permits & LGU',
  title text not null,
  content text not null,
  ai_advice text default '',
  statutory_ref text default '',
  is_pinned boolean not null default false,
  is_verified_solution boolean not null default false,
  helpful_votes int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.community_forum_replies (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_forum_posts(id) on delete cascade,
  author_id text not null,
  author_name text not null,
  author_avatar_url text,
  author_role text not null default 'member',
  reply_text text not null,
  created_at timestamptz not null default now()
);

alter table public.community_forum_posts enable row level security;
alter table public.community_forum_replies enable row level security;

drop policy if exists "community_forum_posts_select" on public.community_forum_posts;
create policy "community_forum_posts_select" on public.community_forum_posts for select to public using (true);

drop policy if exists "community_forum_posts_insert" on public.community_forum_posts;
create policy "community_forum_posts_insert" on public.community_forum_posts for insert to public with check (true);

drop policy if exists "community_forum_posts_delete" on public.community_forum_posts;
create policy "community_forum_posts_delete" on public.community_forum_posts for delete to public using (
  author_id = (auth.jwt() ->> 'sub') or public.is_admin()
);

drop policy if exists "community_forum_replies_select" on public.community_forum_replies;
create policy "community_forum_replies_select" on public.community_forum_replies for select to public using (true);

drop policy if exists "community_forum_replies_insert" on public.community_forum_replies;
create policy "community_forum_replies_insert" on public.community_forum_replies for insert to public with check (true);

drop policy if exists "community_forum_replies_delete" on public.community_forum_replies;
create policy "community_forum_replies_delete" on public.community_forum_replies for delete to public using (
  author_id = (auth.jwt() ->> 'sub') or public.is_admin()
);
