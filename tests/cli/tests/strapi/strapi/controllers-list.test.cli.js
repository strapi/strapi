'use strict';

const coffee = require('coffee');

const utils = require('../../../utils');

describe('controllers:list', () => {
  let appPath;

  beforeAll(async () => {
    const testApps = utils.instances.getTestApps();

    appPath = testApps.at(0);
  });

  it('should output list of controllers', async () => {
    const { stdout } = await coffee
      .spawn('npm', ['run', '-s', 'strapi', 'controllers:list'], { cwd: appPath })
      .expect('code', 0)
      .end();

    const output = stdout.trim();

    const expected = `
    ┌──────────────────────────────────────────────────────┐
    │ Name                                                 │
    ├──────────────────────────────────────────────────────┤
    │ admin::admin                                         │
    ├──────────────────────────────────────────────────────┤
    │ admin::api-token                                     │
    ├──────────────────────────────────────────────────────┤
    │ admin::authenticated-user                            │
    ├──────────────────────────────────────────────────────┤
    │ admin::authentication                                │
    ├──────────────────────────────────────────────────────┤
    │ admin::permission                                    │
    ├──────────────────────────────────────────────────────┤
    │ admin::role                                          │
    ├──────────────────────────────────────────────────────┤
    │ admin::transfer                                      │
    ├──────────────────────────────────────────────────────┤
    │ admin::user                                          │
    ├──────────────────────────────────────────────────────┤
    │ admin::webhooks                                      │
    ├──────────────────────────────────────────────────────┤
    │ admin::content-api                                   │
    ├──────────────────────────────────────────────────────┤
    │ plugin::content-manager.collection-types             │
    ├──────────────────────────────────────────────────────┤
    │ plugin::content-manager.components                   │
    ├──────────────────────────────────────────────────────┤
    │ plugin::content-manager.content-types                │
    ├──────────────────────────────────────────────────────┤
    │ plugin::content-manager.init                         │
    ├──────────────────────────────────────────────────────┤
    │ plugin::content-manager.relations                    │
    ├──────────────────────────────────────────────────────┤
    │ plugin::content-manager.single-types                 │
    ├──────────────────────────────────────────────────────┤
    │ plugin::content-manager.uid                          │
    ├──────────────────────────────────────────────────────┤
    │ plugin::content-type-builder.builder                 │
    ├──────────────────────────────────────────────────────┤
    │ plugin::content-type-builder.component-categories    │
    ├──────────────────────────────────────────────────────┤
    │ plugin::content-type-builder.components              │
    ├──────────────────────────────────────────────────────┤
    │ plugin::content-type-builder.content-types           │
    ├──────────────────────────────────────────────────────┤
    │ plugin::email.email                                  │
    ├──────────────────────────────────────────────────────┤
    │ plugin::upload.admin-file                            │
    ├──────────────────────────────────────────────────────┤
    │ plugin::upload.admin-folder                          │
    ├──────────────────────────────────────────────────────┤
    │ plugin::upload.admin-folder-file                     │
    ├──────────────────────────────────────────────────────┤
    │ plugin::upload.admin-settings                        │
    ├──────────────────────────────────────────────────────┤
    │ plugin::upload.admin-upload                          │
    ├──────────────────────────────────────────────────────┤
    │ plugin::upload.content-api                           │
    ├──────────────────────────────────────────────────────┤
    │ plugin::upload.view-configuration                    │
    ├──────────────────────────────────────────────────────┤
    │ plugin::documentation.documentation                  │
    ├──────────────────────────────────────────────────────┤
    │ plugin::i18n.locales                                 │
    ├──────────────────────────────────────────────────────┤
    │ plugin::i18n.iso-locales                             │
    ├──────────────────────────────────────────────────────┤
    │ plugin::i18n.content-types                           │
    ├──────────────────────────────────────────────────────┤
    │ plugin::users-permissions.auth                       │
    ├──────────────────────────────────────────────────────┤
    │ plugin::users-permissions.user                       │
    ├──────────────────────────────────────────────────────┤
    │ plugin::users-permissions.role                       │
    ├──────────────────────────────────────────────────────┤
    │ plugin::users-permissions.permissions                │
    ├──────────────────────────────────────────────────────┤
    │ plugin::users-permissions.settings                   │
    ├──────────────────────────────────────────────────────┤
    │ plugin::users-permissions.contentmanageruser         │
    ├──────────────────────────────────────────────────────┤
    │ api::category.category                               │
    ├──────────────────────────────────────────────────────┤
    │ api::complex.complex                                 │
    ├──────────────────────────────────────────────────────┤
    │ api::config.config                                   │
    ├──────────────────────────────────────────────────────┤
    │ api::single-type-localized.single-type-localized     │
    ├──────────────────────────────────────────────────────┤
    │ api::single-type-non-local.single-type-non-local     │
    ├──────────────────────────────────────────────────────┤
    │ api::single-type-unpublished.single-type-unpublished │
    └──────────────────────────────────────────────────────┘
    `;

    utils.helpers.expectConsoleLinesToInclude(output, expected);
  });
});
