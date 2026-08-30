# Repository baseline

Baseline captured on 2026-08-30 from `main` before Phase 0 changes.

## Current stack

- React 18 and Vite 6 frontend
- Express 4 and TypeScript backend
- Drizzle ORM with PostgreSQL/Neon
- Replit authentication and demo authentication paths
- Object storage, reporting, policies, providers, expenses and audit features

## Verification results

| Check | Result | Notes |
| --- | --- | --- |
| Dependency install | Pass | `npm ci` completed; several transitive packages are deprecated |
| Type-check | Fail | `npm run check` reports 60 TypeScript errors |
| Production build | Pass | Vite and the bundled Express server build successfully |
| Automated tests | Missing | No repository test script or committed test suite |
| CI workflow | Missing | No GitHub Actions workflow currently enforces checks |

## Main failure groups

- UI and schema types have drifted, including roles, travel-request fields, expense line items and status presentation.
- Several admin forms no longer match their Zod/React Hook Form types.
- Replit chat integration imports schema exports that do not exist.
- API request bodies reach storage functions as `unknown` in multiple routes.
- Some policy and audit values exist in code but not in their declared enums.
- Compiler target defaults are inconsistent with `Set` iteration used by the application.
- `xml2js` has no installed TypeScript declaration package.

## Phase 0 baseline rule

The existing errors must be reduced to zero before target-schema migrations are merged. Each repair should restore the intended contract rather than suppress type safety globally. The production build and a small automated test harness then become required pull-request checks.
