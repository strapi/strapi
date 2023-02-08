const customPermissions = {
  settings: {
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

export default customPermissions;
