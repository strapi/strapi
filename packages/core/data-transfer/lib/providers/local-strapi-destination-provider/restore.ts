import type { ContentTypeSchema } from '@strapi/strapi';

export type DeleteOptions = {
  contentTypes?: ContentTypeSchema[];
  conditions?: {
    [contentTypeUid: string]: {
      where: any;
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
  console.log(deleteOptions?.contentTypes);
  await Promise.all(
    contentTypes.map(async (contentType) => {
      const filters = conditions[contentType.uid] ?? {};
      const result = await strapi?.db.query(contentType.uid).deleteMany({
        filters,
      });
      count += result.count;
    })
  );

  return { count };
};
