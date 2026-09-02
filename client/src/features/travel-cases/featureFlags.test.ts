import { describe, expect, it } from "vitest";
import { phaseOneTravelCasesEnabled } from "./featureFlags";

describe("phaseOneTravelCasesEnabled", () => {
  it("is fail-closed when the flag is absent", () => {
    expect(phaseOneTravelCasesEnabled({} as ImportMetaEnv)).toBe(false);
  });

  it("requires an explicit true value", () => {
    expect(phaseOneTravelCasesEnabled({ VITE_TRIPFLOW_PHASE1_UI_ENABLED: "true" } as ImportMetaEnv)).toBe(true);
    expect(phaseOneTravelCasesEnabled({ VITE_TRIPFLOW_PHASE1_UI_ENABLED: "false" } as ImportMetaEnv)).toBe(false);
  });
});
