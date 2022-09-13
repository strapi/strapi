const customPermissions = {
  settings: {
    sso: {
      main: [{ action: 'admin::provider-login.read', subject: null }],
      read: [{ action: 'admin::provider-login.read', subject: null }],
      update: [{ action: 'admin::provider-login.update', subject: null }],
    },
  },
};

export default customPermissions;
