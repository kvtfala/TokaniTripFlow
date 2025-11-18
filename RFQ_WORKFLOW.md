# RFQ (Request for Quote) Workflow Documentation

## Overview

The RFQ workflow extends Tokani TripFlow's approval process to support multi-stage approvals with vendor quote collection for high-value travel requests. This ensures competitive pricing and compliance with procurement policies before final authorization.

## Workflow Stages

### Standard Approval Flow (No Quotes Required)
```
submitted → in_review → approved → completed
```

### RFQ-Enhanced Flow (Quotes Required)
```
submitted → in_review → [PRE-APPROVAL] → awaiting_quotes → 
[COLLECT QUOTES] → quotes_submitted → [FINAL APPROVAL] → approved → completed
```

## Status Definitions

| Status | Description | Who Can Act |
|--------|-------------|-------------|
| `submitted` | Initial submission | - |
| `in_review` | Under review by approver | Current approver in approverFlow |
| `awaiting_quotes` | Pre-approved, waiting for quotes | Coordinator |
| `quotes_submitted` | Quotes collected and submitted | Current approver (for final approval) |
| `approved` | Fully approved | - |
| `rejected` | Rejected at any stage | - |

## Quote Policy

Defined in `QuotePolicy` type:
- **Domestic Travel (within Fiji)**: Minimum 2 quotes required for trips ≥ FJD 3,000
- **International Travel**: Minimum 3 quotes required for trips ≥ FJD 3,000
- **Threshold**: FJD 3,000 (configurable)

### Quote Selection Rules
1. **Cheapest Quote**: Can be selected without justification
2. **Non-Cheapest Quote**: Requires written justification explaining why a higher-priced vendor was chosen

## Backend Implementation

### Data Models

#### TravelQuote
```typescript
{
  id: string;
  requestId: string;
  vendorName: string;
  vendorEmail: string;
  quoteValue: number;
  currency: string; // "FJD"
  quotedAt: string; // ISO timestamp
  notes?: string;
}
```

#### QuotePolicy
```typescript
{
  minQuotesDomestic: number; // 2
  minQuotesInternational: number; // 3
  minValueThreshold: number; // 3000 FJD
  currency: string; // "FJD"
}
```

### API Endpoints

#### Quote Management

**GET /api/requests/:requestId/quotes**
- Returns all quotes for a request
- Authorization: Any authenticated user (coordinator for editing)

**POST /api/requests/:requestId/quotes**
- Creates a new quote
- Body: `{ vendorName, vendorEmail, quoteValue, currency, notes? }`
- Authorization: Coordinator

**DELETE /api/requests/:requestId/quotes/:quoteId**
- Deletes a quote
- Authorization: Coordinator

**GET /api/requests/:requestId/quote-policy**
- Returns applicable quote policy for the request
- Based on destination (domestic vs international)

#### Workflow Actions

**POST /api/requests/:requestId/send-rfq**
- Sends RFQ to vendors (placeholder - email integration pending)
- Body: `{ vendorEmails: string[] }`
- Updates `request.rfqSentAt` timestamp
- Authorization: Coordinator

**POST /api/requests/:requestId/submit-with-quotes**
- Submits quotes for final approval
- Body: `{ selectedQuoteId, quoteJustification? }`
- Validates quote policy compliance
- Updates status to `quotes_submitted`
- Authorization: Coordinator

**POST /api/requests/:requestId/approve**
- Extended to support both pre-approval and final approval
- Body: `{ approvalType?: "pre_approval" | "final", comment? }`
- **Pre-approval**: Changes status to `awaiting_quotes`
- **Final approval**: Validates approverFlow and advances approval stage
- Authorization: Current approver in approverFlow

### Storage Interface Extensions

```typescript
interface IStorage {
  // Quote operations
  getQuotes(requestId: string): Promise<TravelQuote[]>;
  createQuote(quote: Omit<TravelQuote, "id">): Promise<TravelQuote>;
  deleteQuote(quoteId: string): Promise<void>;
  getQuotePolicy(requestId: string): Promise<QuotePolicy>;
  
  // Request operations (extended)
  updateRequestStatus(
    requestId: string,
    status: RequestStatus,
    updates?: Partial<TravelRequest>
  ): Promise<TravelRequest>;
}
```

## Frontend Implementation

### Components

#### RfqSection
Location: `client/src/pages/RequestDetail.tsx` (inline component)

**Purpose**: Send RFQ to vendors

**Features**:
- Vendor email input with Add button
- Duplicate email prevention
- Vendor list with remove capability
- Send RFQ button (triggers `/api/requests/:id/send-rfq`)

**Permissions**: Only shown when `status === "awaiting_quotes"` and user is coordinator

#### QuotesSection
Location: `client/src/pages/RequestDetail.tsx` (inline component)

**Purpose**: Manage vendor quotes

**Features**:
- Add Quote dialog (vendor name, email, quote value, notes)
- Quote table with:
  - Vendor info
  - Quote value
  - Cheapest indicator (green badge)
  - Delete action
- Quote selection radio buttons
- Justification textarea (required for non-cheapest selection)
- Submit with Quotes button
- Quote policy validation (min quotes required)
- State syncing via useEffect (prevents stale selections)

**Permissions**: 
- View: Any user
- Edit: Coordinator only
- Submit: Coordinator only (when policy requirements met)

#### Approval Section Extensions

**Pre-Approval Button**:
- Shown when: `status === "submitted" || "in_review"` AND current user is expected approver
- Action: Sends `POST /api/requests/:id/approve` with `approvalType: "pre_approval"`
- Result: Status → `awaiting_quotes`

