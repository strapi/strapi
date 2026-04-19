'use strict';

const coffee = require('coffee');

const utils = require('../../../../utils');

// eslint-disable-next-line
const { resetDatabaseAndImportDataFromPathProgrammatic } = require('../../../../utils/dts-import');

describe('admin:list-users', () => {
  let appPath;
  const testEmail = 'test.list@strapi.io';
  const testPassword = 'Testpassword1!';
  const testFirstname = 'ListTest';
  const testLastname = 'Admin';

  beforeAll(async () => {
    const testApps = utils.instances.getTestApps();
    appPath = testApps.at(0);

    await resetDatabaseAndImportDataFromPathProgrammatic(appPath, 'without-admin');

    // Create a user so there is at least one to list
    await coffee
      .spawn(
        'npm',
        [
          'run',
          '-s',
          'strapi',
          '--',
          'admin:create-user',
          '--email',
          testEmail,
          '--password',
          testPassword,
          '--firstname',
          testFirstname,
          '--lastname',
          testLastname,
        ],
        { cwd: appPath }
      )
      .expect('code', 0)
      .end();
  });

  it('should output list of admin users', async () => {
    const { stdout } = await coffee
      .spawn('npm', ['run', '-s', 'strapi', '--', 'admin:list-users'], {
        cwd: appPath,
      })
      .expect('code', 0)
      .end();

    expect(
      utils.helpers.maskVolatileAdminListUsersTableIds(
        utils.helpers.normalizeCliOutputForSnapshot(stdout),
        testEmail
      )
    ).toMatchSnapshot();
  });
});
