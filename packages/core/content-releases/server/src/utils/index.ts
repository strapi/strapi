import type { LoadedStrapi, UID } from '@strapi/types';

export const getService = (
  name: 'release' | 'release-validation',
  { strapi } = { strapi: global.strapi }
) => {
  return strapi.plugin('content-releases').service(name);
};

/**
 * Gets the content types that have draft and publish enabled and that the user can read
 */
export const getAllowedContentTypes = ({ strapi, userAbility }: { strapi: LoadedStrapi, userAbility: any }) => {
  const { contentTypes } = strapi;
  const contentTypesWithDraftAndPublish = (Object.keys(contentTypes) as UID.ContentType[]).filter((contentTypeUid) => contentTypes[contentTypeUid].options?.draftAndPublish);
  const allowedContentTypes = contentTypesWithDraftAndPublish.filter((contentTypeUid) => {
    return userAbility.can('plugin::content-manager.explorer.read', contentTypeUid);
  });

  return allowedContentTypes;
};

/**
 * Gets the permissions checker for a given content type using the permission checker from content-manager
 */
export const  getPermissionsChecker = ({ strapi, userAbility, model }: { strapi: LoadedStrapi, userAbility: any, model: UID.ContentType }) => {
  return strapi
    .plugin('content-manager')
    .service('permission-checker')
    .create({ userAbility, model });
};
