import type { Plugin } from '@strapi/types';

import { controllers } from './controllers';
import { services } from './services';
import { routes } from './routes';
import { getService } from './utils';
import { autosave } from './models/autosave';

const getFeature = (): Partial<Plugin.LoadedPlugin> => ({
  register({ strapi }) {
    strapi.get('models').add(autosave);
  },
  bootstrap({ strapi }) {
    getService(strapi, 'autosave-lifecycles').bootstrap();
  },
  controllers,
  services,
  routes,
});

export default getFeature();
