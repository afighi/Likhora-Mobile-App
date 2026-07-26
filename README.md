# Likhora

> From *"likha"* — Filipino for "to create / to craft."

Likhora is a mobile-based, AI-assisted startup guidance application that helps aspiring Filipino small business owners **plan, cost, and launch** their venture through one connected journey — combining a personalized roadmap, cost-based pricing tools, and supplier discovery in a single platform, instead of scattered guides and spreadsheets.

Built with **Flutter**.

---

## 🎯 Problem & SDG Alignment

Aspiring small business owners in the Philippines — especially first-time entrepreneurs, students, and informal-sector sellers — often abandon or mismanage their ventures due to fragmented, generic guidance. Existing resources (government guides, scattered online articles, spreadsheet templates) provide information but no personalized path, leaving new owners unsure how to:

- Price their products correctly
- Identify which permits and steps apply to their specific business
- Reliably source ingredients and materials

This lack of structured, trackable guidance leads to costing errors, thin or negative margins, wasted capital, and businesses that stall before they ever launch.

**Likhora addresses SDG 8 – Decent Work and Economic Growth**, specifically **Target 8.3** (promoting development-oriented policies that support entrepreneurship and the growth of micro, small, and medium enterprises), by giving aspiring Filipino entrepreneurs a personalized, trackable path from idea to launch — reducing costly guesswork and improving the survival rate of small businesses.

## 👥 Target Audience

Aspiring and first-time small business owners in the Philippines — including students, informal sellers, and micro-entrepreneurs — who are starting a small **food, retail, service, agriculture-based, craft, or digital** business and currently rely on scattered online guides, generic checklists, and manual costing to plan their venture.

## ✨ Core Features

| Feature | Description |
|---|---|
| **Business Profile & Roadmap Generation** | Centralized hub capturing a user's business type, budget, location, and experience level to generate their startup path. |
| **Pre-Built Business Templates** | Curated, ready-made roadmaps for common Philippine small business types (food, retail, services, agriculture-adjacent, crafts, digital), each with typical steps, costs, and permits. |
| **AI-Personalized Roadmap Adjustment** | AI adapts the chosen template to the user's specific budget, location, and experience — trimming, reordering, or annotating steps instead of generating a roadmap from scratch. |
| **Cost-Based Pricing Calculator** | Computes suggested product pricing based on ingredient, material, and labor costs entered by the user. |
| **AI Cost Breakdown Assistant** | Suggests reasonable default cost ranges for first-time users unsure how to price labor, ingredients, or overhead. |
| **Supplier Directory & Location Mapping** | Admin-curated listing of suppliers for specific products or ingredients, with map-based location data. |
| **Contextual Supplier Suggestions** | Surfaces only the suppliers relevant to the user's current roadmap step, rather than a static full directory. |
| **Progress Tracker** | Tracks completion of roadmap steps from start to finish, turning the journey into a visible, ongoing checklist. |
| **AI Progress Check-Ins** | Generates short, contextual "what's next and why" nudges as the user completes roadmap steps. |
| **Business Name/Description Helper** | AI-suggested business name and short description options based on the user's product or service. |
| **Completed Business Portfolio** | By the end of the roadmap, the user has a finished cost sheet, chosen supplier list, and launch-ready price list as a tangible output. |

## ⚠️ Limitations

- **Admin-Managed Suppliers Only** — supplier listings are curated by the app admin, not self-registered by suppliers, in this version; supplier self-accounts are a planned future enhancement.
- **No Payment Processing** — the app supports planning and costing only and does not process actual payments or transactions.
- **Reference Pricing, Not Guaranteed** — supplier prices and cost suggestions are for reference and planning purposes only, not guaranteed live pricing or availability.
- **Not a Substitute for Official Registration** — the app guides users toward relevant permits and requirements but does not process or replace official government business registration; it links out to official resources.
- **Limited Template Coverage** — pre-built roadmaps cover common Philippine small business categories only and are not exhaustive of every possible business type.

## 🎨 Design System

Likhora uses a **Warm Parchment** aesthetic engineered for a mobile-first Filipino business companion, keeping users focused on one connected journey: choose a business path, cost products, find suppliers, and finish with launch-ready materials.

**Color palette**
- **Aubergine** — main brand color: business journey hero card, selected tab active pill, key headings, pricing hero, milestone card
- **Blue** — informational guidance, supplier/location features, map pins, AI assistance callouts
- **Green** — completed steps, healthy profit margins, positive progress, successful business milestones
- **Yellow** — active work, pricing actions, in-progress states, primary CTAs
- **Pink/Red** — warnings, thin margin alerts, retail/resale accents

## 🧱 Project Structure

```
likhora2/
├── android/
├── ios/
├── lib/
│   ├── models/
│   │   ├── admin_user_model.dart
│   │   ├── ai_nudge_model.dart
│   │   ├── pricing_model.dart
│   │   ├── progress_nudge_model.dart
│   │   ├── roadmap_model.dart
│   │   ├── supplier_model.dart
│   │   └── user_profile_model.dart
│   ├── providers/
│   │   └── app_state_provider.dart
│   ├── screens/
│   │   ├── admin_supplier_modal.dart
│   │   ├── app_scaffold_screen.dart
│   │   ├── home_screen.dart
│   │   ├── launch_package_modal.dart
│   │   ├── preference_wizard_screen.dart
│   │   ├── pricing_calculator_screen.dart
│   │   ├── progress_tracker_screen.dart
│   │   ├── roadmap_screen.dart
│   │   ├── splash_screen.dart
│   │   ├── step_detail_screen.dart
│   │   └── supplier_directory_screen.dart
│   ├── services/
│   │   ├── ai_service.dart
│   │   ├── geocoding_service.dart
│   │   └── local_storage_service.dart
│   ├── theme/
│   │   ├── app_colors.dart
│   │   └── app_typography.dart
│   ├── widgets/
│   └── main.dart
├── linux/ macos/ web/ windows/
└── test/
```

## 🛠️ Tech Stack

- **Framework:** Flutter (Dart)
- **State Management:** Provider (`AppStateProvider`)
- **Platforms:** Android, iOS (with Linux, macOS, Web, and Windows scaffolding)

## 🚀 Getting Started

### Prerequisites
- [Flutter SDK](https://docs.flutter.dev/get-started/install) installed and configured
- Android Studio / Xcode (for emulator or physical device testing)
- A connected Android emulator, iOS simulator, or physical device

### Installation

```bash
# Clone the repository
git clone https://github.com/afighi/Likhora-Mobile-App.git
cd Likhora-Mobile-App

# Install dependencies
flutter pub get

# Run the app
flutter run
```

## 📱 App Screens

- **Home** – greeting, business journey progress, quick actions (Roadmap, Pricing, Suppliers), AI nudges
- **Roadmap (Launch Plan)** – launch board and templates tabs, journey map, milestone tracking
- **Pricing** – cost-based pricing calculator with suggested selling price, margin slider, and cost breakdown
- **Progress** – overall completion tracker, weekly milestones, launch toolkit
- **Suppliers** – location-based, context-aware supplier directory matched to the user's current roadmap step
- **Step Detail** – focused milestone checklist for the active roadmap step

## 🗺️ Roadmap / Future Enhancements

- Supplier self-registration accounts
- Live/verified supplier pricing integration
- Direct links to government business registration portals
- Expanded template library covering more business categories

## 📄 License

This project is developed for academic purposes (ITE231 – IT ELECTIVE 4).

---

**Author:** De Guzman, Ahiah Ryajen M.
