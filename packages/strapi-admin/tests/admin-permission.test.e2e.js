'use strict';

const _ = require('lodash');

const { createAuthRequest } = require('../../../test/helpers/request');
const { createStrapiInstance } = require('../../../test/helpers/strapi');

const edition = process.env.STRAPI_DISABLE_EE === 'true' ? 'CE' : 'EE';

describe('Role CRUD End to End', () => {
  let rq;
  let strapi;

  beforeAll(async () => {
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
  }, 60000);

  afterAll(async () => {
    await strapi.destroy();
  });

  test('Can get the existing permissions', async () => {
    let res = await rq({
      url: '/admin/permissions',
      method: 'GET',
    });

    expect(res.statusCode).toBe(200);

    // Data is sorted to avoid error with snapshot when the data is not in the same order
    const sortedData = _.cloneDeep(res.body.data);
    Object.keys(sortedData.sections).forEach(sectionName => {
      sortedData.sections[sectionName] = _.sortBy(sortedData.sections[sectionName], ['action']);
    });
    sortedData.conditions = sortedData.conditions.sort();

    if (edition === 'CE') {
      expect(sortedData).toMatchInlineSnapshot(`
        Object {
          "conditions": Array [
            Object {
              "category": "default",
              "displayName": "Is creator",
              "id": "admin::is-creator",
            },
            Object {
              "category": "default",
              "displayName": "Has same role as creator",
              "id": "admin::has-same-role-as-creator",
            },
          ],
          "sections": Object {
            "contentTypes": Array [
              Object {
                "action": "plugins::content-manager.explorer.create",
                "displayName": "Create",
                "subjects": Array [
                  "plugins::users-permissions.user",
                ],
              },
              Object {
                "action": "plugins::content-manager.explorer.delete",
                "displayName": "Delete",
                "subjects": Array [
                  "plugins::users-permissions.user",
                ],
              },
              Object {
                "action": "plugins::content-manager.explorer.publish",
                "displayName": "Publish",
                "subjects": Array [],
              },
              Object {
                "action": "plugins::content-manager.explorer.read",
                "displayName": "Read",
                "subjects": Array [
                  "plugins::users-permissions.user",
                ],
              },
              Object {
                "action": "plugins::content-manager.explorer.update",
                "displayName": "Update",
                "subjects": Array [
                  "plugins::users-permissions.user",
                ],
              },
            ],
            "plugins": Array [
              Object {
                "action": "plugins::content-manager.collection-types.configure-view",
                "displayName": "Configure view",
                "plugin": "plugin::content-manager",
                "subCategory": "collection types",
              },
              Object {
                "action": "plugins::content-manager.components.configure-layout",
                "displayName": "Configure Layout",
                "plugin": "plugin::content-manager",
                "subCategory": "components",
              },
              Object {
                "action": "plugins::content-manager.single-types.configure-view",
                "displayName": "Configure view",
                "plugin": "plugin::content-manager",
                "subCategory": "single types",
              },
              Object {
                "action": "plugins::content-type-builder.read",
                "displayName": "Read",
                "plugin": "plugin::content-type-builder",
                "subCategory": "general",
              },
              Object {
                "action": "plugins::documentation.read",
                "displayName": "Access the Documentation",
                "plugin": "plugin::documentation",
                "subCategory": "general",
              },
              Object {
                "action": "plugins::documentation.settings.regenerate",
                "displayName": "Regenerate",
                "plugin": "plugin::documentation",
                "subCategory": "settings",
              },
              Object {
                "action": "plugins::documentation.settings.update",
                "displayName": "Update and delete",
                "plugin": "plugin::documentation",
                "subCategory": "settings",
              },
              Object {
                "action": "plugins::upload.assets.copy-link",
                "displayName": "Copy link",
                "plugin": "plugin::upload",
                "subCategory": "assets",
              },
              Object {
                "action": "plugins::upload.assets.create",
                "displayName": "Create (upload)",
                "plugin": "plugin::upload",
                "subCategory": "assets",
              },
              Object {
                "action": "plugins::upload.assets.download",
                "displayName": "Download",
                "plugin": "plugin::upload",
                "subCategory": "assets",
              },
              Object {
                "action": "plugins::upload.assets.update",
                "displayName": "Update (crop, details, replace) + delete",
                "plugin": "plugin::upload",
                "subCategory": "assets",
              },
              Object {
                "action": "plugins::upload.read",
                "displayName": "Access the Media Library",
                "plugin": "plugin::upload",
                "subCategory": "general",
              },
              Object {
                "action": "plugins::users-permissions.advanced-settings.read",
                "displayName": "Read",
                "plugin": "plugin::users-permissions",
                "subCategory": "advancedSettings",
              },
              Object {
                "action": "plugins::users-permissions.advanced-settings.update",
                "displayName": "Edit",
                "plugin": "plugin::users-permissions",
                "subCategory": "advancedSettings",
              },
              Object {
                "action": "plugins::users-permissions.email-templates.read",
                "displayName": "Read",
                "plugin": "plugin::users-permissions",
                "subCategory": "emailTemplates",
              },
              Object {
                "action": "plugins::users-permissions.email-templates.update",
                "displayName": "Edit",
                "plugin": "plugin::users-permissions",
                "subCategory": "emailTemplates",
              },
              Object {
                "action": "plugins::users-permissions.providers.read",
                "displayName": "Read",
                "plugin": "plugin::users-permissions",
                "subCategory": "providers",
              },
              Object {
                "action": "plugins::users-permissions.providers.update",
                "displayName": "Edit",
                "plugin": "plugin::users-permissions",
                "subCategory": "providers",
              },
              Object {
                "action": "plugins::users-permissions.roles.create",
                "displayName": "Create",
                "plugin": "plugin::users-permissions",
                "subCategory": "roles",
              },
              Object {
                "action": "plugins::users-permissions.roles.delete",
                "displayName": "Delete",
                "plugin": "plugin::users-permissions",
                "subCategory": "roles",
              },
              Object {
                "action": "plugins::users-permissions.roles.read",
                "displayName": "Read",
                "plugin": "plugin::users-permissions",
                "subCategory": "roles",
              },
              Object {
                "action": "plugins::users-permissions.roles.update",
                "displayName": "Update",
                "plugin": "plugin::users-permissions",
                "subCategory": "roles",
              },
            ],
            "settings": Array [
              Object {
                "action": "admin::marketplace.plugins.install",
                "category": "plugins and marketplace",
                "displayName": "Install (only for dev env)",
                "subCategory": "plugins",
              },
              Object {
                "action": "admin::marketplace.plugins.uninstall",
                "category": "plugins and marketplace",
                "displayName": "Uninstall (only for dev env)",
                "subCategory": "plugins",
              },
              Object {
                "action": "admin::marketplace.read",
                "category": "plugins and marketplace",
                "displayName": "Access the marketplace",
                "subCategory": "marketplace",
              },
              Object {
                "action": "admin::roles.create",
                "category": "users and roles",
                "displayName": "Create",
                "subCategory": "roles",
              },
              Object {
                "action": "admin::roles.delete",
                "category": "users and roles",
                "displayName": "Delete",
                "subCategory": "roles",
              },
              Object {
                "action": "admin::roles.read",
                "category": "users and roles",
                "displayName": "Read",
                "subCategory": "roles",
              },
              Object {
                "action": "admin::roles.update",
                "category": "users and roles",
                "displayName": "Update",
                "subCategory": "roles",
              },
              Object {
                "action": "admin::users.create",
                "category": "users and roles",
                "displayName": "Create (invite)",
                "subCategory": "users",
              },
              Object {
                "action": "admin::users.delete",
                "category": "users and roles",
                "displayName": "Delete",
                "subCategory": "users",
              },
              Object {
                "action": "admin::users.read",
                "category": "users and roles",
                "displayName": "Read",
                "subCategory": "users",
              },
              Object {
                "action": "admin::users.update",
                "category": "users and roles",
                "displayName": "Update",
                "subCategory": "users",
              },
              Object {
                "action": "admin::webhooks.create",
                "category": "webhooks",
                "displayName": "Create",
                "subCategory": "general",
              },
              Object {
                "action": "admin::webhooks.delete",
                "category": "webhooks",
                "displayName": "Delete",
                "subCategory": "general",
              },
              Object {
                "action": "admin::webhooks.read",
                "category": "webhooks",
                "displayName": "Read",
                "subCategory": "general",
              },
              Object {
                "action": "admin::webhooks.update",
                "category": "webhooks",
                "displayName": "Update",
                "subCategory": "general",
              },
              Object {
                "action": "plugins::upload.settings.read",
                "category": "media library",
                "displayName": "Access the Media Library settings page",
                "subCategory": "general",
              },
            ],
          },
        }
      `);
    } else {
      // eslint-disable-next-line node/no-extraneous-require
      const { features } = require('strapi/lib/utils/ee');
      const hasSSO = features.isEnabled('sso');

      if (hasSSO) {
        expect(sortedData).toMatchInlineSnapshot(`
          Object {
            "conditions": Array [
              Object {
                "category": "default",
                "displayName": "Is creator",
                "id": "admin::is-creator",
              },
              Object {
                "category": "default",
                "displayName": "Has same role as creator",
                "id": "admin::has-same-role-as-creator",
              },
            ],
            "sections": Object {
              "contentTypes": Array [
                Object {
                  "action": "plugins::content-manager.explorer.create",
                  "displayName": "Create",
                  "subjects": Array [
                    "plugins::users-permissions.user",
                  ],
                },
                Object {
                  "action": "plugins::content-manager.explorer.delete",
                  "displayName": "Delete",
                  "subjects": Array [
                    "plugins::users-permissions.user",
                  ],
                },
                Object {
                  "action": "plugins::content-manager.explorer.publish",
                  "displayName": "Publish",
                  "subjects": Array [],
                },
                Object {
                  "action": "plugins::content-manager.explorer.read",
                  "displayName": "Read",
                  "subjects": Array [
                    "plugins::users-permissions.user",
                  ],
                },
                Object {
                  "action": "plugins::content-manager.explorer.update",
                  "displayName": "Update",
                  "subjects": Array [
                    "plugins::users-permissions.user",
                  ],
                },
              ],
              "plugins": Array [
                Object {
                  "action": "plugins::content-manager.collection-types.configure-view",
                  "displayName": "Configure view",
                  "plugin": "plugin::content-manager",
                  "subCategory": "collection types",
                },
                Object {
                  "action": "plugins::content-manager.components.configure-layout",
                  "displayName": "Configure Layout",
                  "plugin": "plugin::content-manager",
                  "subCategory": "components",
                },
                Object {
                  "action": "plugins::content-manager.single-types.configure-view",
                  "displayName": "Configure view",
                  "plugin": "plugin::content-manager",
                  "subCategory": "single types",
                },
                Object {
                  "action": "plugins::content-type-builder.read",
                  "displayName": "Read",
                  "plugin": "plugin::content-type-builder",
                  "subCategory": "general",
                },
                Object {
                  "action": "plugins::documentation.read",
                  "displayName": "Access the Documentation",
                  "plugin": "plugin::documentation",
                  "subCategory": "general",
                },
                Object {
                  "action": "plugins::documentation.settings.regenerate",
                  "displayName": "Regenerate",
                  "plugin": "plugin::documentation",
                  "subCategory": "settings",
                },
                Object {
                  "action": "plugins::documentation.settings.update",
                  "displayName": "Update and delete",
                  "plugin": "plugin::documentation",
                  "subCategory": "settings",
                },
                Object {
                  "action": "plugins::upload.assets.copy-link",
                  "displayName": "Copy link",
                  "plugin": "plugin::upload",
                  "subCategory": "assets",
                },
                Object {
                  "action": "plugins::upload.assets.create",
                  "displayName": "Create (upload)",
                  "plugin": "plugin::upload",
                  "subCategory": "assets",
                },
                Object {
                  "action": "plugins::upload.assets.download",
                  "displayName": "Download",
                  "plugin": "plugin::upload",
                  "subCategory": "assets",
                },
                Object {
                  "action": "plugins::upload.assets.update",
                  "displayName": "Update (crop, details, replace) + delete",
                  "plugin": "plugin::upload",
                  "subCategory": "assets",
                },
                Object {
                  "action": "plugins::upload.read",
                  "displayName": "Access the Media Library",
                  "plugin": "plugin::upload",
                  "subCategory": "general",
                },
                Object {
                  "action": "plugins::users-permissions.advanced-settings.read",
                  "displayName": "Read",
                  "plugin": "plugin::users-permissions",
                  "subCategory": "advancedSettings",
                },
                Object {
                  "action": "plugins::users-permissions.advanced-settings.update",
                  "displayName": "Edit",
                  "plugin": "plugin::users-permissions",
                  "subCategory": "advancedSettings",
                },
                Object {
                  "action": "plugins::users-permissions.email-templates.read",
                  "displayName": "Read",
                  "plugin": "plugin::users-permissions",
                  "subCategory": "emailTemplates",
                },
                Object {
                  "action": "plugins::users-permissions.email-templates.update",
                  "displayName": "Edit",
                  "plugin": "plugin::users-permissions",
                  "subCategory": "emailTemplates",
                },
                Object {
                  "action": "plugins::users-permissions.providers.read",
                  "displayName": "Read",
                  "plugin": "plugin::users-permissions",
                  "subCategory": "providers",
                },
                Object {
                  "action": "plugins::users-permissions.providers.update",
                  "displayName": "Edit",
                  "plugin": "plugin::users-permissions",
                  "subCategory": "providers",
                },
                Object {
                  "action": "plugins::users-permissions.roles.create",
                  "displayName": "Create",
                  "plugin": "plugin::users-permissions",
                  "subCategory": "roles",
                },
                Object {
                  "action": "plugins::users-permissions.roles.delete",
                  "displayName": "Delete",
                  "plugin": "plugin::users-permissions",
                  "subCategory": "roles",
                },
                Object {
                  "action": "plugins::users-permissions.roles.read",
                  "displayName": "Read",
                  "plugin": "plugin::users-permissions",
                  "subCategory": "roles",
                },
                Object {
                  "action": "plugins::users-permissions.roles.update",
                  "displayName": "Update",
                  "plugin": "plugin::users-permissions",
                  "subCategory": "roles",
                },
              ],
              "settings": Array [
                Object {
                  "action": "admin::marketplace.plugins.install",
                  "category": "plugins and marketplace",
                  "displayName": "Install (only for dev env)",
                  "subCategory": "plugins",
                },
                Object {
                  "action": "admin::marketplace.plugins.uninstall",
                  "category": "plugins and marketplace",
                  "displayName": "Uninstall (only for dev env)",
                  "subCategory": "plugins",
                },
                Object {
                  "action": "admin::marketplace.read",
                  "category": "plugins and marketplace",
                  "displayName": "Access the marketplace",
                  "subCategory": "marketplace",
                },
                Object {
                  "action": "admin::provider-login.read",
                  "category": "single sign on",
                  "displayName": "Read",
                  "subCategory": "options",
                },
                Object {
                  "action": "admin::provider-login.update",
                  "category": "single sign on",
                  "displayName": "Update",
                  "subCategory": "options",
                },
                Object {
                  "action": "admin::roles.create",
                  "category": "users and roles",
                  "displayName": "Create",
                  "subCategory": "roles",
                },
                Object {
                  "action": "admin::roles.delete",
                  "category": "users and roles",
                  "displayName": "Delete",
                  "subCategory": "roles",
                },
                Object {
                  "action": "admin::roles.read",
                  "category": "users and roles",
                  "displayName": "Read",
                  "subCategory": "roles",
                },
                Object {
                  "action": "admin::roles.update",
                  "category": "users and roles",
                  "displayName": "Update",
                  "subCategory": "roles",
                },
                Object {
                  "action": "admin::users.create",
                  "category": "users and roles",
                  "displayName": "Create (invite)",
                  "subCategory": "users",
                },
                Object {
                  "action": "admin::users.delete",
                  "category": "users and roles",
                  "displayName": "Delete",
                  "subCategory": "users",
                },
                Object {
                  "action": "admin::users.read",
                  "category": "users and roles",
                  "displayName": "Read",
                  "subCategory": "users",
                },
                Object {
                  "action": "admin::users.update",
                  "category": "users and roles",
                  "displayName": "Update",
                  "subCategory": "users",
                },
                Object {
                  "action": "admin::webhooks.create",
                  "category": "webhooks",
                  "displayName": "Create",
                  "subCategory": "general",
                },
                Object {
                  "action": "admin::webhooks.delete",
                  "category": "webhooks",
                  "displayName": "Delete",
                  "subCategory": "general",
                },
                Object {
                  "action": "admin::webhooks.read",
                  "category": "webhooks",
                  "displayName": "Read",
                  "subCategory": "general",
                },
                Object {
                  "action": "admin::webhooks.update",
                  "category": "webhooks",
                  "displayName": "Update",
                  "subCategory": "general",
                },
                Object {
                  "action": "plugins::upload.settings.read",
                  "category": "media library",
                  "displayName": "Access the Media Library settings page",
                  "subCategory": "general",
                },
              ],
            },
          }
        `);
      } else {
        expect(sortedData).toMatchInlineSnapshot(`
          Object {
            "conditions": Array [
              Object {
                "category": "default",
                "displayName": "Is creator",
                "id": "admin::is-creator",
              },
              Object {
                "category": "default",
                "displayName": "Has same role as creator",
                "id": "admin::has-same-role-as-creator",
              },
            ],
            "sections": Object {
              "contentTypes": Array [
                Object {
                  "action": "plugins::content-manager.explorer.create",
                  "displayName": "Create",
                  "subjects": Array [
                    "plugins::users-permissions.user",
                  ],
                },
                Object {
                  "action": "plugins::content-manager.explorer.delete",
                  "displayName": "Delete",
                  "subjects": Array [
                    "plugins::users-permissions.user",
                  ],
                },
                Object {
                  "action": "plugins::content-manager.explorer.publish",
                  "displayName": "Publish",
                  "subjects": Array [],
                },
                Object {
                  "action": "plugins::content-manager.explorer.read",
                  "displayName": "Read",
                  "subjects": Array [
                    "plugins::users-permissions.user",
                  ],
                },
                Object {
                  "action": "plugins::content-manager.explorer.update",
                  "displayName": "Update",
                  "subjects": Array [
                    "plugins::users-permissions.user",
                  ],
                },
              ],
              "plugins": Array [
                Object {
                  "action": "plugins::content-manager.collection-types.configure-view",
                  "displayName": "Configure view",
                  "plugin": "plugin::content-manager",
                  "subCategory": "collection types",
                },
                Object {
                  "action": "plugins::content-manager.components.configure-layout",
                  "displayName": "Configure Layout",
                  "plugin": "plugin::content-manager",
                  "subCategory": "components",
                },
                Object {
                  "action": "plugins::content-manager.single-types.configure-view",
                  "displayName": "Configure view",
                  "plugin": "plugin::content-manager",
                  "subCategory": "single types",
                },
                Object {
                  "action": "plugins::content-type-builder.read",
                  "displayName": "Read",
                  "plugin": "plugin::content-type-builder",
                  "subCategory": "general",
                },
                Object {
                  "action": "plugins::documentation.read",
                  "displayName": "Access the Documentation",
                  "plugin": "plugin::documentation",
                  "subCategory": "general",
                },
                Object {
                  "action": "plugins::documentation.settings.regenerate",
                  "displayName": "Regenerate",
                  "plugin": "plugin::documentation",
                  "subCategory": "settings",
                },
                Object {
                  "action": "plugins::documentation.settings.update",
                  "displayName": "Update and delete",
                  "plugin": "plugin::documentation",
                  "subCategory": "settings",
                },
                Object {
                  "action": "plugins::upload.assets.copy-link",
                  "displayName": "Copy link",
                  "plugin": "plugin::upload",
                  "subCategory": "assets",
                },
                Object {
                  "action": "plugins::upload.assets.create",
                  "displayName": "Create (upload)",
                  "plugin": "plugin::upload",
                  "subCategory": "assets",
                },
                Object {
                  "action": "plugins::upload.assets.download",
                  "displayName": "Download",
                  "plugin": "plugin::upload",
                  "subCategory": "assets",
                },
                Object {
                  "action": "plugins::upload.assets.update",
                  "displayName": "Update (crop, details, replace) + delete",
                  "plugin": "plugin::upload",
                  "subCategory": "assets",
                },
                Object {
                  "action": "plugins::upload.read",
                  "displayName": "Access the Media Library",
                  "plugin": "plugin::upload",
                  "subCategory": "general",
                },
                Object {
                  "action": "plugins::users-permissions.advanced-settings.read",
                  "displayName": "Read",
                  "plugin": "plugin::users-permissions",
                  "subCategory": "advancedSettings",
                },
                Object {
                  "action": "plugins::users-permissions.advanced-settings.update",
                  "displayName": "Edit",
                  "plugin": "plugin::users-permissions",
                  "subCategory": "advancedSettings",
                },
                Object {
                  "action": "plugins::users-permissions.email-templates.read",
                  "displayName": "Read",
                  "plugin": "plugin::users-permissions",
                  "subCategory": "emailTemplates",
                },
                Object {
                  "action": "plugins::users-permissions.email-templates.update",
                  "displayName": "Edit",
                  "plugin": "plugin::users-permissions",
                  "subCategory": "emailTemplates",
                },
                Object {
                  "action": "plugins::users-permissions.providers.read",
                  "displayName": "Read",
                  "plugin": "plugin::users-permissions",
                  "subCategory": "providers",
                },
                Object {
                  "action": "plugins::users-permissions.providers.update",
                  "displayName": "Edit",
                  "plugin": "plugin::users-permissions",
                  "subCategory": "providers",
                },
                Object {
                  "action": "plugins::users-permissions.roles.create",
                  "displayName": "Create",
                  "plugin": "plugin::users-permissions",
                  "subCategory": "roles",
                },
                Object {
                  "action": "plugins::users-permissions.roles.delete",
                  "displayName": "Delete",
                  "plugin": "plugin::users-permissions",
                  "subCategory": "roles",
                },
                Object {
                  "action": "plugins::users-permissions.roles.read",
                  "displayName": "Read",
                  "plugin": "plugin::users-permissions",
                  "subCategory": "roles",
                },
                Object {
                  "action": "plugins::users-permissions.roles.update",
                  "displayName": "Update",
                  "plugin": "plugin::users-permissions",
                  "subCategory": "roles",
                },
              ],
              "settings": Array [
                Object {
                  "action": "admin::marketplace.plugins.install",
                  "category": "plugins and marketplace",
                  "displayName": "Install (only for dev env)",
                  "subCategory": "plugins",
                },
                Object {
                  "action": "admin::marketplace.plugins.uninstall",
                  "category": "plugins and marketplace",
                  "displayName": "Uninstall (only for dev env)",
                  "subCategory": "plugins",
                },
                Object {
                  "action": "admin::marketplace.read",
                  "category": "plugins and marketplace",
                  "displayName": "Access the marketplace",
                  "subCategory": "marketplace",
                },
                Object {
                  "action": "admin::roles.create",
                  "category": "users and roles",
                  "displayName": "Create",
                  "subCategory": "roles",
                },
                Object {
                  "action": "admin::roles.delete",
                  "category": "users and roles",
                  "displayName": "Delete",
                  "subCategory": "roles",
                },
                Object {
                  "action": "admin::roles.read",
                  "category": "users and roles",
                  "displayName": "Read",
                  "subCategory": "roles",
                },
                Object {
                  "action": "admin::roles.update",
                  "category": "users and roles",
                  "displayName": "Update",
                  "subCategory": "roles",
                },
                Object {
                  "action": "admin::users.create",
                  "category": "users and roles",
                  "displayName": "Create (invite)",
                  "subCategory": "users",
                },
                Object {
                  "action": "admin::users.delete",
                  "category": "users and roles",
                  "displayName": "Delete",
                  "subCategory": "users",
                },
                Object {
                  "action": "admin::users.read",
                  "category": "users and roles",
                  "displayName": "Read",
                  "subCategory": "users",
                },
                Object {
                  "action": "admin::users.update",
                  "category": "users and roles",
                  "displayName": "Update",
                  "subCategory": "users",
                },
                Object {
                  "action": "admin::webhooks.create",
                  "category": "webhooks",
                  "displayName": "Create",
                  "subCategory": "general",
                },
                Object {
                  "action": "admin::webhooks.delete",
                  "category": "webhooks",
                  "displayName": "Delete",
                  "subCategory": "general",
                },
                Object {
                  "action": "admin::webhooks.read",
                  "category": "webhooks",
                  "displayName": "Read",
                  "subCategory": "general",
                },
                Object {
                  "action": "admin::webhooks.update",
                  "category": "webhooks",
                  "displayName": "Update",
                  "subCategory": "general",
                },
                Object {
                  "action": "plugins::upload.settings.read",
                  "category": "media library",
                  "displayName": "Access the Media Library settings page",
                  "subCategory": "general",
                },
              ],
            },
          }
        `);
      }
    }
  });
});
