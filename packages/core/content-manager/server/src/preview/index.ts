import type { Plugin } from '@strapi/types';

import { routes } from '@content-manager/server/preview/routes';
import { controllers } from '@content-manager/server/preview/controllers';
import { services } from '@content-manager/server/preview/services';
import { getService } from '@content-manager/server/preview/utils';

/**
 * Check once if the feature is enabled before loading it,
 * so that we can assume it is enabled in the other files.
 */
const getFeature = (): Partial<Plugin.LoadedPlugin> => {
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
