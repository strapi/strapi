import type { ContentTypeSchema } from '@strapi/strapi';

export type DeleteOptions = {
  contentTypes?: ContentTypeSchema[];
  conditions?: {
    [contentTypeUid: string]: {
      params: any;
    };
  };
};

export const deleteAllRecords = async (strapi: Strapi.Strapi, deleteOptions?: DeleteOptions) => {
  const conditions = deleteOptions?.conditions ?? {};
  const exceptions = [
    'admin::permission',
    'admin::user',
    'admin::role',
    'admin::api-token',
    'admin::api-token-permission',
  ];
  const allContentTypes: ContentTypeSchema[] = Object.values(strapi.contentTypes);
  const defaultContentTypes: ContentTypeSchema[] = allContentTypes.filter(
    (contentType) => !exceptions.includes(contentType.uid)
  );
  const contentTypes: ContentTypeSchema[] = deleteOptions?.contentTypes ?? defaultContentTypes;
  let count = 0;
  await Promise.all(
    contentTypes.map(async (contentType) => {
      const params = conditions[contentType.uid]?.params ?? {};
      const result = await strapi?.entityService.deleteMany(contentType.uid, params);
      count += result ? result.count : 0;
    })
  );

  return { count };
};
