import { adminRoutes, contentApiRoutes } from './groups';
import settings from './settings';

export default {
  admin: {
    type: 'admin',
    routes: [...settings, ...adminRoutes]
  },
  'content-api': {
    type: 'content-api',
    routes: [...contentApiRoutes]
  }
};
