import { previewScript } from './previewScript';

const scriptResponse = previewScript(false);

/**
 * These events can be changed safely. They're used by the content manager admin on one side, and by
 * the preview script on the other. We own both ends, and they're not documented to users, so we can
 * do what we want with them.
 */
export const INTERNAL_EVENTS = scriptResponse!.INTERNAL_EVENTS;

/**
 * These events are documented to users, and will be hardcoded in their frontends.
 * Changing any of these would be a breaking change.
 */
export const PUBLIC_EVENTS = {
  PREVIEW_READY: 'previewReady',
  STRAPI_UPDATE: 'strapiUpdate',
  STRAPI_SCRIPT: 'strapiScript',
} as const;
