import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';
import { createUtils } from 'api-tests/utils';
import type { Core } from '@strapi/types';

/**
 * The role, user and content API token form routes without any form extension: every answer must
 * match `develop`, except for the changes listed in `expectedStatus`.
 */
describe('Admin form routes without a plugin (api)', () => {
  let strapi: Core.Strapi;
  let rq: Awaited<ReturnType<typeof createAuthRequest>>;
  let utils: ReturnType<typeof createUtils>;

  const prefix = 'form_routes_matrix';
  let count = 0;
  const unique = () => {
    count += 1;
    return `${prefix}_${count}`;
  };

  const target = { roleId: 0, userId: 0, tokenId: 0, superAdminRoleId: 0 };

  const ids = (id: number) =>
    ({
      id: `${id}`,
      zeroPadded: `0${id}`,
      missing: '999999',
      exponent: `${id}e0`,
      decimalPoint: `${id}.0`,
      leadingSpace: ` ${id}`,
      hex: '0x0A',
      letters: 'abc',
    }) as const;

  type IdKind = keyof ReturnType<typeof ids>;
  type BodyKind = 'valid' | 'array' | 'unknownKey' | 'emptyPlugins';

  const BODY_KINDS: BodyKind[] = ['valid', 'array', 'unknownKey', 'emptyPlugins'];

  const withKind = (valid: Record<string, unknown>, kind: BodyKind): unknown => {
    switch (kind) {
      case 'array':
        return [];
      case 'unknownKey':
        return { ...valid, foo: 1 };
      case 'emptyPlugins':
        return { ...valid, plugins: {} };
      default:
        return valid;
    }
  };

  const UPDATE_ROUTES = {
    'PUT /admin/roles/:id': {
      path: (id: string) => `/admin/roles/${encodeURIComponent(id)}`,
      targetId: () => target.roleId,
      body: () => ({ description: 'matrix' }),
    },
    'PUT /admin/users/:id': {
      path: (id: string) => `/admin/users/${encodeURIComponent(id)}`,
      targetId: () => target.userId,
      body: () => ({ firstname: 'Matrix' }),
    },
    'PUT /admin/api-tokens/:id': {
      path: (id: string) => `/admin/api-tokens/${encodeURIComponent(id)}`,
      targetId: () => target.tokenId,
      body: () => ({ description: 'matrix' }),
    },
  } as const;

  const CREATE_ROUTES = {
    'POST /admin/roles': { path: '/admin/roles', body: () => ({ name: unique() }) },
    'POST /admin/users': {
      path: '/admin/users',
      body: () => ({
        firstname: 'Matrix',
        email: `${unique()}@matrix.test`,
        roles: [target.roleId],
      }),
    },
    'POST /admin/api-tokens': {
      path: '/admin/api-tokens',
      body: () => ({ name: unique(), type: 'read-only' }),
    },
  } as const;

  type UpdateRoute = keyof typeof UPDATE_ROUTES;
  type CreateRoute = keyof typeof CREATE_ROUTES;

  /**
   * What `develop` (e5b1020b4e) answers on SQLite, recorded with this matrix. The three update
   * routes answer the same: core validates the body first, then looks the id up. Only the `id`
   * and `zeroPadded` rows are compared: the others show what the 404 of `expectedStatus` replaces.
   */
  const DEVELOP_UPDATE: Record<IdKind, Record<BodyKind, number>> = {
    id: { valid: 200, array: 400, unknownKey: 400, emptyPlugins: 400 },
    zeroPadded: { valid: 200, array: 400, unknownKey: 400, emptyPlugins: 400 },
    missing: { valid: 404, array: 400, unknownKey: 400, emptyPlugins: 400 },
    exponent: { valid: 200, array: 400, unknownKey: 400, emptyPlugins: 400 },
    decimalPoint: { valid: 200, array: 400, unknownKey: 400, emptyPlugins: 400 },
    leadingSpace: { valid: 200, array: 400, unknownKey: 400, emptyPlugins: 400 },
    hex: { valid: 404, array: 400, unknownKey: 400, emptyPlugins: 400 },
    letters: { valid: 404, array: 400, unknownKey: 400, emptyPlugins: 400 },
  };

  // Token create keeps only its own fields, so it ignored unknown keys and `plugins`
  const DEVELOP_CREATE: Record<CreateRoute, Record<BodyKind, number>> = {
    'POST /admin/roles': { valid: 201, array: 400, unknownKey: 400, emptyPlugins: 400 },
    'POST /admin/users': { valid: 201, array: 400, unknownKey: 400, emptyPlugins: 400 },
    'POST /admin/api-tokens': { valid: 201, array: 400, unknownKey: 201, emptyPlugins: 201 },
  };

  /**
   * The answer this branch must give: `develop`'s, except for these changes.
   * 1. Only ids made of plain digits reach the database: any other id answers 404. On `develop`,
   *    SQLite and MySQL matched `7e0`, `7.0` or ` 7` to row 7, and Postgres 16 matched `0x0A`.
   * 2. Checks that need only the id (the entity exists) run before the body is validated, so a
   *    missing id answers 404 whatever the body.
   * 3. `plugins: {}` means no plugin values: the body is then checked as without it.
   */
  const expectedStatus = (idKind: IdKind, bodyKind: BodyKind) => {
    if (idKind !== 'id' && idKind !== 'zeroPadded') {
      return 404;
    }

    return DEVELOP_UPDATE[idKind][bodyKind === 'emptyPlugins' ? 'valid' : bodyKind];
  };

  const expectedCreateStatus = (route: CreateRoute, bodyKind: BodyKind) =>
    DEVELOP_CREATE[route][bodyKind === 'emptyPlugins' ? 'valid' : bodyKind];

  beforeAll(async () => {
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
    utils = createUtils(strapi);

    target.roleId = (await utils.createRole({ name: unique(), description: 'matrix' })).id;
    target.superAdminRoleId = (await utils.getSuperAdminRole()).id;

    const user = await rq({
      method: 'POST',
      url: '/admin/users',
      body: { firstname: 'Matrix', email: `${unique()}@matrix.test`, roles: [target.roleId] },
    });
    target.userId = user.body.data.id;

    const token = await rq({
      method: 'POST',
      url: '/admin/api-tokens',
      body: { name: unique(), type: 'read-only' },
    });
    target.tokenId = token.body.data.id;
  });

  afterAll(async () => {
    await strapi.db
      .query('admin::user')
      .deleteMany({ where: { email: { $endsWith: '@matrix.test' } } });
    await strapi.db
      .query('admin::api-token')
      .deleteMany({ where: { name: { $startsWith: prefix } } });
    await strapi.db.query('admin::role').deleteMany({ where: { name: { $startsWith: prefix } } });
    await strapi.destroy();
  });

  describe.each(Object.keys(UPDATE_ROUTES) as UpdateRoute[])('%s', (route) => {
    const { path, targetId, body } = UPDATE_ROUTES[route];

    test.each(BODY_KINDS)('answers as develop for each id, with a %s body', async (bodyKind) => {
      for (const [idKind, id] of Object.entries(ids(targetId())) as [IdKind, string][]) {
        const res = await rq({ method: 'PUT', url: path(id), body: withKind(body(), bodyKind) });

        expect({ idKind, status: res.statusCode }).toEqual({
          idKind,
          status: expectedStatus(idKind, bodyKind),
        });
      }
    });
  });

  describe.each(Object.keys(CREATE_ROUTES) as CreateRoute[])('%s', (route) => {
    const { path, body } = CREATE_ROUTES[route];

    test.each(BODY_KINDS)('answers as develop with a %s body', async (bodyKind) => {
      const res = await rq({ method: 'POST', url: path, body: withKind(body(), bodyKind) });

      expect(res.statusCode).toBe(expectedCreateStatus(route, bodyKind));
    });
  });

  test('still refuses to edit the Super Admin role', async () => {
    const res = await rq({
      method: 'PUT',
      url: `/admin/roles/${target.superAdminRoleId}`,
      body: { description: 'matrix' },
    });

    expect(res.statusCode).toBe(400);
  });
});
