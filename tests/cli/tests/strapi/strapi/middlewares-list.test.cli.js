'use strict';

const coffee = require('coffee');

const utils = require('../../../utils');

describe('middlewares:list', () => {
  let appPath;

  beforeAll(async () => {
    const testApps = utils.instances.getTestApps();

    appPath = testApps.at(0);
  });

  it('should output list of policies', async () => {
    const { stdout } = await coffee
      .spawn('npm', ['run', '-s', 'strapi', 'middlewares:list'], { cwd: appPath })
      .expect('code', 0)
      .end();

    const output = stdout.trim();

    const expected = `
    ┌─────────────────────────────────────┐
    │ Name                                │
    ├─────────────────────────────────────┤
    │ admin::rateLimit                    │
    ├─────────────────────────────────────┤
    │ admin::data-transfer                │
    ├─────────────────────────────────────┤
    │ strapi::compression                 │
    ├─────────────────────────────────────┤
    │ strapi::cors                        │
    ├─────────────────────────────────────┤
    │ strapi::errors                      │
    ├─────────────────────────────────────┤
    │ strapi::favicon                     │
    ├─────────────────────────────────────┤
    │ strapi::ip                          │
    ├─────────────────────────────────────┤
    │ strapi::logger                      │
    ├─────────────────────────────────────┤
    │ strapi::poweredBy                   │
    ├─────────────────────────────────────┤
    │ strapi::body                        │
    ├─────────────────────────────────────┤
    │ strapi::query                       │
    ├─────────────────────────────────────┤
    │ strapi::responseTime                │
    ├─────────────────────────────────────┤
    │ strapi::responses                   │
    ├─────────────────────────────────────┤
    │ strapi::security                    │
    ├─────────────────────────────────────┤
    │ strapi::session                     │
    ├─────────────────────────────────────┤
    │ strapi::public                      │
    ├─────────────────────────────────────┤
    │ plugin::users-permissions.rateLimit │
    └─────────────────────────────────────┘
    `;

    utils.helpers.expectConsoleLinesToInclude(output, expected);
  });
});
