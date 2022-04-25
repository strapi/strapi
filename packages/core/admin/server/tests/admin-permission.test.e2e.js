'use strict';

const _ = require('lodash');

const { createAuthRequest } = require('../../../../../test/helpers/request');
const { createStrapiInstance } = require('../../../../../test/helpers/strapi');

const edition = process.env.STRAPI_DISABLE_EE === 'true' ? 'CE' : 'EE';

describe('Role CRUD End to End', () => {
  let rq;
  let strapi;

  beforeAll(async () => {
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
  });

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
            "collectionTypes": Array [
              Array [
                Object {
                  "actionId": "plugin::content-manager.explorer.create",
                  "applyToProperties": Array [
                    "fields",
                    "locales",
                  ],
                  "label": "Create",
                  "subjects": Array [
                    "plugin::users-permissions.user",
                  ],
                },
                Object {
                  "actionId": "plugin::content-manager.explorer.read",
                  "applyToProperties": Array [
                    "fields",
                    "locales",
                  ],
                  "label": "Read",
                  "subjects": Array [
                    "plugin::users-permissions.user",
                  ],
                },
                Object {
                  "actionId": "plugin::content-manager.explorer.update",
                  "applyToProperties": Array [
                    "fields",
                    "locales",
                  ],
                  "label": "Update",
                  "subjects": Array [
                    "plugin::users-permissions.user",
                  ],
                },
                Object {
                  "actionId": "plugin::content-manager.explorer.delete",
                  "applyToProperties": Array [
                    "locales",
                  ],
                  "label": "Delete",
                  "subjects": Array [
                    "plugin::users-permissions.user",
                  ],
                },
                Object {
                  "actionId": "plugin::content-manager.explorer.publish",
                  "applyToProperties": Array [
                    "locales",
                  ],
                  "label": "Publish",
                  "subjects": Array [],
                },
              ],
              Array [
                Object {
                  "label": "user",
                  "properties": Array [
                    Object {
                      "children": Array [
                        Object {
                          "label": "username",
                          "required": true,
                          "value": "username",
                        },
                        Object {
                          "label": "email",
                          "required": true,
                          "value": "email",
                        },
                        Object {
                          "label": "provider",
                          "value": "provider",
                        },
                        Object {
                          "label": "password",
                          "value": "password",
                        },
                        Object {
                          "label": "resetPasswordToken",
                          "value": "resetPasswordToken",
                        },
                        Object {
                          "label": "confirmationToken",
                          "value": "confirmationToken",
                        },
                        Object {
                          "label": "confirmed",
                          "value": "confirmed",
                        },
                        Object {
                          "label": "blocked",
                          "value": "blocked",
                        },
                        Object {
                          "label": "role",
                          "value": "role",
                        },
                      ],
                      "label": "Fields",
                      "value": "fields",
                    },
                  ],
                  "uid": "plugin::users-permissions.user",
                },
              ],
            ],
            "plugins": Array [
              Object {
                "action": "plugin::content-manager.collection-types.configure-view",
                "displayName": "Configure view",
                "plugin": "content-manager",
                "subCategory": "collection types",
              },
              Object {
                "action": "plugin::content-manager.components.configure-layout",
                "displayName": "Configure Layout",
                "plugin": "content-manager",
                "subCategory": "components",
              },
              Object {
                "action": "plugin::content-manager.single-types.configure-view",
                "displayName": "Configure view",
                "plugin": "content-manager",
                "subCategory": "single types",
              },
              Object {
                "action": "plugin::content-type-builder.read",
                "displayName": "Read",
                "plugin": "content-type-builder",
                "subCategory": "general",
              },
              Object {
                "action": "plugin::documentation.read",
                "displayName": "Access the Documentation",
                "plugin": "documentation",
                "subCategory": "general",
              },
              Object {
                "action": "plugin::documentation.settings.regenerate",
                "displayName": "Regenerate",
                "plugin": "documentation",
                "subCategory": "general",
              },
              Object {
                "action": "plugin::documentation.settings.update",
                "displayName": "Update and delete",
                "plugin": "documentation",
                "subCategory": "general",
              },
              Object {
                "action": "plugin::upload.assets.copy-link",
                "displayName": "Copy link",
                "plugin": "upload",
                "subCategory": "assets",
              },
              Object {
                "action": "plugin::upload.assets.create",
                "displayName": "Create (upload)",
                "plugin": "upload",
                "subCategory": "assets",
              },
              Object {
                "action": "plugin::upload.assets.download",
                "displayName": "Download",
                "plugin": "upload",
                "subCategory": "assets",
              },
              Object {
                "action": "plugin::upload.assets.update",
                "displayName": "Update (crop, details, replace) + delete",
                "plugin": "upload",
                "subCategory": "assets",
              },
              Object {
                "action": "plugin::upload.read",
                "displayName": "Access the Media Library",
                "plugin": "upload",
                "subCategory": "general",
              },
              Object {
                "action": "plugin::users-permissions.advanced-settings.read",
                "displayName": "Read",
                "plugin": "users-permissions",
                "subCategory": "advancedSettings",
              },
              Object {
                "action": "plugin::users-permissions.advanced-settings.update",
                "displayName": "Edit",
                "plugin": "users-permissions",
                "subCategory": "advancedSettings",
              },
              Object {
                "action": "plugin::users-permissions.email-templates.read",
                "displayName": "Read",
                "plugin": "users-permissions",
                "subCategory": "emailTemplates",
              },
              Object {
                "action": "plugin::users-permissions.email-templates.update",
                "displayName": "Edit",
                "plugin": "users-permissions",
                "subCategory": "emailTemplates",
              },
              Object {
                "action": "plugin::users-permissions.providers.read",
                "displayName": "Read",
                "plugin": "users-permissions",
                "subCategory": "providers",
              },
              Object {
                "action": "plugin::users-permissions.providers.update",
                "displayName": "Edit",
                "plugin": "users-permissions",
                "subCategory": "providers",
              },
              Object {
                "action": "plugin::users-permissions.roles.create",
                "displayName": "Create",
                "plugin": "users-permissions",
                "subCategory": "roles",
              },
              Object {
                "action": "plugin::users-permissions.roles.delete",
                "displayName": "Delete",
                "plugin": "users-permissions",
                "subCategory": "roles",
              },
              Object {
                "action": "plugin::users-permissions.roles.read",
                "displayName": "Read",
                "plugin": "users-permissions",
                "subCategory": "roles",
              },
              Object {
                "action": "plugin::users-permissions.roles.update",
                "displayName": "Update",
                "plugin": "users-permissions",
                "subCategory": "roles",
              },
            ],
            "settings": Array [
              Object {
                "action": "admin::api-tokens.create",
                "category": "api tokens",
                "displayName": "Create (generate)",
                "subCategory": "general",
              },
              Object {
                "action": "admin::api-tokens.delete",
                "category": "api tokens",
                "displayName": "Delete (revoke)",
                "subCategory": "general",
              },
              Object {
                "action": "admin::api-tokens.read",
                "category": "api tokens",
                "displayName": "Read",
                "subCategory": "general",
              },
              Object {
                "action": "admin::api-tokens.update",
                "category": "api tokens",
                "displayName": "Update",
                "subCategory": "general",
              },
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
                "action": "admin::project-settings.read",
                "category": "project",
                "displayName": "Read the project level settings",
                "subCategory": "general",
              },
              Object {
                "action": "admin::project-settings.update",
                "category": "project",
                "displayName": "Update the project level settings",
                "subCategory": "general",
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
                "action": "plugin::documentation.settings.read",
                "category": "documentation",
                "displayName": "Access the documentation settings page",
                "subCategory": "general",
              },
              Object {
                "action": "plugin::email.settings.read",
                "category": "email",
                "displayName": "Access the Email Settings page",
                "subCategory": "general",
              },
              Object {
                "action": "plugin::i18n.locale.create",
                "category": "Internationalization",
                "displayName": "Create",
                "subCategory": "Locales",
              },
              Object {
                "action": "plugin::i18n.locale.delete",
                "category": "Internationalization",
                "displayName": "Delete",
                "subCategory": "Locales",
              },
              Object {
                "action": "plugin::i18n.locale.read",
                "category": "Internationalization",
                "displayName": "Read",
                "subCategory": "Locales",
              },
              Object {
                "action": "plugin::i18n.locale.update",
                "category": "Internationalization",
                "displayName": "Update",
                "subCategory": "Locales",
              },
              Object {
                "action": "plugin::upload.settings.read",
                "category": "media library",
                "displayName": "Access the Media Library settings page",
                "subCategory": "general",
              },
            ],
            "singleTypes": Array [
              Array [
                Object {
                  "actionId": "plugin::content-manager.explorer.create",
                  "applyToProperties": Array [
                    "fields",
                    "locales",
                  ],
                  "label": "Create",
                  "subjects": Array [
                    "plugin::users-permissions.user",
                  ],
                },
                Object {
                  "actionId": "plugin::content-manager.explorer.read",
                  "applyToProperties": Array [
                    "fields",
                    "locales",
                  ],
                  "label": "Read",
                  "subjects": Array [
                    "plugin::users-permissions.user",
                  ],
                },
                Object {
                  "actionId": "plugin::content-manager.explorer.update",
                  "applyToProperties": Array [
                    "fields",
                    "locales",
                  ],
                  "label": "Update",
                  "subjects": Array [
                    "plugin::users-permissions.user",
                  ],
                },
                Object {
                  "actionId": "plugin::content-manager.explorer.delete",
                  "applyToProperties": Array [
                    "locales",
                  ],
                  "label": "Delete",
                  "subjects": Array [
                    "plugin::users-permissions.user",
                  ],
                },
                Object {
                  "actionId": "plugin::content-manager.explorer.publish",
                  "applyToProperties": Array [
                    "locales",
                  ],
                  "label": "Publish",
                  "subjects": Array [],
                },
              ],
              Array [],
            ],
          },
        }
      `);
    } else {
      // eslint-disable-next-line node/no-extraneous-require
      const { features } = require('@strapi/strapi/lib/utils/ee');
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
              "collectionTypes": Array [
                Array [
                  Object {
                    "actionId": "plugin::content-manager.explorer.create",
                    "applyToProperties": Array [
                      "fields",
                      "locales",
                    ],
                    "label": "Create",
                    "subjects": Array [
                      "plugin::users-permissions.user",
                    ],
                  },
                  Object {
                    "actionId": "plugin::content-manager.explorer.read",
                    "applyToProperties": Array [
                      "fields",
                      "locales",
                    ],
                    "label": "Read",
                    "subjects": Array [
                      "plugin::users-permissions.user",
                    ],
                  },
                  Object {
                    "actionId": "plugin::content-manager.explorer.update",
                    "applyToProperties": Array [
                      "fields",
                      "locales",
                    ],
                    "label": "Update",
                    "subjects": Array [
                      "plugin::users-permissions.user",
                    ],
                  },
                  Object {
                    "actionId": "plugin::content-manager.explorer.delete",
                    "applyToProperties": Array [
                      "locales",
                    ],
                    "label": "Delete",
                    "subjects": Array [
                      "plugin::users-permissions.user",
                    ],
                  },
                  Object {
                    "actionId": "plugin::content-manager.explorer.publish",
                    "applyToProperties": Array [
                      "locales",
                    ],
                    "label": "Publish",
                    "subjects": Array [],
                  },
                ],
                Array [
                  Object {
                    "label": "user",
                    "properties": Array [
                      Object {
                        "children": Array [
                          Object {
                            "label": "username",
                            "required": true,
                            "value": "username",
                          },
                          Object {
                            "label": "email",
                            "required": true,
                            "value": "email",
                          },
                          Object {
                            "label": "provider",
                            "value": "provider",
                          },
                          Object {
                            "label": "password",
                            "value": "password",
                          },
                          Object {
                            "label": "resetPasswordToken",
                            "value": "resetPasswordToken",
                          },
                          Object {
                            "label": "confirmationToken",
                            "value": "confirmationToken",
                          },
                          Object {
                            "label": "confirmed",
                            "value": "confirmed",
                          },
                          Object {
                            "label": "blocked",
                            "value": "blocked",
                          },
                          Object {
                            "label": "role",
                            "value": "role",
                          },
                        ],
                        "label": "Fields",
                        "value": "fields",
                      },
                    ],
                    "uid": "plugin::users-permissions.user",
                  },
                ],
              ],
              "plugins": Array [
                Object {
                  "action": "plugin::content-manager.collection-types.configure-view",
                  "displayName": "Configure view",
                  "plugin": "content-manager",
                  "subCategory": "collection types",
                },
                Object {
                  "action": "plugin::content-manager.components.configure-layout",
                  "displayName": "Configure Layout",
                  "plugin": "content-manager",
                  "subCategory": "components",
                },
                Object {
                  "action": "plugin::content-manager.single-types.configure-view",
                  "displayName": "Configure view",
                  "plugin": "content-manager",
                  "subCategory": "single types",
                },
                Object {
                  "action": "plugin::content-type-builder.read",
                  "displayName": "Read",
                  "plugin": "content-type-builder",
                  "subCategory": "general",
                },
                Object {
                  "action": "plugin::documentation.read",
                  "displayName": "Access the Documentation",
                  "plugin": "documentation",
                  "subCategory": "general",
                },
                Object {
                  "action": "plugin::documentation.settings.regenerate",
                  "displayName": "Regenerate",
                  "plugin": "documentation",
                  "subCategory": "general",
                },
                Object {
                  "action": "plugin::documentation.settings.update",
                  "displayName": "Update and delete",
                  "plugin": "documentation",
                  "subCategory": "general",
                },
                Object {
                  "action": "plugin::upload.assets.copy-link",
                  "displayName": "Copy link",
                  "plugin": "upload",
                  "subCategory": "assets",
                },
                Object {
                  "action": "plugin::upload.assets.create",
                  "displayName": "Create (upload)",
                  "plugin": "upload",
                  "subCategory": "assets",
                },
                Object {
                  "action": "plugin::upload.assets.download",
                  "displayName": "Download",
                  "plugin": "upload",
                  "subCategory": "assets",
                },
                Object {
                  "action": "plugin::upload.assets.update",
                  "displayName": "Update (crop, details, replace) + delete",
                  "plugin": "upload",
                  "subCategory": "assets",
                },
                Object {
                  "action": "plugin::upload.read",
                  "displayName": "Access the Media Library",
                  "plugin": "upload",
                  "subCategory": "general",
                },
                Object {
                  "action": "plugin::users-permissions.advanced-settings.read",
                  "displayName": "Read",
                  "plugin": "users-permissions",
                  "subCategory": "advancedSettings",
                },
                Object {
                  "action": "plugin::users-permissions.advanced-settings.update",
                  "displayName": "Edit",
                  "plugin": "users-permissions",
                  "subCategory": "advancedSettings",
                },
                Object {
                  "action": "plugin::users-permissions.email-templates.read",
                  "displayName": "Read",
                  "plugin": "users-permissions",
                  "subCategory": "emailTemplates",
                },
                Object {
                  "action": "plugin::users-permissions.email-templates.update",
                  "displayName": "Edit",
                  "plugin": "users-permissions",
                  "subCategory": "emailTemplates",
                },
                Object {
                  "action": "plugin::users-permissions.providers.read",
                  "displayName": "Read",
                  "plugin": "users-permissions",
                  "subCategory": "providers",
                },
                Object {
                  "action": "plugin::users-permissions.providers.update",
                  "displayName": "Edit",
                  "plugin": "users-permissions",
                  "subCategory": "providers",
                },
                Object {
                  "action": "plugin::users-permissions.roles.create",
                  "displayName": "Create",
                  "plugin": "users-permissions",
                  "subCategory": "roles",
                },
                Object {
                  "action": "plugin::users-permissions.roles.delete",
                  "displayName": "Delete",
                  "plugin": "users-permissions",
                  "subCategory": "roles",
                },
                Object {
                  "action": "plugin::users-permissions.roles.read",
                  "displayName": "Read",
                  "plugin": "users-permissions",
                  "subCategory": "roles",
                },
                Object {
                  "action": "plugin::users-permissions.roles.update",
                  "displayName": "Update",
                  "plugin": "users-permissions",
                  "subCategory": "roles",
                },
              ],
              "settings": Array [
                Object {
                  "action": "admin::api-tokens.create",
                  "category": "api tokens",
                  "displayName": "Create (generate)",
                  "subCategory": "general",
                },
                Object {
                  "action": "admin::api-tokens.delete",
                  "category": "api tokens",
                  "displayName": "Delete (revoke)",
                  "subCategory": "general",
                },
                Object {
                  "action": "admin::api-tokens.read",
                  "category": "api tokens",
                  "displayName": "Read",
                  "subCategory": "general",
                },
                Object {
                  "action": "admin::api-tokens.update",
                  "category": "api tokens",
                  "displayName": "Update",
                  "subCategory": "general",
                },
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
                  "action": "admin::project-settings.read",
                  "category": "project",
                  "displayName": "Read the project level settings",
                  "subCategory": "general",
                },
                Object {
                  "action": "admin::project-settings.update",
                  "category": "project",
                  "displayName": "Update the project level settings",
                  "subCategory": "general",
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
                  "action": "plugin::documentation.settings.read",
                  "category": "documentation",
                  "displayName": "Access the documentation settings page",
                  "subCategory": "general",
                },
                Object {
                  "action": "plugin::email.settings.read",
                  "category": "email",
                  "displayName": "Access the Email Settings page",
                  "subCategory": "general",
                },
                Object {
                  "action": "plugin::i18n.locale.create",
                  "category": "Internationalization",
                  "displayName": "Create",
                  "subCategory": "Locales",
                },
                Object {
                  "action": "plugin::i18n.locale.delete",
                  "category": "Internationalization",
                  "displayName": "Delete",
                  "subCategory": "Locales",
                },
                Object {
                  "action": "plugin::i18n.locale.read",
                  "category": "Internationalization",
                  "displayName": "Read",
                  "subCategory": "Locales",
                },
                Object {
                  "action": "plugin::i18n.locale.update",
                  "category": "Internationalization",
                  "displayName": "Update",
                  "subCategory": "Locales",
                },
                Object {
                  "action": "plugin::upload.settings.read",
                  "category": "media library",
                  "displayName": "Access the Media Library settings page",
                  "subCategory": "general",
                },
              ],
              "singleTypes": Array [
                Array [
                  Object {
                    "actionId": "plugin::content-manager.explorer.create",
                    "applyToProperties": Array [
                      "fields",
                      "locales",
                    ],
                    "label": "Create",
                    "subjects": Array [
                      "plugin::users-permissions.user",
                    ],
                  },
                  Object {
                    "actionId": "plugin::content-manager.explorer.read",
                    "applyToProperties": Array [
                      "fields",
                      "locales",
                    ],
                    "label": "Read",
                    "subjects": Array [
                      "plugin::users-permissions.user",
                    ],
                  },
                  Object {
                    "actionId": "plugin::content-manager.explorer.update",
                    "applyToProperties": Array [
                      "fields",
                      "locales",
                    ],
                    "label": "Update",
                    "subjects": Array [
                      "plugin::users-permissions.user",
                    ],
                  },
                  Object {
                    "actionId": "plugin::content-manager.explorer.delete",
                    "applyToProperties": Array [
                      "locales",
                    ],
                    "label": "Delete",
                    "subjects": Array [
                      "plugin::users-permissions.user",
                    ],
                  },
                  Object {
                    "actionId": "plugin::content-manager.explorer.publish",
                    "applyToProperties": Array [
                      "locales",
                    ],
                    "label": "Publish",
                    "subjects": Array [],
                  },
                ],
                Array [],
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
                  "action": "plugin::content-manager.explorer.create",
                  "displayName": "Create",
                  "subjects": Array [
                    "plugin::users-permissions.user",
                  ],
                },
                Object {
                  "action": "plugin::content-manager.explorer.delete",
                  "displayName": "Delete",
                  "subjects": Array [
                    "plugin::users-permissions.user",
                  ],
                },
                Object {
                  "action": "plugin::content-manager.explorer.publish",
                  "displayName": "Publish",
                  "subjects": Array [],
                },
                Object {
                  "action": "plugin::content-manager.explorer.read",
                  "displayName": "Read",
                  "subjects": Array [
                    "plugin::users-permissions.user",
                  ],
                },
                Object {
                  "action": "plugin::content-manager.explorer.update",
                  "displayName": "Update",
                  "subjects": Array [
                    "plugin::users-permissions.user",
                  ],
                },
              ],
              "plugins": Array [
                Object {
                  "action": "plugin::content-manager.collection-types.configure-view",
                  "displayName": "Configure view",
                  "plugin": "plugin::content-manager",
                  "subCategory": "collection types",
                },
                Object {
                  "action": "plugin::content-manager.components.configure-layout",
                  "displayName": "Configure Layout",
                  "plugin": "plugin::content-manager",
                  "subCategory": "components",
                },
                Object {
                  "action": "plugin::content-manager.single-types.configure-view",
                  "displayName": "Configure view",
                  "plugin": "plugin::content-manager",
                  "subCategory": "single types",
                },
                Object {
                  "action": "plugin::content-type-builder.read",
                  "displayName": "Read",
                  "plugin": "plugin::content-type-builder",
                  "subCategory": "general",
                },
                Object {
                  "action": "plugin::documentation.read",
                  "displayName": "Access the Documentation",
                  "plugin": "plugin::documentation",
                  "subCategory": "general",
                },
                Object {
                  "action": "plugin::documentation.settings.regenerate",
                  "displayName": "Regenerate",
                  "plugin": "plugin::documentation",
                  "subCategory": "settings",
                },
                Object {
                  "action": "plugin::documentation.settings.update",
                  "displayName": "Update and delete",
                  "plugin": "plugin::documentation",
                  "subCategory": "settings",
                },
                Object {
                  "action": "plugin::upload.assets.copy-link",
                  "displayName": "Copy link",
                  "plugin": "plugin::upload",
                  "subCategory": "assets",
                },
                Object {
                  "action": "plugin::upload.assets.create",
                  "displayName": "Create (upload)",
                  "plugin": "plugin::upload",
                  "subCategory": "assets",
                },
                Object {
                  "action": "plugin::upload.assets.download",
                  "displayName": "Download",
                  "plugin": "plugin::upload",
                  "subCategory": "assets",
                },
                Object {
                  "action": "plugin::upload.assets.update",
                  "displayName": "Update (crop, details, replace) + delete",
                  "plugin": "plugin::upload",
                  "subCategory": "assets",
                },
                Object {
                  "action": "plugin::upload.read",
                  "displayName": "Access the Media Library",
                  "plugin": "plugin::upload",
                  "subCategory": "general",
                },
                Object {
                  "action": "plugin::users-permissions.advanced-settings.read",
                  "displayName": "Read",
                  "plugin": "plugin::users-permissions",
                  "subCategory": "advancedSettings",
                },
                Object {
                  "action": "plugin::users-permissions.advanced-settings.update",
                  "displayName": "Edit",
                  "plugin": "plugin::users-permissions",
                  "subCategory": "advancedSettings",
                },
                Object {
                  "action": "plugin::users-permissions.email-templates.read",
                  "displayName": "Read",
                  "plugin": "plugin::users-permissions",
                  "subCategory": "emailTemplates",
                },
                Object {
                  "action": "plugin::users-permissions.email-templates.update",
                  "displayName": "Edit",
                  "plugin": "plugin::users-permissions",
                  "subCategory": "emailTemplates",
                },
                Object {
                  "action": "plugin::users-permissions.providers.read",
                  "displayName": "Read",
                  "plugin": "plugin::users-permissions",
                  "subCategory": "providers",
                },
                Object {
                  "action": "plugin::users-permissions.providers.update",
                  "displayName": "Edit",
                  "plugin": "plugin::users-permissions",
                  "subCategory": "providers",
                },
                Object {
                  "action": "plugin::users-permissions.roles.create",
                  "displayName": "Create",
                  "plugin": "plugin::users-permissions",
                  "subCategory": "roles",
                },
                Object {
                  "action": "plugin::users-permissions.roles.delete",
                  "displayName": "Delete",
                  "plugin": "plugin::users-permissions",
                  "subCategory": "roles",
                },
                Object {
                  "action": "plugin::users-permissions.roles.read",
                  "displayName": "Read",
                  "plugin": "plugin::users-permissions",
                  "subCategory": "roles",
                },
                Object {
                  "action": "plugin::users-permissions.roles.update",
                  "displayName": "Update",
                  "plugin": "plugin::users-permissions",
                  "subCategory": "roles",
                },
              ],
              "settings": Array [
                Object {
                  "action": "admin::api-tokens.create",
                  "category": "api tokens",
                  "displayName": "Create (generate)",
                  "subCategory": "general",
                },
                Object {
                  "action": "admin::api-tokens.delete",
                  "category": "api tokens",
                  "displayName": "Delete (revoke)",
                  "subCategory": "general",
                },
                Object {
                  "action": "admin::api-tokens.read",
                  "category": "api tokens",
                  "displayName": "Read",
                  "subCategory": "general",
                },
                Object {
                  "action": "admin::api-tokens.update",
                  "category": "api tokens",
                  "displayName": "Update",
                  "subCategory": "general",
                },
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
                  "action": "admin::project-settings.update",
                  "category": "project",
                  "displayName": "Update the project level settings",
                  "subCategory": "general",
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
                  "action": "plugin::email.settings.read",
                  "category": "email",
                  "displayName": "Access the Email Settings page",
                  "subCategory": "general",
                },
                Object {
                  "action": "plugin::upload.settings.read",
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
