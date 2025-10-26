'use strict';

module.exports = ({ strapi }) => {
  strapi.admin.services.permission.actionProvider.register({
    uid: 'read',
    displayName: 'Read Audit Logs',
    pluginName: 'audit-log',
    section: 'plugins',
    subjects: ['plugin::audit-log.audit-log'],
  });
};
