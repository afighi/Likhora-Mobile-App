# Likhora AI - Midterm Project Progress Report (Current Accomplishments)

**Project Title:** Likhora AI  
**Repository:** [`c:\Users\hiverpc\LikhAI`](file:///c:/Users/hiverpc/LikhAI)  
**Evaluation Phase:** Midterm Evaluation  
**Date:** August 19, 2026  

---

## 1. Executive Summary

**Likhora AI** is an AI-powered mobile business advisor and execution platform designed specifically for Filipino micro-, small-, and medium-sized enterprises (MSMEs). The application assists emerging entrepreneurs in creating step-by-step business roadmaps, locating nearby verified wholesale suppliers, consulting an AI business advisor (Khora AI), and sharing reusable business templates within an active founder community.

As of the midterm evaluation, all primary core components—including User Interface (UI/UX), Navigation & Routing, Full CRUD Functionality, Multi-API Integration, and PostgreSQL Database Schema Design—are fully developed, functional, and ready for live demonstration.

---

## 2. Summary of Current Accomplishments

### A. System Architecture & UI/UX Implementation
- **Cross-Platform React Native App**: Built with Expo and Expo Router file-based routing (`src/app/_layout.tsx`, `(tabs)`, `login.tsx`, `signup.tsx`, `onboarding.tsx`, `profile.tsx`, `notifications.tsx`).
- **Modern Glassmorphic Design System**: Custom visual hierarchy featuring dark/light adaptive themes, responsive cards, hero illustrations, progress bar metrics, tab bars, and animated micro-interactions.
- **Global Context Providers**: Built [`AuthContext.tsx`](file:///c:/Users/hiverpc/LikhAI/src/context/AuthContext.tsx) for user session/profile management and [`NotificationContext.tsx`](file:///c:/Users/hiverpc/LikhAI/src/context/NotificationContext.tsx) for real-time alert badges.

---

### B. Core Functional Accomplishments by Module

#### 1. User Authentication & Regional Onboarding Module
- **Firebase & Supabase Authentication**: Supports user registration, sign-in, password reset, and secure session management.
- **Philippine Geographic Code (PSGC) API Integration**: Implemented [`src/services/location.ts`](file:///c:/Users/hiverpc/LikhAI/src/services/location.ts) fetching live data for 17 regions, 82 provinces, and 1,600+ municipalities with offline fallback datasets.
- **User Profile Management**: Stores user business profiles (name, industry type, budget tier, location, launch date) in the `public.profiles` PostgreSQL table.

#### 2. Dynamic Business Roadmap & Task Tracker (Full CRUD)
- **Create (C)**: Users can create custom roadmap tasks with title validation, category selection (`Finance`, `Legal`, `Marketing`), description, and checklist sub-steps via `createRoadmapTaskInSupabase`.
- **Read (R)**: Real-time rendering of user-specific roadmap tasks (`fetchUserRoadmapFromSupabase`) with automatic completion percentage calculation.
- **Update (U)**: Interactive status toggle (`Pending`, `In Progress`, `Completed`) and checkbox completion for individual sub-steps (`updateRoadmapTaskInSupabase`), automatically writing completed milestone alerts to `public.notifications`.
- **Delete (D)**: Secure roadmap task deletion with user confirmation prompts (`deleteRoadmapTaskFromSupabase`).

#### 3. Local Supplier & Wholesale Market Discovery Module
- **Live OpenStreetMap Overpass REST API**: Sends `POST` Overpass QL queries to dynamically discover real-world supermarkets, malls, public markets, and wholesale suppliers within a 15 km radius of the user's GPS/city.
- **Haversine Distance Sorting**: Automatically computes exact straight-line distance in kilometers (`getDistanceFromLatLonInKm`) and sorts nearby pins nearest-first.
- **Supabase Database Fallback**: Implemented resilient fallback querying `public.suppliers` with a 4-second `AbortController` cap to guarantee data availability even during API network timeouts.
- **Category & Search Filtering**: Filter wholesale listings by text search and category chips (`Rice & Grains`, `Meat`, `Packaging`, `Malls & Supermarkets`).

#### 4. Khora AI Advisory Assistant Module
- **Anthropic Claude API Integration**: Implemented [`src/services/claude.ts`](file:///c:/Users/hiverpc/LikhAI/src/services/claude.ts) providing real-time, context-aware business recommendations, marketing ideas, and financial guidance tailored to Filipino micro-entrepreneurs.

#### 5. Community Template Marketplace Module
- **Share Business Templates**: Users can publish their completed business roadmaps as reusable templates (`INSERT INTO public.community_posts`).
- **Template Favorites**: Implemented bookmarking and favorites system linked to `public.community_template_favorites`.

---

## 3. Accomplishments & Verification Matrix

| Component / Feature | Development Status | Verification & Evidence Location |
| :--- | :---: | :--- |
| **UI/UX & Routing** | **100% Complete** | 9 functional app screens in Expo Router (`src/app/`) |
| **Authentication & Profile** | **100% Complete** | `AuthContext.tsx`, `login.tsx`, `signup.tsx`, `public.profiles` |
| **PSGC Regional API** | **100% Complete** | `src/services/location.ts` (17 regions, 82 provinces, 1600+ municipalities) |
| **Roadmap Task CRUD** | **100% Complete** | `roadmap.tsx`, `src/services/supabase.ts` (`public.roadmaps`) |
| **Notifications System** | **100% Complete** | `NotificationContext.tsx`, `notifications.tsx` (`public.notifications`) |
| **OpenStreetMap Overpass API** | **100% Complete** | `suppliers.tsx` (`POST https://overpass-api.de/api/interpreter`) |
| **Supplier Database Fallback** | **100% Complete** | `fetchSuppliersFromSupabase` (`public.suppliers`) |
| **Khora AI Assistant** | **100% Complete** | `ai-assistant.tsx`, `src/services/claude.ts` |
| **Community Marketplace** | **100% Complete** | `community.tsx` (`public.community_posts`, `public.community_template_favorites`) |
| **Architecture & ERD Diagrams** | **100% Complete** | [`assets/system_architecture_diagram.png`](file:///c:/Users/hiverpc/LikhAI/assets/system_architecture_diagram.png), [`assets/system_flowchart_diagram.png`](file:///c:/Users/hiverpc/LikhAI/assets/system_flowchart_diagram.png), [`assets/database_erd_diagram.png`](file:///c:/Users/hiverpc/LikhAI/assets/database_erd_diagram.png) |

---

## 4. External API Integration Summary

```
+-----------------------------------------------------------------------------------+
|                                 LIKHORA AI CLIENT                                 |
+-------------------+--------------------+-------------------+----------------------+
                    |                    |                   |
      POST (Overpass QL)               GET                  POST                   GET / POST / PUT / DELETE
                    |                    |                   |                                 |
                    v                    v                   v                                 v
+-----------------------+ +--------------------+ +-------------------+ +----------------------------------+
| OpenStreetMap Overpass| |  PSGC Geographic   | | Anthropic Claude  | |      Supabase Cloud PostgreSQL   |
|   REST API (15 km)    | |   GitLab REST API  | |   Khora AI Proxy  | |   (PostgREST DB REST Client)     |
+-----------------------+ +--------------------+ +-------------------+ +----------------------------------+
```

1. **OpenStreetMap Overpass API**:
   - **Method**: `POST` to `https://overpass-api.de/api/interpreter`
   - **Function**: Fetches verified commercial locations, markets, and malls within 15 km of user coordinates.
2. **Supabase Database REST API**:
   - **Methods**: `GET`, `POST`, `PUT`, `DELETE` via `@supabase/supabase-js`
   - **Function**: Executes CRUD operations across 6 PostgreSQL schema tables (`profiles`, `roadmaps`, `notifications`, `suppliers`, `community_posts`, `community_template_favorites`).
3. **PSGC Location API**:
   - **Method**: `GET` to `https://psgc.gitlab.io/api/`
   - **Function**: Dynamically populates region, province, and municipality dropdown menus during onboarding.
4. **Claude AI Khora Advisor API**:
   - **Method**: `POST` request service
   - **Function**: Generates custom business guidance and answers user entrepreneurial inquiries.

---

## 5. Next Steps & Remaining Backlog for Final Project

1. **Offline Sync Queue**: Add SQLite/AsyncStorage mutation queue to sync pending roadmap task edits automatically when network connectivity reconnects.
2. **Push Notifications**: Integrate Expo Push Notifications server for native mobile push alerts on milestone achievements.
3. **Financial Projections Calculator**: Build an interactive cash-flow and break-even budget calculator tool for business planning.
4. **Enhanced Voice Input**: Implement speech-to-text audio prompt support for Khora AI Assistant.

---

## 6. Declaration & Verification

I certify that the accomplishments detailed in this midterm progress report accurately reflect the current working state of the **Likhora AI** application codebase and database infrastructure as of August 19, 2026.
