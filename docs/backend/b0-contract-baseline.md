# Backend Phase B0 contract baseline

Status: in progress  
Repository baseline: `38a166ac55047f9c55899d05b67583394bb87ae4`  
Implementation branch: `backend-b0-contract-reconciliation`

## Purpose

Phase B0 reconciles the frontend integration at the pinned baseline with the
approved TripFlow architecture, workflow and security controls before the
Supabase database, authentication and storage foundation is introduced.

The repository baseline is fixed. Later branch changes are not incorporated
without an explicit impact review.

## Decisions established in the first B0 increment

### Draft integrity

- An initial draft requires only title and purpose.
- Draft detail responses represent missing traveller, destination, case type
  and funding values as null rather than inventing placeholder domain data.
- Submission remains a separate strict command.
- Draft updates and submission include an expected version.
- Submission and component commands carry idempotency keys where replay could
  otherwise duplicate a material action.

### Funding references

- The browser submits stable identifiers for cost centres, projects, funding
  sources and budgets.
- Display names and codes are not authoritative relationships.
- Cost-centre-only travel is supported.
- Project, funding source and budget references remain optional until tenant
  policy requires them.

### Authorization

- Display roles map to stable capabilities.
- Approval, Authority to Proceed and finance powers are separate.
- Tenant administration does not automatically grant case access.
- Tenant administration does not automatically grant document access.
- Restricted documents require a separate server-side restricted-data
  permission after tenant and case scope have been evaluated.
- User-editable identity metadata and frontend role checks are not
  authorization sources.

### Tenant boundary

- The browser does not submit an authoritative organisation identifier.
- Hidden and cross-tenant records use the same neutral not-found behaviour.
- Supabase RLS will supplement, not replace, Express authorization.
- Every operational child will require a database-enforced tenant relationship
  to its parent during B3.

## Frontend-to-backend route contract

| Frontend experience | Method | API | B0 requirement |
| --- | --- | --- | --- |
| Travel Case list | GET | `/api/v1/travel-cases` | Tenant-scoped summaries; incomplete drafts are safe |
| Create draft | POST | `/api/v1/travel-cases` | Title and purpose only; no tenant input |
| Case detail | GET | `/api/v1/travel-cases/:caseId` | Neutral not-found; server actions |
| Save draft | PATCH | `/api/v1/travel-cases/:caseId/draft` | Expected version; server validation |
| Add component | POST | `/api/v1/travel-cases/:caseId/components` | Expected version and idempotency |
| Submit | POST | `/api/v1/travel-cases/:caseId/submission` | Strict completeness, attestation and idempotency |

## Security and quality alignment

The implementation evidence is structured to support:

- ISO/IEC 27001:2022 security governance and change control;
- ISO/IEC 27002:2022 access, logging and operational controls;
- ISO/IEC 27034-1 application-security lifecycle;
- ISO/IEC 25010 security, reliability and maintainability;
- ISO/IEC 29119 risk-based testing;
- OWASP ASVS and OWASP API Security Top 10 verification; and
- NIST Secure Software Development Framework practices.

ISO certification applies to the organisation and its information-security
management system. Repository controls provide supporting technical evidence;
they do not by themselves constitute certification.

## Verification evidence for this increment

- Strict TypeScript: passed.
- Automated tests: 27 passed across 8 files.
- Production build: passed.
- High or critical production dependency findings: none.
- Moderate production dependency findings: six pre-existing `uuid` findings
  inherited through Excel and Google Cloud dependency paths.
- Forced dependency downgrade is prohibited because the available automatic
  remediation is breaking.

## Remaining B0 work

- Implement the defined route-to-capability policies in the Express handlers.
- Implement persistence for standardized errors, audit events and idempotency
  receipts during B1/B3.
- Add the backend API implementation plan for all six Phase 1 routes.
- Review and reconcile the remaining legacy frontend screens.
- Complete the B0 acceptance checklist before beginning B1.

## Decisions established in the second B0 increment

- All API failures use a validated error code, safe message and correlation ID.
- The six Phase 1 frontend routes map to stable capabilities and authorization
  scopes in executable shared policy.
- Case-specific routes use neutral not-found behavior.
- Every material command defines its audit effect; component creation and
  submission require both idempotency and optimistic concurrency.
- Legacy migration follows expand, rehearse, migrate, verify, cut over and
  contract stages with tenant, document and finance reconciliation gates.
- Every operational child uses a composite tenant-parent relationship.
- Approval, Authority to Proceed, provider fulfilment and finance remain
  separate facts from the case lifecycle projection.
