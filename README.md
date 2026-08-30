# TripFlow

TripFlow is a multi-tenant travel management, coordination and control platform. The current application is a demonstration build being evolved toward production through the controlled Phase 0 foundation work in [`docs/phase-0`](docs/phase-0/README.md).

## Local start

Prerequisites:

- Node 18+
- npm

Install dependencies and start the development server:

```bash
npm ci
npm run dev
```

The server requires the environment variables used by the selected database and authentication mode. Do not commit credentials or production secrets.

## Quality checks

```bash
npm run check
npm run build
```

Phase 0 baseline and architecture decisions are recorded under `docs/`. Replit-specific development information remains available in `replit.md`.
