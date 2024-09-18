'use strict';

const coffee = require('coffee');

const utils = require('../../../utils');

// TODO: Fix expected outputs
describe.skip('services:list', () => {
  let appPath;

  beforeAll(async () => {
    const testApps = utils.instances.getTestApps();

    appPath = testApps.at(0);
  });

  it('should output list of policies', async () => {
    const { stdout } = await coffee
      .spawn('npm', ['run', '-s', 'strapi', 'services:list'], { cwd: appPath })
      .expect('code', 0)
      .end();

    const output = stdout.trim();

    const expected = `
    ┌──────────────────────────────────────────────────────┐
    │ Name                                                 │
    ├──────────────────────────────────────────────────────┤
    │ admin::auth                                          │
    ├──────────────────────────────────────────────────────┤
    │ admin::user                                          │
    ├──────────────────────────────────────────────────────┤
    │ admin::role                                          │
    ├──────────────────────────────────────────────────────┤
    │ admin::passport                                      │
    ├──────────────────────────────────────────────────────┤
    │ admin::token                                         │
    ├──────────────────────────────────────────────────────┤
    │ admin::permission                                    │
    ├──────────────────────────────────────────────────────┤
    │ admin::metrics                                       │
    ├──────────────────────────────────────────────────────┤
    │ admin::content-type                                  │
    ├──────────────────────────────────────────────────────┤
    │ admin::constants                                     │
    ├──────────────────────────────────────────────────────┤
    │ admin::condition                                     │
    ├──────────────────────────────────────────────────────┤
    │ admin::action                                        │
    ├──────────────────────────────────────────────────────┤
    │ admin::api-token                                     │
    ├──────────────────────────────────────────────────────┤
    │ admin::transfer                                      │
    ├──────────────────────────────────────────────────────┤
    │ admin::project-settings                              │
    ├──────────────────────────────────────────────────────┤
    │ plugin::content-manager.components                   │
    ├──────────────────────────────────────────────────────┤
    │ plugin::content-manager.content-types                │
    ├──────────────────────────────────────────────────────┤
    │ plugin::content-manager.data-mapper                  │
    ├──────────────────────────────────────────────────────┤
    │ plugin::content-manager.entity-manager               │
    ├──────────────────────────────────────────────────────┤
    │ plugin::content-manager.field-sizes                  │
    ├──────────────────────────────────────────────────────┤
    │ plugin::content-manager.metrics                      │
    ├──────────────────────────────────────────────────────┤
    │ plugin::content-manager.permission-checker           │
    ├──────────────────────────────────────────────────────┤
    │ plugin::content-manager.permission                   │
    ├──────────────────────────────────────────────────────┤
    │ plugin::content-manager.populate-builder             │
    ├──────────────────────────────────────────────────────┤
    │ plugin::content-manager.uid                          │
    ├──────────────────────────────────────────────────────┤
    │ plugin::content-type-builder.content-types           │
    ├──────────────────────────────────────────────────────┤
    │ plugin::content-type-builder.components              │
    ├──────────────────────────────────────────────────────┤
    │ plugin::content-type-builder.component-categories    │
    ├──────────────────────────────────────────────────────┤
    │ plugin::content-type-builder.builder                 │
    ├──────────────────────────────────────────────────────┤
    │ plugin::content-type-builder.api-handler             │
    ├──────────────────────────────────────────────────────┤
    │ plugin::email.email                                  │
    ├──────────────────────────────────────────────────────┤
    │ plugin::upload.provider                              │
    ├──────────────────────────────────────────────────────┤
    │ plugin::upload.upload                                │
    ├──────────────────────────────────────────────────────┤
    │ plugin::upload.folder                                │
    ├──────────────────────────────────────────────────────┤
    │ plugin::upload.file                                  │
    ├──────────────────────────────────────────────────────┤
    │ plugin::upload.weeklyMetrics                         │
    ├──────────────────────────────────────────────────────┤
    │ plugin::upload.metrics                               │
    ├──────────────────────────────────────────────────────┤
    │ plugin::upload.image-manipulation                    │
    ├──────────────────────────────────────────────────────┤
    │ plugin::upload.api-upload-folder                     │
    ├──────────────────────────────────────────────────────┤
    │ plugin::upload.extensions                            │
    ├──────────────────────────────────────────────────────┤
    │ plugin::documentation.documentation                  │
    ├──────────────────────────────────────────────────────┤
    │ plugin::documentation.override                       │
    ├──────────────────────────────────────────────────────┤
    │ plugin::graphql.builders                             │
    ├──────────────────────────────────────────────────────┤
    │ plugin::graphql.content-api                          │
    ├──────────────────────────────────────────────────────┤
    │ plugin::graphql.constants                            │
    ├──────────────────────────────────────────────────────┤
    │ plugin::graphql.extension                            │
    ├──────────────────────────────────────────────────────┤
    │ plugin::graphql.format                               │
    ├──────────────────────────────────────────────────────┤
    │ plugin::graphql.internals                            │
    ├──────────────────────────────────────────────────────┤
    │ plugin::graphql.type-registry                        │
    ├──────────────────────────────────────────────────────┤
    │ plugin::graphql.utils                                │
    ├──────────────────────────────────────────────────────┤
    │ plugin::i18n.permissions                             │
    ├──────────────────────────────────────────────────────┤
    │ plugin::i18n.metrics                                 │
    ├──────────────────────────────────────────────────────┤
    │ plugin::i18n.localizations                           │
    ├──────────────────────────────────────────────────────┤
    │ plugin::i18n.locales                                 │
    ├──────────────────────────────────────────────────────┤
    │ plugin::i18n.iso-locales                             │
    ├──────────────────────────────────────────────────────┤
    │ plugin::i18n.core-api                                │
    ├──────────────────────────────────────────────────────┤
    │ plugin::i18n.content-types                           │
    ├──────────────────────────────────────────────────────┤
    │ plugin::users-permissions.jwt                        │
    ├──────────────────────────────────────────────────────┤
    │ plugin::users-permissions.providers                  │
    ├──────────────────────────────────────────────────────┤
    │ plugin::users-permissions.providers-registry         │
    ├──────────────────────────────────────────────────────┤
    │ plugin::users-permissions.role                       │
    ├──────────────────────────────────────────────────────┤
    │ plugin::users-permissions.user                       │
    ├──────────────────────────────────────────────────────┤
    │ plugin::users-permissions.users-permissions          │
    ├──────────────────────────────────────────────────────┤
    │ plugin::users-permissions.permission                 │
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
