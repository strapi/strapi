'use strict';

const coffee = require('coffee');

const utils = require('../../../utils');

describe('content-types:list', () => {
  let appPath;

  beforeAll(async () => {
    const testApps = utils.instances.getTestApps();

    appPath = testApps.at(0);
  });

  it('should output list of content-types', async () => {
    const { stdout } = await coffee
      .spawn('npm', ['run', '-s', 'strapi', 'content-types:list'], { cwd: appPath })
      .expect('code', 0)
      .end();

    const output = stdout.trim();

    const expected = `
    ┌──────────────────────────────────────────────────────┐
    │ Name                                                 │
    ├──────────────────────────────────────────────────────┤
    │ admin::permission                                    │
    ├──────────────────────────────────────────────────────┤
    │ admin::user                                          │
    ├──────────────────────────────────────────────────────┤
    │ admin::role                                          │
    ├──────────────────────────────────────────────────────┤
    │ admin::api-token                                     │
    ├──────────────────────────────────────────────────────┤
    │ admin::api-token-permission                          │
    ├──────────────────────────────────────────────────────┤
    │ admin::transfer-token                                │
    ├──────────────────────────────────────────────────────┤
    │ admin::transfer-token-permission                     │
    ├──────────────────────────────────────────────────────┤
    │ plugin::upload.file                                  │
    ├──────────────────────────────────────────────────────┤
    │ plugin::upload.folder                                │
    ├──────────────────────────────────────────────────────┤
    │ plugin::content-releases.release                     │
    ├──────────────────────────────────────────────────────┤
    │ plugin::content-releases.release-action              │
    ├──────────────────────────────────────────────────────┤
    │ plugin::i18n.locale                                  │
    ├──────────────────────────────────────────────────────┤
    │ plugin::users-permissions.permission                 │
    ├──────────────────────────────────────────────────────┤
    │ plugin::users-permissions.role                       │
    ├──────────────────────────────────────────────────────┤
    │ plugin::users-permissions.user                       │
    ├──────────────────────────────────────────────────────┤
    │ api::category.category                               │
    ├──────────────────────────────────────────────────────┤
    │ api::complex.complex                                 │
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
