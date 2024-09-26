import type { Plugin } from '@strapi/types';
import { FEATURE_ID } from './constants';

/**
 * Check once if the feature is enabled before loading it,
 * so that we can assume it is enabled in the other files.
 */
const getFeature = (): Partial<Plugin.LoadedPlugin> => {
  // TODO: Add license registry check when it's available
  if (!strapi.features.future.isEnabled(FEATURE_ID)) {
    return {};
  }

  return {
    bootstrap() {
      // eslint-disable-next-line no-console -- TODO remove when we have real functionality
      console.log('Bootstrapping preview server');
    },
  };
};

export default getFeature();
