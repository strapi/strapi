import formatLayoutForSettingsAndPlugins from '../formatLayoutForSettingsAndPlugins';
import permissionsLayout from './data';

describe('ADMIN | COMPONENTS | ROLE | PluginsAndSettings | formatLayoutForSettingsAndPlugins', () => {
  it('should format plugins permissions correctly', () => {
    const expected = [
      {
        category: 'plugin::content-type-builder',
        categoryId: 'plugin::content-type-builder',
        childrenForm: [
          {
            subCategoryName: 'general',
            subCategoryId: 'general',
            actions: [
              {
                displayName: 'Read',
                action: 'plugins::content-type-builder.read',
                subCategory: 'general',
                plugin: 'plugin::content-type-builder',
              },
            ],
          },
        ],
      },
      {
        category: 'plugin::documentation',
        categoryId: 'plugin::documentation',
        childrenForm: [
          {
            subCategoryName: 'general',
            subCategoryId: 'general',
            actions: [
              {
                displayName: 'Access the Documentation',
                action: 'plugins::documentation.read',
                subCategory: 'general',
                plugin: 'plugin::documentation',
              },
            ],
          },
          {
            subCategoryName: 'settings',
            subCategoryId: 'settings',
            actions: [
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
            ],
          },
        ],
      },
      {
        category: 'plugin::upload',
        categoryId: 'plugin::upload',
        childrenForm: [
          {
            subCategoryName: 'general',
            subCategoryId: 'general',
            actions: [
              {
                displayName: 'Access the Media Library',
                action: 'plugins::upload.read',
                subCategory: 'general',
                plugin: 'plugin::upload',
              },
            ],
          },
          {
            subCategoryName: 'assets',
            subCategoryId: 'assets',
            actions: [
              {
                displayName: 'Create (upload)',
                action: 'plugins::upload.assets.create',
                subCategory: 'assets',
                plugin: 'plugin::upload',
              },
            ],
          },
        ],
      },
    ];

    expect(formatLayoutForSettingsAndPlugins(permissionsLayout.sections.plugins, 'plugin')).toEqual(
      expected
    );
  });

  it('should format settings permissions correctly', () => {
    const expected = [
      {
        category: 'media library',
        categoryId: 'media-library',
        childrenForm: [
          {
            subCategoryName: 'general',
            subCategoryId: 'general',
            actions: [
              {
                displayName: 'Access the Media Library settings page',
                action: 'plugins::upload.settings.read',
                category: 'media library',
                subCategory: 'general',
              },
            ],
          },
        ],
      },
      {
        category: 'plugins and marketplace',
        categoryId: 'plugins-and-marketplace',
        childrenForm: [
          {
            subCategoryName: 'marketplace',
            subCategoryId: 'marketplace',
            actions: [
              {
                displayName: 'Access the marketplace',
                action: 'admin::marketplace.read',
                category: 'plugins and marketplace',
                subCategory: 'marketplace',
              },
            ],
          },
          {
            subCategoryName: 'plugins',
            subCategoryId: 'plugins',
            actions: [
              {
                displayName: 'Install (only for dev env)',
                action: 'admin::marketplace.plugins.install',
                category: 'plugins and marketplace',
                subCategory: 'plugins',
              },
            ],
          },
        ],
      },
    ];

    expect(
      formatLayoutForSettingsAndPlugins(permissionsLayout.sections.settings, 'category')
    ).toEqual(expected);
  });
});
