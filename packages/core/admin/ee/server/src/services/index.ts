import type { Core } from '@strapi/types';
import type {} from '../../../../server/src/types';

import auth from './auth';
import passport from './passport';
import role from './role';
import user from './user';
import metrics from './metrics';
import seatEnforcement from './seat-enforcement';
import persistTablesService from './persist-tables';

/**
 * Names of the registered admin services. The EE services replace or add registered services, so
 * each one is registered.
 */
type RegisteredNames = keyof Core.RegisteredFor<Strapi.Registries.PackageServices, 'admin::'>;

export default {
  auth,
  passport,
  role,
  user,
  metrics,
  'seat-enforcement': seatEnforcement,
  'persist-tables': persistTablesService,
} satisfies Partial<Record<RegisteredNames, unknown>>;
