/**
 * Feature flags for enabling experimental or upcoming breaking changes.
 *
 * @see docs/docs/docs/06-future-flags.md
 */
export interface FeaturesFutureFlags {
  unstableMediaLibrary?: boolean;
  experimental_firstPublishedAt?: boolean;
  [futureFlagName: string]: boolean | undefined;
}

export interface Features {
  future?: FeaturesFutureFlags;
}
