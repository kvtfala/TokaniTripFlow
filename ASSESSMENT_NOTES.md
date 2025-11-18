# RFQ Workflow Integration - System Assessment

## Current State Analysis (Completed)

### Existing Status Model
```typescript
export type RequestStatus = "draft" | "submitted" | "in_review" | "approved" | "rejected" | "ticketed";
```

**Current Flow:**
1. `draft` → Not submitted yet
2. `submitted` → Awaiting first approver
3. `in_review` → Multi-level approval in progress (approverIndex advancing)
4. `approved` → All approvers have approved
5. `rejected` → Rejected by any approver
6. `ticketed` → Travel Desk has processed booking

### Existing Approval Logic
- **Multi-level approvers**: `approverFlow: string[]` (e.g. ["manager", "finance_admin"])
- **Current approver**: `approverIndex: number` (advances with each approval)
- **Endpoints**: `/api/requests/:id/approve`, `/api/requests/:id/reject`
- **Final approval**: When `approverIndex >= approverFlow.length`, status → "approved"

### Existing Models & Fields (Relevant to RFQ)
```typescript
interface TravelRequest {
  // Core fields
  id, employeeName, employeeNumber, position, department, employeeId
  destination, startDate, endDate, purpose
  
  // Approval flow
  status: RequestStatus
  approverFlow: string[]
  approverIndex: number
  history: HistoryEntry[]
  
  // Cost tracking (ALREADY EXISTS - can integrate with quotes)
  costBreakdown?: {
    flights?: number
    accommodation?: number
    groundTransfers?: number
    visaFees?: number
    perDiem: number
    totalCost: number
  }
  
  // Service flags (ALREADY EXISTS - can use for RFQ requirements)
  needsFlights?: boolean
  needsAccommodation?: boolean
  needsVisa?: boolean
  needsTransport?: boolean
}
```

### Existing History/Audit
```typescript
interface HistoryEntry {
  ts: string
  actor: string
  action: HistoryAction  // "SUBMIT" | "APPROVE" | "REJECT" | "ESCALATE" | "COMMENT" | "TICKET" | "QUOTE"
  note?: string
}
```

**Note**: `"QUOTE"` action already exists in HistoryAction enum! We can reuse this.

### Existing UI Pages
1. **RequestDetail.tsx**:
   - Split view: Left (traveler info, trip details, financial), Right (timeline, decision)
   - Shows approval timeline from `request.history`
   - Decision section with approve/reject (shown if `canTakeAction`)
   - Already displays `costBreakdown` in Financial Details section

2. **ManagerDashboard.tsx**: Shows requests awaiting manager approval
3. **CoordinatorDashboard.tsx**: Shows team requests
4. **TravelDeskDashboard.tsx**: Shows approved requests for processing

### Existing Role System
- Roles: employee, coordinator, manager, finance_admin, travel_admin
- Auth: Replit Auth with PostgreSQL sessions
- Test users already created for each role

## Integration Plan

### 1. Status Model Extension (Minimal Change)

**Add two new statuses** to support RFQ workflow:
```typescript
export type RequestStatus = 
  | "draft" 
  | "submitted"           // Initial submission
  | "in_review"           // Approval in progress
  | "awaiting_quotes"     // NEW: Pre-approved to collect quotes
  | "quotes_submitted"    // NEW: Coordinator has submitted with quotes for final approval
  | "approved"            // Final approval (ready for Travel Desk)
  | "rejected" 
  | "ticketed";           // Travel Desk processed
```

**Status Transitions:**
1. `submitted` → (manager pre-approves) → `awaiting_quotes`
2. `awaiting_quotes` → (coordinator sends RFQ, adds quotes) → `quotes_submitted`
3. `quotes_submitted` → (manager/finance final approves) → `approved`
4. `approved` → (Travel Desk processes) → `ticketed`

### 2. New Models to Add

**TravelQuote** (quotes from vendors):
```typescript
interface TravelQuote {
  id: string
  requestId: string
  vendorName: string
  vendorEmail: string
  quoteValue: number
  currency: string  // e.g. "FJD"
  pnr?: string  // Reservation number
  quoteExpiry?: string  // ISO date
  notes?: string
  attachmentUrl?: string
  createdBy: string  // User ID who logged this quote
  createdAt: string
  updatedAt: string
}
```

