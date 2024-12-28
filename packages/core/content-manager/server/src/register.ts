import type { Plugin } from '@strapi/types';
import history from './history';
import preview from './preview';

const register: Plugin.LoadedPlugin['register'] = async ({ strapi }) => {
  await history.register?.({ strapi });
  await preview.register?.({ strapi });
};

export default register;
