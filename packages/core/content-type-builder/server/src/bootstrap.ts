import type { Core } from '@strapi/types';

export default async ({ strapi }: { strapi: Core.Strapi }) => {
  const actions = [
    {
      section: 'plugins',
      displayName: 'Read',
      uid: 'read',
      pluginName: 'content-type-builder',
    },
    {
      section: 'plugins',
      displayName: 'Update',
      uid: 'update',
      pluginName: 'content-type-builder',
    },
  ];

  await strapi.service('admin::permission').actionProvider.registerMany(actions);
};
