const pluginPermissions = {
  // This permission regards the main component (App) and is used to tell
  // If the plugin link should be displayed in the menu
  // And also if the plugin is accessible. This use case is found when a user types the url of the
  // plugin directly in the browser
  main: [
    { action: 'plugin::upload.read', subject: null },
    {
      action: 'plugin::upload.assets.create',
      subject: null,
    },
    {
      action: 'plugin::upload.assets.update',
      subject: null,
    },
  ],
  copyLink: [
    {
      action: 'plugin::upload.assets.copy-link',
      subject: null,
    },
  ],
  create: [
    {
      action: 'plugin::upload.assets.create',
      subject: null,
    },
  ],
  download: [
    {
      action: 'plugin::upload.assets.download',
      subject: null,
    },
  ],
  read: [{ action: 'plugin::upload.read', subject: null }],
  settings: [{ action: 'plugin::upload.settings.read', subject: null }],
  update: [{ action: 'plugin::upload.assets.update', subject: null, fields: null }],
};

export default pluginPermissions;
