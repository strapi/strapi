import type { Plugin } from '@strapi/types';

import { FEATURE_ID } from './constants';
import { routes } from './routes';
import { controllers } from './controllers';
import { services } from './services';

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
    bootstrap() {
      // eslint-disable-next-line no-console -- TODO remove when we have real functionality
      console.log('Bootstrapping preview server');

      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- TODO: Remove when implemented
      const config = strapi.config.get('admin.preview');

      // TODO: Validation
      // TODO: Disable feature if config is not valid
    },
    routes,
    controllers,
    services,
  };
};

export default getFeature();
