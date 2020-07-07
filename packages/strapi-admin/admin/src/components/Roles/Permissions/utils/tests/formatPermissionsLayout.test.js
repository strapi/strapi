import formatPermissionsLayout from '../formatPermissionsLayout';
import { permissionsLayout } from './data';

describe('ADMIN | COMPONENTS | ROLE | UTILS | formatPermissionsLayout', () => {
  it('should format plugins permissions correctly', () => {
    const expected = [
      {
        category: 'plugin::content-type-builder',
        subCategories: [
          {
            subCategory: 'general',
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
        subCategories: [
          {
            subCategory: 'general',
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
            subCategory: 'settings',
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
        subCategories: [
          {
            subCategory: 'general',
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
            subCategory: 'assets',
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

    expect(formatPermissionsLayout(permissionsLayout.sections.plugins, 'plugin')).toEqual(expected);
  });

  it('should format settings permissions correctly', () => {
    const expected = [
      {
        category: 'media library',
        subCategories: [
          {
            subCategory: 'general',
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
        subCategories: [
          {
            subCategory: 'marketplace',
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
            subCategory: 'plugins',
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

    expect(formatPermissionsLayout(permissionsLayout.sections.settings, 'category')).toEqual(
      expected
    );
  });
});
