interface StrapiFeaturesConfig {
  /**
   * These features are considered unstable and may have breaking changes within,
   * use them at your own risk. They will likely be promoted to stable in the next
   * major version. They do not follow semantic convention and we may remove them at any time
   */
  future?: {
    contentReleases: boolean;
  };
}

export { StrapiFeaturesConfig };
