export function phaseOneTravelCasesEnabled(env: ImportMetaEnv = import.meta.env): boolean {
  return env.VITE_TRIPFLOW_PHASE1_UI_ENABLED?.trim().toLowerCase() === "true";
}
