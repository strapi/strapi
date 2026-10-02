import type { Modules } from '@strapi/types';

/**
 * A feature as the license lists it: a name, or an object with a name (and often `options`).
 */
type LicenseFeature = { name: string; [key: string]: any } | string;

type LegacyFeature = { name: Modules.EE.FeatureName; options?: Record<string, unknown> };

/**
 * Features of a legacy license, which has no `features`, by license type.
 */
const LEGACY_FEATURES: Record<Modules.EE.LicenseType, LegacyFeature[]> = {
  bronze: [],
  silver: [],
  gold: [
    { name: 'sso' },
    // Set a null retention duration to allow the user to override it
    // The default of 90 days is set in the audit logs service
    { name: 'audit-logs', options: { retentionDays: null } },
    { name: 'review-workflows' },
    { name: 'cms-content-releases' },
    { name: 'cms-content-history', options: { retentionDays: 99999 } },
    { name: 'cms-advanced-preview' },
  ],
};

const SEAT_LIMIT = 'seat-limit' satisfies Modules.EE.FeatureName;

/**
 * The features of a verified license payload: its `features` as they are, else the legacy
 * features of its `type`. Entries are kept as the license lists them.
 */
const resolveFeatures = <TFeatures extends LicenseFeature[]>(licenseInfo: {
  type: Modules.EE.LicenseType;
  features?: TFeatures;
}) => {
  // Falsy on purpose, not only missing: the legacy fallback has always used `!features`
  return licenseInfo.features || LEGACY_FEATURES[licenseInfo.type];
};

/**
 * Every license feature: a name becomes `{ name }`, an object is returned as the license lists it.
 * `seat-limit` is not part of it, see {@link getFeature}.
 */
const listFeatures = (features: LicenseFeature[] | undefined) => {
  return (
    features?.map((feature) => (typeof feature === 'object' ? feature : { name: feature })) || []
  );
};

/**
 * The license feature of that name, else `undefined`. The options shape of a known name is
 * trusted from the license, it is not validated.
 *
 * `seat-limit` comes from the top-level `seats` only: present when `seats` is neither `undefined`
 * nor `null`, the condition under which the seat checks treat it as a limit, with `seats` as is.
 * The license payload is signed, so the value is neither coerced nor validated.
 */
const getFeature = <TName extends Modules.EE.FeatureName>(
  licenseInfo: { features?: LicenseFeature[]; seats?: number | null },
  name: TName
): Modules.EE.Feature<TName> | undefined => {
  if (name === SEAT_LIMIT) {
    const { seats } = licenseInfo;

    // TODO @Nico a `seat-limit` listed in `features` is ignored; the registry does not send one
    if (seats === undefined || seats === null) {
      return undefined;
    }

    return { name, options: { seats } } as Modules.EE.Feature<TName>;
  }

  return listFeatures(licenseInfo.features).find(
    (feature): feature is Modules.EE.Feature<TName> => feature.name === name
  );
};

export type { LicenseFeature };
export { LEGACY_FEATURES, resolveFeatures, listFeatures, getFeature };
