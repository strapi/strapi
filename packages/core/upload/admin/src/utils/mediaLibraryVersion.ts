/**
 * Which Media Library a project is configured to use, stamped on every event
 * both trees fire. They emit the SAME event names, so without this there is no
 * way to tell a project that kept the legacy library from one that did not.
 *
 * Read from the feature flag rather than from whichever tree fired the event,
 * because the two do not line up. Several surfaces are registered outside the
 * flag's branch in `index.ts` and so run under both settings — the Content
 * Manager media field and picker are legacy code for everyone, and the Media
 * Library settings page is current code for everyone. Tagging by tree would
 * report a project running the current library as legacy the moment an editor
 * attached an image to an entry, and vice versa.
 *
 * Bump these if a future revamp ever needs its own bucket.
 */
export const MEDIA_LIBRARY_VERSION_CURRENT = 'v2';
export const MEDIA_LIBRARY_VERSION_LEGACY = 'v1';

export const getMediaLibraryVersion = () =>
  window.strapi.featureFlags.isEnabled('useLegacyMediaLibrary')
    ? MEDIA_LIBRARY_VERSION_LEGACY
    : MEDIA_LIBRARY_VERSION_CURRENT;
