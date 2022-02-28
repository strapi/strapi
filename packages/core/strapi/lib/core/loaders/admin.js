'use strict';

const _ = require('lodash');

module.exports = strapi => {
  strapi.admin = require('@strapi/admin/strapi-server');

  strapi.container.get('services').add(`admin::`, strapi.admin.services);
  strapi.container.get('controllers').add(`admin::`, strapi.admin.controllers);
  strapi.container.get('content-types').add(`admin::`, strapi.admin.contentTypes);
  strapi.container.get('policies').add(`admin::`, strapi.admin.policies);
  strapi.container.get('middlewares').add(`admin::`, strapi.admin.middlewares);

  const userAdminConfig = strapi.config.get('admin');
  strapi.container.get('config').set('admin', _.merge(strapi.admin.config, userAdminConfig));
};
