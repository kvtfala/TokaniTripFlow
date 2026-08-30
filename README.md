# TripFlow

TripFlow is a multi-tenant travel management, coordination and control
platform. The current application is a demonstration build being evolved toward
production through the controlled Phase 0 foundation work in
[`docs/phase-0`](docs/phase-0/README.md).

Quick demo start (local)

Prerequisites
- Node 18+ and npm

Install dependencies

npm ci

Start the development server

npm run dev

The server requires the environment variables used by the selected database and
authentication mode. Do not commit credentials or production secrets.

Quality checks

```bash
npm run check
npm run build
```

Notes
- Phase 0 baseline and architecture decisions are recorded under `docs/`.
- Replit-specific development information remains available in `replit.md`.
