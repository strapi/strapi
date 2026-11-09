import { createAuthRequest } from 'api-tests/request';
import { createUtils } from 'api-tests/utils';

import { createEndUsersInstance } from '../utils/create-end-users-instance';

const PASSWORD = 'Password123';
const MIGRATION = '/end-users/migration';
const ITEM = 'api-token:all';

const report = () => ({
  version: 1,
  source: 'migration',
  generatedAt: '2026-11-01T00:00:00.000Z',
  counts: { users: 3, localUsers: 3, providerUsers: {}, roles: 2, permissions: 10 },
  estimate: null,
  items: [
    {
      id: ITEM,
      kind: 'api-token',
      severity: 'action',
      message: 'API tokens are not changed by the migration.',
      resolved: false,
    },
    {
      id: 'compat-note:all',
      kind: 'compat-note',
      severity: 'info',
      message: 'Compatibility mode is on.',
      resolved: false,
    },
  ],
});

describe('end-users: admin migration API', () => {
  let strapi;
  let utils;
  let rqAdmin;
  let rqAuthor;
  let authorId: number;

  const store = () => strapi.store({ type: 'plugin', name: 'end-users' });

  beforeAll(async () => {
    strapi = await createEndUsersInstance();
    utils = createUtils(strapi);

    rqAdmin = await createAuthRequest({ strapi });

    const [authorRole] = await utils.getRole({ code: 'strapi-author' });
    const author = await utils.createUser({
      email: 'end-users-migration-author@example.com',
      firstname: 'End users',
      lastname: 'Author',
      password: PASSWORD,
      isActive: true,
      roles: [authorRole.id],
    });

    authorId = author.id;
    rqAuthor = await createAuthRequest({
      strapi,
      userInfo: { email: 'end-users-migration-author@example.com', password: PASSWORD },
    });
  });

  afterAll(async () => {
    await store().delete({ key: 'migration' });
    await store().delete({ key: 'migration-report' });
    await utils.deleteUsersById([authorId]);
    await strapi.destroy();
  });

  it('answers the empty status with no record', async () => {
    const res = await rqAdmin.get(MIGRATION);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      mode: 'active',
      record: null,
      report: null,
      unresolved: 0,
    });
    expect(res.body.data.config.rollback).toBe(false);
  });

  it('returns the record, the report, the unresolved count and the hits to an admin with settings read', async () => {
    await store().set({
      key: 'migration',
      value: { status: 'completed', cutoverAt: '2026-11-01T00:00:00.000Z', attempt: 1 },
    });
    await store().set({ key: 'migration-report', value: report() });

    const res = await rqAdmin.get(MIGRATION);

    expect(res.status).toBe(200);
    expect(res.body.data.record).toMatchObject({ status: 'completed', attempt: 1 });
    expect(res.body.data.record).not.toHaveProperty('completedSteps');
    expect(res.body.data.report.items).toHaveLength(2);
    expect(res.body.data.unresolved).toBe(1);
    expect(res.body.data.legacyJwtHits).toEqual({ legacy: 0, access: 0, lastHitAt: null });
  });

  it('answers 403 without settings read', async () => {
    expect((await rqAuthor.get(MIGRATION)).status).toBe(403);
    expect(
      (
        await rqAuthor.put(`${MIGRATION}/items/${encodeURIComponent(ITEM)}`, {
          body: { resolved: true },
        })
      ).status
    ).toBe(403);
  });

  it('acknowledges an item and lowers the count', async () => {
    const put = await rqAdmin.put(`${MIGRATION}/items/${encodeURIComponent(ITEM)}`, {
      body: { resolved: true },
    });

    expect(put.status).toBe(200);
    expect(put.body.data).toMatchObject({ id: ITEM, resolved: true });
    expect(put.body.data.resolvedAt).toEqual(expect.any(String));

    expect((await rqAdmin.get(MIGRATION)).body.data.unresolved).toBe(0);

    const missing = await rqAdmin.put(`${MIGRATION}/items/${encodeURIComponent('api-token:x')}`, {
      body: { resolved: true },
    });

    expect(missing.status).toBe(404);
  });
});
