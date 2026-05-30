---
name: Demo org TTR prefix map
description: Each tenant has its own travel request number prefix; the map lives in dbStorage.ts generateTTRNumber()
---

The `generateTTRNumber()` method in `server/dbStorage.ts` uses a `prefixMap` to decide the reference number prefix for each company:

```ts
const prefixMap: Record<string, string> = {
  itt001: "TTR",
  thc001: "THC",
  khc001: "KHC",
};
const prefix = prefixMap[companyCode] ?? "TTR";
```

**Why:** Each org needs its own readable prefix (TTR-2026-00001, THC-2026-00001, KHC-2026-00001) so references are unambiguous in multi-tenant context. The fallback "TTR" catches any legacy/unknown codes.

**How to apply:** Any time a new demo tenant is added, add its companyCode → prefix entry here AND seed a row in `refSequences` with the matching prefix via `server/seed.ts`.
