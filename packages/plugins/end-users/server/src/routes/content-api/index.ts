import { createContentApiRoutesFactory } from '@strapi/utils';

import authRoutes, { compatAuthRoutes } from './auth';
import compatConnectRoutes from './connect';
import permissionsRoutes from './permissions';
import usersRoutes from './users';

const createContentApiRoutes = createContentApiRoutesFactory(() => [
  ...authRoutes,
  ...compatAuthRoutes(),
  ...compatConnectRoutes(),
  ...usersRoutes(),
  ...permissionsRoutes,
]);

export default createContentApiRoutes;
