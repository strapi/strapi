import type { Plugin } from '@strapi/types';

export const register: Plugin.LoadedPlugin['register'] = async () => {
  // TODO: remove log once there are actual features
  console.log('registering history feature');
};
