const permissionsLayout = {
  sections: {
    plugins: [
      {
        displayName: 'Read',
        action: 'plugins::content-type-builder.read',
        subCategory: 'general',
        plugin: 'plugin::content-type-builder',
      },
      {
        displayName: 'Access the Documentation',
        action: 'plugins::documentation.read',
        subCategory: 'general',
        plugin: 'plugin::documentation',
      },
      {
        displayName: 'Update and delete',
        action: 'plugins::documentation.settings.update',
        subCategory: 'settings',
        plugin: 'plugin::documentation',
      },
      {
        displayName: 'Regenerate',
        action: 'plugins::documentation.settings.regenerate',
        subCategory: 'settings',
        plugin: 'plugin::documentation',
      },
      {
        displayName: 'Access the Media Library',
        action: 'plugins::upload.read',
        subCategory: 'general',
        plugin: 'plugin::upload',
      },
      {
        displayName: 'Create (upload)',
        action: 'plugins::upload.assets.create',
        subCategory: 'assets',
        plugin: 'plugin::upload',
      },
    ],
    settings: [
      {
        displayName: 'Access the Media Library settings page',
        action: 'plugins::upload.settings.read',
        category: 'media library',
        subCategory: 'general',
      },
      {
        displayName: 'Access the marketplace',
        action: 'admin::marketplace.read',
        category: 'plugins and marketplace',
        subCategory: 'marketplace',
      },
      {
        displayName: 'Install (only for dev env)',
        action: 'admin::marketplace.plugins.install',
        category: 'plugins and marketplace',
        subCategory: 'plugins',
      },
    ],
  },
};

export default permissionsLayout;
