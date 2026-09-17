import type { Core, Schema } from '@strapi/types';

/**
 * Every user content type is branchable unless its schema says otherwise:
 *
 *   "pluginOptions": { "branches": { "enabled": false } }
 *
 * Plugin content types (upload files, admin users, i18n locales, …) never are:
 * they belong to the platform, not to a release.
 */
export const isBranchableContentType = (model: unknown): boolean => {
  const ct = model as
    | { uid?: string; pluginOptions?: { branches?: { enabled?: boolean } } }
    | undefined;
  if (!ct?.uid?.startsWith('api::')) {
    return false;
  }
  return ct.pluginOptions?.branches?.enabled !== false;
};

export const getBranchableContentTypes = (strapi: Core.Strapi): Schema.ContentType[] =>
  Object.values(strapi.contentTypes).filter((ct) => isBranchableContentType(ct));

export const isLocalizedContentType = (model: unknown): boolean =>
  (model as { pluginOptions?: { i18n?: { localized?: boolean } } })?.pluginOptions?.i18n
    ?.localized === true;

export const hasDraftAndPublish = (model: unknown): boolean =>
  (model as { options?: { draftAndPublish?: boolean } })?.options?.draftAndPublish === true;
