import _ from 'lodash';
import type { Strapi } from '@strapi/types';

export default async function loadAdmin(strapi: Strapi) {
  strapi.admin = require('@strapi/admin/strapi-server');

  strapi.get('services').add(`admin::`, strapi.admin?.services);
  strapi.get('controllers').add(`admin::`, strapi.admin?.controllers);
  strapi.get('content-types').add(`admin::`, strapi.admin?.contentTypes);
  strapi.get('policies').add(`admin::`, strapi.admin?.policies);
  strapi.get('middlewares').add(`admin::`, strapi.admin?.middlewares);

  const userAdminConfig = strapi.config.get('admin');
  strapi.get('config').set('admin', _.merge(strapi.admin?.config, userAdminConfig));
}
