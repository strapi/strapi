'use strict';

const coffee = require('coffee');

const utils = require('../../../utils');

describe('--version', () => {
  let appPath;
  let currentVersion;

  beforeAll(async () => {
    const testApps = utils.instances.getTestApps();

    appPath = testApps.at(0);
    currentVersion = require(`${appPath}/package.json`).dependencies['@strapi/strapi'];
  });

  it('should output version', async () => {
    await coffee
      .spawn('npm', ['run', '-s', 'strapi', '--', 'version'], { cwd: appPath })
      .expect('stderr', '')
      .expect('stdout', `${currentVersion}\n`)
      .expect('code', 0)
      .end();
  });

  it('should output version with --version', async () => {
    await coffee
      .spawn('npm', ['run', '-s', 'strapi', '--', '--version'], { cwd: appPath })
      .expect('stdout', `${currentVersion}\n`)
      .expect('code', 0)
      .end();
  });
});
