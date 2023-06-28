export const ADMIN_PERMISSIONS_EE = {
    settings: {
      auditLogs: {
        main: [{ action: 'admin::audit-logs.read', subject: null }],
        read: [{ action: 'admin::audit-logs.read', subject: null }],
      },
      'review-workflows': {
        main: [{ action: 'admin::review-workflows.read', subject: null }],
      },
      sso: {
        main: [{ action: 'admin::provider-login.read', subject: null }],
        read: [{ action: 'admin::provider-login.read', subject: null }],
        update: [{ action: 'admin::provider-login.update', subject: null }],
      },
    },
  };
