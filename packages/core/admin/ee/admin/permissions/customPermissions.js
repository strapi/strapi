const customPermissions = {
  settings: {
    reviewWorkflows: {
      main: [{ action: 'admin::roles.create', subject: null }],
    },

    sso: {
      main: [{ action: 'admin::provider-login.read', subject: null }],
      read: [{ action: 'admin::provider-login.read', subject: null }],
      update: [{ action: 'admin::provider-login.update', subject: null }],
    },
  },
};

export default customPermissions;
