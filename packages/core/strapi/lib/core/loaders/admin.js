'use strict';

const _ = require('lodash');

module.exports = strapi => {
  strapi.admin = require('@strapi/admin/strapi-server');

  strapi.container.get('content-types').add(`admin::`, strapi.admin.contentTypes);

  // TODO: move admin config into config.get('admin') and not config.get('server.admin')

  const userAdminConfig = strapi.config.get('server.admin');
  strapi.config.set('server.admin', _.merge(strapi.admin.config, userAdminConfig));
};
