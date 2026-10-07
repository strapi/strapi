/**
 * Effective entitlement limits registry.
 *
 * Feature modules register a live resolver for each numeric limit they enforce;
 * the license endpoint and the support debug dump read the resolved, normalized
 * values. A numeric string is read as its number. A resolved value that is nullish,
 * non-numeric, or greater than or equal to UNLIMITED_ENTITLEMENT_THRESHOLD is reported
 * as `null`, meaning "Unlimited".
 */

// The license registry ships a deliberately large number to mean "unlimited"
// (see the "a number that will never be reached like 9999" convention in
// content-releases validation). Kept server-side so the frontend never hard-codes it.
export const UNLIMITED_ENTITLEMENT_THRESHOLD = 9999;

/** A feature as a license lists it: a bare name, or `{ name, options }`. */
export type EntitlementFeature =
  | string
  | { name: string; options?: Record<string, unknown>; [key: string]: unknown }
  | undefined;

export interface EntitlementLimitInput {
  key: string;
  unit?: 'days' | 'count';
  /**
   * Resolves the limit the feature enforces from the feature as a license lists it. The same
   * resolver serves the live license and a lapsed license's retained snapshot, so it must read
   * options from the feature it is handed and apply its own defaults and clamps.
   */
  get: (feature?: EntitlementFeature) => unknown;
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

const normalize = (value: unknown): number | null => {
  // License options are untyped JSON, and the registry has shipped some limits as numeric
  // strings (`retentionDays: "90"`). Enforcement coerces those implicitly, so accepting only
  // real numbers here showed a 90-day audit-logs cap as "Unlimited".
  const limit = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;

  if (typeof limit !== 'number' || Number.isNaN(limit)) {
    return null;
  }
  return limit >= UNLIMITED_ENTITLEMENT_THRESHOLD ? null : limit;
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

  const list = (
    getFeature: (name: string) => EntitlementFeature = () => undefined
  ): Entitlement[] =>
    registry.map((entry) => {
      const feature = getFeature(entry.feature);

      return {
        feature: entry.feature,
        limits: entry.limits.map((limit) => ({
          key: limit.key,
          unit: limit.unit,
          value: normalize(limit.get(feature)),
        })),
      };
    });

  return { register, list };
};
