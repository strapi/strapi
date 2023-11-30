/**
 * The features service is responsible for managing features within strapi,
 * including interacting with the feature configuration file to know
 * which are enabled and disabled.
 */

import type { Strapi, FeaturesService } from '@strapi/types';

const createFeaturesService = (strapi: Strapi): FeaturesService => {
  return {
    get config() {
      return strapi.config.get<FeaturesService['config'] | undefined>('features');
    },
    future: {
      isEnabled(futureFlagName: string): boolean {
        return (
          strapi.config.get<FeaturesService['config'] | undefined>('features')?.future[
            futureFlagName as keyof FeaturesService['config']['future']
          ] === true
        );
      },
    },
  };
};

export { createFeaturesService };
export type { FeaturesService };
