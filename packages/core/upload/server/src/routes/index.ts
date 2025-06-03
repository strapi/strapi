import { routes as admin } from './admin';
import { routes as contentApi } from './content-api';
import { routes as viewConfiguration } from './view-configuration';

export const routes = {
  admin,
  'content-api': contentApi,
  viewConfiguration,
};
