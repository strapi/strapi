export interface FeaturesConfig {
  future?: {
    preview?: boolean;
  };
}

export interface FeaturesService {
  /**
   * This is the features.(js|ts) file in the user project.
   */
  config: FeaturesConfig | undefined;
  future: {
    isEnabled: (futureFlagName: string) => boolean;
  };
}
