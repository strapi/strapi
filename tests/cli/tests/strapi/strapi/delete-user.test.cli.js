'use strict';

const coffee = require('coffee');
// eslint-disable-next-line import/no-extraneous-dependencies
const { createStrapi } = require('@strapi/core');

const utils = require('../../../../utils');
const { loadTestAppEnv } = require('../../../../utils/helpers');

// eslint-disable-next-line
const { resetDatabaseAndImportDataFromPathProgrammatic } = require('../../../../utils/dts-import');

describe('admin:delete-user', () => {
  let appPath;
  const testEmail = 'test.delete@strapi.io';
  const testPassword = 'Testpassword1!';
  const testFirstname = 'DeleteTest';
  const testLastname = 'Admin';

  beforeAll(async () => {
    const testApps = utils.instances.getTestApps();
    appPath = testApps.at(0);

    await resetDatabaseAndImportDataFromPathProgrammatic(appPath, 'without-admin');

    // Create a second admin so that deleting the target user doesn't remove the last super admin
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
          'keeper@strapi.io',
          '--password',
          testPassword,
          '--firstname',
          'Keeper',
          '--lastname',
          'Admin',
        ],
        { cwd: appPath }
      )
      .expect('code', 0)
      .end();

    // Create the user we intend to delete
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

  it('should delete an admin user and remove from database', async () => {
    // Delete the user via CLI
    await coffee
      .spawn('npm', ['run', '-s', 'strapi', '--', 'admin:delete-user', '--email', testEmail], {
        cwd: appPath,
      })
      .expect('code', 0)
      .end();

    // Verify user was deleted from the database
    await loadTestAppEnv(appPath);
    const app = createStrapi({ appDir: appPath, distDir: appPath });
    await app.load();

    try {
      const user = await app.admin.services.user.findOneByEmail(testEmail);
      expect(user).toBeNull();
    } finally {
      await app.destroy();
    }
  });

  it('should fail when trying to delete a non-existent user', async () => {
    await coffee
      .spawn(
        'npm',
        ['run', '-s', 'strapi', '--', 'admin:delete-user', '--email', 'nobody@strapi.io'],
        { cwd: appPath }
      )
      .expect('code', 1)
      .end();
  });

  it('should fail when trying to delete the last super admin', async () => {
    // After the first test, only keeper@strapi.io remains as the sole super admin
    await coffee
      .spawn(
        'npm',
        ['run', '-s', 'strapi', '--', 'admin:delete-user', '--email', 'keeper@strapi.io'],
        { cwd: appPath }
      )
      .expect('code', 1)
      .end();

    // Verify the user was NOT deleted
    await loadTestAppEnv(appPath);
    const app = createStrapi({ appDir: appPath, distDir: appPath });
    await app.load();

    try {
      const user = await app.admin.services.user.findOneByEmail('keeper@strapi.io');
      expect(user).toBeDefined();
      expect(user.email).toBe('keeper@strapi.io');
    } finally {
      await app.destroy();
    }
  });
});
