-- Run this once in the Supabase SQL Editor.
--
-- Kilo/liter products used to ask the user "how many pieces does this make?",
-- which is the one number they should never have to work out. Someone who
-- bought 100 kg and sells it in 5 kg packs knows both of those figures; asking
-- them for 20 is asking them to do the division the calculator exists to do.
--
-- So the form now takes the quantity bought and the portion size, and derives
-- the piece count. bulk_quantity stops being an optional reference note and
-- becomes required input; bulk_portion_size is new; bulk_pieces_yielded stays,
-- but now stores the DERIVED count rather than a typed-in guess.

alter table public.products
  add column if not exists bulk_portion_size numeric,
  -- The unit the user typed the portion in. Stored so reopening a product
  -- shows "250 g" and not "0.25 kg" — the same quantity, but not the way
  -- someone selling 250-gram packs thinks about it.
  add column if not exists bulk_portion_unit text;

comment on column public.products.bulk_quantity is
  'Total quantity bought, in kilos or liters. Required for bulk purchase modes.';
comment on column public.products.bulk_portion_size is
  'Size of one sellable portion, always in the base unit (kilos or liters).';
comment on column public.products.bulk_portion_unit is
  'Display unit the portion was entered in: kg, g, L or ml.';
comment on column public.products.bulk_pieces_yielded is
  'Derived: floor(bulk_quantity / bulk_portion_size). No longer user-entered.';

notify pgrst, 'reload schema';
