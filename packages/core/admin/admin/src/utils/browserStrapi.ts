import { getFetchClient } from './getFetchClient';
import { getProjectType } from './getProjectType';
import { createAbsoluteUrl } from './urls';

import type { GetProjectType } from '../../../shared/contracts/admin';
import type { Modules } from '@strapi/types';
import type { Admin } from '@strapi/types/_internal';

/**
 * Builds the `window.strapi` object: Community defaults, then the license response.
 * Returned rather than assigned so the caller publishes it to `window` exactly once.
 *
 * Nothing here may read `window.strapi` — it does not exist yet, and the `#strapi`
 * mount node shadows it as a named window property, so reads silently yield the
 * element instead of throwing.
 */
const createBrowserStrapi = async (
  features?: Modules.Features.FeaturesService['config']
): Promise<Admin.BrowserStrapi> => {
  const browserStrapi: Admin.BrowserStrapi = {
    /**
     * This ENV variable is passed from the strapi instance, by default no url is set
     * in the config and therefore the instance returns you an empty string so URLs are relative.
     *
     * To ensure that the backendURL is always set, we use the window.location.origin as a fallback.
     */
    backendURL: createAbsoluteUrl(process.env.STRAPI_ADMIN_BACKEND_URL),
    isEE: false,
    isTrial: false,
    isTrialLicense: false,
    telemetryDisabled: process.env.STRAPI_TELEMETRY_DISABLED === 'true',
    future: {
      isEnabled: (name: keyof NonNullable<Modules.Features.FeaturesConfig['future']>) => {
        return features?.future?.[name] === true;
      },
    },
    features: {
      SSO: 'sso',
      AUDIT_LOGS: 'audit-logs',
      REVIEW_WORKFLOWS: 'review-workflows',
      /**
       * If we don't get the license then we know it's not EE
       * so no feature is enabled.
       */
      isEnabled: () => false,
    },
    projectType: 'Community',
    flags: {
      nps: false,
      promoteEE: true,
      docLinks: true,
    },
    ai: {
      enabled: true,
    },
  };

  const { get } = getFetchClient({ backendURL: browserStrapi.backendURL });

  try {
    const {
      data: {
        data: { isEE, isTrial, features: licensedFeatures, flags, ai, planPriceId },
      },
    } = await get<GetProjectType.Response>('/admin/project-type');

    // Runtime defense: the payload is only typed by convention, not validated.
    const trial = isTrial ?? false;

    browserStrapi.isEE = isEE;
    browserStrapi.isTrial = trial;
    browserStrapi.isTrialLicense = trial;
    browserStrapi.flags = flags;
    browserStrapi.features = {
      ...browserStrapi.features,
      isEnabled: (featureName: string | undefined) =>
        licensedFeatures.some((feature) => feature.name === featureName),
    };
    browserStrapi.projectType = getProjectType({ isEE, planPriceId });
    browserStrapi.ai = ai;
  } catch (err) {
    /**
     * If this fails, we simply don't activate any EE features.
     * Should we warn clearer in the UI?
     */
    console.error(err);
  }

  return browserStrapi;
};

export { createBrowserStrapi };
