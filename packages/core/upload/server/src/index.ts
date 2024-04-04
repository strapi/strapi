import type {} from 'koa-body';
import type {} from '@strapi/types';

import { register } from './register';
import { bootstrap } from './bootstrap';
import { contentTypes } from './content-types';
import { services } from './services';
import { routes } from './routes';
import { config } from './config';
import { controllers } from './controllers';

export default () => ({
  register,
  bootstrap,
  config,
  routes,
  controllers,
  contentTypes,
  services,
});
