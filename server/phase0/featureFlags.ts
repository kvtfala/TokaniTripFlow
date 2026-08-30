export interface Phase0FeatureFlags {
  productionCore: boolean;
}

function enabled(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
}

export function getPhase0FeatureFlags(
  env: NodeJS.ProcessEnv = process.env,
): Phase0FeatureFlags {
  return {
    productionCore: enabled(env.TRIPFLOW_PRODUCTION_CORE_ENABLED),
  };
}

