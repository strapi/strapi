import type { LoadedStrapi, UID } from '@strapi/types';

export const getService = (
  name: 'release' | 'release-validation',
  { strapi } = { strapi: global.strapi }
) => {
  return strapi.plugin('content-releases').service(name);
};

export const getAllowedContentTypes = ({ strapi, userAbility }: { strapi: LoadedStrapi, userAbility: any }) => {
  // We get the content types that have draft and publish enabled and that the user can read
  const { contentTypes } = strapi;
  const contentTypesWithDraftAndPublish = (Object.keys(contentTypes) as UID.ContentType[]).filter((contentTypeUid) => contentTypes[contentTypeUid].options?.draftAndPublish);
  const allowedContentTypes = contentTypesWithDraftAndPublish.filter((contentTypeUid) => {
    return userAbility.can('plugin::content-manager.explorer.read', contentTypeUid);
  });

  return allowedContentTypes;
};
