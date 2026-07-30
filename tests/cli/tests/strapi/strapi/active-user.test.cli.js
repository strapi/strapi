'use strict';

const coffee = require('coffee');
// eslint-disable-next-line import/no-extraneous-dependencies
const { createStrapi } = require('@strapi/core');

const utils = require('../../../../utils');
const { loadTestAppEnv } = require('../../../../utils/helpers');

// eslint-disable-next-line
const { resetDatabaseAndImportDataFromPathProgrammatic } = require('../../../../utils/dts-import');

describe('admin:active-user', () => {
  let appPath;
  const testEmail = 'test.active@strapi.io';
  /** Second super admin so deactivating `testEmail` is allowed (cannot deactivate the only super admin). */
  const secondAdminEmail = 'test.active.other@strapi.io';
  const testPassword = 'Testpassword1!';
  const testFirstname = 'ActiveTest';
  const testLastname = 'Admin';

  beforeAll(async () => {
    const testApps = utils.instances.getTestApps();
    appPath = testApps.at(0);

    await resetDatabaseAndImportDataFromPathProgrammatic(appPath, 'without-admin');

    const createAdmin = (email) =>
      coffee
        .spawn(
          'npm',
          [
            'run',
            '-s',
            'strapi',
            '--',
            'admin:create-user',
            '--email',
            email,
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

    // Two super admins: otherwise deactivating the only one is rejected by the admin user service
    await createAdmin(testEmail);
    await createAdmin(secondAdminEmail);
  });

  it('should deactivate a user and persist to database', async () => {
    await coffee
      .spawn(
        'npm',
        [
          'run',
          '-s',
          'strapi',
          '--',
          'admin:active-user',
          '--email',
          testEmail,
          '--active',
          'false',
        ],
        { cwd: appPath }
      )
      .expect('code', 0)
      .end();

    await loadTestAppEnv(appPath);
    const app = createStrapi({ appDir: appPath, distDir: appPath });
    await app.load();

    try {
      const user = await app.admin.services.user.findOneByEmail(testEmail);

      expect(user).toBeDefined();
      expect(user.email).toBe(testEmail);
      expect(user.firstname).toBe(testFirstname);
      expect(user.lastname).toBe(testLastname);
      expect(user.isActive).toBe(false);
      expect(typeof user.isActive).toBe('boolean');
    } finally {
      await app.destroy();
    }
  });

  it('should reactivate a user and persist to database', async () => {
    await coffee
      .spawn(
        'npm',
        [
          'run',
          '-s',
          'strapi',
          '--',
          'admin:active-user',
          '--email',
          testEmail,
          '--active',
          'true',
        ],
        { cwd: appPath }
      )
      .expect('code', 0)
      .end();

    await loadTestAppEnv(appPath);
    const app = createStrapi({ appDir: appPath, distDir: appPath });
    await app.load();

    try {
      const user = await app.admin.services.user.findOneByEmail(testEmail);

      expect(user).toBeDefined();
      expect(user.email).toBe(testEmail);
      expect(user.firstname).toBe(testFirstname);
      expect(user.lastname).toBe(testLastname);
      expect(user.isActive).toBe(true);
      expect(typeof user.isActive).toBe('boolean');
    } finally {
      await app.destroy();
    }
  });

  it('should fail with invalid active value', async () => {
    await coffee
      .spawn(
        'npm',
        [
          'run',
          '-s',
          'strapi',
          '--',
          'admin:active-user',
          '--email',
          testEmail,
          '--active',
          'invalid',
        ],
        { cwd: appPath }
      )
      .expect('code', 1)
      .end();
  });

  it('should fail with non-existent email', async () => {
    await coffee
      .spawn(
        'npm',
        [
          'run',
          '-s',
          'strapi',
          '--',
          'admin:active-user',
          '--email',
          'nobody@strapi.io',
          '--active',
          'true',
        ],
        { cwd: appPath }
      )
      .expect('code', 1)
      .end();
  });
});
