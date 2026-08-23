-- Run once in the Supabase SQL Editor.
-- Adds photo support to manually-seeded suppliers (public.suppliers).
--
-- Note: this only affects rows YOU seed directly into public.suppliers.
-- Suppliers pulled live from Google Places already carry a real photo URL
-- at request time and never touch this table.

alter table public.suppliers
  add column if not exists image_url text;

comment on column public.suppliers.image_url is
  'Optional direct image URL shown on the supplier card. Leave null to show the default placeholder icon — do not fabricate a URL.';
