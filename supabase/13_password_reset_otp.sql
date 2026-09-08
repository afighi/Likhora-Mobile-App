-- Run this once in the Supabase SQL Editor.
--
-- Backs the in-app password reset (email -> OTP -> new password), replacing
-- Firebase's emailed reset link.
--
-- SECURITY: every column here is written and read ONLY by the
-- "password-reset" Edge Function, which runs with the service role. There are
-- deliberately no RLS policies, so with RLS enabled the anon/authenticated
-- roles can do nothing with this table at all.
--
-- That separation is the whole point. The signup OTP is generated and checked
-- in the app, which is tolerable there (the worst case is verifying an email
-- you do not own, and you still set your own password). For a password reset
-- the same design would be an account-takeover hole: anyone could read the
-- generated code in devtools — or skip the comparison entirely — and set a new
-- password on any address. So the code is generated, stored and verified
-- server-side, and the client never sees it.

create table if not exists public.password_reset_otps (
  id uuid primary key default gen_random_uuid(),
  email text not null,

  -- SHA-256 of the code, never the code itself. A leaked database backup must
  -- not hand out working reset codes.
  code_hash text not null,

  expires_at timestamptz not null,
  -- Caps brute force: 1,000,000 possible codes is plenty, but only if an
  -- attacker cannot try them all against one issued code.
  attempts int not null default 0,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists password_reset_otps_email_idx
  on public.password_reset_otps (email, created_at desc);

alter table public.password_reset_otps enable row level security;

-- No policies on purpose: RLS with zero policies denies everything to every
-- role except the service role, which bypasses RLS. Drop any that a previous
-- run of this file may have created.
drop policy if exists "password_reset_otps_public" on public.password_reset_otps;

-- Housekeeping: consumed and expired rows have no further use. Call this from
-- a scheduled job if you add one; nothing breaks if it never runs.
create or replace function public.purge_expired_password_reset_otps()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.password_reset_otps
  where expires_at < now() - interval '1 day';
$$;

notify pgrst, 'reload schema';
