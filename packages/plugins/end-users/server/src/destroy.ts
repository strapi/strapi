import type { Core } from '@strapi/types';

import { PLUGIN_ID } from './constants';
import type compatService from './services/compat';

const destroy = async ({ strapi }: { strapi: Core.Strapi }) => {
  // Hits still waiting in memory are written before the process goes
  await (strapi.plugin(PLUGIN_ID).service('compat') as ReturnType<typeof compatService>).flush();
};

export default destroy;
