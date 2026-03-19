'use strict';

const coffee = require('coffee');
// eslint-disable-next-line import/no-extraneous-dependencies
const { createStrapi } = require('@strapi/core');

const utils = require('../../../../utils');
const { loadTestAppEnv } = require('../../../../utils/helpers');

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

    await resetDatabaseAndImportDataFromPathProgrammatic(appPath, 'without-admin.tar');

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

  it('should list admin users matching the database state', async () => {
    const { stdout } = await coffee
      .spawn('npm', ['run', '-s', 'strapi', '--', 'admin:list-users'], {
        cwd: appPath,
      })
      .expect('code', 0)
      .end();

    const output = stdout.trim();

    // Verify the CLI output contains the user's details
    expect(output).toContain(testEmail);
    expect(output).toContain(testFirstname);
    expect(output).toContain(testLastname);

    // Cross-check against the actual database to ensure CLI output is accurate
    await loadTestAppEnv(appPath);
    const app = createStrapi({ appDir: appPath, distDir: appPath });
    await app.load();

    try {
      const user = await app.admin.services.user.findOneByEmail(testEmail, ['roles']);

      expect(user).toBeDefined();
      expect(user.email).toBe(testEmail);
      expect(user.firstname).toBe(testFirstname);
      expect(user.lastname).toBe(testLastname);
      expect(user.isActive).toBe(true);

      // Verify the output includes the role name
      const superAdminRole = await app.admin.services.role.getSuperAdmin();
      expect(user.roles).toContainEqual(expect.objectContaining({ id: superAdminRole.id }));
      expect(output).toContain(superAdminRole.name);
    } finally {
      await app.destroy();
    }
  });
});
