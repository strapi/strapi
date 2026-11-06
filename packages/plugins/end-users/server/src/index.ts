import './assert-node-version';
import register from './register';
import bootstrap from './bootstrap';
import destroy from './destroy';
import config from './config';
import contentTypes from './content-types';
import services from './services';
import controllers from './controllers';
import middlewares from './middlewares';
import policies from './policies';
import routes from './routes';

export default {
  register,
  bootstrap,
  destroy,
  config,
  // The content types of the engine's tables are generated when the plugin registers
  // (`register.ts`); these are the ones written by hand: the role and its permissions.
  contentTypes,
  routes,
  controllers,
  services,
  policies,
  middlewares,
};
