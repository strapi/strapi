import { createContentApiRoutesFactory } from '@strapi/utils';

import authRoutes from './auth';
import permissionsRoutes from './permissions';
import usersRoutes from './users';

const createContentApiRoutes = createContentApiRoutesFactory(() => [
  ...authRoutes,
  ...usersRoutes(),
  ...permissionsRoutes,
]);

export default createContentApiRoutes;
