# Likhora AI - Feature Accomplishments & Project Roadmap

**Project Name:** Likhora AI  
**Document Type:** Midterm Feature Status & Final Project Backlog  
**Date:** August 19, 2026  

---

## I. List of Completed Features (Midterm Evaluation)

### 1. User Authentication & Profile Management System
- **Cross-Platform Authentication**: Secure user registration, sign-in, and password reset powered by Firebase Authentication and Supabase Auth.
- **Persistent Session & Access Control**: Protected tab routing with global auth state provider (`AuthContext.tsx`).
- **Entrepreneur Profile Management**: Customized user profiling storing business title, industry category, capital budget tier, location, and target launch date in PostgreSQL `public.profiles`.

### 2. Philippine Geographic Selector (PSGC API Integration)
- **Live Regional & Municipal API Data**: Dynamic dropdown selection covering 17 Regions, 82 Provinces, and 1,600+ Municipalities integrated via the Philippine Standard Geographic Code (PSGC) API (`src/services/location.ts`).
- **Resilient Offline Datasets**: Fallback dataset ensuring uninterrupted onboarding even during network outages.

### 3. Dynamic Business Roadmap & Task Execution System (Full CRUD)
- **Create (C)**: Modal interface for adding custom business tasks with title validation, category selection (`Finance`, `Legal`, `Marketing`), descriptions, and checklist sub-steps (`createRoadmapTaskInSupabase`).
- **Read (R)**: Real-time rendering of user-specific roadmap tasks (`fetchUserRoadmapFromSupabase`) with automatic completion percentage calculation.
- **Update (U)**: Interactive status toggling (`Pending`, `In Progress`, `Completed`) and checkbox completion for individual sub-steps (`updateRoadmapTaskInSupabase`).
- **Delete (D)**: Removal of roadmap tasks with user confirmation prompts (`deleteRoadmapTaskFromSupabase`).

### 4. Real-Time Notification & Milestone Alert System
- **Automated Milestone Alerts**: System-generated notifications triggered upon roadmap task completions, saved to PostgreSQL `public.notifications`.
- **Notification Center**: Unread count badge indicators, individual read toggles, and mark-all-as-read actions (`NotificationContext.tsx`).

### 5. Local Wholesale Supplier & Market Finder Module
- **OpenStreetMap Overpass REST API**: Dynamic HTTP `POST` Overpass QL queries locating verified markets, malls, supermarkets, and wholesale vendors within a 15 km radius.
- **Haversine Distance & Dynamic Sorting**: Real-time distance calculation in kilometers and nearest-first sorting.
- **Automatic Regional Geocoding**: City coordinate resolution (`getCityCoords`) pinning accurate location coordinates for Bulacan, Metro Manila, and provincial cities.
- **Database Fallback & Search**: Resilient fallback querying Supabase `public.suppliers` database alongside OpenStreetMap Nominatim search.
- **Filtering & Interactive Map**: Category chips (`Rice & Grains`, `Meat`, `Packaging`, `Malls & Supermarkets`), search bar, Leaflet map with custom SVG markers, and direct phone call triggers (`tel:` schema).

### 6. Khora AI Advisory Assistant
- **24/7 AI Business Advisor**: Anthropic Claude API integration (`src/services/claude.ts`) delivering personalized business recommendations, marketing strategies, permit guidance, and financial tips for Filipino MSMEs.

### 7. Community Template Marketplace
- **Template Publishing**: Publish completed roadmaps as public reusable templates (`public.community_posts`).
- **Community Feed & Favorites**: Browse founder templates, import roadmaps, and bookmark favorites (`public.community_template_favorites`).

### 8. Comprehensive Architecture & Database Documentation
- **Visual Diagrams**: 4-Tier System Architecture Diagram, Operational Data Flowchart, and 6-Table PostgreSQL Schema ERD.
- **Reports**: Midterm Submission Report (`SUBMISSION_REPORT.md`), Evaluation Checklist (`MIDTERM_CHECKLIST.md`), and Progress Report (`PROGRESS_REPORT.md`).

---

### 9. Smart Calculator (AI Pricing & Break-Even)
- **AI-Decided Pricing**: The user enters only what they alone can know — the product name, how it was bought (per piece, pack, case, kilo or liter) and what it cost. Khora AI determines the category, the markup appropriate to that category, and the selling price, with a plain-English explanation (`src/services/pricingAdvisor.ts`).
- **Derived Portioning**: Bulk purchases take the quantity bought and the portion size (in kilos or grams); the piece count is computed, not guessed (`src/services/calculator.ts`).
- **Profit & ROI**: Profit per piece, margin, effective markup, batch capital, and the number of units needed to recover that capital.
- **Price Book with Filters**: Products are auto-categorised, grouped per business roadmap, and searchable with category filters and directional sorting (`src/app/calculator.tsx`).
- **Full CRUD** on `public.products` with Supabase Storage product photos.

### 10. Business-Type-Aware Onboarding & Roadmaps
- **Five Philippine Business Profiles**: Sari-sari Store, Carinderia / Food Stall, Online Selling, Serbisyo / Services, and Buy & Sell / Reselling — each with its own customer segments, risks, permits and operational roadmap steps (`src/services/businessProfiles.ts`).
- **AI-Generated Profiles for Custom Types**: A business type outside the five (e.g. pet grooming, car wash) has its onboarding questions, risks and roadmap steps generated by Khora AI (`src/services/onboardingAdvisor.ts`).
- **Service Businesses Supported**: Labour-based businesses receive rate-setting and booking steps instead of wholesale-sourcing and price-tag steps.

### 11. AI-Targeted Supplier Discovery
- **Per-Trade Supplier Search**: Khora AI determines which supplier categories a specific business buys from, and the Google Places search phrases that find them (`src/services/supplierAdvisor.ts`).

### 12. Expanded Startup Template Library
- **8 Pre-Built Roadmaps** across food, retail, services, online and fashion, each with real Philippine agencies, legal bases, fees and required documents (`src/services/startupTemplates.ts`).
- **Search & Category Filters** over the template catalogue.

### 13. Server-Side AI & In-App Password Reset
- **Khora AI Edge Function**: The Anthropic API key is held as a Supabase secret and never ships in the app bundle; the model, effort level and token ceiling are fixed server-side (`supabase/functions/khora-ai/`).
- **In-App Password Reset**: Email → 6-digit code → new password, without leaving the app. The code is generated, hashed, and verified server-side with Firebase Admin credentials (`supabase/functions/password-reset/`).
- **Profile Photos**: Uploaded to a Supabase Storage bucket and shown on the dashboard and community posts.

---

## II. List of Remaining Features for Final Project (Future Deliverables)

### 1. Offline Synchronization & Mutation Queue
- **SQLite / AsyncStorage Queue**: Caching user roadmap task edits while offline and automatically syncing changes to Supabase Cloud upon network reconnection.

### 2. Native Mobile Push Notifications
- **Expo Push Notifications Integration**: Background push notifications (`expo-notifications`) alerting users to upcoming task deadlines and milestone achievements.

### 3. Voice Assistance for Khora AI
- **Voice Interaction**: Speech-to-text audio input and text-to-speech audio playback for Khora AI Assistant.

### 4. Supplier Ratings & Community Reviews
- **Community Feedback**: User reviews, ratings, and direct inquiry forms for wholesale suppliers.

### 5. Exportable Business Plan & Analytics Dashboard
- **Readiness Analytics**: Launch readiness score and exportable PDF business summary report.
