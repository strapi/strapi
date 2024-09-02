'use strict';

const coffee = require('coffee');

const utils = require('../../../utils');

// TODO: Fix expected outputs
describe.skip('policies:list', () => {
  let appPath;

  beforeAll(async () => {
    const testApps = utils.instances.getTestApps();

    appPath = testApps.at(0);
  });

  it('should output list of policies', async () => {
    const { stdout } = await coffee
      .spawn('npm', ['run', '-s', 'strapi', 'policies:list'], { cwd: appPath })
      .expect('code', 0)
      .end();

    const output = stdout.trim();

    const expected = `
      ┌───────────────────────────────────────────────┐
      │ Name                                          │
      ├───────────────────────────────────────────────┤
      │ admin::isAuthenticatedAdmin                   │
      ├───────────────────────────────────────────────┤
      │ admin::hasPermissions                         │
      ├───────────────────────────────────────────────┤
      │ admin::isTelemetryEnabled                     │
      ├───────────────────────────────────────────────┤
      │ plugin::content-manager.has-draft-and-publish │
      ├───────────────────────────────────────────────┤
      │ plugin::content-manager.hasPermissions        │
      └───────────────────────────────────────────────┘
    `;

    utils.helpers.expectConsoleLinesToInclude(output, expected);
  });
});
