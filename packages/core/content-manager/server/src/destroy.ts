import type { Plugin } from '@strapi/types';
import history from './history';
import autosave from './autosave';

const destroy: Plugin.LoadedPlugin['destroy'] = async ({ strapi }) => {
  await history.destroy?.({ strapi });
  await autosave.destroy?.({ strapi });
};

export default destroy;
