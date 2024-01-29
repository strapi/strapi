import type { Plugin } from '@strapi/types';
import { controllers } from './controllers';
import { services } from './services';
import { contentTypes } from './content-types';
import { getService } from './utils';

/**
 * Check once if the feature is enabled (both license info & feature flag) before loading it,
 * so that we can assume it is enabled in the other files.
 */
const getFeature = (): Partial<Plugin.LoadedPlugin> => {
  // TODO: add license check here when it's ready on the license registry
  if (strapi.features.future.isEnabled('history')) {
    return {
      bootstrap({ strapi }) {
        // Start recording history and saving history versions
        getService(strapi, 'history').init();
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
