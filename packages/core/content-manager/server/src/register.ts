import type { Plugin } from '@strapi/types';
import history from './history';

const register: Plugin.LoadedPlugin['register'] = async ({ strapi }) => {
  await history.register?.({ strapi });
};

export default register;
