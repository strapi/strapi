const customPermissions = {
  settings: {
    auditLogs: {
      main: [{ action: 'admin::audit-logs.read', subject: null }],
      read: [{ action: 'admin::audit-logs.read', subject: null }],
    },
    sso: {
      main: [{ action: 'admin::provider-login.read', subject: null }],
      read: [{ action: 'admin::provider-login.read', subject: null }],
      update: [{ action: 'admin::provider-login.update', subject: null }],
    },
  },
};

export default customPermissions;
