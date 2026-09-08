-- Run once in the Supabase SQL Editor.
--
-- Adds columns so profile.tsx's avatar color picker and notification
-- toggles actually persist across sessions, instead of silently resetting
-- to their defaults every time the Profile screen remounts (they were
-- local-only React state before this).
--
-- Note on the notification toggles: this only makes the PREFERENCE itself
-- real and durable. There is no push-notification delivery system wired up
-- yet (that's still an open item — see FEATURE_LIST.md's "Native Mobile
-- Push Notifications" backlog entry), so these columns currently just
-- record what the user asked for, ready for that system to read once built.

alter table public.profiles
  add column if not exists avatar_color text not null default '#7C3AED',
  add column if not exists push_notifications_enabled boolean not null default true,
  add column if not exists email_notifications_enabled boolean not null default true;