**QuotePolicy** (minimum quote requirements):
```typescript
interface QuotePolicy {
  id: string
  minQuotesDomestic: number
  minQuotesInternational: number
  allowOverride: boolean
  overrideRoles: string[]  // e.g. ["manager", "finance_admin"]
}
```

### 3. New Fields on TravelRequest

Extend existing TravelRequest with:
```typescript
interface TravelRequest {
  // ... existing fields ...
  
  // RFQ tracking
  rfqRecipients?: Array<{vendorName: string, email: string}>
  rfqSentAt?: string
  
  // Quote selection (for final approval)
  selectedQuoteId?: string
  quoteJustification?: string  // Required if not cheapest quote
  
  // Policy override
  quoteRequirementOverridden?: boolean
  quoteOverrideReason?: string
}
```

### 4. New API Endpoints to Add

**RFQ Operations:**
- `POST /api/requests/:id/send-rfq` - Send RFQ emails to vendors
- `POST /api/requests/:id/quotes` - Log a new quote
- `GET /api/requests/:id/quotes` - Get all quotes for a request
- `PUT /api/requests/:id/quotes/:quoteId` - Update a quote
- `DELETE /api/requests/:id/quotes/:quoteId` - Delete a quote
- `POST /api/requests/:id/submit-with-quotes` - Submit request with selected quote for final approval

**Modified Endpoints:**
- Extend `POST /api/requests/:id/approve` to:
  - Support "pre-approval" (transition to `awaiting_quotes`)
  - Support "final approval" (validate quotes, transition to `approved`)

### 5. UI Changes (Extend, Don't Replace)

**RequestDetail.tsx** - Add new sections:

A. **RFQ Section** (shown if status === "awaiting_quotes" && user is coordinator):
   - Button: "Send RFQ to Vendors"
   - Modal with vendor selection/entry
   - Shows RFQ recipients if already sent

B. **Quotes Section** (shown if status >= "awaiting_quotes"):
   - Table of all quotes (vendor, amount, PNR, expiry, attachment)
   - "Add Quote" button (if coordinator && status === "awaiting_quotes")
   - "Select Quote" radio buttons (if coordinator submitting)
   - Quote justification field (if selected quote is not cheapest)

C. **Extended Decision Section** (for managers):
   - If status === "submitted": Normal pre-approval
   - If status === "quotes_submitted": Show quote comparison + final approval
   - Validate minimum quotes before final approval

**Manager Dashboard** - Update filters:
   - Show `awaiting_quotes` requests (informational)
   - Show `quotes_submitted` requests (actionable for final approval)

### 6. Database Changes

**New Tables:**
- `travel_quotes` (stores vendor quotes)
- `quote_policies` (minimum quote requirements)

**Updated Table:**
- `travel_requests` - add RFQ and quote selection fields (non-breaking additions)

### 7. Implementation Order

1. ✅ **Assessment complete** (this document)
2. **Schema/Models** - Add new types to shared/types.ts
3. **Storage Layer** - Extend IStorage with quote operations
4. **Database** - Add new tables, run migration
5. **Backend API** - Create quote endpoints
6. **Frontend UI** - Add RFQ/Quote sections to RequestDetail
7. **Approval Logic** - Extend approve endpoint for pre-approval vs final approval
8. **Testing** - Test complete flow with test users
9. **Documentation** - Create FLOW_NOTES.md

## Design Decisions

### Reusing Existing Patterns
- ✅ **Keep existing approval logic**: `approverFlow` and `approverIndex` still work
- ✅ **Extend history**: Use existing HistoryEntry with "QUOTE" action
- ✅ **Reuse costBreakdown**: Can populate from selected quote
- ✅ **Reuse service flags**: Use `needsFlights`, etc. to determine RFQ requirements

### Minimal Breaking Changes
- ✅ **Add statuses, don't remove**: Existing flows still work
- ✅ **Optional fields**: All new TravelRequest fields are optional
- ✅ **Backward compatible**: Requests without quotes can still use old flow

### Policy Integration
- Quote requirements will check trip type (domestic vs international)
- Will use existing `destination.country` field to determine if international
- Override mechanism follows pattern of existing audit flag/note fields
