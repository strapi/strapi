'use strict';

const auditLogContentType = require('./content-types/audit-log');

const provider = {
  register({ strapi }) {
    strapi.container.get('content-types').add('admin::', { 'audit-log': auditLogContentType });
    return this;
  },
};

module.exports = provider;
