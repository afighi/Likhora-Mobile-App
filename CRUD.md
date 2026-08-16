# LikhAI CRUD Implementation

## Main entity: roadmap tasks

LikhAI stores each user's roadmap tasks in Supabase (`public.roadmaps`). The Roadmap tab provides complete CRUD functionality:

- **Create:** “Add custom business task” saves a user-defined task with a title, category, and optional notes.
- **Read:** the Roadmap tab loads the signed-in user's saved tasks and displays their progress.
- **Update:** users can mark a task or its steps complete/in progress; these changes are saved to Supabase.
- **Delete:** the trash action removes a selected task after a confirmation prompt.

Validation prevents saving a custom task without a title. All task changes are persisted in Supabase and cached locally for resilience.

## Additional data features

- Notifications are loaded from Supabase, saved when roadmap steps are completed, and can be marked as read.
- Community members can publish their roadmap as a reusable business template, view public founder cards, use another founder's template, and delete their own posts.

## Database setup

Run [`supabase/week4_crud_and_community.sql`](./supabase/week4_crud_and_community.sql) once in the Supabase SQL Editor before testing the custom-task and community features.

## Suggested screenshots for submission

1. **Create:** custom task form and the newly created task in the roadmap.
2. **Read:** roadmap task list after reopening the app.
3. **Update:** task marked complete with the updated progress percentage.
4. **Delete:** delete confirmation and the roadmap after removal.
