import '@strapi/types';

import config from './config';
import bootstrap from './bootstrap';
import services from './services';
import controllers from './controllers';
import routes from './routes';

export default () => ({
  config,
  bootstrap,
  services,
  controllers,
  routes,
});