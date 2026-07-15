import type { Features } from '../core/config/features';

/**
 * @deprecated use {@linkcode Features} instead
 */
export type FeaturesConfig = Features;

export interface FeaturesService {
  /**
   * This is the features.(js|ts) file in the user project.
   */
  config: Features | undefined;
  future: {
    isEnabled: (futureFlagName: string) => boolean;
  };
}
