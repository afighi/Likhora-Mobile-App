-- Run this once in the Supabase SQL Editor.
--
-- Adds the Smart Calculator: a per-product pricing/costing tool
-- (src/app/calculator.tsx) that lets a user record what a product actually
-- costs them — bought per piece, per pack/case, or by kilo/liter, plus any
-- extra per-piece costs (dagdag gastos: gas, plastic, kuryente, etc.) —
-- apply a markup, and see the resulting exact selling price, margin,
-- profit per piece (tubo), and how many units they need to sell to earn
-- back what they spent on that batch (break-even / ROI).
--
-- Uses the same "to public" RLS pattern established in
-- week11_fix_firebase_authenticated_role.sql: Firebase-issued JWTs don't
-- carry Supabase's own `role` claim, so PostgREST does not resolve these
-- requests to the `authenticated` Postgres role — policies scoped
-- `to public` still fully enforce per-user ownership via
-- auth.jwt() ->> 'sub', they just don't additionally require a role that
-- never gets assigned.

-- NOTE: this is "create table if not exists" — if public.products already
-- exists from an earlier draft of this file, running it again does NOTHING and
-- the table keeps whatever columns it was originally built with. See
-- week14_products_column_reconcile.sql, which repairs exactly that drift.

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,

  name text not null,
  category text not null default '',
  labels text[] not null default '{}',
  image_url text,

  purchase_mode text not null default 'piece'
    check (purchase_mode in ('piece', 'pack', 'case', 'kilo', 'liter')),

  -- Raw inputs — only the ones relevant to purchase_mode are populated by
  -- the app, the rest stay null.
  manual_cost_per_piece numeric,      -- purchase_mode = 'piece'
  pack_total_price numeric,           -- purchase_mode = 'pack' | 'case'
  pack_item_count numeric,            -- purchase_mode = 'pack' | 'case'
  bulk_quantity numeric,              -- purchase_mode = 'kilo' | 'liter' (e.g. 5)
  bulk_total_price numeric,           -- purchase_mode = 'kilo' | 'liter'
  bulk_pieces_yielded numeric,        -- purchase_mode = 'kilo' | 'liter'
  batch_pieces numeric,               -- purchase_mode = 'piece' (how many bought)

  dagdag_gastos_per_piece numeric not null default 0, -- single lump sum: ice, plastic, kuryente, pamasahe, etc.

  markup_type text not null default 'percent' check (markup_type in ('percent', 'fixed')),
  markup_value numeric not null default 0,

  estimated_daily_units_sold numeric, -- optional, only used to project breakeven_days

  -- Computed results, snapshotted at save time so the list renders without
  -- recomputing, and past entries keep their result even if the formula
  -- changes later.
  puhunan numeric not null default 0,
  total_cost_per_piece numeric not null default 0,
  exact_selling_price numeric not null default 0,  -- before rounding to a practical retail price
  selling_price numeric not null default 0,        -- rounded — what every other figure below is based on
  tubo_per_piece numeric not null default 0,
  margin_percent numeric not null default 0,
  markup_percent_effective numeric not null default 0,
  batch_total_investment numeric not null default 0,
  batch_total_profit_potential numeric not null default 0,
  breakeven_units numeric,
  breakeven_days numeric,
  remaining_pieces_as_profit numeric,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_user_id_idx on public.products (user_id, created_at desc);

alter table public.products enable row level security;

drop policy if exists "products_owner_select" on public.products;
create policy "products_owner_select"
  on public.products for select
  to public
  using (user_id = (auth.jwt() ->> 'sub'));

drop policy if exists "products_owner_insert" on public.products;
create policy "products_owner_insert"
  on public.products for insert
  to public
  with check (user_id = (auth.jwt() ->> 'sub'));

drop policy if exists "products_owner_update" on public.products;
create policy "products_owner_update"
  on public.products for update
  to public
  using (user_id = (auth.jwt() ->> 'sub'))
  with check (user_id = (auth.jwt() ->> 'sub'));

drop policy if exists "products_owner_delete" on public.products;
create policy "products_owner_delete"
  on public.products for delete
  to public
  using (user_id = (auth.jwt() ->> 'sub'));

-- ---------------------------------------------------------------------------
-- Storage bucket for optional product photos.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- Public bucket — anyone with a file's URL can view it, same as every other
-- image already used in this app (community post photos, supplier photos).
drop policy if exists "product_images_public_read" on storage.objects;
create policy "product_images_public_read"
  on storage.objects for select
  to public
  using (bucket_id = 'product-images');

-- Writes are still owner-restricted: the app uploads to a path prefixed
-- with the Firebase UID ("{uid}/product-{id}.jpg"), and these policies
-- require that first path segment to match the verified token's sub claim.
drop policy if exists "product_images_owner_insert" on storage.objects;
create policy "product_images_owner_insert"
  on storage.objects for insert
  to public
  with check (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')
  );

drop policy if exists "product_images_owner_update" on storage.objects;
create policy "product_images_owner_update"
  on storage.objects for update
  to public
  using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')
  );

drop policy if exists "product_images_owner_delete" on storage.objects;
create policy "product_images_owner_delete"
  on storage.objects for delete
  to public
  using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')
  );
