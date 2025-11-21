import type { Plugin } from '@strapi/types';
import history from '@content-manager/server/history';

const destroy: Plugin.LoadedPlugin['destroy'] = async ({ strapi }) => {
  await history.destroy?.({ strapi });
};

export default destroy;
