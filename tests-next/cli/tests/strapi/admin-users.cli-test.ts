import { resetDatabase, type App, type Database } from '@strapi/tests-shared';
import { beforeAll, describe, expect, it } from 'vitest';

import { createApp, parseTable, runStrapi } from '../helpers';

let app: App;
let database: Database;

const password = 'Testpassword1!';

const strapi = (...args: string[]) => runStrapi(app, args, { database });

/** Every admin user created through the CLI is a super admin. */
const createAdminUser = async (email: string, firstname = 'Test', lastname = 'Admin') => {
  const result = await strapi(
    'admin:create-user',
    '--email',
    email,
    '--password',
    password,
    '--firstname',
    firstname,
    '--lastname',
    lastname
  );
  expect(result.code, result.output).toBe(0);
  return result;
};

/** The admin users, read back through `admin:list-users`. */
const listAdminUsers = async () => {
  const result = await strapi('admin:list-users');
  expect(result.code, result.output).toBe(0);
  return parseTable(result.stdout);
};

const findAdminUser = async (email: string) =>
  (await listAdminUsers()).find((user) => user.Email === email);

describe('admin user commands', () => {
  beforeAll(async () => {
    ({ app, database } = await createApp());
  });

  describe('admin:create-user', () => {
    it('creates an active super admin', async () => {
      const result = await createAdminUser('create@strapi.io', 'Create', 'Test');

      expect(result.stdout).toContain('Successfully created new admin');
      expect(await findAdminUser('create@strapi.io')).toMatchObject({
        'First Name': 'Create',
        'Last Name': 'Test',
        Active: 'true',
        Blocked: 'false',
        Roles: 'Super Admin',
      });
    });
  });

  describe('admin:list-users', () => {
    it('lists the admin users', async () => {
      await createAdminUser('list@strapi.io', 'List', 'Test');

      expect(await findAdminUser('list@strapi.io')).toEqual({
        ID: expect.stringMatching(/^\d+$/),
        Email: 'list@strapi.io',
        'First Name': 'List',
        'Last Name': 'Test',
        Active: 'true',
        Blocked: 'false',
        Roles: 'Super Admin',
      });
    });
  });

  describe('admin:active-user', () => {
    const setActive = (email: string, active: string) =>
      strapi('admin:active-user', '--email', email, '--active', active);

    beforeAll(async () => {
      // Two super admins: the CLI refuses to deactivate the only one.
      await createAdminUser('active@strapi.io');
      await createAdminUser('active.other@strapi.io');
    });

    it('deactivates a user', async () => {
      const result = await setActive('active@strapi.io', 'false');

      expect(result.code, result.output).toBe(0);
      expect(await findAdminUser('active@strapi.io')).toMatchObject({ Active: 'false' });
    });

    it('reactivates a user', async () => {
      expect((await setActive('active@strapi.io', 'false')).code).toBe(0);
      const result = await setActive('active@strapi.io', 'true');

      expect(result.code, result.output).toBe(0);
      expect(await findAdminUser('active@strapi.io')).toMatchObject({ Active: 'true' });
    });

    it('fails with an invalid value', async () => {
      expect((await setActive('active@strapi.io', 'invalid')).code).toBe(1);
    });

    it('fails with an unknown email', async () => {
      expect((await setActive('nobody@strapi.io', 'true')).code).toBe(1);
    });
  });

  describe('admin:block-user', () => {
    const setBlocked = (email: string, block: string) =>
      strapi('admin:block-user', '--email', email, '--block', block);

    beforeAll(async () => {
      await createAdminUser('block@strapi.io');
    });

    it('blocks a user', async () => {
      const result = await setBlocked('block@strapi.io', 'true');

      expect(result.code, result.output).toBe(0);
      expect(await findAdminUser('block@strapi.io')).toMatchObject({ Blocked: 'true' });
    });

    it('unblocks a user', async () => {
      expect((await setBlocked('block@strapi.io', 'true')).code).toBe(0);
      const result = await setBlocked('block@strapi.io', 'false');

      expect(result.code, result.output).toBe(0);
      expect(await findAdminUser('block@strapi.io')).toMatchObject({ Blocked: 'false' });
    });

    it('fails with an invalid value', async () => {
      expect((await setBlocked('block@strapi.io', 'invalid')).code).toBe(1);
    });

    it('fails with an unknown email', async () => {
      expect((await setBlocked('nobody@strapi.io', 'true')).code).toBe(1);
    });
  });

  describe('admin:delete-user', () => {
    const deleteUser = (email: string) => strapi('admin:delete-user', '--email', email);

    it('deletes a user', async () => {
      // A second super admin, so the deleted user isn't the last one.
      await createAdminUser('delete.keeper@strapi.io');
      await createAdminUser('delete@strapi.io');

      const result = await deleteUser('delete@strapi.io');

      expect(result.code, result.output).toBe(0);
      expect(await findAdminUser('delete@strapi.io')).toBeUndefined();
    });

    it('fails with an unknown email', async () => {
      expect((await deleteUser('nobody@strapi.io')).code).toBe(1);
    });

    it('refuses to delete the last super admin', async () => {
      // The other tests of the file created more super admins.
      await resetDatabase(app, database);
      await createAdminUser('last@strapi.io');

      expect((await deleteUser('last@strapi.io')).code).toBe(1);
      expect(await listAdminUsers()).toEqual([
        expect.objectContaining({ Email: 'last@strapi.io' }),
      ]);
    });
  });
});
