/**
 * Which Media Library a project is configured to use, stamped on every event
 * both trees fire. They emit the SAME event names, so without this there is no
 * way to tell a project that kept the legacy library from one that did not.
 *
 * Read from the feature flag rather than from whichever tree fired the event,
 * because the two do not always line up. The Media Library settings page is
 * registered outside the flag's branch in `index.ts`, so it runs the current
 * code (and its `useTracking`) under both settings. Tagging by tree would report
 * a project that kept the legacy library as current whenever its settings page
 * fires an event.
 *
 * Bump these if a future revamp ever needs its own bucket.
 */
export const MEDIA_LIBRARY_VERSION_CURRENT = 'v2';
export const MEDIA_LIBRARY_VERSION_LEGACY = 'v1';

export const getMediaLibraryVersion = () =>
  window.strapi.featureFlags.isEnabled('useLegacyMediaLibrary')
    ? MEDIA_LIBRARY_VERSION_LEGACY
    : MEDIA_LIBRARY_VERSION_CURRENT;
