# Tokani TripFlow - Travel Management System

## Overview
Tokani TripFlow is a travel request, approval, and expense management system for Fijian organizations. It streamlines travel workflows from submission to multi-level approvals and expense reconciliation. Key features include automated per-diem calculations, visa checks, multi-level approval workflows with delegation, budget tracking by cost center, audit trails, and analytics. The system focuses on low-bandwidth environments, local compliance (FRCS-friendly records), and a mobile-first approach. Its ambition is to provide a robust, efficient, and compliant solution for enterprise clients in the Pacific region.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework & Build Tools**: React with TypeScript, Vite, TailwindCSS, Wouter for routing.
- **UI Component System**: Radix UI primitives, shadcn/ui (New York style), custom theme with light/dark mode, Material Design principles adapted for enterprise productivity and bandwidth optimization.
- **State Management & Data Fetching**: TanStack Query for server state, react-hook-form with Zod for form state.
- **Design Philosophy**: Efficiency-first, bandwidth-conscious, mobile-native (44px touch targets), professional aesthetics, progressive enhancement for offline UX.
- **UI/UX Decisions**: Dashboard with personalized greetings, activity feeds, upcoming trips, budget alerts, advanced search/filtering. "MyTrips" page with comprehensive search, filtering, multi-column sorting. "Analytics Dashboard" for trend analysis, monthly spend, data export. "Approvals Workflow" with bulk actions, search/filter. "Travel Watch" for KPI summaries, alerts, CSV export, mobile-first responsive design, Pacific-themed map enhancements. Multi-step wizard for travel request creation with role-based navigation foundation.

### Backend Architecture
- **Server Framework**: Express.js with TypeScript, RESTful API design.
- **API Structure**: Endpoints for travel request CRUD, approval/rejection workflows, and delegation management.
- **Data Layer Pattern**: Abstracted storage adapter (`IStorage`) with in-memory implementation (`MemStorage`) for development, designed for migration to persistent storage (e.g., PostgreSQL with Drizzle ORM).
- **Business Logic**: Per-diem calculation (first/last day 75% rule), visa checking, multi-level configurable approval flows, delegation, budget validation, and immutable audit trails.

### Data Storage Solutions
- **Current**: In-memory storage (`MemStorage`) with seeded sample data.
- **Planned Production**: Drizzle ORM configured for PostgreSQL (via `@neondatabase/serverless`), schema defined in `shared/schema.ts`, migration support via `drizzle-kit`.
- **Data Model Highlights**: `TravelRequest`, `DelegateAssignment`, `CostCentre`, `HistoryEntry`, with an adapter pattern for storage flexibility.

### Authentication and Authorization
- **Current**: Mock authentication with RoleProvider context, hardcoded user IDs in backend routes (`currentManagerId = "manager"`), and basic role guards on dashboard pages.
  * Role guards implemented on CoordinatorDashboard (coordinator/manager only) and ManagerDashboard (manager only)
  * RequestDetail approval actions use hardcoded `currentManagerId = "manager"` matching backend validation
  * TODO: Replace with session-based authentication and dynamic user ID from req.user
- **Role Types**: `UserRole`: employee, coordinator, manager, finance_admin, travel_admin
- **Planned Production**: Session-based authentication (using `connect-pg-simple`), JWT tokens, role-based permissions middleware, delegation system, and proper authorization checks on all API routes.

### Technical Implementations
- `useMemo` for performance optimization, `data-testid` attributes for testing, comprehensive validation for date inputs.
- Role-based system foundation with `RoleContext` and `useRole` hook.
- Multi-step travel request wizard with validation, autosave to localStorage, and draft recovery.
- Automated finance routing logic based on cost and policy.
- Mock employee directory service for traveller selection.
- Expanded location data for global destinations.
- Comprehensive wizard-specific types in `shared/types.ts`.
- Travel Watch dashboard features smart metrics with trend indicators, multi-level alert system (returning travelers, overdue expenses, high-value trips, visa compliance), advanced analytics charts (department spend, travel activity, visa compliance), enhanced CSV export, sortable table columns, and quick filter chips.

## External Dependencies

### Third-Party APIs
- **Amadeus Self-Service API**: Airport/city code autocomplete (currently mocked).

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
- **@hookform/resolvers**: Integration with zod.

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