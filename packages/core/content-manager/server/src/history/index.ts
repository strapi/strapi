import type { Plugin } from '@strapi/types';
import { controllers } from './controllers';
import { services } from './services';
import { contentTypes } from './content-types';
import type { createHistoryVersionService } from './services/history-version';

/**
 * Check once if the feature is enabled (both license info & feature flag) before loading it,
 * so that we can assume it is enabled in the other files.
 */
const getFeature = (): Partial<Plugin.LoadedPlugin> => {
  // TODO: add license check here when it's ready on the license registry
  if (strapi.features.future.isEnabled('history')) {
    return {
      bootstrap() {
        const historyVersionService = strapi
          .plugin('content-manager')
          .service('history-version') as ReturnType<typeof createHistoryVersionService>;
        historyVersionService.plop();
        // strapi.documents?.middlewares.add('_all', 'findOne', () => {
        //   console.log('findOne middleware!');
        // });
      },
      controllers,
      services,
      contentTypes,
    };
  }

  /**
   * Keep returning contentTypes to avoid losing the data if the feature is disabled,
   * or if the license expires.
   */
  return { contentTypes };
};

export default getFeature();
