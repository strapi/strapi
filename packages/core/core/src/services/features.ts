/**
 * The features service is responsible for managing features within strapi,
 * including interacting with the feature configuration file to know
 * which are enabled and disabled.
 */

import type { Core, Modules } from '@strapi/types';

type FeatureName = keyof Modules.Features.FeaturesConfig['future'];

const createFeaturesService = (strapi: Core.Strapi): Modules.Features.FeaturesService => {
  const service: Modules.Features.FeaturesService = {
    get config() {
      return strapi.config.get<Modules.Features.FeaturesService['config']>('features');
    },
    future: {
      isEnabled(futureFlagName: string): boolean {
        return service.config?.future?.[futureFlagName as FeatureName] === true;
      },
    },
  };

  return service;
};

export { createFeaturesService };
export type FeaturesService = Modules.Features.FeaturesService;
