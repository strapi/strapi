import type { Plugin } from '@strapi/types';
import history from '@content-manager/server/history';
import preview from '@content-manager/server/preview';

const register: Plugin.LoadedPlugin['register'] = async ({ strapi }) => {
  await history.register?.({ strapi });
  await preview.register?.({ strapi });
};

export default register;
