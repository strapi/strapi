'use strict';

const coffee = require('coffee');
// eslint-disable-next-line import/no-extraneous-dependencies
const { createStrapi } = require('@strapi/core');

const utils = require('../../../../utils');
const { loadTestAppEnv } = require('../../../../utils/helpers');

// eslint-disable-next-line
const { resetDatabaseAndImportDataFromPathProgrammatic } = require('../../../../utils/dts-import');

describe('admin:block-user', () => {
  let appPath;
  const testEmail = 'test.block@strapi.io';
  const testPassword = 'Testpassword1!';
  const testFirstname = 'BlockTest';
  const testLastname = 'Admin';

  beforeAll(async () => {
    const testApps = utils.instances.getTestApps();
    appPath = testApps.at(0);

    await resetDatabaseAndImportDataFromPathProgrammatic(appPath, 'without-admin');

    // Create a user to test block status changes
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

  it('should block a user and persist to database', async () => {
    await coffee
      .spawn(
        'npm',
        ['run', '-s', 'strapi', '--', 'admin:block-user', '--email', testEmail, '--block', 'true'],
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
      expect(user.blocked).toBe(true);
      expect(typeof user.blocked).toBe('boolean');
    } finally {
      await app.destroy();
    }
  });

  it('should unblock a user and persist to database', async () => {
    await coffee
      .spawn(
        'npm',
        ['run', '-s', 'strapi', '--', 'admin:block-user', '--email', testEmail, '--block', 'false'],
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
      expect(user.blocked).toBe(false);
      expect(typeof user.blocked).toBe('boolean');
    } finally {
      await app.destroy();
    }
  });

  it('should fail with invalid block value', async () => {
    await coffee
      .spawn(
        'npm',
        [
          'run',
          '-s',
          'strapi',
          '--',
          'admin:block-user',
          '--email',
          testEmail,
          '--block',
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
          'admin:block-user',
          '--email',
          'nobody@strapi.io',
          '--block',
          'true',
        ],
        { cwd: appPath }
      )
      .expect('code', 1)
      .end();
  });
});
