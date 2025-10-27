'use strict';

module.exports = ({ strapi }) => {
  const actions = [
    {
      section: 'plugins',
      displayName: 'Read audit logs',
      uid: 'read_audit_logs',
      pluginName: 'audit-log'
    }
  ];

  try {
    if (strapi?.admin?.services?.permission?.actionProvider?.registerMany) {
      strapi.admin.services.permission.actionProvider.registerMany(actions);
    }
  } catch (err) {
    strapi.log.debug('[audit-log] register: permission registration skipped or not available yet');
  }
};
