import type { Core } from '@strapi/strapi';
import { Settings } from '../../shared/settings';
import { PLUGIN_ID } from '../../shared/constants';
import { get, set } from 'lodash';

const bootstrap = async ({ strapi }: { strapi: Core.Strapi }) => {
  // bootstrap phase
  const defaultConfig: Settings = {
    alwaysShowFieldTypeInList: true,
  };

  const configurator = strapi.store!({ type: 'plugin', name: PLUGIN_ID, key: 'settings' });
  const config: any = await configurator.get({}) ?? {};

  for (const [key, defaultValue] of Object.entries(defaultConfig)) {
    if(get(config, key) === undefined) {
      set(config, key, get(defaultConfig, key));
    }
  }
  await configurator.set({ value: config });
};

export default bootstrap;
