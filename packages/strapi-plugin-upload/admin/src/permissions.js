const pluginPermissions = {
  // This permission regards the main component (App) and is used to tell
  // If the plugin link should be displayed in the menu
  // And also if the plugin is accessible. This use case is found when a user types the url of the
  // plugin directly in the browser
  main: [
    { action: 'plugins::upload.read', subject: null },
    {
      action: 'plugins::upload.assets.create',
      subject: null,
    },
    {
      action: 'plugins::upload.assets.update',
      subject: null,
    },
  ],
  copyLink: [
    {
      action: 'plugins::upload.assets.copy-link',
      subject: null,
    },
  ],
  create: [
    {
      action: 'plugins::upload.assets.create',
      subject: null,
    },
  ],
  download: [
    {
      action: 'plugins::upload.assets.download',
      subject: null,
    },
  ],
  read: [{ action: 'plugins::upload.read', subject: null }],
  settings: [{ action: 'plugins::upload.settings.read', subject: null }],
  update: [{ action: 'plugins::upload.assets.update', subject: null, fields: null }],
};

export default pluginPermissions;
