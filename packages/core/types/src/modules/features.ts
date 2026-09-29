import type { Features } from '../core/config/features';

export type FeaturesConfig = Features;

export interface FeaturesService {
  /**
   * This is the features.(js|ts) file in the user project.
   */
  config: FeaturesConfig | undefined;
  future: {
    isEnabled: (futureFlagName: string) => boolean;
  };
  /**
   * Permanent flags, read straight off `features`. Unlike `future.*` these are supported
   * configuration rather than opt-in previews, so they are named for what they do rather
   * than gathered under a bucket that promises removal.
   */
  isEnabled: (flagName: keyof Omit<FeaturesConfig, 'future'>) => boolean;
}
