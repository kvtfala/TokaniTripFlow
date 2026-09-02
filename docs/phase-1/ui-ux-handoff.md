# Phase 1 UI/UX handoff — case intake and submission

Status: ready for UI/UX design

## Design now

- Role-aware case list/dashboard using the `TravelCaseSummary` contract.
- New-case journey with save-and-resume draft behaviour.
- Traveller, trip, destination, funding and service-component sections.
- Review-and-attest step before formal submission.
- Case-detail shell using `TravelCaseDetail`, including current status,
  dependency, next action, components and chronological activity area.
- Loading, empty, validation, forbidden, not-found and version-conflict states.

## Required interaction rules

- Drafts may be incomplete, are editable and are not billable.
- Title and purpose are required to create the initial draft record.
- Submission requires case type, one traveller, valid dates, destination,
  funding information, at least one component and affirmative attestation.
- The first production journey is one traveller; do not imply group allocation.
- Organisation/tenant is derived from the signed-in membership and must not be
  selectable or submitted as an authoritative field.
- Case status is displayed but never freely editable.
- Submission must prevent accidental duplicates and present a stable result if
  the same idempotency key is retried.
- Cross-tenant and missing resources use the same not-found experience.
- Approval and Authority to Proceed must appear as separate concepts.
- Provider authority and provider confirmation must also appear separately.

## First route map

| Experience | Method | Path |
| --- | --- | --- |
| Case list | GET | `/api/v1/travel-cases` |
| Create draft | POST | `/api/v1/travel-cases` |
| Case detail | GET | `/api/v1/travel-cases/:caseId` |
| Save draft | PATCH | `/api/v1/travel-cases/:caseId/draft` |
| Add component | POST | `/api/v1/travel-cases/:caseId/components` |
| Submit | POST | `/api/v1/travel-cases/:caseId/submission` |

The authoritative executable schemas and response shapes are in
`shared/contracts/travelCases.ts`. Visual styling remains a UI/UX decision;
workflow semantics and required states do not.
