import type { ContentTypeSchema } from '@strapi/strapi';

export type DeleteOptions = {
  contentTypes?: ContentTypeSchema[];
  uidsOfModelsToDelete?: string[];
  conditions?: {
    [contentTypeUid: string]: {
      params: any;
    };
  };
};

export const deleteAllRecords = async (strapi: Strapi.Strapi, deleteOptions?: DeleteOptions) => {
  const conditions = deleteOptions?.conditions ?? {};
  const contentTypes = deleteOptions?.contentTypes ?? [];
  const uidsOfModelsToDelete = deleteOptions?.uidsOfModelsToDelete ?? [];
  let count = 0;

  await Promise.all(
    contentTypes.map(async (contentType) => {
      const params = conditions[contentType.uid]?.params ?? {};
      const result = await strapi?.entityService.deleteMany(contentType.uid, params);
      count += result ? result.count : 0;
    })
  );

  await Promise.all(
    uidsOfModelsToDelete.map(async (uid) => {
      const result = await strapi?.query(uid).deleteMany();
      count += result.count;
    })
  );

  return { count };
};

const restoreCoreStore = async (strapi: Strapi.Strapi, data: any) => {
  return await strapi.db.query('strapi::core-store').create({
    data: {
      ...data,
      value: JSON.stringify(data.value),
    },
  });
};

const restoreWebhooks = async (strapi: Strapi.Strapi, data: any) => {
  return await strapi.db.query('webhook').create({
    data,
  });
};

export const restoreConfigs = async (strapi: Strapi.Strapi, config: any) => {
  if (config.type === 'core-store') {
    return await restoreCoreStore(strapi, config.value);
  }

  if (config.type === 'webhook') {
    return await restoreWebhooks(strapi, config.value);
  }
};
