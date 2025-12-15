'use strict';

const coffee = require('coffee');
// eslint-disable-next-line import/no-extraneous-dependencies
const { createStrapi } = require('@strapi/core');

const utils = require('../../../../utils');
const { loadTestAppEnv } = require('../../../../utils/helpers');
// Jest handles TypeScript files at runtime via @swc/jest transform
// eslint-disable-next-line
const { resetDatabaseAndImportDataFromPathProgrammatic } = require('../../../../utils/dts-import');

describe('admin:create-user', () => {
  let appPath;
  const testEmail = 'test.admin@strapi.io';
  const testPassword = 'Testpassword1!';
  const testFirstname = 'Test';
  const testLastname = 'Admin';

  beforeAll(async () => {
    const testApps = utils.instances.getTestApps();
    appPath = testApps.at(0);

    // Reset the database using the programmatic function (no HTTP server required)
    // Use without-admin.tar to start with an empty database (no admin users)
    await resetDatabaseAndImportDataFromPathProgrammatic(appPath, 'without-admin.tar');
  });

  it('should create an admin user and persist it to the database', async () => {
    // Run the create admin user command
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
        {
          cwd: appPath,
        }
      )
      .expect('code', 0)
      .end();

    // Verify the user was created in the database
    // Load environment variables from the test app's .env file
    // This ensures all required env vars (APP_KEYS, ADMIN_JWT_SECRET, etc.) are set
    await loadTestAppEnv(appPath);

    const app = createStrapi({
      appDir: appPath,
      distDir: appPath,
    });

    await app.load();

    try {
      const user = await app.admin.services.user.findOneByEmail(testEmail, ['roles']);

      expect(user).toBeDefined();
      expect(user.email).toBe(testEmail);
      expect(user.firstname).toBe(testFirstname);
      expect(user.lastname).toBe(testLastname);
      expect(user.isActive).toBe(true);

      // Verify the user has the super admin role
      const superAdminRole = await app.admin.services.role.getSuperAdmin();
      expect(user.roles).toContainEqual(
        expect.objectContaining({
          id: superAdminRole.id,
        })
      );
    } finally {
      await app.destroy();
    }
  });
});
