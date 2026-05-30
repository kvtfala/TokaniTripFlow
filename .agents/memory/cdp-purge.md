---
name: CDP purge pattern
description: How cdp001 demo data is removed; two complementary mechanisms exist
---

CDP Couriers (cdp001) was the original second demo org. It has been fully replaced by THC (thc001) and KHC (khc001). Two cleanup mechanisms remain in place as safeguards:

1. **`server/seed.ts` `cleanupCdp()`** — called first in `main()`, DELETEs from `expenseClaims`, `travelRequests`, `refSequences`, `users` WHERE `companyCode = 'cdp001'`. Safe/idempotent.

2. **`server/dbInit.ts` `purgeCdpDemoData()`** — same four DELETEs, called by `initializeDatabase()` on every server startup (no-op if already clean).

**Why:** Belt-and-suspenders — seed.ts handles deliberate re-seeding, dbInit.ts handles any race conditions or partial states from old deployments.

**How to apply:** Do not remove these purge calls; they are cheap no-ops once cdp001 rows are gone and protect against stale production data if an old seed ran against the DB.
