/* eslint-disable no-undef */
import { createRoot } from 'react-dom/client';

import { StrapiApp, StrapiAppConstructorArgs } from './StrapiApp';
import { createBrowserStrapi } from './utils/browserStrapi';

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

  const browserStrapi = await createBrowserStrapi(features);

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
