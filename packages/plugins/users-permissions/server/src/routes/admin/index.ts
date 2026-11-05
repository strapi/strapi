import permissionsRoutes from './permissions';
import settingsRoutes from './settings';
import roleRoutes from './role';

export default {
  type: 'admin',
  routes: [...roleRoutes, ...settingsRoutes, ...permissionsRoutes],
};
