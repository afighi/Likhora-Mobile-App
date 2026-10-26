-- Migration 16: Add labor_cost_per_batch & material_cost to products, and allow 'Skipped' status in roadmaps
--
-- Run this in the Supabase SQL Editor if you want these columns and status checks persisted in your cloud database.

-- 1. Add labor_cost_per_batch & material_cost to public.products
alter table public.products 
  add column if not exists labor_cost_per_batch numeric default 0,
  add column if not exists material_cost numeric default 0;

-- 2. Update status check constraint on public.roadmaps if a check constraint exists
do $$
begin
  if exists (
    select 1 from pg_constraint 
    where conname = 'roadmaps_status_check'
  ) then
    alter table public.roadmaps drop constraint roadmaps_status_check;
    alter table public.roadmaps add constraint roadmaps_status_check 
      check (status in ('Pending', 'In Progress', 'Completed', 'Skipped'));
  end if;
end $$;
