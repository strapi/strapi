'use strict';

const coffee = require('coffee');

const utils = require('../../../utils');

describe('export', () => {
  let appPath;
  const outputFilename = 'output';

  beforeAll(async () => {
    const testApps = utils.instances.getTestApps();

    appPath = testApps.at(0);
  });

  it('should export data without error', async () => {
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
