import type { Plugin } from '@strapi/types';

import { FEATURE_ID } from './constants';
import { routes } from './routes';
import { controllers } from './controllers';
import { services } from './services';
import { getService } from './utils';

/**
 * Check once if the feature is enabled before loading it,
 * so that we can assume it is enabled in the other files.
 */
const getFeature = (): Partial<Plugin.LoadedPlugin> => {
  if (!strapi.features.future.isEnabled(FEATURE_ID)) {
    return {};
  }

  // TODO: Add license registry check when it's available
  // if (!strapi.ee.features.isEnabled('cms-content-preview')) {
  //   return {};
  // }

  return {
    register() {
      const config = getService(strapi, 'preview-config');
      config.validate();
      config.register();
    },
    bootstrap() {},
    routes,
    controllers,
    services,
  };
};

export default getFeature();
