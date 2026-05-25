import { prop } from 'lodash/fp';
import type { Core } from '@strapi/types';

/**
 * Returns true when the content type opts into space scope via
 * `pluginOptions.spaces.scope: 'space'` in its schema.json.
 *
 * Storage path mirrors `pluginOptions.i18n.localized` from @strapi/plugin-i18n —
 * a plugin's options live under `pluginOptions.<pluginName>`, never inside the
 * core `options` block. This keeps core CTB byte-identical when the plugin
 * isn't installed.
 */
const isSpaceScopedContentType = (model: unknown): boolean => {
  return prop('pluginOptions.spaces.scope', model) === 'space';
};

/**
 * Returns every registered content type that opts into space scope.
 */
const getSpaceScopedContentTypes = (strapi: Core.Strapi) => {
  return Object.values(strapi.contentTypes).filter(isSpaceScopedContentType);
};

const contentTypes = () => ({
  isSpaceScopedContentType,
  getSpaceScopedContentTypes,
});

type ContentTypesService = typeof contentTypes;

export default contentTypes;
export { ContentTypesService, isSpaceScopedContentType, getSpaceScopedContentTypes };
