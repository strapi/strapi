export const PERMISSIONS = {
  // This permission regards the main component (App) and is used to tell
  // If the plugin link should be displayed in the menu
  // And also if the plugin is accessible. This use case is found when a user types the url of the
  // plugin directly in the browser
  main: [
    { action: 'plugin::documentation.read', subject: null },
    { action: 'plugin::documentation.settings.regenerate', subject: null },
    { action: 'plugin::documentation.settings.update', subject: null },
  ],
  open: [
    { action: 'plugin::documentation.read', subject: null },
    { action: 'plugin::documentation.settings.regenerate', subject: null },
  ],
  regenerate: [{ action: 'plugin::documentation.settings.regenerate', subject: null }],
  update: [{ action: 'plugin::documentation.settings.update', subject: null }],
};
