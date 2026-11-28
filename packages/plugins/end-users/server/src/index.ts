import './assert-node-version';
import type { Core } from '@strapi/types';
import registerEndUsers from './register';
import bootstrapEndUsers from './bootstrap';
import { bootstrapCheckMode, registerCheckMode } from './migration/check-mode';
import { isCheckMode } from './migration/config';
import destroy from './destroy';
import config from './config';
import contentTypes from './content-types';
import services from './services';
import controllers from './controllers';
import middlewares from './middlewares';
import policies from './policies';
import routes from './routes';

/** In check mode the plugin stays dormant next to Users & Permissions: none of the full register runs */
const register = ({ strapi }: { strapi: Core.Strapi }): Promise<void> => {
  if (isCheckMode(strapi)) {
    registerCheckMode(strapi);

    return Promise.resolve();
  }

  return registerEndUsers({ strapi });
};

/** In check mode only the admin actions the migration routes need */
const bootstrap = ({ strapi }: { strapi: Core.Strapi }): Promise<void> =>
  isCheckMode(strapi) ? bootstrapCheckMode(strapi) : bootstrapEndUsers({ strapi });

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
