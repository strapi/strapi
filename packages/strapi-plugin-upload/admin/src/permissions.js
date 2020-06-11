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
      fields: null,
      conditions: null,
    },
  ],
  create: [
    {
      action: 'plugins::upload.assets.create',
      subject: null,
      fields: null,
      conditions: null,
    },
  ],
  filters: [{ action: 'plugins::upload.read', subject: null }],
  sort: [{ action: 'plugins::upload.read', subject: null }],
  settings: [{ action: 'plugins::upload.settings.read', subject: null }],
  update: [
    { action: 'plugins::upload.assets.update', subject: null, fields: null, conditions: null },
  ],
};

export default pluginPermissions;
