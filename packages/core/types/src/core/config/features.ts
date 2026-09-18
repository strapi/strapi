/**
 * Feature flags for enabling experimental or upcoming breaking changes.
 *
 * @see docs/docs/docs/06-future-flags.md
 */
export interface FeaturesFutureFlags {
  experimental_firstPublishedAt?: boolean;
  [futureFlagName: string]: boolean | undefined;
}

export interface Features {
  future?: FeaturesFutureFlags;
  /**
   * Restores the previous Media Library.
   *
   * Flat rather than under `future`, which means "unstable, may be removed": this flag
   * is a supported opt-out that outlives the feature's release. It reads as an opt-out
   * because the new Media Library is the default from 5.53 — see the removal version in
   * the Media Library documentation.
   */
  useLegacyMediaLibrary?: boolean;
}
