import { createContentApiRoutesFactory } from '@strapi/utils';
import authRoutes from './auth';
import userRoutes from './user';
import roleRoutes from './role';
import permissionsRoutes from './permissions';

const createContentApiRoutes = createContentApiRoutesFactory(() => {
  return [
    ...authRoutes(strapi),
    ...userRoutes(strapi),
    ...roleRoutes(strapi),
    ...permissionsRoutes(strapi),
  ];
});

export default createContentApiRoutes;
