/**
 * Pins the runtime shape of the `admin::user` service results that `strapi.db.query` infers as
 * `any`, against `AdminUser` (`packages/core/admin/shared/contracts/shared.ts`). The contract of
 * `admin::user` in `packages/core/admin/server/src/types/index.ts` relies on what these tests
 * record. CE and EE implement `updateById`, `deleteById` and `deleteByIds` separately: the suite
 * runs in both editions.
 */
import { createStrapiInstance } from 'api-tests/strapi';
import { createUtils } from 'api-tests/utils';
import type { Core } from '@strapi/types';

const edition = process.env.STRAPI_DISABLE_EE === 'true' ? 'CE' : 'EE';

const MISSING_ID = 999999;

/** An `admin::user` row: every `AdminUser` key but `roles`, plus the document keys */
const userRow = () => ({
  id: expect.any(Number),
  documentId: expect.any(String),
  firstname: expect.any(String),
  lastname: expect.any(String),
  username: null,
  email: expect.any(String),
  password: expect.any(String),
  resetPasswordToken: null,
  resetPasswordTokenExpiresAt: null,
  registrationToken: null,
  isActive: true,
  blocked: false,
  preferedLanguage: null,
  locale: null,
  createdAt: expect.any(String),
  updatedAt: expect.any(String),
  publishedAt: expect.any(String),
});

/** An `admin::role` row, as `populate: ['roles']` adds it: `AdminRole` without its relations */
const roleRow = (code: string) => ({
  id: expect.any(Number),
  documentId: expect.any(String),
  name: expect.any(String),
  code,
  description: expect.any(String),
  locale: null,
  createdAt: expect.any(String),
  updatedAt: expect.any(String),
  publishedAt: expect.any(String),
});

/** `AdminUser`: the row with its roles */
const adminUser = (roleCode: string) => ({ ...userRow(), roles: [roleRow(roleCode)] });

describe(`Admin user service results (api, ${edition})`, () => {
  let strapi: Core.Strapi;
  let utils: ReturnType<typeof createUtils>;
  let editorRoleId: number;
  let editorCode: string;
  let sequence = 0;

  const service = () => strapi.service('admin::user');

  /** A user with only the editor role, so that deleting it never removes the last super admin */
  const createEditor = async () => {
    sequence += 1;
    return utils.createUser({
      email: `admin-user-results-${sequence}@test.com`,
      firstname: 'Results',
      lastname: `User ${sequence}`,
      password: 'Password123',
      roles: [editorRoleId],
    });
  };

  beforeAll(async () => {
    strapi = await createStrapiInstance();
    utils = createUtils(strapi);

    const superAdminRole = await utils.getSuperAdminRole();
    // A super admin of its own, so that the editors are never the last super admin
    await utils.createUser({
      email: 'admin-user-results-keeper@test.com',
      firstname: 'Results',
      lastname: 'Keeper',
      password: 'Password123',
      roles: [superAdminRole.id],
    });
    const editorRole = await strapi.db
      .query('admin::role')
      .findOne({ where: { code: 'strapi-editor' } });
    editorRoleId = editorRole.id;
    editorCode = editorRole.code;
  });

  afterAll(async () => {
    await strapi.db.query('admin::user').deleteMany({
      where: { email: { $startsWith: 'admin-user-results-' } },
    });
    await strapi.destroy();
  });

  // `getCurrentActiveUserCount` only exists in the EE service
  test(`runs the ${edition} service`, () => {
    expect(typeof service().getCurrentActiveUserCount).toBe(
      edition === 'EE' ? 'function' : 'undefined'
    );
  });

  describe('findOne', () => {
    test('with the default populate resolves an AdminUser with its roles', async () => {
      const user = await createEditor();

      expect(await service().findOne(user.id)).toStrictEqual(adminUser(editorCode));
    });

    test('with populate [] resolves the row without roles', async () => {
      const user = await createEditor();

      expect(await service().findOne(user.id, [])).toStrictEqual(userRow());
    });

    test('resolves null for a missing user', async () => {
      expect(await service().findOne(MISSING_ID)).toBeNull();
    });
  });

  describe('findOneByEmail', () => {
    test('without populate resolves the row without roles', async () => {
      const user = await createEditor();

      expect(await service().findOneByEmail(user.email)).toStrictEqual(userRow());
    });

    test('resolves null for a missing email', async () => {
      expect(await service().findOneByEmail('admin-user-results-missing@test.com')).toBeNull();
    });
  });

  describe('updateById', () => {
    test('resolves the updated AdminUser with its roles', async () => {
      const user = await createEditor();

      expect(await service().updateById(user.id, { firstname: 'Updated' })).toStrictEqual({
        ...adminUser(editorCode),
        id: user.id,
        firstname: 'Updated',
      });
    });

    test('with a new password resolves the updated AdminUser with its roles', async () => {
      const user = await createEditor();

      expect(await service().updateById(user.id, { password: 'NewPassword123' })).toStrictEqual({
        ...adminUser(editorCode),
        id: user.id,
      });
    });

    test('resolves null for a missing user', async () => {
      expect(await service().updateById(MISSING_ID, { firstname: 'Missing' })).toBeNull();
    });
  });

  describe('deleteById', () => {
    test('resolves the deleted AdminUser with its roles', async () => {
      const user = await createEditor();

      expect(await service().deleteById(user.id)).toStrictEqual({
        ...adminUser(editorCode),
        id: user.id,
      });
    });

    test('resolves null for a missing user', async () => {
      expect(await service().deleteById(MISSING_ID)).toBeNull();
    });
  });

  describe('deleteByIds', () => {
    test('resolves the deleted AdminUsers with their roles, in the order of the IDs', async () => {
      const first = await createEditor();
      const second = await createEditor();

      expect(await service().deleteByIds([second.id, first.id])).toStrictEqual([
        { ...adminUser(editorCode), id: second.id },
        { ...adminUser(editorCode), id: first.id },
      ]);
    });

    // The deleted list never holds null: an ID that matches no user is skipped
    test('skips a missing user', async () => {
      const user = await createEditor();

      expect(await service().deleteByIds([MISSING_ID, user.id])).toStrictEqual([
        { ...adminUser(editorCode), id: user.id },
      ]);
    });
  });
});
