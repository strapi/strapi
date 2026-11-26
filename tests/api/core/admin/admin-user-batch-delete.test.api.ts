import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';
import { createUtils } from 'api-tests/utils';
import type { Core } from '@strapi/types';

/**
 * Bulk delete of admin users (`POST /admin/users/batch-delete`) when some IDs do not exist.
 * Runs in CE and EE: each edition has its own `deleteByIds`.
 */
describe('Admin users batch delete with missing IDs (api)', () => {
  let strapi: Core.Strapi;
  let rq: Awaited<ReturnType<typeof createAuthRequest>>;
  let utils: ReturnType<typeof createUtils>;
  let roleId: number;

  const emailDomain = '@batch-delete-missing.test';

  const createTestUser = async (name: string) =>
    utils.createUser({
      email: `${name}${emailDomain}`,
      firstname: name,
      lastname: 'Doe',
      password: 'Password123',
      isActive: true,
      roles: [roleId],
    });

  const findTestUser = (id: number) => strapi.db.query('admin::user').findOne({ where: { id } });

  // An ID above every existing one, so no admin user has it
  const getMissingId = async () => {
    const [last] = await strapi.db
      .query('admin::user')
      .findMany({ orderBy: { id: 'desc' }, limit: 1 });
    return last.id + 1000;
  };

  beforeAll(async () => {
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
    utils = createUtils(strapi);

    const role = await utils.createRole({
      name: 'batch_delete_missing_role',
      description: 'Only used by the batch delete with missing IDs test (api)',
    });
    roleId = role.id;
  });

  afterAll(async () => {
    await strapi.db.query('admin::user').deleteMany({
      where: { email: { $endsWith: emailDomain } },
    });
    await utils.deleteRolesById([roleId]);
    await strapi.destroy();
  });

  test('deletes the existing users and skips a missing ID', async () => {
    const first = await createTestUser('first');
    const second = await createTestUser('second');
    const missingId = await getMissingId();

    const res = await rq({
      url: '/admin/users/batch-delete',
      method: 'POST',
      body: { ids: [first.id, missingId, second.id] },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toMatchObject([
      { id: first.id, email: first.email },
      { id: second.id, email: second.email },
    ]);
    expect(await findTestUser(first.id)).toBeNull();
    expect(await findTestUser(second.id)).toBeNull();
  });

  test('deletes nothing and returns an empty list when every ID is missing', async () => {
    const kept = await createTestUser('kept');
    const missingId = await getMissingId();

    const res = await rq({
      url: '/admin/users/batch-delete',
      method: 'POST',
      body: { ids: [missingId] },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(await findTestUser(kept.id)).toMatchObject({ id: kept.id });
  });
});
