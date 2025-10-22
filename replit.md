# Tokani TripFlow - Travel Management System

## Overview

Tokani TripFlow is a professional travel request, approval, and expense management system designed specifically for Fijian organizations. The application streamlines the entire travel workflow from initial request submission through multi-level approvals to expense reconciliation, with special consideration for low-bandwidth environments and local compliance requirements (FRCS-friendly records).

Key features include automated per-diem calculations, visa requirement checking, multi-level approval workflows with delegation support, budget tracking by cost centre, audit trail maintenance, and comprehensive analytics. The system is built with a mobile-first approach optimized for bandwidth-constrained environments.

## Recent Changes (October 22, 2025)

### Layout and UX Improvements
- **Sidebar Width Optimization**: Reduced sidebar width from 16rem to 13rem (208px) to provide more space for main content and prevent horizontal scrolling on smaller screens
- **Horizontal Scrollbar Fix**: Eliminated horizontal scrollbar across all pages by:
  - Adding `overflow-x: hidden` to html/body elements
  - Changing main element from `overflow-auto` to `overflow-y-auto overflow-x-hidden`
  - Ensuring all pages use proper `container mx-auto py-8 px-4` structure
- **Double Scrollbar Resolution**: Fixed New Request page to prevent nested scrollable containers

### Demo Data Enhancement
- Added 10 realistic travel requests for presentation and testing:
  - 6 approved requests (Finance, HR, IT, Operations departments)
  - 2 submitted requests (Marketing, IT)
  - 1 in-review request (Operations)
  - 1 rejected request (HR)
- Destinations include domestic Fiji (Suva, Nadi, Labasa) and international (Australia, New Zealand, Singapore, USA)
- Total approved per diem: FJD 1,922 across 6 requests
- All requests include proper visa checks, cost centre assignments, and approval history

### Finance Export Functionality
- Finance Export page now fully functional with 6 approved requests available for export
- CSV and Excel export buttons enabled with real demo data
- Preview section displays sample approved requests with employee names and per diem amounts

### Technical Improvements
- Added visaCheck to all travel requests (including domestic trips marked as "OK - Domestic travel")
- Ensured type safety and WCAG 2.1 AA accessibility compliance across all Pacific/Fiji themed components

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build Tools**
- React with TypeScript for type-safe component development
- Vite as the build tool and development server
- TailwindCSS for utility-first styling with custom design tokens
- Wouter for lightweight client-side routing

**UI Component System**
- Radix UI primitives for accessible, unstyled components
- shadcn/ui component library (New York style variant) providing pre-built, customizable components
- Custom theme system with light/dark mode support via CSS variables
- Material Design principles adapted for enterprise productivity with bandwidth optimization

**State Management & Data Fetching**
- TanStack Query (React Query) for server state management, caching, and data synchronization
- Form state managed via react-hook-form with Zod schema validation
- Local component state using React hooks

**Design Philosophy**
- Efficiency-first approach minimizing cognitive load
- Bandwidth-conscious: no decorative animations, optimized assets
- Mobile-native with 44px minimum touch targets
- Professional aesthetics for trust in financial/compliance workflows
- Progressive enhancement for offline-friendly UX

### Backend Architecture

**Server Framework**
- Express.js server with TypeScript
- RESTful API design pattern
- In-memory storage adapter pattern (production-ready interface for database integration)

**API Structure**
- `/api/requests/*` - Travel request CRUD operations
- `/api/requests/:id/approve` - Approval workflow endpoints
- `/api/requests/:id/reject` - Rejection workflow endpoints
- `/api/delegations/*` - Delegation management

**Data Layer Pattern**
- Storage adapter interface (`IStorage`) abstracting database operations
- Current implementation uses `MemStorage` (in-memory) with sample data
- Designed for easy migration to persistent storage (Drizzle ORM configuration present)
- Type-safe data models defined in `shared/types.ts`

**Business Logic**
- Per-diem calculation with first/last day 75% rule
- Visa checking against stored rules
- Multi-level approval flow with configurable approver sequences
- Delegation and escalation support
- Budget validation and tracking by cost centre
- Immutable audit trail for all state changes

### Data Storage Solutions

**Current Implementation**
- In-memory storage (`MemStorage` class) for development/testing
- Seeded sample data for demonstration

**Planned Production Storage**
- Drizzle ORM configured for PostgreSQL (via `@neondatabase/serverless`)
- Database schema defined in `shared/schema.ts` (currently minimal - users table only)
- Migration support via `drizzle-kit` with migrations output to `./migrations`
- Environment variable `DATABASE_URL` required for production database connection

**Data Model Highlights**
- `TravelRequest` - Core entity with embedded per-diem calculations, visa status, approval flow
- `DelegateAssignment` - Temporary authority delegation with date ranges
- `CostCentre` - Budget tracking and finance reconciliation
- `HistoryEntry` - Immutable audit trail entries
- Adapter pattern allows swapping storage implementations without business logic changes

### Authentication and Authorization

**Current State**
- Mock authentication with hardcoded user IDs ("employee", "manager", "finance_admin")
- Role-based access control types defined (`UserRole`: employee, approver, finance_admin, travel_admin)
- User model exists in schema but authentication not yet implemented

**Planned Implementation**
- Session-based authentication (connect-pg-simple package included for PostgreSQL session store)
- Role-based permissions controlling access to approval, analytics, and admin features
- Delegation system allowing temporary authority transfer between users

### External Dependencies

**Third-Party APIs**
- **Amadeus Self-Service API** - Airport/city code autocomplete (currently mocked with static data in `LocationAutocomplete.tsx`)
  - Integration point: `client/src/components/LocationAutocomplete.tsx`
  - Mock data includes major Pacific region airports (Fiji, Australia, New Zealand, US)

**UI Libraries & Components**
- **Radix UI** - Comprehensive suite of accessible component primitives (accordion, dialog, dropdown, popover, select, tabs, toast, tooltip, etc.)
- **shadcn/ui** - Pre-styled component library built on Radix UI
- **Recharts** - Chart library for analytics dashboard visualization
- **cmdk** - Command palette component for search/navigation

**Data Processing & Export**
- **papaparse** - CSV parsing and generation for finance exports
- **xlsx** - Excel file generation for export functionality
- **jsPDF** - PDF generation for trip summaries

**Form Handling & Validation**
- **react-hook-form** - Performant form state management
- **zod** - Schema validation with TypeScript type inference
- **@hookform/resolvers** - Integration between react-hook-form and zod

**Date Handling**
- **date-fns** - Lightweight date manipulation and formatting

**Development Tools**
- **Replit-specific plugins** - Runtime error overlay, cartographer, dev banner for Replit environment
- **tsx** - TypeScript execution for development server
- **esbuild** - Fast bundling for production builds

**Database & ORM**
- **Drizzle ORM** - TypeScript-first ORM with type-safe queries
- **@neondatabase/serverless** - PostgreSQL driver optimized for serverless environments
- **drizzle-zod** - Automatic Zod schema generation from Drizzle schemas

**Utility Libraries**
- **clsx** & **tailwind-merge** - Conditional className composition
- **class-variance-authority** - Type-safe variant styling patterns
- **nanoid** - Compact unique ID generation