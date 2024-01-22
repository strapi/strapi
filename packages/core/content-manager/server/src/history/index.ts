import type { Plugin } from '@strapi/types';
import { register } from './register';
import { bootstrap } from './bootstrap';
import { controllers } from './controllers';
import { services } from './services';
import { destroy } from './destroy';

/**
 * Check once if the feature is enabled (both license info & feature flag) before loading it,
 * so that we can assume it is enabled in the other files.
 */
const getFeature = (): Partial<Plugin.LoadedPlugin> => {
  // TODO: add license check here when it's ready on the license registry
  if (strapi.features.future.isEnabled('history')) {
    return {
      register,
      bootstrap,
      controllers,
      services,
      destroy,
    };
  }

  return {};
};

export default getFeature();
