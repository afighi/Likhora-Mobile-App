-- Run this once in the Supabase SQL Editor, AFTER week12_smart_calculator.sql.
--
-- Turns the Smart Calculator into an actually-smart one:
--
--   1. The user no longer picks a markup. They only enter what they alone
--      can know — what the product is, how they bought it, and what it cost.
--      Khora AI works out the category, the right markup for that kind of
--      product, and the selling price, and explains the reasoning in Taglish.
--      The user can still nudge the final price; when they do, we record that
--      as price_source = 'manual' so the AI's original call is never lost.
--
--   2. Every product is filed under one business roadmap — either the user's
--      active roadmap, or one of the saved roadmaps in their template library
--      (public.user_templates) — so someone running more than one venture
--      keeps a separate price book for each.
--
-- Additive only — existing rows keep their saved figures.

alter table public.products
  -- 'active' for the user's live roadmap, otherwise user_templates.id.
  -- Deliberately a text key rather than a foreign key: 'active' is not a row,
  -- and deleting a template should orphan its products rather than delete them.
  add column if not exists business_key text,
  add column if not exists business_label text,            -- snapshot of the roadmap/business name at save time
  add column if not exists ai_suggested_price numeric,     -- what Khora recommended, before any manual nudge
  add column if not exists ai_suggested_markup_percent numeric,
  add column if not exists ai_reasoning text,              -- short Taglish explanation shown on the result card
  add column if not exists ai_confidence text,             -- 'high' | 'medium' | 'estimate'
  add column if not exists ai_tips text[] not null default '{}',
  add column if not exists ai_source text,                 -- 'khora-ai' | 'offline'
  add column if not exists price_source text not null default 'ai';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'products_price_source_check'
  ) then
    alter table public.products
      add constraint products_price_source_check
      check (price_source in ('ai', 'manual'));
  end if;
end $$;

-- The category is now inferred by Khora rather than typed by the user, so it
-- must be allowed to stay empty until a suggestion comes back.
alter table public.products alter column category drop not null;

-- markup_type / markup_value are still written on every save, but they are now
-- DERIVED from the final selling price rather than entered by hand. They stay
-- for backwards compatibility and for anyone querying the table directly.
comment on column public.products.markup_value is
  'Derived from the final selling price (percent over total cost) — no longer a user input.';

-- Products are read per-business in the calculator list, so index that path.
create index if not exists products_user_business_idx
  on public.products (user_id, business_key);

-- An earlier draft of this migration filed products against a single roadmap
-- STEP instead of a whole roadmap. Those columns were never populated by any
-- released build, so drop them if a pre-release run of this file created them.
alter table public.products
  drop column if exists roadmap_step_key,
  drop column if exists roadmap_step_title;
drop index if exists products_user_step_idx;

-- public.products.labels is unused by the app (it was never populated). Left in
-- place rather than dropped so this migration stays non-destructive; its
-- "not null default '{}'" means inserts that omit it keep working.
