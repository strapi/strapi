import type { Core } from '@strapi/types';

import conditions from './conditions';
import migration from './migration';
import permissions from './permissions';
import providers from './providers';
import roles from './roles';
import settings from './settings';
import userSecurity from './user-security';

/** One router for the plugin's admin routes: `/end-users/<area>/...`, an area at a time. */
const routes: Core.RouterInput = {
  type: 'admin',
  routes: [
    ...roles.routes,
    ...permissions.routes,
    ...conditions.routes,
    ...providers.routes,
    ...migration.routes,
    ...settings.routes,
    ...userSecurity.routes,
  ],
};

export default routes;
