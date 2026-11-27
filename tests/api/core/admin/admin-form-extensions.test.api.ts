import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';
import { createUtils } from 'api-tests/utils';
import { errors, z as zod } from '@strapi/utils';
import type { Core } from '@strapi/types';
import { formRouteIds, matchesEntity, type FormRouteIdKind } from './utils/form-route-ids';

/**
 * Plugins send their own values with the role, user and API token forms, under
 * `plugins.<pluginId>`, through `admin::form-extensions`.
 */
describe('Admin form extensions (api)', () => {
  let strapi: Core.Strapi;
  let rq: Awaited<ReturnType<typeof createAuthRequest>>;
  let utils: ReturnType<typeof createUtils>;

  const prefix = 'form_extensions_test';
  const afterSave = jest.fn();
  // The entityId each validate step gets
  const validatedIds = jest.fn();
  const roleIds: number[] = [];
  // The role a user holds in another place, which the plugin keeps on save
  let keptRoleId: number;

  const spacesSchema = zod.object({ space: zod.string().min(1) });
  const spacesParam = {
    schema: spacesSchema,
    validate: ({
      values,
      entityId,
    }: {
      values?: zod.infer<typeof spacesSchema>;
      entityId?: unknown;
    }) => {
      validatedIds(entityId);

      if (values?.space === 'forbidden') {
        throw new errors.ValidationError('This space is not allowed');
      }
    },
    afterSave,
  };

  // Every form's beforeSave refuses this value with a ValidationError without field errors
  const refuseBeforeSave = (values?: { space?: string }) => {
    if (values?.space === 'refused-before-save') {
      throw new errors.ValidationError('Refused before save');
    }
  };

  beforeAll(async () => {
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
    utils = createUtils(strapi);

    const formExtensions = strapi.service('admin::form-extensions');
    formExtensions.unstable_addInputParams('role', {
      spaces: {
        ...spacesParam,
        beforeSave: ({ values, data }) => {
          refuseBeforeSave(values);

          return values?.space === 'bad-name' ? { ...data, name: '' } : data;
        },
      },
    });
    formExtensions.unstable_addInputParams('user', {
      spaces: {
        ...spacesParam,
        // A plugin can change the core values before core checks and saves them
        beforeSave: ({ values, data }) => {
          refuseBeforeSave(values);

          if (values?.space === 'bad-email') {
            return { ...data, email: 'not an email' };
          }

          return Array.isArray(data.roles) ? { ...data, roles: [...data.roles, keptRoleId] } : data;
        },
      },
    });
    formExtensions.unstable_addInputParams('content-api-token', {
      spaces: {
        ...spacesParam,
        beforeSave: ({ values, data }) => {
          refuseBeforeSave(values);

          if (values?.space === 'padded') {
            return { ...data, name: `  ${prefix}_padded_token  ` };
          }

          if (values?.space === 'padded-create') {
            return { ...data, name: `  ${prefix}_padded_create  ` };
          }

          return values?.space === 'bad-type' ? { ...data, type: 'nope' } : data;
        },
      },
    });

    keptRoleId = (await createRole({ name: `${prefix}_kept_role` })).body.data.id;
  });

  beforeEach(() => {
    afterSave.mockReset();
  });

  afterAll(async () => {
    await strapi.db
      .query('admin::user')
      .deleteMany({ where: { email: { $endsWith: `@${prefix}.test` } } });
    await strapi.db
      .query('admin::api-token')
      .deleteMany({ where: { name: { $startsWith: prefix } } });
    await utils.deleteRolesById(roleIds);
    await strapi.destroy();
  });

  const createRole = async (body: Record<string, unknown>) => {
    const res = await rq({ method: 'POST', url: '/admin/roles', body });

    if (res.body.data?.id) {
      roleIds.push(res.body.data.id);
    }

    return res;
  };

  describe('roles', () => {
    test('create and update hand the plugin values and the saved id to the plugin', async () => {
      const created = await createRole({
        name: `${prefix}_role`,
        plugins: { spaces: { space: 'france' } },
      });

      expect(created.statusCode).toBe(201);
      expect(created.body.data).not.toHaveProperty('plugins');
      expect(afterSave).toHaveBeenCalledWith(
        expect.objectContaining({ entityId: created.body.data.id, values: { space: 'france' } })
      );

      const updated = await rq({
        method: 'PUT',
        url: `/admin/roles/${created.body.data.id}`,
        body: { name: `${prefix}_role_renamed`, plugins: { spaces: { space: 'spain' } } },
      });

      expect(updated.statusCode).toBe(200);
      expect(updated.body.data.name).toBe(`${prefix}_role_renamed`);
      expect(afterSave).toHaveBeenLastCalledWith(
        expect.objectContaining({
          entityId: created.body.data.id,
          values: { space: 'spain' },
        })
      );
    });

    test('takes plugins {} and null as no values, and refuses a value that is not an object', async () => {
      const empty = await createRole({ name: `${prefix}_empty`, plugins: {} });
      const nullValue = await createRole({ name: `${prefix}_null`, plugins: null });
      const notAnObject = await createRole({ name: `${prefix}_string`, plugins: 'spaces' });

      expect(empty.statusCode).toBe(201);
      expect(nullValue.statusCode).toBe(201);
      expect(notAnObject.statusCode).toBe(400);
      expect(notAnObject.body.error.details.errors[0].path).toEqual(['plugins']);
    });

    test('core checks the role values beforeSave returns', async () => {
      const res = await createRole({
        name: `${prefix}_renamed_by_plugin`,
        plugins: { spaces: { space: 'bad-name' } },
      });

      expect(res.statusCode).toBe(400);
      expect(afterSave).not.toHaveBeenCalled();
    });
  });

  describe('users', () => {
    const roleIdsOf = (user: { roles: Array<{ id: number }> }) => user.roles.map(({ id }) => id);

    test('core checks the roles beforeSave returns, so the form can send none', async () => {
      const invited = await rq({
        method: 'POST',
        url: '/admin/users',
        body: {
          firstname: 'Sofia',
          lastname: 'García',
          email: `sofia@${prefix}.test`,
          roles: [],
          plugins: { spaces: { space: 'france' } },
        },
      });

      expect(invited.statusCode).toBe(201);
      expect(roleIdsOf(invited.body.data)).toEqual([keptRoleId]);
      expect(afterSave).toHaveBeenCalledWith(
        expect.objectContaining({ entityId: invited.body.data.id, values: { space: 'france' } })
      );

      const updated = await rq({
        method: 'PUT',
        url: `/admin/users/${invited.body.data.id}`,
        body: { firstname: 'Sofía', plugins: { spaces: { space: 'spain' } } },
      });

      expect(updated.statusCode).toBe(200);
      expect(updated.body.data.firstname).toBe('Sofía');

      const withoutRoles = await rq({
        method: 'PUT',
        url: `/admin/users/${invited.body.data.id}`,
        body: { roles: [], plugins: { spaces: { space: 'spain' } } },
      });

      expect(withoutRoles.statusCode).toBe(200);
      expect(roleIdsOf(withoutRoles.body.data)).toEqual([keptRoleId]);
      expect(afterSave).toHaveBeenLastCalledWith(
        expect.objectContaining({
          entityId: invited.body.data.id,
          values: { space: 'spain' },
        })
      );
    });

    test('refuses core values from beforeSave that core would refuse', async () => {
      const invited = await rq({
        method: 'POST',
        url: '/admin/users',
        body: { firstname: 'Ana', email: `ana@${prefix}.test`, roles: [keptRoleId] },
      });
      afterSave.mockReset();

      const res = await rq({
        method: 'PUT',
        url: `/admin/users/${invited.body.data.id}`,
        body: { firstname: 'Renamed', plugins: { spaces: { space: 'bad-email' } } },
      });

      expect(res.statusCode).toBe(400);
      expect(afterSave).not.toHaveBeenCalled();
    });

    // Same scenario as the concurrent role removals test in admin-user, which deadlocks on
    // Postgres and MySQL: plugin steps must leave core's deadlock retry working
    test('concurrent role changes survive a deadlock when a plugin has an afterSave', async () => {
      const sharedRoleId = (await createRole({ name: `${prefix}_shared_role` })).body.data.id;

      const createUser = async (name: string) => {
        const res = await rq({
          method: 'POST',
          url: '/admin/users',
          body: { firstname: name, email: `${name}@${prefix}.test`, roles: [sharedRoleId] },
        });

        expect(res.statusCode).toBe(201);
        return res.body.data.id;
      };

      const userIds = [await createUser('concurrent-a'), await createUser('concurrent-b')];

      // The plugin adds the kept role, so each user keeps one role when the shared one goes
      const setRoles = async (roles: number[]) => {
        const responses = await Promise.all(
          userIds.map((id) =>
            rq({
              method: 'PUT',
              url: `/admin/users/${id}`,
              body: { roles, plugins: { spaces: { space: 'france' } } },
            })
          )
        );

        return responses.map((res) => res.statusCode);
      };

      const { name, inverseJoinColumn, inverseOrderColumnName } = (
        strapi.db.metadata.get('admin::user').attributes.roles as unknown as {
          joinTable: {
            name: string;
            inverseJoinColumn: { name: string };
            inverseOrderColumnName: string;
          };
        }
      ).joinTable;

      const forceGapInSharedRoleOrder = async () => {
        const rows = await strapi.db
          .getConnection()
          .from(name)
          .select(['id', inverseOrderColumnName])
          .where(inverseJoinColumn.name, sharedRoleId)
          .orderBy(inverseOrderColumnName, 'asc');

        expect(rows).toHaveLength(2);

        await strapi.db
          .getConnection()
          .from(name)
          .where('id', rows[1].id)
          .update({ [inverseOrderColumnName]: Number(rows[0][inverseOrderColumnName]) + 2 });
      };

      await forceGapInSharedRoleOrder();

      for (let attempt = 0; attempt < 8; attempt += 1) {
        expect(await setRoles([])).toEqual([200, 200]);
        expect(await setRoles([sharedRoleId])).toEqual([200, 200]);

        await forceGapInSharedRoleOrder();
      }
    });
  });

  describe('API tokens', () => {
    test('create and update hand the plugin values and the saved id to the plugin', async () => {
      const created = await rq({
        method: 'POST',
        url: '/admin/api-tokens',
        body: {
          name: `${prefix}_token`,
          type: 'read-only',
          plugins: { spaces: { space: 'france' } },
        },
      });

      expect(created.statusCode).toBe(201);
      expect(afterSave).toHaveBeenCalledWith(
        expect.objectContaining({ entityId: created.body.data.id, values: { space: 'france' } })
      );

      const updated = await rq({
        method: 'PUT',
        url: `/admin/api-tokens/${created.body.data.id}`,
        body: { description: 'Updated', plugins: { spaces: { space: 'spain' } } },
      });

      expect(updated.statusCode).toBe(200);
      expect(afterSave).toHaveBeenLastCalledWith(
        expect.objectContaining({
          entityId: created.body.data.id,
          values: { space: 'spain' },
        })
      );
    });

    test('core checks and trims the token values beforeSave returns', async () => {
      const created = await rq({
        method: 'POST',
        url: '/admin/api-tokens',
        body: { name: `${prefix}_to_pad`, type: 'read-only' },
      });

      const padded = await rq({
        method: 'PUT',
        url: `/admin/api-tokens/${created.body.data.id}`,
        body: { description: 'x', plugins: { spaces: { space: 'padded' } } },
      });

      expect(padded.statusCode).toBe(200);
      expect(padded.body.data.name).toBe(`${prefix}_padded_token`);

      const paddedCreate = await rq({
        method: 'POST',
        url: '/admin/api-tokens',
        body: {
          name: `${prefix}_will_be_padded`,
          type: 'read-only',
          plugins: { spaces: { space: 'padded-create' } },
        },
      });

      expect(paddedCreate.statusCode).toBe(201);
      expect(paddedCreate.body.data.name).toBe(`${prefix}_padded_create`);

      const badType = await rq({
        method: 'POST',
        url: '/admin/api-tokens',
        body: {
          name: `${prefix}_bad_type`,
          type: 'read-only',
          plugins: { spaces: { space: 'bad-type' } },
        },
      });

      expect(badType.statusCode).toBe(400);
    });
  });

  describe('what plugins see on each form route', () => {
    const withPlugins = (body: Record<string, unknown>) => ({
      ...body,
      plugins: { spaces: { space: 'france' } },
    });

    const routes = [
      {
        name: 'role',
        path: (id: string) => `/admin/roles/${encodeURIComponent(id)}`,
        create: () => createRole({ name: `${prefix}_matrix_role` }),
        body: { description: 'matrix' },
      },
      {
        name: 'user',
        path: (id: string) => `/admin/users/${encodeURIComponent(id)}`,
        create: () =>
          rq({
            method: 'POST',
            url: '/admin/users',
            body: { firstname: 'Matrix', email: `matrix@${prefix}.test`, roles: [keptRoleId] },
          }),
        body: { firstname: 'Matrix' },
      },
      {
        name: 'token',
        path: (id: string) => `/admin/api-tokens/${encodeURIComponent(id)}`,
        create: () =>
          rq({
            method: 'POST',
            url: '/admin/api-tokens',
            body: { name: `${prefix}_matrix_token`, type: 'read-only' },
          }),
        body: { description: 'matrix' },
      },
    ];

    test.each(routes)('$name update: plugins only see the id core matched', async (route) => {
      const targetId = (await route.create()).body.data.id;

      for (const [kind, id] of Object.entries(formRouteIds(targetId)) as [
        FormRouteIdKind,
        string,
      ][]) {
        validatedIds.mockReset();
        afterSave.mockReset();

        const res = await rq({ method: 'PUT', url: route.path(id), body: withPlugins(route.body) });
        const matched = matchesEntity(kind);

        expect({ kind, status: res.statusCode }).toEqual({ kind, status: matched ? 200 : 404 });

        if (matched) {
          expect(validatedIds).toHaveBeenCalledWith(targetId);
          expect(afterSave).toHaveBeenCalledWith(expect.objectContaining({ entityId: targetId }));
        } else {
          expect(validatedIds).not.toHaveBeenCalled();
          expect(afterSave).not.toHaveBeenCalled();
        }
      }

      validatedIds.mockReset();
      const array = await rq({ method: 'PUT', url: route.path(`${targetId}`), body: [] });

      expect(array.statusCode).toBe(400);
      expect(validatedIds).not.toHaveBeenCalled();
    });

    test.each(['/admin/roles', '/admin/users', '/admin/api-tokens'])(
      'POST %s with a body that is not an object runs no plugin step',
      async (url) => {
        validatedIds.mockReset();

        const res = await rq({ method: 'POST', url, body: [] });

        expect(res.statusCode).toBe(400);
        expect(validatedIds).not.toHaveBeenCalled();
      }
    );

    test('the Super Admin role runs no plugin step', async () => {
      const superAdminRole = await utils.getSuperAdminRole();
      validatedIds.mockReset();

      const res = await rq({
        method: 'PUT',
        url: `/admin/roles/${superAdminRole.id}`,
        body: withPlugins({ description: 'x' }),
      });

      expect(res.statusCode).toBe(400);
      expect(validatedIds).not.toHaveBeenCalled();
    });
  });

  describe('every form route', () => {
    const target = { roleId: 0, userId: 0, tokenId: 0 };
    let count = 0;
    const unique = () => {
      count += 1;
      return `${prefix}_route_${count}`;
    };

    type Body = Record<string, unknown>;

    const routes: Array<{
      name: string;
      method: 'POST' | 'PUT';
      url: () => string;
      body: () => Body;
      // Whether the change `body` asks for is in the database
      isSaved: (body: Body) => Promise<boolean>;
    }> = [
      {
        name: 'POST /admin/roles',
        method: 'POST',
        url: () => '/admin/roles',
        body: () => ({ name: unique() }),
        isSaved: async ({ name }) =>
          (await strapi.db.query('admin::role').findOne({ where: { name } })) !== null,
      },
      {
        name: 'PUT /admin/roles/:id',
        method: 'PUT',
        url: () => `/admin/roles/${target.roleId}`,
        body: () => ({ description: unique() }),
        isSaved: async ({ description }) =>
          (await strapi.db
            .query('admin::role')
            .findOne({ where: { id: target.roleId, description } })) !== null,
      },
      {
        name: 'POST /admin/users',
        method: 'POST',
        url: () => '/admin/users',
        body: () => ({
          firstname: 'Route',
          email: `${unique()}@${prefix}.test`,
          roles: [keptRoleId],
        }),
        isSaved: async ({ email }) =>
          (await strapi.db.query('admin::user').findOne({ where: { email } })) !== null,
      },
      {
        name: 'PUT /admin/users/:id',
        method: 'PUT',
        url: () => `/admin/users/${target.userId}`,
        body: () => ({ firstname: unique() }),
        isSaved: async ({ firstname }) =>
          (await strapi.db
            .query('admin::user')
            .findOne({ where: { id: target.userId, firstname } })) !== null,
      },
      {
        name: 'POST /admin/api-tokens',
        method: 'POST',
        url: () => '/admin/api-tokens',
        body: () => ({ name: unique(), type: 'read-only' }),
        isSaved: async ({ name }) =>
          (await strapi.db.query('admin::api-token').findOne({ where: { name } })) !== null,
      },
      {
        name: 'PUT /admin/api-tokens/:id',
        method: 'PUT',
        url: () => `/admin/api-tokens/${target.tokenId}`,
        body: () => ({ description: unique() }),
        isSaved: async ({ description }) =>
          (await strapi.db
            .query('admin::api-token')
            .findOne({ where: { id: target.tokenId, description } })) !== null,
      },
    ];

    const send = async (route: (typeof routes)[number], body: Body) => {
      const res = await rq({ method: route.method, url: route.url(), body });

      if (route.url() === '/admin/roles' && res.body.data?.id) {
        roleIds.push(res.body.data.id);
      }

      return res;
    };

    beforeAll(async () => {
      target.roleId = (await createRole({ name: unique() })).body.data.id;
      target.userId = (
        await rq({
          method: 'POST',
          url: '/admin/users',
          body: { firstname: 'Route', email: `${unique()}@${prefix}.test`, roles: [keptRoleId] },
        })
      ).body.data.id;
      target.tokenId = (
        await rq({
          method: 'POST',
          url: '/admin/api-tokens',
          body: { name: unique(), type: 'read-only' },
        })
      ).body.data.id;
    });

    test.each(routes)(
      '$name refuses values the schema, validate or beforeSave refuse, and saves nothing',
      async (route) => {
        const refusals = [
          { space: '', path: ['plugins', 'spaces', 'space'] },
          // A ValidationError without field errors is reported on the plugin's field
          { space: 'forbidden', path: ['plugins', 'spaces'] },
          { space: 'refused-before-save', path: ['plugins', 'spaces'] },
        ];

        for (const { space, path } of refusals) {
          const body = { ...route.body(), plugins: { spaces: { space } } };
          const res = await send(route, body);

          expect({
            space,
            status: res.statusCode,
            path: res.body.error?.details?.errors?.[0]?.path,
          }).toEqual({
            space,
            status: 400,
            path,
          });
          expect(await route.isSaved(body)).toBe(false);
        }

        expect(afterSave).not.toHaveBeenCalled();
      }
    );

    test.each(routes)(
      '$name refuses the values of a plugin that added no params',
      async (route) => {
        const body = { ...route.body(), plugins: { spaces: { space: 'france' }, other: {} } };
        const res = await send(route, body);

        expect(res.statusCode).toBe(400);
        expect(res.body.error.message).toBe('Invalid key plugins.other');
        expect(res.body.error.details.errors[0].path).toEqual(['plugins', 'other']);
        expect(await route.isSaved(body)).toBe(false);
        expect(afterSave).not.toHaveBeenCalled();
      }
    );

    test.each(routes)(
      '$name answers 500 when an afterSave fails, and deletes the entity it created',
      async (route) => {
        for (const error of [
          new Error('Plugin save failed'),
          new errors.ValidationError('Too late to refuse'),
        ]) {
          afterSave.mockReset();
          afterSave.mockRejectedValueOnce(error);
          const body = { ...route.body(), plugins: { spaces: { space: 'france' } } };

          const res = await send(route, body);

          expect({ error: error.name, status: res.statusCode }).toEqual({
            error: error.name,
            status: 500,
          });
          // No transaction, so an update stays saved; a create is deleted, so the client can retry
          expect(await route.isSaved(body)).toBe(route.method === 'PUT');

          if (route.method === 'POST') {
            const retried = await send(route, body);

            expect(retried.statusCode).toBe(201);
          }
        }
      }
    );
  });
});
