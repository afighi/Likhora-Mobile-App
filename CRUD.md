# LikhAI CRUD Implementation

## Main entity: roadmap tasks

LikhAI stores each user's roadmap tasks in Supabase (`public.roadmaps`). The Roadmap tab (`src/app/(tabs)/roadmap.tsx`) provides complete CRUD functionality, presented as a guided, sequential stepper (each step unlocks only after the previous one is completed):

- **Create:** the "Create your own template" button opens a dedicated template builder (`src/app/template-builder.tsx`) where a user adds as many steps as they want, each with a title, category, description, and checklist sub-steps — saved to their personal template library (`public.user_templates` via `createUserTemplate`). From there they can set it as their active roadmap (`replaceUserRoadmap`) and/or publish it to the Community tab.
- **Read:** the Roadmap tab loads the signed-in user's saved tasks (`fetchUserRoadmap`) and displays live progress.
- **Update:** users mark a task or its individual sub-steps complete/in progress; changes are saved via `saveUserRoadmap`, and profile/onboarding edits are saved via `syncUserProfile`.
- **Delete:** the "Remove this step" action in the task detail view removes a selected task after a confirmation prompt (`deleteRoadmapTask`).

Validation prevents saving a template without a name or without at least one titled step. All task changes are persisted in Supabase and cached locally for resilience.

## Additional data features

- **Notifications**: loaded from Supabase (`public.notifications`), created when roadmap steps are completed, and marked read individually or all at once (`NotificationContext.tsx`).
- **Community templates**: users choose what to share — either their current active roadmap or any saved template from their personal library — describe it, and publish it (`createCommunityPost`). Other users can browse, favorite, and import (`replaceUserRoadmap`) any published template, and delete their own posts (`deleteCommunityPost`). The Community tab ships pre-seeded with 35 curated templates (5 per business category) in addition to whatever users publish themselves.
- **Suppliers**: nearby wholesale suppliers are sourced live (Google Places API when configured, OpenStreetMap Overpass/Nominatim otherwise, with a Supabase table as a further fallback), filterable by distance, rating, price level, and category, and tailored to the user's onboarding business type.

## Database setup

Run these once, **in order**, in the Supabase SQL Editor:

1. [`supabase/01_crud_and_community.sql`](./supabase/01_crud_and_community.sql) — base roadmap/community schema.
2. [`supabase/02_supplier_photos.sql`](./supabase/02_supplier_photos.sql) — optional supplier image column.
3. [`supabase/03_community_templates.sql`](./supabase/03_community_templates.sql) — seeds the 35 curated community templates.
4. [`supabase/04_fix_community_rls.sql`](./supabase/04_fix_community_rls.sql) — fixes Community tab read access.
5. **Prerequisite for steps 6–8**: add Firebase as a Third-Party Auth provider in the Supabase Dashboard (Authentication → Sign In / Providers → Third Party Auth → Firebase → your Firebase Project ID). Without this, steps 6–8 will lock everyone out of their own data instead of just their own.
6. [`supabase/05_secure_user_data.sql`](./supabase/05_secure_user_data.sql) — enforces that a user can only read/write their own roadmap, profile, and notifications.
7. [`supabase/06_user_templates.sql`](./supabase/06_user_templates.sql) — personal template library table.
8. [`supabase/07_profile_preferences.sql`](./supabase/07_profile_preferences.sql) — avatar color and notification preference columns (no auth prerequisite, safe to run anytime).

## Suggested screenshots for submission

1. **Create:** the template builder's step-adding form, and the newly created template in the roadmap.
2. **Read:** roadmap step list after reopening the app, showing the sequential stepper.
3. **Update:** a step marked complete with the updated progress percentage, unlocking the next step.
4. **Delete:** the delete confirmation and the roadmap after removal.
