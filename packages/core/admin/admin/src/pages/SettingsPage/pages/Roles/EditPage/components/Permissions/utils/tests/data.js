const permissionsLayout = {
  sections: {
    plugins: [
      {
        displayName: 'Read',
        action: 'plugin::content-type-builder.read',
        subCategory: 'general',
        plugin: 'plugin::content-type-builder',
      },
      {
        displayName: 'Access the Documentation',
        action: 'plugin::documentation.read',
        subCategory: 'general',
        plugin: 'plugin::documentation',
      },
      {
        displayName: 'Update and delete',
        action: 'plugin::documentation.settings.update',
        subCategory: 'settings',
        plugin: 'plugin::documentation',
      },
      {
        displayName: 'Regenerate',
        action: 'plugin::documentation.settings.regenerate',
        subCategory: 'settings',
        plugin: 'plugin::documentation',
      },
      {
        displayName: 'Access the Media Library',
        action: 'plugin::upload.read',
        subCategory: 'general',
        plugin: 'plugin::upload',
      },
      {
        displayName: 'Create (upload)',
        action: 'plugin::upload.assets.create',
        subCategory: 'assets',
        plugin: 'plugin::upload',
      },
    ],
    settings: [
      {
        displayName: 'Access the Media Library settings page',
        action: 'plugin::upload.settings.read',
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
