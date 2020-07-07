export const permissions = {
  contentTypesPermissions: {
    'application::address.address': {
      contentTypeActions: {
        'plugins::content-manager.explorer.delete': true,
      },
      attributes: {
        city: {
          actions: [
            'plugins::content-manager.explorer.create',
            'plugins::content-manager.explorer.read',
          ],
        },
        cover: {
          actions: [
            'plugins::content-manager.explorer.create',
            'plugins::content-manager.explorer.read',
          ],
        },
        closing_period: {
          actions: [
            'plugins::content-manager.explorer.create',
            'plugins::content-manager.explorer.read',
          ],
        },
        'closing_period.start_date': {
          actions: ['plugins::content-manager.explorer.create'],
        },
        'closing_period.dish.description': {
          actions: [
            'plugins::content-manager.explorer.create',
            'plugins::content-manager.explorer.read',
          ],
        },
      },
    },
    'application::places.places': {
      attributes: {
        like: {
          actions: [
            'plugins::content-manager.explorer.create',
            'plugins::content-manager.explorer.read',
          ],
        },
        country: {
          actions: [
            'plugins::content-manager.explorer.create',
            'plugins::content-manager.explorer.read',
          ],
        },
      },
    },
  },
};

export const contentTypes = [
  {
    uid: 'application::address.address',
    schema: {
      options: {
        timestamps: ['updated_at', 'created_at'],
      },
      modelType: 'contentType',
      attributes: {
        id: { type: 'integer' },
        city: { type: 'string', required: false },
        cover: { type: 'media', multiple: false, required: false },
        closing_period: {
          component: 'default.closingperiod',
          type: 'component',
        },
        label: { type: 'string' },
        updated_at: { type: 'timestamp' },
      },
    },
  },
  {
    uid: 'application::places.places',
    schema: {
      options: {
        timestamps: ['updated_at', 'created_at'],
      },
      modelType: 'contentType',
      attributes: {
        id: { type: 'integer' },
        like: { type: 'string', required: false },
        country: { type: 'string', required: false },
        image: { type: 'media', multiple: false, required: false },
        custom_label: { type: 'string' },
        updated_at: { type: 'timestamp' },
      },
    },
  },
];

export const components = [
  {
    uid: 'default.closingperiod',
    schema: {
      attributes: {
        id: { type: 'integer' },
        start_date: { type: 'date', required: true },
        dish: {
          component: 'default.dish',
          type: 'component',
        },
        media: { type: 'media', multiple: false, required: false },
      },
    },
  },
  {
    uid: 'default.dish',
    schema: {
      attributes: {
        description: { type: 'text' },
        id: { type: 'integer' },
        name: { type: 'string', required: true, default: 'My super dish' },
      },
    },
  },
  {
    uid: 'default.restaurantservice',
    schema: {
      attributes: {
        is_available: { type: 'boolean', required: true, default: true },
        id: { type: 'integer' },
        name: { type: 'string', required: true, default: 'something' },
      },
    },
  },
];

export const permissionsLayout = {
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
