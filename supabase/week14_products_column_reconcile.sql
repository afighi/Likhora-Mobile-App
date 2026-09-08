-- Run this once in the Supabase SQL Editor, AFTER week13_smart_calculator_ai.sql.
--
-- Reconciles public.products with what the app actually inserts.
--
-- The live table was created by an EARLIER draft of week12 than the file now
-- in this repo. That draft modelled dagdag gastos as a JSONB list of entries
-- plus a computed total, and predated two result columns the calculator now
-- saves. Because week12 uses "create table if not exists", every later run
-- skipped the existing table instead of correcting it — so three columns the
-- app writes were never added:
--
--   dagdag_gastos_per_piece     (now a single lump sum, not a list)
--   exact_selling_price         (price before rounding to a practical price)
--   remaining_pieces_as_profit  (pieces left over once break-even is passed)
--
-- Non-destructive on purpose. The legacy dagdag_gastos and
-- dagdag_gastos_total_per_piece columns are LEFT IN PLACE: both are NOT NULL
-- with defaults, so inserts that omit them keep working, and dropping them
-- would throw away whatever earlier saves recorded. Anything already stored
-- in the old total is carried across to the new column below.

alter table public.products
  add column if not exists dagdag_gastos_per_piece numeric not null default 0,
  add column if not exists exact_selling_price numeric not null default 0,
  add column if not exists remaining_pieces_as_profit numeric;

-- Carry the old per-piece total across, guarded so this file also runs
-- cleanly against a database built from the current week12, where the legacy
-- column never existed in the first place.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'products'
      and column_name = 'dagdag_gastos_total_per_piece'
  ) then
    update public.products
       set dagdag_gastos_per_piece = dagdag_gastos_total_per_piece
     where dagdag_gastos_per_piece = 0
       and dagdag_gastos_total_per_piece is distinct from 0;
  end if;
end $$;

-- exact_selling_price is only meaningful for rows saved by the current app.
-- For older rows the rounded price is the best available value, so seed it
-- rather than leaving a misleading 0.
update public.products
   set exact_selling_price = selling_price
 where exact_selling_price = 0
   and selling_price <> 0;

-- PostgREST caches the schema; without this the API can keep reporting the
-- new columns as unknown until it next reloads on its own.
notify pgrst, 'reload schema';
