# Tokani TripFlow - Travel Management System

## Overview
Tokani TripFlow is a travel request, approval, and expense management system designed for Fijian organizations. Its primary purpose is to streamline travel workflows from submission to multi-level approvals and expense reconciliation. Key capabilities include automated per-diem calculations, visa checks, configurable multi-level approval workflows with delegation, budget tracking by cost center, immutable audit trails, and integrated analytics. The system prioritizes functionality in low-bandwidth environments, adherence to local compliance standards (FRCS-friendly records), and a mobile-first user experience. The project's ambition is to deliver a robust, efficient, and compliant enterprise solution for the Pacific region.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The system features a mobile-first responsive design with 44px touch targets, professional aesthetics, and progressive enhancement for offline UX. The UI includes a personalized dashboard, comprehensive "MyTrips" and "Approvals Workflow" pages with advanced search/filtering/sorting, and a unified "Reports" page (replacing separate Analytics and Finance Export pages) that consolidates trend analysis, transaction detail, cost analysis, and multi-format data export. A multi-step wizard guides travel request creation, and a "Travel Command Centre" provides a full duty-of-care dashboard — interactive world map, live GDACS threat feed, real-time weather, welfare alerts, 14-day Gantt timeline, and destination roster.

**Design System (Tokani Official Brand - v3.0):**
- **Typography:** Inter font family loaded from Google Fonts with defined type scale (H1: 32px, H2: 26px, H3: 20px, Body: 16px)
- **Spacing:** 8px rhythm system (4px, 8px, 12px, 16px, 20px, 24px, 32px, 40px) with ttf-* spacing utilities
- **Colors:** Centralized ttf-* brand color classes (ttf-blue #0057B8, ttf-navy #002A52, ttf-aqua #1FBED6, ttf-light-sky #EAF7FF)
- **Components:** Buttons use rounded-full, Cards use rounded-2xl, Inputs use rounded-lg for consistent enterprise aesthetic
- **Accessibility:** WCAG 2.1 AA compliant with verified contrast ratios (≥4.5:1 for body text, ≥5.2:1 for white text on gradients)
- **Documentation:** Comprehensive design guidelines in design_guidelines.md covering typography, layout, spacing, components, and accessibility rules

**Custom Icon Library (TokaniIcons v1.0):**
- `client/src/components/icons/TokaniIcons.tsx` — 19 travel-domain SVG React components
- Icons: Dashboard, Trips, Travellers, Approvals, TravelPolicies, Flights, Hotels, Expense, Transport, Documents, Alerts, Reports, Teams, DutyOfCare, Messages, Calendar, Upload, Settings, Search
- Props: `size` (default 24), `strokeWidth` (default 1.5), `accentColor` (default `#1FBED6`), `className`
- Dual-tone style: `currentColor` for structural strokes (adapts to light/dark mode), `accentColor` for teal accent elements
- Exported as named components + `TOKANI_ICONS` record map
- Used in: sidebar navigation (App.tsx), page headers (all main pages), Quick Access grid (Home.tsx), empty states (MyTrips, Approvals, ExpenseClaims)
- Sidebar: active item at full opacity, inactive at opacity-60; both use `accentColor="#1FBED6"`
- Home dashboard has a 3×2 "Quick Access" branded card grid using TokaniIcons at 40px

### Technical Implementations
The frontend uses React with TypeScript, Vite, TailwindCSS, Wouter for routing, Radix UI for primitives, and shadcn/ui for components. State management and data fetching are handled by TanStack Query, while forms use react-hook-form with Zod validation. The backend is built with Express.js and TypeScript, following a RESTful API design. It implements business logic for per-diem calculations, visa checks, multi-level configurable approval flows, delegation, budget validation, and immutable audit trails. The Admin Portal features comprehensive CRUD operations across seven sections (Vendor, Email Template, Per Diem, Travel Policy, Workflow Rules, System Notifications, Audit Log Viewer) with robust 3-layer JSON validation and audit logging. Authentication supports both Replit Auth (OpenID Connect with PostgreSQL session storage) and a demo login system. Role-based access control is foundational, with a `RoleContext` and `useRole` hook.

**Expense Claims Module (v1.0):**
- Travellers submit expense claims after approved trips via `/expenses` page
- Multi-step ClaimWizard: select trip → add line items with receipt upload → summary & submit
- AI-powered receipt OCR via Google Gemini 1.5 Flash Vision (`server/services/receiptOcr.ts`) auto-fills merchant name, date, amount, and category
- Receipt categories: Meals, Accommodation, Transport (Local), Flights, Visa / Entry Fees, Communication, Other
- Claim status lifecycle: `draft → submitted → under_review → approved/rejected → paid`
- Finance managers review claims in the Reports → Claims tab with full approve/reject workflow
- Expense claims linked to TravelRequest by `requestId` and `travelRequestRef`
- RequestDetail page shows expense claims section for approved/ticketed trips

### System Design Choices
The system uses an abstracted storage adapter (`IStorage`) with an in-memory implementation for development, designed for migration to persistent storage like PostgreSQL with Drizzle ORM. The data model includes entities such as `TravelRequest`, `DelegateAssignment`, `CostCentre`, `HistoryEntry`, `Vendor`, `EmailTemplate`, `PerDiemRate`, `TravelPolicy`, `WorkflowRule`, `SystemNotification`, `AuditLog`, and `ExpenseClaim`. Data immutability is enforced through multiple layers, including cloning entities before updates and when retrieved. Backend routes enforce strict Zod validation and comprehensive audit logging with before/after snapshots. The Admin Portal utilizes a consistent UI pattern with shadcn/ui tables and dialogs, TanStack Query for state, and react-hook-form for forms.

## External Dependencies

### Third-Party APIs
- **Amadeus Self-Service API**: For airport/city code autocomplete (currently mocked).
- **Google Gemini 1.5 Flash Vision** (`@google/generative-ai`): Receipt OCR via `POST /api/uploads/ocr-receipt`. API key stored as `GOOGLE_API_KEY_GEMINI` environment secret.

### UI Libraries & Components
- **Radix UI**: Accessible component primitives.
- **shadcn/ui**: Pre-styled component library.
- **Recharts**: Charting for analytics.
- **cmdk**: Command palette component.

### Data Processing & Export
- **papaparse**: CSV parsing and generation.
- **xlsx**: Excel file generation.
- **jsPDF**: PDF generation.

### Form Handling & Validation
- **react-hook-form**: Form state management.
- **zod**: Schema validation.
- **@hookform/resolvers**: Integration with Zod.

### Date Handling
- **date-fns**: Date manipulation and formatting.

### Database & ORM
- **Drizzle ORM**: TypeScript-first ORM.
- **@neondatabase/serverless**: PostgreSQL driver.
- **drizzle-zod**: Zod schema generation from Drizzle schemas.

### Utility Libraries
- **clsx** & **tailwind-merge**: Conditional className composition.
- **class-variance-authority**: Type-safe variant styling.
- **nanoid**: Unique ID generation.