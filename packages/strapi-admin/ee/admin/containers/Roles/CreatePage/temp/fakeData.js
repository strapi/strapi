const data = {
  conditions: [
    {
      id: 'admin::is-creator',
      displayName: 'Is creator',
      category: 'default',
    },
    {
      id: 'admin::has-same-role-as-creator',
      displayName: 'Has same role as creator',
      category: 'default',
    },
  ],
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
      {
        displayName: 'Update (crop, details, replace) + delete',
        action: 'plugins::upload.assets.update',
        subCategory: 'assets',
        plugin: 'plugin::upload',
      },
      {
        displayName: 'Download',
        action: 'plugins::upload.assets.download',
        subCategory: 'assets',
        plugin: 'plugin::upload',
      },
      {
        displayName: 'Copy link',
        action: 'plugins::upload.assets.copy-link',
        subCategory: 'assets',
        plugin: 'plugin::upload',
      },
      {
        displayName: 'Create',
        action: 'plugins::users-permissions.roles.create',
        subCategory: 'roles',
        plugin: 'plugin::users-permissions',
      },
      {
        displayName: 'Read',
        action: 'plugins::users-permissions.roles.read',
        subCategory: 'roles',
        plugin: 'plugin::users-permissions',
      },
      {
        displayName: 'Update',
        action: 'plugins::users-permissions.roles.update',
        subCategory: 'roles',
        plugin: 'plugin::users-permissions',
      },
      {
        displayName: 'Delete',
        action: 'plugins::users-permissions.roles.delete',
        subCategory: 'roles',
        plugin: 'plugin::users-permissions',
      },
      {
        displayName: 'Read',
        action: 'plugins::users-permissions.providers.read',
        subCategory: 'providers',
        plugin: 'plugin::users-permissions',
      },
      {
        displayName: 'Edit',
        action: 'plugins::users-permissions.providers.update',
        subCategory: 'providers',
        plugin: 'plugin::users-permissions',
      },
      {
        displayName: 'Read',
        action: 'plugins::users-permissions.email-templates.read',
        subCategory: 'emailTemplates',
        plugin: 'plugin::users-permissions',
      },
      {
        displayName: 'Edit',
        action: 'plugins::users-permissions.email-templates.update',
        subCategory: 'emailTemplates',
        plugin: 'plugin::users-permissions',
      },
      {
        displayName: 'Read',
        action: 'plugins::users-permissions.advanced-settings.read',
        subCategory: 'advancedSettings',
        plugin: 'plugin::users-permissions',
      },
      {
        displayName: 'Edit',
        action: 'plugins::users-permissions.advanced-settings.update',
        subCategory: 'advancedSettings',
        plugin: 'plugin::users-permissions',
      },
      {
        displayName: 'Configure view',
        action: 'plugins::content-manager.single-types.configure-view',
        subCategory: 'single types',
        plugin: 'plugin::content-manager',
      },
      {
        displayName: 'Configure view',
        action: 'plugins::content-manager.collection-types.configure-view',
        subCategory: 'collection types',
        plugin: 'plugin::content-manager',
      },
      {
        displayName: 'Configure Layout',
        action: 'plugins::content-manager.components.configure-layout',
        subCategory: 'components',
        plugin: 'plugin::content-manager',
      },
    ],
    settings: [
      {
        displayName: 'Create',
        action: 'plugins::i18n.locale.create',
        category: 'Internationalization',
        subCategory: 'Locales',
      },
      {
        displayName: 'Read',
        action: 'plugins::i18n.locale.read',
        category: 'Internationalization',
        subCategory: 'Locales',
      },
      {
        displayName: 'Update',
        action: 'plugins::i18n.locale.update',
        category: 'Internationalization',
        subCategory: 'Locales',
      },
      {
        displayName: 'Delete',
        action: 'plugins::i18n.locale.delete',
        category: 'Internationalization',
        subCategory: 'Locales',
      },
      {
        displayName: 'Access the Media Library settings page',
        action: 'plugins::upload.settings.read',
        category: 'media library',
        subCategory: 'general',
      },
      {
        displayName: 'Read',
        action: 'admin::provider-login.read',
        category: 'single sign on',
        subCategory: 'options',
      },
      {
        displayName: 'Update',
        action: 'admin::provider-login.update',
        category: 'single sign on',
        subCategory: 'options',
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
      {
        displayName: 'Uninstall (only for dev env)',
        action: 'admin::marketplace.plugins.uninstall',
        category: 'plugins and marketplace',
        subCategory: 'plugins',
      },
      {
        displayName: 'Create',
        action: 'admin::webhooks.create',
        category: 'webhooks',
        subCategory: 'general',
      },
      {
        displayName: 'Read',
        action: 'admin::webhooks.read',
        category: 'webhooks',
        subCategory: 'general',
      },
      {
        displayName: 'Update',
        action: 'admin::webhooks.update',
        category: 'webhooks',
        subCategory: 'general',
      },
      {
        displayName: 'Delete',
        action: 'admin::webhooks.delete',
        category: 'webhooks',
        subCategory: 'general',
      },
      {
        displayName: 'Create (invite)',
        action: 'admin::users.create',
        category: 'users and roles',
        subCategory: 'users',
      },
      {
        displayName: 'Read',
        action: 'admin::users.read',
        category: 'users and roles',
        subCategory: 'users',
      },
      {
        displayName: 'Update',
        action: 'admin::users.update',
        category: 'users and roles',
        subCategory: 'users',
      },
      {
        displayName: 'Delete',
        action: 'admin::users.delete',
        category: 'users and roles',
        subCategory: 'users',
      },
      {
        displayName: 'Create',
        action: 'admin::roles.create',
        category: 'users and roles',
        subCategory: 'roles',
      },
      {
        displayName: 'Read',
        action: 'admin::roles.read',
        category: 'users and roles',
        subCategory: 'roles',
      },
      {
        displayName: 'Update',
        action: 'admin::roles.update',
        category: 'users and roles',
        subCategory: 'roles',
      },
      {
        displayName: 'Delete',
        action: 'admin::roles.delete',
        category: 'users and roles',
        subCategory: 'roles',
      },
    ],

    singleTypes: {}, // same format as under,
    collectionTypes: {
      subjects: {
        address: {
          properties: [
            {
              label: 'Fields',
              value: 'fields',
              children: [
                {
                  label: 'POST',
                  value: 'postal_coder',
                  required: true,
                },
                {
                  label: 'categories',
                  value: 'categories',
                },
                {
                  label: 'cover',
                  value: 'cover',
                },
                {
                  label: 'images',
                  value: 'images',
                },
                {
                  label: 'city',
                  value: 'city',
                },
              ],
            },
          ],
        },
        restaurant: {
          properties: [
            {
              label: 'Fields',
              value: 'fields',
              children: [
                {
                  label: 'f1',
                  value: 'f1',
                  required: true,
                },
                {
                  label: 'f2',
                  value: 'f2',
                },
                {
                  // nested compo
                  label: 'services',
                  value: 'services',
                  children: [
                    {
                      label: 'name',
                      value: 'name',
                    },
                    {
                      label: 'media',
                      value: 'media',
                      required: true,
                    },
                    {
                      label: 'closing',
                      value: 'closing',
                      children: [
                        {
                          label: 'name',
                          value: 'name',
                          children: [{ label: 'test', value: 'test' }],
                        },
                      ],
                    },
                  ],
                },
                {
                  label: 'dz',
                  value: 'dz',
                },
                {
                  label: 'relation',
                  value: 'relation',
                },
              ],
            },
            {
              label: 'Locales',
              value: 'locales',
              children: [
                {
                  label: 'French',
                  value: 'fr',
                },
                {
                  label: 'English',
                  required: true,
                  value: 'en',
                },
              ],
            },
          ],
        },
        test: {
          properties: [],
        },
      },
      actions: [
        {
          label: 'Create',
          actionId: 'content-manager.explorer.create',
          subjects: ['restaurant', 'address'],
          applyToProperties: ['fields', 'locales'],
        },
        {
          label: 'Read',
          actionId: 'content-manager.explorer.read',
          subjects: ['restaurant', 'address'],
          applyToProperties: ['fields', 'locales'],
        },
        {
          label: 'Update',
          actionId: 'content-manager.explorer.update',
          subjects: ['address', 'erestaurant'],
          applyToProperties: ['fields'],
        },
        {
          label: 'Delete',
          actionId: 'content-manager.explorer.delete',
          subjects: ['restaurant', 'address'],
          applyToProperties: ['locales'],
        },
        {
          label: 'Publish',
          actionId: 'content-manager.explorer.publish',
          subjects: ['restaurant'],
        },
      ],
    },
  },
};

export default data;
