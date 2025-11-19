# Tokani TripFlow - Travel Management System

## Overview
Tokani TripFlow is a travel request, approval, and expense management system designed for Fijian organizations. Its primary purpose is to streamline travel workflows from submission to multi-level approvals and expense reconciliation. Key capabilities include automated per-diem calculations, visa checks, configurable multi-level approval workflows with delegation, budget tracking by cost center, immutable audit trails, and integrated analytics. The system prioritizes functionality in low-bandwidth environments, adherence to local compliance standards (FRCS-friendly records), and a mobile-first user experience. The project's ambition is to deliver a robust, efficient, and compliant enterprise solution for the Pacific region.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The system features a mobile-first responsive design with 44px touch targets, professional aesthetics, and progressive enhancement for offline UX. The UI includes a personalized dashboard, comprehensive "MyTrips" and "Approvals Workflow" pages with advanced search/filtering/sorting, and an "Analytics Dashboard" for trend analysis and data export. A multi-step wizard guides travel request creation, and a "Travel Watch" dashboard provides KPI summaries and alerts. The design adapts Material Design principles for enterprise productivity and bandwidth optimization, incorporating custom themes and light/dark modes.

### Technical Implementations
The frontend uses React with TypeScript, Vite, TailwindCSS, Wouter for routing, Radix UI for primitives, and shadcn/ui for components. State management and data fetching are handled by TanStack Query, while forms use react-hook-form with Zod validation. The backend is built with Express.js and TypeScript, following a RESTful API design. It implements business logic for per-diem calculations, visa checks, multi-level configurable approval flows, delegation, budget validation, and immutable audit trails. The Admin Portal features comprehensive CRUD operations across seven sections (Vendor, Email Template, Per Diem, Travel Policy, Workflow Rules, System Notifications, Audit Log Viewer) with robust 3-layer JSON validation and audit logging. Authentication supports both Replit Auth (OpenID Connect with PostgreSQL session storage) and a demo login system. Role-based access control is foundational, with a `RoleContext` and `useRole` hook.

### System Design Choices
The system uses an abstracted storage adapter (`IStorage`) with an in-memory implementation for development, designed for migration to persistent storage like PostgreSQL with Drizzle ORM. The data model includes entities such as `TravelRequest`, `DelegateAssignment`, `CostCentre`, `HistoryEntry`, `Vendor`, `EmailTemplate`, `PerDiemRate`, `TravelPolicy`, `WorkflowRule`, `SystemNotification`, and `AuditLog`. Data immutability is enforced through multiple layers, including cloning entities before updates and when retrieved. Backend routes enforce strict Zod validation and comprehensive audit logging with before/after snapshots. The Admin Portal utilizes a consistent UI pattern with shadcn/ui tables and dialogs, TanStack Query for state, and react-hook-form for forms.

## External Dependencies

### Third-Party APIs
- **Amadeus Self-Service API**: For airport/city code autocomplete (currently mocked).

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