'use strict';

const coffee = require('coffee');

const utils = require('../../../utils');

describeOnCondition(edition === 'CE')('hooks:list', () => {
  let appPath;

  beforeAll(async () => {
    const testApps = utils.instances.getTestApps();

    appPath = testApps.at(0);
  });

  it('should output list of hooks', async () => {
    const { stdout } = await coffee
      .spawn('npm', ['run', '-s', 'strapi', 'hooks:list'], { cwd: appPath })
      .expect('code', 0)
      .end();

    const output = stdout.trim();

    const expected = `
    ┌──────────────────────────────────┐
    │ Name                             │
    ├──────────────────────────────────┤
    │ strapi::content-types.beforeSync │
    ├──────────────────────────────────┤
    │ strapi::content-types.afterSync  │
    └──────────────────────────────────┘
    `;

    utils.helpers.expectConsoleLinesToEqual(output, expected);
  });
});
