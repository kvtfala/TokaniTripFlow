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
- **API Structure**: Endpoints for travel request CRUD, approval/rejection workflows, delegation management, and comprehensive Admin Portal API (12 endpoints).
- **Data Layer Pattern**: Abstracted storage adapter (`IStorage`) with in-memory implementation (`MemStorage`) for development, designed for migration to persistent storage (e.g., PostgreSQL with Drizzle ORM).
- **Business Logic**: Per-diem calculation (first/last day 75% rule), visa checking, multi-level configurable approval flows, delegation, budget validation, and immutable audit trails.
- **Admin Portal Backend (Nov 2025)**: Comprehensive validation and audit logging implementation
  * **Validation Layer**: All 12 admin routes use strict Zod validation with `.strict()` to reject unknown fields, `safeParse()` for error handling
  * **Audit Logging**: Enhanced logging with before/after snapshots, field-level change tracking, deep comparison for nested objects
  * **Data Immutability**: Defense-in-depth approach with 5 layers:
    1. Route handlers clone previousValue before updates
    2. Storage update methods return structuredClone of updated entities
    3. Admin storage getters (15 methods) return structuredClone to prevent mutation
    4. Auth-critical getters (getUser, getUserByEmail, updateUser) return clones
    5. Null-safe audit logging handles undefined values
  * **Routes Implemented**: Vendors (POST/PATCH with finance approval workflow), Email Templates (POST/PATCH), Per Diem Rates (POST/PATCH), Travel Policies (POST/PATCH), Workflow Rules (POST/PATCH), System Notifications (POST/PATCH)
  * **Vendor Approval Workflow**: Finance admins and super admins must approve vendors before they're available in RFQ dropdowns (status: pending_approval → approved)
  * **Future Improvements**: Extend structuredClone pattern to remaining storage getters (getTravelRequests, getQuotes, getDelegations) for complete system-wide immutability
  
### Admin Portal Frontend (Nov 2025)
- **Complete Implementation**: All 7 admin sections fully functional with comprehensive CRUD operations
- **Sections Implemented**:
  1. **Vendor Management**: Finance approval workflow (pending → approved/rejected/suspended), performance ratings, services management, contact details
  2. **Email Template Management**: Category-based templates (approval_request, trip_reminder, etc.), 11 documented placeholders ({{employee_name}}, {{trip_destination}}, etc.), active/inactive toggle
  3. **Per Diem Rates Management**: Location-based daily rates, tier filtering (standard/manager/executive), currency support (FJD, USD, AUD, NZD, EUR, GBP), effective date ranges
  4. **Travel Policies Management**: MVP JSON-driven rule engine with conditions/actions, priority ordering, effective dates, compliance flags, **robust error handling** (3-layer validation)
  5. **Workflow Rules Management**: MVP JSON-driven multi-stage approval flows, preset template library (Two-Stage, Single Approval), escalation paths, **robust error handling** (3-layer validation)
  6. **System Notifications Management**: User/role targeting, severity levels (info/warning/critical), publish workflow, expiry dates, dismissible flags
  7. **Audit Log Viewer**: Read-only compliance viewer, summary statistics, CSV export, before/after JSON comparison, field-level change tracking
- **Technical Architecture**:
  * **UI Pattern**: Consistent across all sections - shadcn/ui Table + Dialog forms + AlertDialog confirmations
  * **State Management**: TanStack Query v5 (useQuery, useMutation) with cache invalidation
  * **Form Handling**: react-hook-form + zodResolver + insertSchema validation from shared/schema.ts
  * **Error Handling**: 3-layer JSON validation (Zod `.refine()` → form try/catch → mutation try/catch) prevents error mislabeling
  * **Components**: Badge for status/severity, Card for documentation, Select for filtering, DatePicker for date ranges
  * **Testing**: Comprehensive data-testid attributes on all interactive elements
  * **Access Control**: Role guard (finance_admin || manager || super_admin), backend enforces additional permissions per operation
- **Routing & Navigation**: `/admin` route in App.tsx, sidebar menu item with Shield icon, 8-tab internal navigation
- **JSON Configuration Philosophy**: MVP approach uses text-area JSON editors for Travel Policies and Workflow Rules (no visual builders for MVP) with robust validation and error recovery
- **Known Limitations**: Testing environment may have role assignment mismatches (OIDC claims vs actual user data); individual admin operations have backend role requirements beyond page access

