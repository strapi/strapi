const register = ({ strapi }) => {
  // Register the plugin's permissions
  const actions = [
    {
      section: 'plugins',
      displayName: 'Read audit logs',
      uid: 'read_audit_logs',
      pluginName: 'audit-logs',
    },
  ];

  // Register permissions after the admin service is available
  strapi.hook('strapi::content-types.beforeRegister').register(() => {
    if (strapi.admin) {
      strapi.admin.permission.actions.register(actions);
    }
  });

  strapi.log.info('Audit logs plugin registered');
};

export default register;