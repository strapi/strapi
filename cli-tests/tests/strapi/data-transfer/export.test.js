'use strict';

const coffee = require('coffee');

const utils = require('../../../utils');

describe('export', () => {
  let appPath;
  let currentVersion;
  const outputFilename = 'output';

  beforeAll(async () => {
    const testApps = utils.instances.getTestApps();

    appPath = testApps.at(0);
    currentVersion = require(`${appPath}/package.json`).dependencies['@strapi/strapi'];
  });

  it('should export the data', async () => {
    await coffee
      .spawn(
        'npm',
        [
          'run',
          '-s',
          'strapi',
          '--',
          'export',
          '-f',
          outputFilename,
          '--no-encrypt',
          '--no-compress',
        ],
        {
          cwd: appPath,
        }
      )
      .expect('code', 0)
      .end();
  });
});
