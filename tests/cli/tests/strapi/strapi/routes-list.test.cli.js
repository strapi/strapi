'use strict';

const coffee = require('coffee');

const utils = require('../../../../utils');

describe('routes:list', () => {
  let appPath;

  beforeAll(async () => {
    const testApps = utils.instances.getTestApps();

    appPath = testApps.at(0);
  });

  it('should output list of routes', async () => {
    const { stdout } = await coffee
      .spawn('npm', ['run', '-s', 'strapi', 'routes:list'], { cwd: appPath })
      .expect('code', 0)
      .end();

    expect(utils.helpers.normalizeCliOutputForSnapshot(stdout)).toMatchSnapshot();
  });
});
