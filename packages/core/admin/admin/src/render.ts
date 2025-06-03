/* eslint-disable no-undef */
import { createRoot } from 'react-dom/client';

import { StrapiApp, StrapiAppConstructorArgs } from './StrapiApp';
import { getFetchClient } from './utils/getFetchClient';
import { createAbsoluteUrl } from './utils/urls';

import type { Modules } from '@strapi/types';

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

  window.strapi = {
    /**
     * This ENV variable is passed from the strapi instance, by default no url is set
     * in the config and therefore the instance returns you an empty string so URLs are relative.
     *
     * To ensure that the backendURL is always set, we use the window.location.origin as a fallback.
     */
    backendURL: createAbsoluteUrl(process.env.STRAPI_ADMIN_BACKEND_URL),
    isEE: false,
    telemetryDisabled: process.env.STRAPI_TELEMETRY_DISABLED === 'true',
    future: {
      isEnabled: (name: keyof NonNullable<Modules.Features.FeaturesConfig['future']>) => {
        return features?.future?.[name] === true;
      },
    },
    // @ts-expect-error – there's pollution from the global scope of Node.
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
    },
  };

  const { get } = getFetchClient();

  interface ProjectType extends Pick<Window['strapi'], 'flags'> {
    isEE: boolean;
    features: {
      name: string;
    }[];
  }

  try {
    const {
      data: {
        data: { isEE, features, flags },
      },
    } = await get<{ data: ProjectType }>('/admin/project-type');

    window.strapi.isEE = isEE;
    window.strapi.flags = flags;
    window.strapi.features = {
      ...window.strapi.features,
      isEnabled: (featureName) => features.some((feature) => feature.name === featureName),
    };
    window.strapi.projectType = isEE ? 'Enterprise' : 'Community';
  } catch (err) {
    /**
     * If this fails, we simply don't activate any EE features.
     * Should we warn clearer in the UI?
     */
    console.error(err);
  }

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
