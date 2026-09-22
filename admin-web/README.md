# LikhAI Admin Portal

A separate React + Vite + TypeScript + Tailwind web app for curating the supplier directory shown in the LikhAI mobile app (Objective 3: admin-curated supplier discovery). It does not share the mobile app's dependency tree — it's its own `package.json`.

Uses the same Firebase project and Supabase project as the mobile app. An account is granted portal access by setting `profiles.is_admin = true` for its Firebase UID (see `supabase/15_admin_and_market.sql` at the repo root).

## Run locally

```bash
npm install
npm run dev
```

## What it does

- **Suppliers** — create/edit/delete/publish-or-hide rows in the shared `suppliers` table. The mobile app only shows `status = 'published'` suppliers.
- **Activity Log** — every mutation here writes a row to `admin_audit_log`, visible on this page.

## Requirements

- `supabase/15_admin_and_market.sql` (repo root) must be run against the Supabase project first — it adds `profiles.is_admin`, locks `suppliers` writes to admins, and creates `admin_audit_log`.
- At least one Firebase account flagged `is_admin = true`.
