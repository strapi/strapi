/**
 * Effective entitlement limits registry.
 *
 * Feature modules register a live resolver for each numeric limit they enforce;
 * the license endpoint and the support debug dump read the resolved, normalized
 * values. A resolved value that is nullish or greater than or equal to
 * UNLIMITED_ENTITLEMENT_THRESHOLD is reported as `null`, meaning "Unlimited".
 */

// The license registry ships a deliberately large number to mean "unlimited"
// (see the "a number that will never be reached like 9999" convention in
// content-releases validation). Kept server-side so the frontend never hard-codes it.
export const UNLIMITED_ENTITLEMENT_THRESHOLD = 9999;

export interface EntitlementLimitInput {
  key: string;
  unit?: 'days' | 'count';
  get: () => number | null | undefined;
}

export interface EntitlementInput {
  feature: string;
  limits: EntitlementLimitInput[];
}

export interface EntitlementLimit {
  key: string;
  unit?: 'days' | 'count';
  value: number | null;
}

export interface Entitlement {
  feature: string;
  limits: EntitlementLimit[];
}

const normalize = (value: number | null | undefined): number | null => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return null;
  }
  return value >= UNLIMITED_ENTITLEMENT_THRESHOLD ? null : value;
};

export const createEntitlementsRegistry = () => {
  const registry: EntitlementInput[] = [];

  const register = (input: EntitlementInput): void => {
    const index = registry.findIndex((entry) => entry.feature === input.feature);
    if (index >= 0) {
      registry[index] = input;
    } else {
      registry.push(input);
    }
  };

  const list = (): Entitlement[] =>
    registry.map((entry) => ({
      feature: entry.feature,
      limits: entry.limits.map((limit) => ({
        key: limit.key,
        unit: limit.unit,
        value: normalize(limit.get()),
      })),
    }));

  return { register, list };
};
