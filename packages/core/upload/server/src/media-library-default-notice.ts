import type { Core } from '@strapi/types';

const NOTICE_STORE_KEY = 'media_library_default_notice';

const NOTICE = [
  'The Media Library has been redesigned and is now the default.',
  'To keep the previous one, set `useLegacyMediaLibrary: true` in config/features.',
].join(' ');

/**
 * Tells an upgrading app, once, that its Media Library changed.
 *
 * At GA every existing app changes behaviour with nothing in its config to hint at it,
 * because nobody has a flag set. Three conditions keep this from becoming noise:
 *
 * - only when the flag is absent — setting it either way is a deliberate choice, and
 *   `false` is how an app says "I know, I want the new one"
 * - only for an app that has booted this plugin before, so a fresh install (which has
 *   no previous Media Library to lose) stays quiet
 * - only once, tracked in the plugin store rather than in memory, so restarts and
 *   multi-instance deployments do not repeat it
 */
export const notifyMediaLibraryDefault = async ({
  strapi,
  isExistingApp,
}: {
  strapi: Core.Strapi;
  isExistingApp: boolean;
}) => {
  const optOut = strapi.config.get('features.useLegacyMediaLibrary');

  if (optOut !== undefined || !isExistingApp) {
    return;
  }

  const store = strapi.store!({ type: 'plugin', name: 'upload', key: NOTICE_STORE_KEY });

  if ((await store.get({})) !== null) {
    return;
  }

  strapi.log.info(NOTICE);
  await store.set({ value: { shown: true } });
};
