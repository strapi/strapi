import _ from 'lodash';

import bootstrap from './bootstrap';
import register from './register';
import destroy from './destroy';
import config from './config';
import policies from './policies';
import routes from './routes';
import services from './services';
import controllers from './controllers';
import contentTypes from './content-types';
import middlewares from './middlewares';
import getEEAdmin from '../../ee/server/src';

const ceAdmin = {
  bootstrap,
  register,
  destroy,
  config,
  policies,
  routes,
  services,
  controllers,
  contentTypes,
  middlewares,
};

const mergeRoutes = (a: any, b: any, key: string) => {
  return _.isArray(a) && _.isArray(b) && key === 'routes' ? a.concat(b) : undefined;
};

// The EE module loads in every edition; each of its elements checks its own license feature or
// the seat limit
const admin = _.mergeWith({}, ceAdmin, getEEAdmin(), mergeRoutes);

export default admin;
