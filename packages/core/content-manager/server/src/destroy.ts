import type { Plugin } from '@strapi/types';
import history from './history';

const destroy: Plugin.LoadedPlugin['destroy'] = async ({ strapi }) => {
  await history.destroy?.({ strapi });
};

export default destroy;
