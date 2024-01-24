'use strict';

const coffee = require('coffee');

const utils = require('../../../utils');

describe('import', () => {
  let appPath;
  let currentVersion;
  const outputFilename = 'output';

  beforeAll(async () => {
    const testApps = utils.instances.getTestApps();

    appPath = testApps.at(0);
    currentVersion = require(`${appPath}/package.json`).dependencies['@strapi/strapi'];
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

  it('should import the data', async () => {
    await coffee
      .spawn('npm', ['run', '-s', 'strapi', '--', 'import', '-f', `${outputFilename}.tar`], {
        cwd: appPath,
        stdio: 'inherit',
      })
      .waitForPrompt()
      .write('Y\n')
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
