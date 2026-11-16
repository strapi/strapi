import { createContentApiRoutesFactory } from '@strapi/utils';
import authRoutes from './auth';
import userRoutes from './user';
import roleRoutes from './role';
import permissionsRoutes from './permissions';

const createContentApiRoutes = createContentApiRoutesFactory(() => {
  return [...authRoutes(), ...userRoutes(), ...roleRoutes(), ...permissionsRoutes()];
});

export default createContentApiRoutes;
