/* eslint-disable no-undef */
import { createRoot } from 'react-dom/client';

import { StrapiApp, StrapiAppConstructorArgs } from './StrapiApp';
import { getFetchClient } from './utils/getFetchClient';
import { getProjectType } from './utils/getProjectType';
import { createAbsoluteUrl } from './utils/urls';

import type { Admin, Modules } from '@strapi/types';

interface RenderAdminArgs {
  customisations: {
    register?: (app: StrapiApp) => Promise<void> | void;
    bootstrap?: (app: StrapiApp) => Promise<void> | void;
    config?: StrapiAppConstructorArgs['config'];
  };
  plugins: StrapiAppConstructorArgs['appPlugins'];
  features?: Modules.Features.FeaturesService['config'];
}

const renderAdmin = async (
  mountNode: HTMLElement | null,
  { plugins, customisations, features }: RenderAdminArgs
) => {
  if (!mountNode) {
    throw new Error('[@strapi/admin]: Could not find the root element to mount the admin app');
  }

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

  const { get } = getFetchClient();

  interface ProjectType extends Pick<Admin.BrowserStrapi, 'flags'> {
    isEE: boolean;
    isTrial: boolean;
    /**
     * The licensed plan price id, sent by the license registry (EE only).
     * Used to distinguish the Growth plan from other Enterprise plans.
     */
    planPriceId?: string;
    features: {
      name: string;
    }[];
    ai: {
      enabled: boolean;
    };
  }

  try {
    const {
      data: {
        data: { isEE, isTrial, features, flags, ai, planPriceId },
      },
    } = await get<{ data: ProjectType }>('/admin/project-type');

    browserStrapi.isEE = isEE;
    browserStrapi.isTrial = isTrial;
    browserStrapi.flags = flags;
    browserStrapi.features = {
      ...browserStrapi.features,
      isEnabled: (featureName: string | undefined) =>
        features.some((feature) => feature.name === featureName),
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

  // @ts-expect-error - conflicting global.Strapi with window.BrowserStrapi
  window.strapi = browserStrapi;

  const app = new StrapiApp({
    config: customisations?.config,
    appPlugins: plugins,
  });

  await app.register(customisations?.register);
  await app.bootstrap(customisations?.bootstrap);
  await app.loadTrads(customisations?.config?.translations);

  createRoot(mountNode).render(app.render());

  if (
    typeof module !== 'undefined' &&
    module &&
    'hot' in module &&
    typeof module.hot === 'object' &&
    module.hot !== null &&
    'accept' in module.hot &&
    typeof module.hot.accept === 'function'
  ) {
    module.hot.accept();
  }

  if (typeof import.meta.hot?.accept === 'function') {
    import.meta.hot.accept();
  }
};

export { renderAdmin };
export type { RenderAdminArgs };
