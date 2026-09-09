import type { Plugin } from '@strapi/types';
import autosave from './autosave';
import history from './history';
import preview from './preview';

const register: Plugin.LoadedPlugin['register'] = async ({ strapi }) => {
  await autosave.register?.({ strapi });
  await history.register?.({ strapi });
  await preview.register?.({ strapi });
};

export default register;
