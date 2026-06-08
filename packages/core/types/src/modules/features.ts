import type { Features } from '../core/config';

/**
 * @deprecated use {@link Features} instead
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