**Final Approval Section**:
- Shown when: `status === "quotes_submitted"` AND current user is expected approver
- Displays:
  - Selected quote details
  - Justification (if provided)
  - Quote comparison table
- Action: Sends `POST /api/requests/:id/approve` (no approvalType = final)
- Result: Status → `approved` (or next approval stage)

### State Management

**Queries**:
```typescript
// Request data
useQuery({ queryKey: ["/api/requests", requestId] })

// Quotes
useQuery({ 
  queryKey: ["/api/requests", requestId, "quotes"],
  enabled: status === "awaiting_quotes" || status === "quotes_submitted"
})

// Quote policy
useQuery({ 
  queryKey: ["/api/requests", requestId, "quote-policy"],
  enabled: status === "awaiting_quotes" || status === "quotes_submitted"
})
```

**State Syncing**:
```typescript
// Sync selectedQuoteId and quoteJustification with server data
useEffect(() => {
  if (request.selectedQuoteId !== selectedQuoteId) {
    setSelectedQuoteId(request.selectedQuoteId);
  }
  if (request.quoteJustification !== quoteJustification) {
    setQuoteJustification(request.quoteJustification || "");
  }
}, [request.selectedQuoteId, request.quoteJustification]);
```

**Mutations**:
- `addQuoteMutation`: POST quote
- `deleteQuoteMutation`: DELETE quote
- `sendRfqMutation`: POST send-rfq
- `submitWithQuotesMutation`: POST submit-with-quotes (with client-side validation)
- `approveMutation`: POST approve (with approvalType param)

### Validation

**Client-Side**:
- Minimum quotes required (based on policy)
- Justification required for non-cheapest quote
- Null-safe validation (handles missing quote policy)

**Server-Side**:
- Authorization: Current approver matches expected approver in approverFlow
- Quote policy compliance
- Selected quote exists
- Justification provided if required

## Known Limitations

### Hardcoded User IDs (System-Wide)
- **Current State**: Backend routes use `currentApproverId = "manager"` hardcoded value
- **Impact**: All approval actions are processed as if initiated by "manager" user
- **Scope**: This is a system-wide pattern (documented in replit.md) affecting all routes
- **Mitigation**: Frontend implements permission guards based on expected approver flow
- **Future**: Will be replaced with `req.user` from session after Replit Auth integration is complete

### Email Integration
- **Current State**: `/api/requests/:id/send-rfq` endpoint is a placeholder
- **Future**: Integrate with email service (SendGrid, Twilio, etc.) to send actual RFQ emails to vendors

## Testing Guide

### Test Scenario: Complete RFQ Flow

**Prerequisites**:
- Test user accounts created (see TEST_CREDENTIALS.md)
- Sample travel request with cost ≥ FJD 3,000

**Steps**:

1. **Submit Request** (as Employee)
   - Create travel request
   - Set estimated cost ≥ FJD 3,000
   - Submit request → status: `submitted`

2. **Pre-Approve** (as Manager)
   - Navigate to request detail
   - Click "Pre-Approve to Collect Quotes"
   - Status should change to `awaiting_quotes`

3. **Send RFQ** (as Coordinator)
   - In RFQ section, add vendor emails
   - Click "Send RFQ"
   - Verify `rfqSentAt` timestamp appears

4. **Add Quotes** (as Coordinator)
   - Click "Add Quote"
   - Enter vendor name, email, quote value
   - Repeat for minimum required quotes (2 domestic, 3 international)
   - Verify cheapest quote is highlighted

5. **Select Quote** (as Coordinator)
   - Select a quote using radio button
   - If not cheapest: Enter justification
   - Click "Submit with Quotes"
   - Status should change to `quotes_submitted`

6. **Final Approve** (as Manager/Finance)
   - Navigate to request detail
   - Review selected quote in final approval section
   - Click "Approve"
   - Status should change to `approved`

### Expected Validations

**Client-Side Errors**:
- "Policy requires X quotes. You have Y." (if insufficient quotes)
- "Justification required when not selecting the cheapest quote"

**Server-Side Errors**:
- "This user is not the current approver" (if unauthorized)
- "Request does not meet quote policy requirements" (if policy not satisfied)

## Architecture Decisions

### Why In-Memory Storage?
- Consistent with existing system architecture
- Simplifies testing and development
- Easy migration path to PostgreSQL when ready

### Why Inline Components?
- Minimizes file count (development guideline)
- RfqSection and QuotesSection are tightly coupled to RequestDetail
- Shared state management (selectedQuoteId, quoteJustification)

### Why useEffect for State Syncing?
- Prevents stale UI state after server updates
- Handles cross-session changes (if multiple users editing)
- Ensures selected quote reflects latest server data

### Why Client-Side + Server-Side Validation?
- **Client-Side**: Improves UX with immediate feedback
- **Server-Side**: Ensures security and data integrity
- **Null Guards**: Prevents runtime errors when quote policy is undefined

## Future Enhancements

1. **Session-Based Auth**: Replace hardcoded user IDs with `req.user` from session
2. **Email Integration**: Send actual RFQ emails to vendors
3. **Vendor Portal**: Allow vendors to submit quotes directly via portal
4. **Quote Attachments**: Support PDF/file uploads for quote documentation
5. **Automated Comparison**: Generate side-by-side comparison reports
6. **Budget Integration**: Automatically check against cost center budgets
7. **Audit Trail**: Track all quote-related actions in history log

## References

- Main implementation: `client/src/pages/RequestDetail.tsx`
- Backend routes: `server/routes.ts`
- Storage: `server/storage.ts`
- Data models: `shared/types.ts`
- Test credentials: `TEST_CREDENTIALS.md`
- Project overview: `replit.md`
