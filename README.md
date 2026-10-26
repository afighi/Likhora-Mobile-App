# Likhora AI (LikhAI)

An AI-powered entrepreneurship companion and management platform designed specifically for Philippine Micro, Small, and Medium Enterprises (MSMEs). Likhora guides aspiring Filipino business founders through every stage of their venture—from business registration and regulatory compliance (DTI, Barangay, Mayor's Permit, BIR, BMBE) to recipe-level product costing, wholesale supplier discovery, and community knowledge sharing.

---

## Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Key Features](#key-features)
  - [1. Business Roadmaps & Regulatory Guidance](#1-business-roadmaps--regulatory-guidance)
  - [2. Khora AI MSME Advisor](#2-khora-ai-msme-advisor)
  - [3. Smart Calculator & Product Costing](#3-smart-calculator--product-costing)
  - [4. Wholesale Supplier & Market Discovery](#4-wholesale-supplier--market-discovery)
  - [5. Community Marketplace & Kapihan Forums](#5-community-marketplace--kapihan-forums)
  - [6. Admin Web Portal](#6-admin-web-portal)
- [Technology Stack](#technology-stack)
- [Security & Architecture Guardrails](#security--architecture-guardrails)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Mobile Application Setup](#mobile-application-setup)
  - [Admin Web Portal Setup](#admin-web-portal-setup)
  - [Environment Variables](#environment-variables)
- [Database & Migrations](#database--migrations)
- [License](#license)

---

## Overview

Starting and operating a business in the Philippines often involves navigating complex regulatory requirements, volatile ingredient costs, and informal supply chains. Many micro-entrepreneurs face challenges with:

- Complex legal compliance steps across local and national agencies (Barangay, DTI, BPLO, BIR, FDA).
- Inaccurate batch costing and pricing calculations that lead to negative margins and cash flow problems.
- Difficulties finding nearby wholesale raw material suppliers.
- Limited access to tailored, professional business mentorship.

Likhora AI addresses these obstacles by unifying legal onboarding roadmaps, an AI compliance mentor, an automated costing and margin calculator, a geospatial supplier finder, and a founder community network in a single mobile experience, backed by a dedicated administrative management console.

---

## System Architecture

The platform is designed with a 4-tier modular architecture:

1. **Client Tier (Mobile)**: Universal React Native mobile client built with Expo SDK 57, Expo Router, and React Native Reanimated.
2. **Client Tier (Web Admin)**: Modern administrative dashboard built with React 19, Vite 8, and Tailwind CSS v4.
3. **Application & Edge Tier**: Supabase Edge Functions running on the Deno runtime for secure server-side AI proxying and transactional password resets.
4. **Data & Identity Tier**: 
   - **Identity**: Firebase Authentication (Email/Password, Google Sign-In) integrated seamlessly with Supabase Row-Level Security (RLS) via JWT inspection.
   - **Database**: Supabase PostgreSQL with custom security definer functions, triggers, and indices.
   - **Storage**: Supabase Storage buckets for business logos, product photos, and supplier imagery.

---

## Key Features

### 1. Business Roadmaps & Regulatory Guidance
- **Customized Launch Paths**: Step-by-step blueprints for prominent Filipino business models, including Sari-Sari Stores, Carinderias / Food Stalls, Online Selling, Service Businesses, and Buy & Sell / Resellers.
- **Accurate Regulatory Details**: Every milestone covers the specific legal basis (e.g., Act 3883 for DTI, RA 7160 for Barangay, TRAIN Law RA 10963 for BIR 8% Gross Income Tax option, RA 9178 BMBE Act), required paperwork, estimated fees, and target government agency.
- **Task Management**: Full task life cycle tracking (Pending, In Progress, Completed, Skipped) with sub-step checklists and labor hour logging.
- **Multiple Roadmaps**: Ability to create, save, and switch between multiple venture roadmaps in local and cloud storage.

### 2. Khora AI MSME Advisor
- **Domain-Enforced Guidance**: Integrated Anthropic Claude LLM customized specifically for Philippine commercial legal frameworks, pricing equations, and operational strategy.
- **Prompt Injection Defense & Boundary Enforcement**: Strict guardrails restrict the assistant to business and entrepreneurship subjects, declining unrelated queries courteously in Taglish or English.
- **Offline Fallback Engine**: Rule-based heuristic advisor that provides immediate, localized recommendations even when offline.

### 3. Smart Calculator & Product Costing
- **Recipe & Unit Costing**: Breaks down bulk purchases (by piece, pack, case, kilo, or liter) into precise single-serving costs.
- **Automatic Portion Derivation**: Computes piece counts based on net weights and portion sizes, avoiding estimation errors.
- **Wastage & Labor Buffers**: Accounts for spoilage allowances (10-15%) and direct labor costs into the total unit base cost.
- **Margin & ROI Analytics**: Calculates gross margin, net profit per serving, batch capital requirements, and break-even sales volume.

### 4. Wholesale Supplier & Market Discovery
- **Geospatial Discovery**: Pinpoints nearby markets, trading centers, and wholesale suppliers using Google Places API (New) with an automated fallback to OpenStreetMap Overpass and Nominatim APIs.
- **Radius & Category Filtering**: Distance calculations via the Haversine formula, category chips (Rice & Grains, Meat, Packaging, Supermarkets), and one-tap phone dialing.

### 5. Community Marketplace & Kapihan Forums
- **Roadmap Marketplace**: Users can publish completed milestone blueprints as reusable templates for other founders to clone and adapt.
- **Kapihan Discussions**: Interactive forum with threaded comments, category tags, upvoting, and moderation.
- **Portfolio Showcase**: Compiles business identity, selected roadmap milestones, product costing sheets, and supplier contacts into a sharable digital profile.

### 6. Admin Web Portal
- **Administrative Dashboard**: Real-time KPI summaries tracking active users, total roadmaps, community templates, and verified suppliers.
- **Directory & Supplier Curation**: Moderation suite for reviewing, editing, approving, or hiding wholesale suppliers.
- **Forum Moderation**: Management controls for community threads and replies.
- **Audit Logging**: Immutable, append-only administrative activity logs tracking platform maintenance actions.

---

## Technology Stack

| Domain | Technology / Library | Description |
| :--- | :--- | :--- |
| **Mobile Client** | React Native 0.86, React 19, Expo 57 | Cross-platform Android and iOS mobile application |
| **Mobile Routing** | Expo Router 57 | File-based declarative routing and deep linking |
| **Mobile UI & Styling** | Reanimated 4, Gesture Handler, Lucide Icons | Smooth transitions, swipeable cards, and modern vector icons |
| **Admin Web Portal** | React 19, Vite 8, React Router 7 | High-performance administrative dashboard |
| **Web Styling** | Tailwind CSS v4 (@tailwindcss/vite) | Utility-first styling framework |
| **Authentication** | Firebase Authentication | User registration, password authentication, and Google OAuth |
| **Database & RLS** | Supabase (PostgreSQL 15) | Relational database with fine-grained Row-Level Security policies |
| **Edge Functions** | Deno runtime on Supabase | Serverless endpoints for AI orchestration and OTP password reset |
| **AI / LLM** | Anthropic Claude API (3.5 Haiku / Sonnet) | Intelligence engine for business mentoring and pricing evaluation |
| **Mapping & Location** | Google Places API (New), OpenStreetMap | Geospatial supplier search, geocoding, and distance calculation |
| **Email Services** | EmailJS, Supabase Functions | Transactional verification codes and notifications |

---

## Security & Architecture Guardrails

- **Zero Client-Side Secrets**: Private keys (such as the Anthropic API key and Firebase Admin SDK credentials) are never stored in the mobile app bundle or web client. All privileged operations execute inside Supabase Edge Functions with environment secret protection.
- **Row-Level Security (RLS)**: Database tables enforce strict user ownership checks comparing `auth.jwt() ->> 'sub'` against row owners. Users can only modify their own profiles, roadmaps, and costing records.
- **Admin Access Control**: The Admin Web Portal validates admin status via a PostgreSQL Security Definer function (`public.is_admin()`), preventing unauthorized users from accessing administrative data.
- **Environment Isolation**: Production secrets and service account JSON files are excluded via `.gitignore` rules.

---

## Project Structure

```text
LikhAI/
|-- admin-web/                     # Administrative web portal (Vite + React + Tailwind)
|   |-- src/
|   |   |-- pages/                 # Dashboard, User Roadmaps, Suppliers, Forums, Audit Log
|   |   |-- lib/                   # Supabase client and Firebase auth integration
|   |   `-- App.tsx                # Admin routing and authorization guards
|   `-- package.json
|-- src/                           # Mobile application source code (Expo)
|   |-- app/                       # Expo Router file-based screens and tabs
|   |   |-- (tabs)/                # Main bottom navigation tabs (Roadmap, Calculator, Suppliers, etc.)
|   |   |-- onboarding.tsx         # Business profile setup and permit selector
|   |   |-- business-portfolio.tsx # Venture summary exporter
|   |   `-- calculator-product.tsx # Batch costing and portion calculation screen
|   |-- components/                # Reusable UI components (GlassTabBar, ConfirmDialog, etc.)
|   |-- constants/                 # Theme tokens, colors, typography
|   |-- context/                   # Global state providers (AuthContext, NotificationContext)
|   `-- services/                  # Business logic and external API integrations
|       |-- businessProfiles.ts    # Comprehensive Philippine MSME profiles and task blueprints
|       |-- calculator.ts          # Mathematical pricing and batch cost models
|       |-- claude.ts              # Khora AI prompt engine and offline fallback
|       |-- community.ts           # Community posts and template marketplace service
|       |-- firebase.ts            # Firebase initialization and persistent native auth
|       |-- location.ts            # Philippine PSGC geographic directory
|       |-- marketAnalysis.ts      # Foot traffic and competitor density assessment
|       |-- places.ts              # Google Places API client with OSM fallback
|       |-- regulatoryAdvisor.ts   # Legal basis and government agency requirements
|       |-- roadmapStorage.ts      # Multi-roadmap local and cloud persistence manager
|       `-- supabase.ts            # Supabase PostgreSQL client and CRUD operations
|-- supabase/
|   |-- functions/                 # Deno serverless edge functions
|   |   |-- khora-ai/              # Anthropic Claude proxy with prompt guardrails
|   |   `-- password-reset/        # Server-side OTP code generator and verification
|   `-- *.sql                      # PostgreSQL migration scripts and RLS security policies
|-- app.json                       # Expo configuration
|-- eas.json                       # EAS Build profile configuration
`-- package.json                   # Mobile dependencies and run scripts
```

---

## Getting Started

### Prerequisites

- Node.js (v18.0.0 or higher)
- npm or yarn package manager
- Expo Go application on Android/iOS (or Android Studio / Xcode for development builds)
- A Supabase project with database migrations applied
- A Firebase project with Email/Password authentication enabled

### Mobile Application Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/afighi/Likhora-Mobile-App.git
   cd Likhora-Mobile-App
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
   Add any optional configuration values (e.g., `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY`).

4. Start the Expo development server:
   ```bash
   npx expo start
   ```

5. Run on your preferred platform:
   - Press `a` for Android emulator or device
   - Press `i` for iOS simulator
   - Press `w` for Web preview
   - Scan the QR code using the Expo Go mobile app

### Admin Web Portal Setup

1. Navigate to the `admin-web` directory:
   ```bash
   cd admin-web
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the local development server:
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   ```

### Environment Variables

The mobile application connects to Supabase and Firebase via public client identifiers that are securely locked down with Row-Level Security policies.

For the serverless AI and password reset functions, set secrets using the Supabase CLI:

```bash
supabase secrets set ANTHROPIC_API_KEY=your-anthropic-key
supabase functions deploy khora-ai
supabase functions deploy password-reset
```

---

## Database & Migrations

All SQL schema definitions, indexes, and Row-Level Security policies are located in the `supabase/` directory in sequential order:

- `01_crud_and_community.sql`: Base schemas for profiles, roadmaps, and community tables.
- `03_community_templates.sql`: Preloaded startup roadmaps and task blueprints.
- `05_secure_user_data.sql`: Core RLS policies scoped to Firebase user identities.
- `09_smart_calculator.sql`: Product catalog and costing schema.
- `15_admin_and_market.sql`: Supplier directory, audit logs, and market analysis tables.
- `17_admin_full_access.sql`: Non-recursive security definer function for administrative role verification.

Run these files sequentially in the Supabase SQL Editor to initialize or update your database instance.

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for full details.
