import { isPlainObject } from 'lodash/fp';
import type { Modules } from '@strapi/types';

type ResolvedFeature = { name: string; options: Record<string, unknown> };

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

// The review-workflows server read these at the top level before; the registry shape is unverified
const LEGACY_TOP_LEVEL_OPTIONS: Record<string, string[]> = {
  'review-workflows': ['numberOfWorkflows', 'stagesPerWorkflow'],
};

const isOptions = (value: unknown): value is Record<string, unknown> => isPlainObject(value);

const isLicenseType = (value: unknown): value is Modules.EE.LicenseType =>
  typeof value === 'string' && Object.hasOwn(LEGACY_FEATURES, value);

const toFeature = (entry: unknown): ResolvedFeature | undefined => {
  if (typeof entry === 'string') {
    return { name: entry, options: {} };
  }

  if (isOptions(entry) === false || typeof entry.name !== 'string') {
    return undefined;
  }

  const options: Record<string, unknown> = isOptions(entry.options) ? { ...entry.options } : {};
  const legacyKeys = Object.hasOwn(LEGACY_TOP_LEVEL_OPTIONS, entry.name)
    ? LEGACY_TOP_LEVEL_OPTIONS[entry.name]
    : [];

  // `options` wins over a legacy top-level key
  for (const key of legacyKeys) {
    if (Object.hasOwn(entry, key) === true && Object.hasOwn(options, key) === false) {
      options[key] = entry[key];
    }
  }

  // The other top-level keys stay on the feature, for the code that reads them there
  return { ...entry, name: entry.name, options };
};

/**
 * Turns a verified license payload into its features, each with an options object.
 * Without `features` (`undefined` or `null`), the features come from the legacy license `type`.
 * Malformed `features` (not an array) grant nothing.
 */
const resolveFeatures = (licenseInfo: {
  type?: unknown;
  features?: unknown;
}): ResolvedFeature[] => {
  let entries: unknown[] = [];

  // `null` is legacy too: the previous `!licenseInfo.features` check treated it as missing
  if (licenseInfo.features === undefined || licenseInfo.features === null) {
    entries = isLicenseType(licenseInfo.type) ? LEGACY_FEATURES[licenseInfo.type] : [];
  } else if (Array.isArray(licenseInfo.features)) {
    entries = licenseInfo.features;
  }

  const features: ResolvedFeature[] = [];
  const names = new Set<string>();

  for (const entry of entries) {
    const feature = toFeature(entry);

    // The first entry of a name wins
    if (feature !== undefined && names.has(feature.name) === false) {
      names.add(feature.name);
      features.push(feature);
    }
  }

  return features;
};

export type { ResolvedFeature };
export { LEGACY_FEATURES, resolveFeatures };
