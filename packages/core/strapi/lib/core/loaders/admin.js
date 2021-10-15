'use strict';

/**
 * @typedef {import('@strapi/admin').Server} Server
 * @typedef {import('@strapi/strapi').Strapi} Strapi
 */

const _ = require('lodash');

/**
 * @param {Strapi} strapi
 * @returns {void}
 */
module.exports = strapi => {
  strapi.admin = require('@strapi/admin/strapi-server');

  if (!strapi.admin) {
    throw new Error('"@strapi/admin" is not installed');
  }

  strapi.container.get('services').add(`admin::`, strapi.admin.services);
  strapi.container.get('controllers').add(`admin::`, strapi.admin.controllers);
  strapi.container.get('content-types').add(`admin::`, strapi.admin.contentTypes);
  strapi.container.get('policies').add(`admin::`, strapi.admin.policies);
  strapi.container.get('middlewares').add(`admin::`, strapi.admin.middlewares);

  const userAdminConfig = strapi.config.get('server.admin');
  strapi.container.get('config').set('server.admin', _.merge(strapi.admin.config, userAdminConfig));
};
