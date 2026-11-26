import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';
import { createUtils } from 'api-tests/utils';
import type { Core } from '@strapi/types';
import { formRouteIds, matchesEntity, type FormRouteIdKind } from './utils/form-route-ids';

/**
 * The role, user and content API token form routes without any form extension: every answer must
 * match `develop`, except for the changes listed in `expectedFromDevelop`.
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

  type BodyKind =
    | 'valid'
    | 'array'
    | 'unknownKey'
    | 'emptyPlugins'
    | 'nullPlugins'
    | 'stringPlugins'
    | 'unknownPlugin';

  const BODY_KINDS: BodyKind[] = [
    'valid',
    'array',
    'unknownKey',
    'emptyPlugins',
    'nullPlugins',
    'stringPlugins',
    'unknownPlugin',
  ];

  const withKind = (valid: Record<string, unknown>, kind: BodyKind): unknown => {
    switch (kind) {
      case 'array':
        return [];
      case 'unknownKey':
        return { ...valid, foo: 1 };
      case 'emptyPlugins':
        return { ...valid, plugins: {} };
      case 'nullPlugins':
        return { ...valid, plugins: null };
      case 'stringPlugins':
        return { ...valid, plugins: 'x' };
      case 'unknownPlugin':
        return { ...valid, plugins: { other: {} } };
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
   * What `develop` (e5b1020b4e) answers on SQLite, recorded with these bodies on the id of an
   * existing entity. The three update routes answer the same.
   */
  const DEVELOP_UPDATE: Record<BodyKind, number> = {
    valid: 200,
    array: 400,
    unknownKey: 400,
    emptyPlugins: 400,
    nullPlugins: 400,
    stringPlugins: 400,
    unknownPlugin: 400,
  };

  const DEVELOP_CREATE: Record<CreateRoute, Record<BodyKind, number>> = {
    'POST /admin/roles': { ...DEVELOP_UPDATE, valid: 201 },
    'POST /admin/users': { ...DEVELOP_UPDATE, valid: 201 },
    // Token create kept only its own fields, so it ignored unknown keys and `plugins`
    'POST /admin/api-tokens': {
      valid: 201,
      array: 400,
      unknownKey: 201,
      emptyPlugins: 201,
      nullPlugins: 201,
      stringPlugins: 201,
      unknownPlugin: 201,
    },
  };

  /**
   * The answer this branch must give: `develop`'s, except for these changes.
   * 1. Only ids made of plain digits reach the database: any other id answers 404. On `develop`,
   *    SQLite and MySQL matched `7e0`, `7.0` or ` 7` to row 7, and Postgres 16 matched `0x0A`.
   * 2. Checks that need only the id (the entity exists) run before the body is validated, so a
   *    missing id answers 404 whatever the body.
   * 3. `plugins: {}` and `plugins: null` mean no plugin values: the body is checked as without it.
   * 4. Any other `plugins` value is refused (400), also on token create, which ignored it.
   */
  const expectedFromDevelop = (develop: Record<BodyKind, number>, bodyKind: BodyKind) => {
    switch (bodyKind) {
      case 'emptyPlugins':
      case 'nullPlugins':
        return develop.valid;
      case 'stringPlugins':
      case 'unknownPlugin':
        return 400;
      default:
        return develop[bodyKind];
    }
  };

  const expectedStatus = (idKind: FormRouteIdKind, bodyKind: BodyKind) =>
    matchesEntity(idKind) ? expectedFromDevelop(DEVELOP_UPDATE, bodyKind) : 404;

  const expectedCreateStatus = (route: CreateRoute, bodyKind: BodyKind) =>
    expectedFromDevelop(DEVELOP_CREATE[route], bodyKind);

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

    test.each(BODY_KINDS)('answers each id as expected, with a %s body', async (bodyKind) => {
      for (const [idKind, id] of Object.entries(formRouteIds(targetId())) as [
        FormRouteIdKind,
        string,
      ][]) {
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

    test.each(BODY_KINDS)('answers as expected with a %s body', async (bodyKind) => {
      const res = await rq({ method: 'POST', url: path, body: withKind(body(), bodyKind) });

      expect(res.statusCode).toBe(expectedCreateStatus(route, bodyKind));
    });
  });

  test.each([
    { name: 'valid', body: { description: 'matrix' } },
    // `develop` answered the validation error: "name must be at least 1 characters"
    { name: 'invalid', body: { name: '' } },
  ])('still refuses to edit the Super Admin role, with a $name body', async ({ body }) => {
    const res = await rq({ method: 'PUT', url: `/admin/roles/${target.superAdminRoleId}`, body });

    expect(res.statusCode).toBe(400);
    expect(res.body.error.message).toBe("Super admin can't be edited.");
  });

  test.each([
    { name: 'a value that is not an object', plugins: 'x', path: ['plugins'] },
    { name: 'an unknown plugin', plugins: { other: {} }, path: ['plugins', 'other'] },
  ])('refuses $name under plugins with its path', async ({ plugins, path }) => {
    const res = await rq({
      method: 'POST',
      url: '/admin/api-tokens',
      body: { name: unique(), type: 'read-only', plugins },
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.error.details.errors[0].path).toEqual(path);
  });
});
