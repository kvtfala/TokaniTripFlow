# Tokani TripFlow - Travel Management System

## Overview
Tokani TripFlow is a professional travel request, approval, and expense management system designed for Fijian organizations. It streamlines the entire travel workflow from submission to multi-level approvals and expense reconciliation, focusing on low-bandwidth environments and local compliance (FRCS-friendly records). Key capabilities include automated per-diem calculations, visa requirement checks, multi-level approval workflows with delegation, budget tracking by cost center, audit trails, and comprehensive analytics. The system prioritizes a mobile-first approach. The project's ambition is to provide a robust, efficient, and compliant travel management solution tailored for enterprise clients like Pacific Foods Group Pte Ltd, demonstrating significant market potential in the Pacific region.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework & Build Tools**: React with TypeScript, Vite, TailwindCSS, Wouter for routing.
- **UI Component System**: Radix UI primitives, shadcn/ui (New York style), custom theme with light/dark mode, Material Design principles adapted for enterprise productivity and bandwidth optimization.
- **State Management & Data Fetching**: TanStack Query for server state, react-hook-form with Zod for form state.
- **Design Philosophy**: Efficiency-first, bandwidth-conscious (no decorative animations, optimized assets), mobile-native (44px touch targets), professional aesthetics, progressive enhancement for offline UX.

### Backend Architecture
- **Server Framework**: Express.js with TypeScript, RESTful API design.
- **API Structure**: Endpoints for travel request CRUD, approval/rejection workflows, and delegation management.
- **Data Layer Pattern**: Abstracted storage adapter (`IStorage`) with current in-memory implementation (`MemStorage`) for development, designed for easy migration to persistent storage (e.g., PostgreSQL with Drizzle ORM).
- **Business Logic**: Per-diem calculation (first/last day 75% rule), visa checking, multi-level configurable approval flows, delegation, budget validation, and immutable audit trails.

### Data Storage Solutions
- **Current**: In-memory storage (`MemStorage`) with seeded sample data.
- **Planned Production**: Drizzle ORM configured for PostgreSQL (via `@neondatabase/serverless`), schema defined in `shared/schema.ts`, migration support via `drizzle-kit`.
- **Data Model Highlights**: `TravelRequest`, `DelegateAssignment`, `CostCentre`, `HistoryEntry`, with an adapter pattern for storage flexibility.

### Authentication and Authorization
- **Current**: Mock authentication with hardcoded user IDs and role-based access control types (`UserRole`: employee, approver, finance_admin, travel_admin).
- **Planned**: Session-based authentication (using `connect-pg-simple`), role-based permissions, and a delegation system.

### System Design Choices
- **UI/UX**: Dashboard improvements include personalized greetings, activity feeds, upcoming trips widgets, budget alerts, advanced search/filtering, and responsive layouts. "MyTrips" page offers comprehensive search, advanced filtering, multi-column sorting, and performance optimization. "Analytics Dashboard" provides date range controls, trend analysis, monthly spend visualization, and data export. "Approvals Workflow" supports bulk actions, search/filter, and summary cards. "Travel Watch" page features KPI summary cards, search, alerts for returning travelers, and CSV export, with mobile-first responsive design and Pacific-themed map enhancements for visual clarity and accessibility.
- **Technical Implementations**: Implemented `useMemo` for performance optimization across dashboards, `data-testid` attributes for testing, and comprehensive validation for date inputs. Addressed layout issues by optimizing sidebar width and fixing horizontal/double scrollbars.
- **Feature Specifications**: Automated per-diem and visa checks, multi-level approvals, budget tracking, audit trails, and comprehensive analytics are core features. The system also includes enterprise-specific features demonstrated with a detailed dataset for Pacific Foods Group Pte Ltd, encompassing 11 departments and various travel request scenarios, including finance export functionality.

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
## Recent Changes

### November 3, 2025 - Map Replacement with Destination Analytics

#### Travel Watch: SVG Map → Destination Analytics Panel
Replaced the SVG-based map visualization with a practical destination analytics system that delivers actionable insights for travel administrators.

**Why the Change:**
- Old SVG map lacked geographic context (ocean gradient only, no real map imagery)
- Difficult to extract actionable business intelligence
- Consumed bandwidth without providing decision value
- Limited utility for travel monitoring tasks

**New Destination Analytics Panel:**

1. **Destination Overview Table/Cards**:
   - Aggregates active trips (in progress + upcoming) by city/country
   - Shows: In Progress count, Upcoming count, Total Per Diem (FJD), Latest Return Date, Visa Compliance Flags
   - Desktop: 6-column sortable table with hover states
   - Mobile: Responsive card layout with 2x2 grid per destination  
   - Badge colors: Lagoon (#009BAA) for in-progress, Coral (#EF6C57) for upcoming
   - Visa warning badges (amber) for compliance alerts
   - Auto-sorted by total trip volume (busiest destinations first)
   - data-testid: card-destination-overview, row-destination-{idx}, card-destination-{idx}

2. **Top Destinations Bar Chart**:
   - Horizontal stacked bar chart showing top 10 travel destinations
   - Segments: In Progress (Lagoon), Upcoming (Coral), Completed (Gray)
   - Covers all trip types for comprehensive travel pattern analysis
   - Built with Recharts, 300px responsive height
   - Pacific color palette throughout (#009BAA, #EF6C57, #94a3b8)
   - data-testid: card-destination-chart

**Technical Implementation:**
- **Aggregation Logic**: Map-based O(n) aggregation in useMemo hooks
  - `destinationData`: Groups trips by destination with counts, totals, dates, warnings
  - `topRoutesData`: Top 10 destinations across all trip statuses
- **Performance**: Memoized calculations prevent unnecessary re-renders
- **Offline-Ready**: No external API dependencies, works in low-bandwidth environments
- **WCAG 2.1 AA Compliant**: Proper semantic HTML, color contrast, keyboard navigation

**Value Delivered:**
- ✅ Clear trip counts and per diem totals by destination  
- ✅ Return date visibility for resource planning
- ✅ Visa compliance warnings surfaced prominently
- ✅ Travel pattern visualization (top routes chart)
- ✅ Works offline/low bandwidth (critical for Fiji)
- ✅ Actionable data over decorative visualization
- ✅ Mobile-responsive (table → cards)

**Files Modified:**
- `client/src/pages/TravelWatch.tsx`: Removed TravelMap import, added destination aggregation logic and analytics components
