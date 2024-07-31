import { formatLayout } from '../layouts';

import { layout } from './data';

describe('layouts', () => {
  it('should format permissions correctly', () => {
    expect(formatLayout(layout.sections.plugins, 'plugin')).toMatchInlineSnapshot(`
      [
        {
          "category": "plugin::content-type-builder",
          "categoryId": "plugin::content-type-builder",
          "childrenForm": [
            {
              "actions": [
                {
                  "action": "plugin::content-type-builder.read",
                  "displayName": "Read",
                  "plugin": "plugin::content-type-builder",
                  "subCategory": "general",
                },
              ],
              "subCategoryId": "general",
              "subCategoryName": "general",
            },
          ],
        },
        {
          "category": "plugin::documentation",
          "categoryId": "plugin::documentation",
          "childrenForm": [
            {
              "actions": [
                {
                  "action": "plugin::documentation.read",
                  "displayName": "Access the Documentation",
                  "plugin": "plugin::documentation",
                  "subCategory": "general",
                },
              ],
              "subCategoryId": "general",
              "subCategoryName": "general",
            },
            {
              "actions": [
                {
                  "action": "plugin::documentation.settings.update",
                  "displayName": "Update and delete",
                  "plugin": "plugin::documentation",
                  "subCategory": "settings",
                },
                {
                  "action": "plugin::documentation.settings.regenerate",
                  "displayName": "Regenerate",
                  "plugin": "plugin::documentation",
                  "subCategory": "settings",
                },
              ],
              "subCategoryId": "settings",
              "subCategoryName": "settings",
            },
          ],
        },
        {
          "category": "plugin::upload",
          "categoryId": "plugin::upload",
          "childrenForm": [
            {
              "actions": [
                {
                  "action": "plugin::upload.read",
                  "displayName": "Access the Media Library",
                  "plugin": "plugin::upload",
                  "subCategory": "general",
                },
              ],
              "subCategoryId": "general",
              "subCategoryName": "general",
            },
            {
              "actions": [
                {
                  "action": "plugin::upload.assets.create",
                  "displayName": "Create (upload)",
                  "plugin": "plugin::upload",
                  "subCategory": "assets",
                },
              ],
              "subCategoryId": "assets",
              "subCategoryName": "assets",
            },
          ],
        },
      ]
    `);
  });

  it('should format settings correctly', () => {
    expect(formatLayout(layout.sections.settings, 'category')).toMatchInlineSnapshot(`
      [
        {
          "category": "media library",
          "categoryId": "media-library",
          "childrenForm": [
            {
              "actions": [
                {
                  "action": "plugin::upload.settings.read",
                  "category": "media library",
                  "displayName": "Access the Media Library settings page",
                  "subCategory": "general",
                },
              ],
              "subCategoryId": "general",
              "subCategoryName": "general",
            },
          ],
        },
        {
          "category": "plugins and marketplace",
          "categoryId": "plugins-and-marketplace",
          "childrenForm": [
            {
              "actions": [
                {
                  "action": "admin::marketplace.read",
                  "category": "plugins and marketplace",
                  "displayName": "Access the marketplace",
                  "subCategory": "marketplace",
                },
              ],
              "subCategoryId": "marketplace",
              "subCategoryName": "marketplace",
            },
          ],
        },
      ]
    `);
  });
});
