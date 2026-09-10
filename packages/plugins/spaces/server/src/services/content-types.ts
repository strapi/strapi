import { prop } from 'lodash/fp';
import type { Core } from '@strapi/types';

interface SpacesContentTypeOptions {
  enabled?: boolean;
  scope?: 'space' | 'platform' | 'none';
  visibleIn?: string[];
  sharedEntries?: boolean;
  sharedEditable?: boolean;
}

const getOptions = (model: unknown): SpacesContentTypeOptions =>
  (prop('pluginOptions.spaces', model) as SpacesContentTypeOptions | undefined) ?? {};

/**
 * Whether a content type carries a workspace (`space_id` column).
 *
 * Every user content type (`api::*`) does, unless its schema opts out with
 * `pluginOptions.spaces.enabled: false` or `scope: 'none'` (`'platform'` is the
 * legacy spelling of the same). Plugin content types opt in explicitly with
 * `scope: 'space'` (the Media Library models are marked that way at register).
 *
 * Storage path mirrors `pluginOptions.i18n.localized` from @strapi/plugin-i18n —
 * a plugin's options live under `pluginOptions.<pluginName>`, never inside the
 * core `options` block, which keeps core CTB byte-identical when the plugin
 * isn't installed.
 */
const isSpaceScopedContentType = (model: unknown): boolean => {
  if (!model || typeof model !== 'object') {
    return false;
  }
  const options = getOptions(model);
  if (options.enabled === false) {
    return false;
  }
  if (options.scope === 'space') {
    return true;
  }
  if (options.scope === 'none' || options.scope === 'platform') {
    return false;
  }
  const uid = (model as { uid?: unknown }).uid;
  return typeof uid === 'string' && uid.startsWith('api::');
};

/**
 * Whether every entry of the content type is shared with every workspace it is
 * visible in (`pluginOptions.spaces.sharedEntries: true`). Shared entries are
 * read-only in sub-workspaces unless the type is also `sharedEditable`.
 */
const isSharedContentType = (model: unknown): boolean =>
  isSpaceScopedContentType(model) && getOptions(model).sharedEntries === true;

const isSharedEditableContentType = (model: unknown): boolean =>
  isSharedContentType(model) && getOptions(model).sharedEditable === true;

/**
 * Returns every registered content type that carries a workspace.
 */
const getSpaceScopedContentTypes = (strapi: Core.Strapi) => {
  return Object.values(strapi.contentTypes).filter(isSpaceScopedContentType);
};

const contentTypes = () => ({
  isSpaceScopedContentType,
  isSharedContentType,
  isSharedEditableContentType,
  getSpaceScopedContentTypes,
});

type ContentTypesService = typeof contentTypes;

export default contentTypes;
export {
  ContentTypesService,
  isSpaceScopedContentType,
  isSharedContentType,
  isSharedEditableContentType,
  getSpaceScopedContentTypes,
};
