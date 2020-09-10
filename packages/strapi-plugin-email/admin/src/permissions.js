const pluginPermissions = {
  // Email
  email: [
    { action: 'plugins::email.config.read', subject: null },
    { action: 'plugins::email.test', subject: null },
  ],
};

export default pluginPermissions;