### Data Storage Solutions
- **Current**: In-memory storage (`MemStorage`) with seeded sample data.
- **Planned Production**: Drizzle ORM configured for PostgreSQL (via `@neondatabase/serverless`), schema defined in `shared/schema.ts`, migration support via `drizzle-kit`.
- **Data Model Highlights**: `TravelRequest`, `DelegateAssignment`, `CostCentre`, `HistoryEntry`, `Vendor`, `EmailTemplate`, `PerDiemRate`, `TravelPolicy`, `WorkflowRule`, `SystemNotification`, `AuditLog` with an adapter pattern for storage flexibility.
- **Admin Portal Entities (Nov 2025)**: 
  * **Vendors**: Contact info, services, approval status (pending/approved/rejected/suspended), performance rating, notes
  * **Email Templates**: Subject/body with placeholders, category, active status, created by tracking
  * **Per Diem Rates**: Location-based daily allowances with effective date ranges, currency, tier levels
  * **Travel Policies**: Rule engine with conditions, actions, priority, effective dates, compliance flags
  * **Workflow Rules**: Multi-stage approval flows with role-based approvers, conditions, escalation paths
  * **System Notifications**: User-targeted messages with severity, publish status, expiry dates, dismissible flags
  * **Audit Logs**: Immutable compliance records with action tracking, entity snapshots, field-level changes, user attribution

### Authentication and Authorization
- **Dual Authentication System**: Supports both production Replit Auth and demo login for testing
  
- **Production Replit Auth**: Integrated OpenID Connect authentication with PostgreSQL session storage
  * **Identity Providers**: Google, GitHub, Email/Password via Replit Auth
  * **Session Management**: PostgreSQL-backed sessions using `connect-pg-simple`, 1-week TTL with automatic OIDC token refresh
  * **Frontend Auth**: `useAuth()` hook with proper 401 handling, Landing page for logged-out users
  * **Backend Protection**: `isAuthenticated` Express middleware with automatic token refresh for OIDC sessions
  * **Database**: `users` table stores email, firstName, lastName, profileImageUrl; `sessions` table for session persistence
  * **Routes**: `/api/login` (starts auth flow), `/api/callback` (OIDC callback), `/api/logout` (session cleanup), `/api/auth/user` (current user)
  * **Auth Flow**: Landing page → Sign In with Replit → Replit OIDC → Callback → Session creation → Authenticated app

- **Demo Login (Island Travel Technologies)**: Email/password authentication for demo environment
  * **Implementation**: `server/demoAuth.ts` with bcrypt password verification, `shared/demoSchema.ts` for Zod validation
  * **Frontend**: `DemoLogin` component using shadcn Form + react-hook-form + zodResolver + TanStack Query mutation
  * **Session Management**: Demo sessions flagged with `isDemo: true`, 24-hour expiry, requires explicit re-login (no OIDC refresh)
  * **Credentials**: 
    - Company Code: `itt001`
    - Email: `desmond.bale@islandtraveltech.com`
    - Password: `itt1235*` (bcrypt hash stored in database)
    - Role: `manager` (full access to all features and dashboards)
  * **Route**: `/api/demo-login` (POST with companyCode, email, password)
  * **Auth Flow**: Landing page → Try Demo → Fill credentials → Demo login → Session creation → Authenticated app
  * **Security**: Bcrypt password hashing (10 rounds), session-based auth, no refresh token for demo sessions
- **Current Auth State**: 
  * **RoleContext Update (Nov 2025)**: Refactored to fetch authenticated user from `/api/auth/user` via TanStack Query instead of hardcoded DEFAULT_USER
    - Uses `useQuery` with retry:false, 5-minute staleTime
    - Exposes `isLoading` state to prevent race conditions during auth checks
    - Dashboard routing now waits for `isLoading:false` before redirecting based on role
  * **Testing Environment Limitation**: `/api/auth/user` returns 401 during OIDC test flows, causing "Unexpected end of JSON input" errors. This is a test-only limitation; production Replit Auth works correctly
  * **Backend Routes**: Hardcoded user IDs still used in backend routes (`currentManagerId = "manager"`) for role-based testing
  * Role guards implemented on CoordinatorDashboard (coordinator/manager only), ManagerDashboard (manager only), TravelDeskDashboard (travel_admin/manager only)
  * RequestDetail approval actions use hardcoded `currentManagerId = "manager"` matching backend validation
  * TODO: Replace hardcoded IDs with dynamic `req.user` from session after Replit Auth testing
- **Role Types**: `UserRole`: employee, coordinator, manager, finance_admin, travel_admin
- **Demo Environment**: Island Travel Technologies (ITT) seed data
  * Demo user: Desmond Bale (manager role, full access)
  * 11 sample travel requests demonstrating all workflow stages
  * Cost centres, departments, approval flows, quotes, and history entries
  * All Pacific Foods Group references replaced with Island Travel Technologies (ITT-* employee numbers)
- **Next Steps**: Migrate from hardcoded user IDs to session-based user identification, add role-based permissions middleware, implement delegation system, add proper authorization checks on all API routes.

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