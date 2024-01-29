'use strict';

const coffee = require('coffee');

const utils = require('../../../utils');

describe('import', () => {
  let appPath;
  const outputFilename = 'output';

  beforeAll(async () => {
    const testApps = utils.instances.getTestApps();

    appPath = testApps.at(0);
    await coffee
      .spawn(
        'npm',
        [
          'run',
          '-s',
          'strapi',
          '--',
          'export',
          '--no-encrypt',
          '--no-compress',
          '-f',
          outputFilename,
        ],
        {
          cwd: appPath,
        }
      )
      .end();
  });

  // TODO: Fix this test (never finishes)
  it.skip('should import the data', async () => {
    await coffee
      .spawn('npm', ['run', '-s', 'strapi', '--', 'import', '-f', `${outputFilename}.tar`], {
        cwd: appPath,
        stdio: 'inherit',
      })
      .waitForPrompt()
      .write('Y\n')
      .expect('code', 0)
      .end();
  });

  it('should import the data without asking for confirmation', async () => {
    await coffee
      .spawn(
        'npm',
        ['run', '-s', 'strapi', '--', 'import', '-f', `${outputFilename}.tar`, '--force'],
        {
          cwd: appPath,
          stdio: 'inherit',
        }
      )
      .expect('code', 0)
      .end();
  });
});
