import type { Core } from '@strapi/types';

/**
 * Exposes the pending-release cap to the Plan card and the debug dump, defaulting the same way
 * `validatePendingReleasesLimit` does. Registered whatever the boot-time license says, so a
 * lapsed or later-renewed license still resolves.
 */
export const registerReleasesEntitlements = (strapi: Core.Strapi) => {
  strapi.ee.entitlements.register({
    feature: 'cms-content-releases',
    limits: [
      {
        key: 'maximumReleases',
        unit: 'count',
        get: (feature) =>
          (typeof feature === 'object' ? feature.options?.maximumReleases : undefined) || 3,
      },
    ],
  });
};
