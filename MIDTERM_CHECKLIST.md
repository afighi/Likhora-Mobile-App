# Likhora AI - Midterm Project Evaluation Checklist & Status Report

**Project Name:** Likhora AI  
**Evaluated Codebase:** [`c:\Users\hiverpc\LikhAI`](file:///c:/Users/hiverpc/LikhAI)  
**Date:** August 19, 2026  

---

## Checklist Evaluation

### A. Project Documentation
- [x] **Project Objectives Defined**  
  *Status:* **Checked / Implemented**  
  *Evidence:* Defined in [`README.md`](file:///c:/Users/hiverpc/LikhAI/README.md), [`SUBMISSION_REPORT.md`](file:///c:/Users/hiverpc/LikhAI/SUBMISSION_REPORT.md), and [`src/app/onboarding.tsx`](file:///c:/Users/hiverpc/LikhAI/src/app/onboarding.tsx) (Empowering Filipino micro-entrepreneurs through AI roadmap generation, supplier lookup, and community template sharing).
- [x] **Scope and Limitations Identified**  
  *Status:* **Checked / Implemented**  
  *Evidence:* Detailed in [`SUBMISSION_REPORT.md`](file:///c:/Users/hiverpc/LikhAI/SUBMISSION_REPORT.md) (15 km Overpass API radius query limit, 4-second timeout handling, Supabase database fallback, PSGC location boundaries).
- [x] **Updated System Flowchart / Architecture Diagram**  
  *Status:* **Checked / Implemented**  
  *Evidence:* System Architecture Diagram & Data Flowchart created in [`SUBMISSION_REPORT.md`](file:///c:/Users/hiverpc/LikhAI/SUBMISSION_REPORT.md) Section 6 (Mermaid interactive diagrams) and saved graphic asset [`assets/system_architecture_diagram.png`](file:///c:/Users/hiverpc/LikhAI/assets/system_architecture_diagram.png).
- [x] **Database Design (ERD or Schema)**  
  *Status:* **Checked / Implemented**  
  *Evidence:* Detailed ERD diagram and 6-table schema added to [`SUBMISSION_REPORT.md`](file:///c:/Users/hiverpc/LikhAI/SUBMISSION_REPORT.md) Section 7, migration script in [`supabase/week4_crud_and_community.sql`](file:///c:/Users/hiverpc/LikhAI/supabase/week4_crud_and_community.sql), and ERD diagram graphic asset [`assets/database_erd_diagram.png`](file:///c:/Users/hiverpc/LikhAI/assets/database_erd_diagram.png).
- [x] **Project Progress Report (Current Accomplishments)**  
  *Status:* **Checked / Implemented**  
  *Evidence:* Comprehensive progress report compiled in [`PROGRESS_REPORT.md`](file:///c:/Users/hiverpc/LikhAI/PROGRESS_REPORT.md), [`SUBMISSION_REPORT.md`](file:///c:/Users/hiverpc/LikhAI/SUBMISSION_REPORT.md), and [`CRUD.md`](file:///c:/Users/hiverpc/LikhAI/CRUD.md).

---

### B. System Implementation
- [x] **User Interface (UI) Developed**  
  *Status:* **Checked / Implemented**  
  *Evidence:* Developed with Expo / React Native, featuring custom glassmorphism styles, dark mode visual hierarchy, bottom tab bars, hero illustrations, modals, and dynamic progress bars across 6+ app screens.
- [x] **Navigation and Routing Functional**  
  *Status:* **Checked / Implemented**  
  *Evidence:* Implemented via `expo-router` file-based routing ([`src/app/_layout.tsx`](file:///c:/Users/hiverpc/LikhAI/src/app/_layout.tsx), [`src/app/(tabs)/_layout.tsx`](file:///c:/Users/hiverpc/LikhAI/src/app/\(tabs\)/_layout.tsx), `login.tsx`, `signup.tsx`, `onboarding.tsx`, `profile.tsx`, `notifications.tsx`).
- [x] **Core Features Implemented**  
  *Status:* **Checked / Implemented**  
  *Evidence:*
  1. AI Business Roadmap & Custom Task Tracker ([`roadmap.tsx`](file:///c:/Users/hiverpc/LikhAI/src/app/\(tabs\)/roadmap.tsx))
  2. Khora AI Advisory Assistant ([`ai-assistant.tsx`](file:///c:/Users/hiverpc/LikhAI/src/app/\(tabs\)/ai-assistant.tsx))
  3. Local Supplier & Wholesale Market Finder ([`suppliers.tsx`](file:///c:/Users/hiverpc/LikhAI/src/app/\(tabs\)/suppliers.tsx))
  4. Community Template Sharing ([`community.tsx`](file:///c:/Users/hiverpc/LikhAI/src/app/\(tabs\)/community.tsx))
  5. PSGC Geographic Onboarding & Profiling ([`onboarding.tsx`](file:///c:/Users/hiverpc/LikhAI/src/app/onboarding.tsx))
- [x] **Forms and Data Validation Working**  
  *Status:* **Checked / Implemented**  
  *Evidence:* Input validation active across Authentication, Onboarding, Custom Roadmap Task creation (empty title blocking), and Community Template publishing.
- [x] **Error Handling Implemented**  
  *Status:* **Checked / Implemented**  
  *Evidence:* `try/catch` error blocks, `AbortController` timeouts (4000ms limit on external HTTP calls), fallback offline supplier dataset, and user-facing alert notifications.

---

### C. CRUD Functionality
- [x] **Create Operation Working**  
  *Status:* **Checked / Implemented**  
  *Evidence:* Custom task creation (`createRoadmapTaskInSupabase` in [`src/services/supabase.ts`](file:///c:/Users/hiverpc/LikhAI/src/services/supabase.ts#L442-L466)) and community template post creation (`createCommunityPostInSupabase`).
- [x] **Read/View Operation Working**  
  *Status:* **Checked / Implemented**  
  *Evidence:* Fetching user roadmap tasks (`fetchUserRoadmapFromSupabase`), querying local suppliers, loading community template marketplace feed, and user notifications list.
- [x] **Update Operation Working**  
  *Status:* **Checked / Implemented**  
  *Evidence:* Task completion status toggle (`updateRoadmapTaskInSupabase`), roadmap step completion update, user profile updates, and notification read state updates (`markNotificationAsRead`).
- [x] **Delete Operation Working**  
  *Status:* **Checked / Implemented**  
  *Evidence:* Deleting roadmap tasks (`deleteRoadmapTaskFromSupabase`) with confirmation dialogs and deleting user community posts (`deleteCommunityPostFromSupabase`).
- [x] **Search/Filter Feature (if applicable)**  
  *Status:* **Checked / Implemented**  
  *Evidence:* Category chips (`Rice & Grains`, `Meat`, `Packaging`, `Malls`) and text search filtering in `suppliers.tsx`, category filter in `community.tsx`, and PSGC Region/City dropdown filters in `onboarding.tsx`.

---

### D. API Integration and Testing
- [x] **API Connection Successfully Established**  
  *Status:* **Checked / Implemented**  
  *Evidence:* Supabase JS Client (`@supabase/supabase-js`), OpenStreetMap Overpass REST API (`https://overpass-api.de/api/interpreter`), Philippine Standard Geographic Code (PSGC) API ([`src/services/location.ts`](file:///c:/Users/hiverpc/LikhAI/src/services/location.ts)), and Anthropic Claude AI proxy ([`src/services/claude.ts`](file:///c:/Users/hiverpc/LikhAI/src/services/claude.ts)).
- [x] **GET Requests Tested**  
  *Status:* **Checked / Implemented**  
  *Evidence:* PSGC region/province queries, Supabase `.select('*')` for tasks, suppliers, notifications, and community posts.
- [x] **POST Requests Tested**  
  *Status:* **Checked / Implemented**  
  *Evidence:* OpenStreetMap Overpass QL query string sent via `POST` with `Content-Type: application/x-www-form-urlencoded`, Supabase `.insert()` calls, Khora AI prompt `POST`.
- [x] **PUT/PATCH Requests Tested**  
  *Status:* **Checked / Implemented**  
  *Evidence:* Supabase `.update()` calls for roadmap step completion, user profile updates, and notification read status toggle.
- [x] **DELETE Requests Tested**  
  *Status:* **Checked / Implemented**  
  *Evidence:* Supabase `.delete().eq('id', taskId)` calls for task removal and community post removal.
- [x] **API Responses Properly Displayed**  
  *Status:* **Checked / Implemented**  
  *Evidence:* Suppliers rendered with Haversine formula distance calculation (`2.4 km`), location coordinates mapped to interactive pins, task completion ratios, and AI response bubbles.
- [x] **Error Responses Properly Handled**  
  *Status:* **Checked / Implemented**  
  *Evidence:* Signal abort after 4000ms for external Overpass API, automatic fallback to Supabase SQL suppliers database or offline dataset when API fails.
- [x] **Authentication/Authorization Implemented (if applicable)**  
  *Status:* **Checked / Implemented**  
  *Evidence:* Auth context provider ([`src/context/AuthContext.tsx`](file:///c:/Users/hiverpc/LikhAI/src/context/AuthContext.tsx)), Firebase / Supabase auth session, protected tabs layout, and user-scoped data filtering.
- [x] **API Documentation Available**  
  *Status:* **Checked / Implemented**  
  *Evidence:* Written documentation in [`SUBMISSION_REPORT.md`](file:///c:/Users/hiverpc/LikhAI/SUBMISSION_REPORT.md) detailing endpoints, HTTP request methods, headers, payload formats, and JSON response samples.

---

### E. Project Demonstration Materials
- [x] **Source Code Available and Organized**  
  *Status:* **Checked / Implemented**  
  *Evidence:* Organized directory structure under `src/app/`, `src/components/`, `src/services/`, `src/context/`, and `supabase/`.
- [x] **System Ready for Live Demonstration**  
  *Status:* **Checked / Implemented**  
  *Evidence:* Application builds and launches cleanly via `npx expo start` across Web browser (`w`), Android emulator (`a`), and iOS Expo Go (`i`).
- [ ] **Presentation Slides Prepared (if required)**  
  *Status:* **In Progress**  
  *Evidence:* Slide outline and technical content are extracted from [`SUBMISSION_REPORT.md`](file:///c:/Users/hiverpc/LikhAI/SUBMISSION_REPORT.md); visual slide deck presentation to be finalized before midterm defense.
- [x] **Sample Data Available for Testing**  
  *Status:* **Checked / Implemented**  
  *Evidence:* Seeded database suppliers dataset, pre-loaded business roadmap templates (Food Stall, Retail, Bakery), and sample community post items.
- [x] **Project Repository Updated**  
  *Status:* **Checked / Implemented**  
  *Evidence:* Git repository contains latest commits, SQL migrations, configuration files, and documentation reports.

---

### F. Midterm Progress Evidence (Exact Screenshot Instructions)

Here are the specific locations to screenshot for your midterm evaluation submission:

1. **Screenshots of Implemented Features**:
   - **Roadmap Screen**: Launch app and navigate to **Roadmap** tab ([`src/app/(tabs)/roadmap.tsx`](file:///c:/Users/hiverpc/LikhAI/src/app/\(tabs\)/roadmap.tsx)). Screenshot the overall progress bar, category filter tabs, task cards, and the "Add Custom Task" modal.
   - **Suppliers Screen**: Navigate to **Suppliers** tab ([`src/app/(tabs)/suppliers.tsx`](file:///c:/Users/hiverpc/LikhAI/src/app/\(tabs\)/suppliers.tsx)). Screenshot the interactive map banner, supplier listing cards with distance badges (e.g. `2.4 km`), and category chips.
   - **AI Assistant Screen**: Navigate to **AI Assistant** tab ([`src/app/(tabs)/ai-assistant.tsx`](file:///c:/Users/hiverpc/LikhAI/src/app/\(tabs\)/ai-assistant.tsx)). Screenshot Khora AI chat dialog showing business advice response.
   - **Community Screen**: Navigate to **Community** tab ([`src/app/(tabs)/community.tsx`](file:///c:/Users/hiverpc/LikhAI/src/app/\(tabs\)/community.tsx)). Screenshot shared template cards and founder profile snippets.

2. **API Testing Screenshots/Logs**:
   - **Code Snippet**: Open [`src/app/(tabs)/suppliers.tsx`](file:///c:/Users/hiverpc/LikhAI/src/app/\(tabs\)/suppliers.tsx#L167-L220) or [`src/services/supabase.ts`](file:///c:/Users/hiverpc/LikhAI/src/services/supabase.ts#L520-L541) in your IDE showing the `fetch()` or `supabase.from('suppliers')` calls.
   - **Network Log**: Run `npx expo start` -> press `w` (Web). Open Browser DevTools (`F12`) -> **Network** tab -> filter by `interpreter` or `suppliers`. Reload page and screenshot HTTP `200 OK` status with JSON response body.

3. **Database Screenshot**:
   - **Supabase Console**: Open [Supabase Dashboard](https://supabase.com/dashboard) -> **Table Editor** -> select `roadmaps` or `suppliers` table. Screenshot rows, columns (`id`, `title`, `user_id`, `category`), and table schema.
   - **SQL Editor**: Screenshot [`supabase/week4_crud_and_community.sql`](file:///c:/Users/hiverpc/LikhAI/supabase/week4_crud_and_community.sql) inside Supabase SQL Editor showing successful script execution.

4. **Source Code Samples for Key Features**:
   - Screenshot [`src/services/supabase.ts`](file:///c:/Users/hiverpc/LikhAI/src/services/supabase.ts) showing functions `createRoadmapTaskInSupabase`, `updateRoadmapTaskInSupabase`, and `deleteRoadmapTaskFromSupabase`.

5. **List of Completed Features**:
   - Screenshot Section 2 ("Updated Project Source Code Overview") in [`SUBMISSION_REPORT.md`](file:///c:/Users/hiverpc/LikhAI/SUBMISSION_REPORT.md) or Section B of this report.

6. **List of Remaining Features for Final Project**:
   - Screenshot the remaining backlog list (e.g., Offline sync queue, Push Notifications via Expo server, Financial projections calculator, Enhanced AI voice assistant).

---

## Project Completion Status

| Component | Complete | In Progress | Not Started | Notes / Status Summary |
| :--- | :---: | :---: | :---: | :--- |
| **UI/UX Development** | ☑ | ☐ | ☐ | Fully implemented responsive UI with dark glassmorphic styling, tabs, modals, and dynamic progress metrics. |
| **Navigation & Structure** | ☑ | ☐ | ☐ | Implemented using Expo Router (`expo-router`) with tab layouts, stack screens, and authentication guards. |
| **CRUD Features** | ☑ | ☐ | ☐ | Complete Create, Read, Update, Delete functionality working in Roadmap & Community modules with Supabase database persistence. |
| **API Integration** | ☑ | ☐ | ☐ | Integrated OpenStreetMap Overpass API (POST), Supabase REST API (GET/POST/PUT/DELETE), PSGC API (GET), and Claude AI proxy. |
| **Documentation** | ☑ | ☐ | ☐ | Comprehensive [`SUBMISSION_REPORT.md`](file:///c:/Users/hiverpc/LikhAI/SUBMISSION_REPORT.md), [`CRUD.md`](file:///c:/Users/hiverpc/LikhAI/CRUD.md), [`README.md`](file:///c:/Users/hiverpc/LikhAI/README.md), and SQL schema scripts available in project root. |

---

## Declaration

I certify that the submitted project update, source code, documentation, and demonstration materials are my/our current work and accurately reflect the progress achieved as of the midterm evaluation.
