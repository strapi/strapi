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

  it('should prompt for confirmation before importing data', async () => {
    await coffee
      .spawn(
        'npm',
        ['run', '-s', 'strapi', '--', 'import', '-f', `${outputFilename}.tar`, '--force'], // TODO Remove --force
        {
          cwd: appPath,
          stdio: 'inherit',
        }
      )
      .waitForPrompt()
      .write('Y\n')
      .expect('code', 0)
      .end();
  });

  it('should import data without asking for confirmation with --force', async () => {
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
