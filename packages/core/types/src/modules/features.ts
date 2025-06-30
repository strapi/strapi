export interface FeaturesConfig {
  future?: {
    unstableGuidedTour?: boolean;
  };
}

export interface FeaturesService {
  /**
   * This is the features.(js|ts) file in the user project.
   */
  config: FeaturesConfig | undefined;
  future: {
    isEnabled: (futureFlagName: string) => boolean;
    unstableGuidedTour?: boolean;
  };
}
