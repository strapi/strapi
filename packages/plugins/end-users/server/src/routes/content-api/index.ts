import { createContentApiRoutesFactory } from '@strapi/utils';

import authRoutes, { compatAuthRoutes } from './auth';
import permissionsRoutes from './permissions';
import usersRoutes from './users';

const createContentApiRoutes = createContentApiRoutesFactory(() => [
  ...authRoutes,
  ...compatAuthRoutes(),
  ...usersRoutes(),
  ...permissionsRoutes,
]);

export default createContentApiRoutes;
