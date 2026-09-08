-- Run this once in the Supabase SQL Editor.
--
-- Replaces the avatar colour swatch with a real profile photo, and carries
-- that photo onto community posts so a shared roadmap shows who published it.
--
-- Why the photo URL is COPIED onto the post rather than joined from profiles:
-- week8_secure_user_data.sql scopes profiles to owner-only SELECT, so one user
-- cannot read another user's profile row at all. A join would return nothing.
-- Snapshotting at publish time matches how business_label and the roadmap
-- template data are already stored, and means a post keeps rendering even if
-- the author later deletes their account.

alter table public.profiles
  add column if not exists avatar_url text;

alter table public.community_posts
  add column if not exists author_avatar_url text;

-- avatar_color stays: it is the background of the initials fallback shown
-- when a user has not set a photo. It is simply no longer user-editable.
comment on column public.profiles.avatar_color is
  'Background colour for the initials fallback when avatar_url is null.';

-- ---------------------------------------------------------------------------
-- Storage bucket for profile photos.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Public read: a community post has to render the author's photo for every
-- viewer, and those viewers cannot read the author's profile row.
drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read"
  on storage.objects for select
  to public
  using (bucket_id = 'avatars');

-- Writes stay owner-only. The app uploads to "{firebase_uid}/avatar-{ts}.jpg",
-- and these policies require that first path segment to match the verified
-- token's sub claim — same pattern as week12's product-images bucket.
drop policy if exists "avatars_owner_insert" on storage.objects;
create policy "avatars_owner_insert"
  on storage.objects for insert
  to public
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')
  );

drop policy if exists "avatars_owner_update" on storage.objects;
create policy "avatars_owner_update"
  on storage.objects for update
  to public
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')
  );

drop policy if exists "avatars_owner_delete" on storage.objects;
create policy "avatars_owner_delete"
  on storage.objects for delete
  to public
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')
  );

notify pgrst, 'reload schema';
