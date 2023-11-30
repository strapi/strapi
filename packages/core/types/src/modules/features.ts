export interface FeaturesService {
  /**
   * This is the features.(js|ts) file in the user project.
   */
  config:
    | {
        future: {
          contentReleases: boolean;
        };
      }
    | undefined;
  future: {
    isEnabled: (futureFlagName: string) => boolean;
  };
}
