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

// eslint-disable-next-line import/no-mutable-exports
let admin = {
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

if (strapi.EE) {
  admin = _.mergeWith({}, admin, getEEAdmin(), mergeRoutes);
}

export default admin;
