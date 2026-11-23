import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';
import { createUtils } from 'api-tests/utils';
import { errors, z as zod } from '@strapi/utils';
import type { Core } from '@strapi/types';

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
  const roleIds: number[] = [];
  // The role a user holds in another place, which the plugin keeps on save
  let keptRoleId: number;

  const spacesSchema = zod.object({ space: zod.string().min(1) });
  const spacesParam = {
    schema: spacesSchema,
    validate: (values?: zod.infer<typeof spacesSchema>) => {
      if (values?.space === 'forbidden') {
        throw new errors.ValidationError('This space is not allowed');
      }
    },
    afterSave,
  };

  beforeAll(async () => {
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
    utils = createUtils(strapi);

    const formExtensions = strapi.service('admin::form-extensions');
    formExtensions.unstable_addInputParams('role', { spaces: spacesParam });
    formExtensions.unstable_addInputParams('user', {
      spaces: {
        ...spacesParam,
        // A plugin can change the core values before core checks and saves them
        beforeSave: ({ values, data }) => {
          if (values?.space === 'bad-email') {
            return { ...data, email: 'not an email' };
          }

          return Array.isArray(data.roles) ? { ...data, roles: [...data.roles, keptRoleId] } : data;
        },
      },
    });
    formExtensions.unstable_addInputParams('api-token', { spaces: spacesParam });

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
        expect.objectContaining({ entityId: created.body.data.id, values: { space: 'spain' } })
      );
    });

    test('refuses values that fail the plugin schema or check, and saves nothing', async () => {
      const invalid = await createRole({
        name: `${prefix}_invalid`,
        plugins: { spaces: { space: '' } },
      });
      const refused = await createRole({
        name: `${prefix}_refused`,
        plugins: { spaces: { space: 'forbidden' } },
      });

      expect(invalid.statusCode).toBe(400);
      expect(invalid.body.error.details.errors[0].path).toEqual(['plugins', 'spaces', 'space']);
      expect(refused.statusCode).toBe(400);
      // A ValidationError without field errors is reported on the plugin's field
      expect(refused.body.error.details.errors[0].path).toEqual(['plugins', 'spaces']);
      expect(afterSave).not.toHaveBeenCalled();
    });

    test('answers the afterSave error, with the entity saved', async () => {
      afterSave.mockRejectedValue(new Error('Plugin save failed'));

      const res = await createRole({
        name: `${prefix}_after_save_failed`,
        plugins: { spaces: { space: 'france' } },
      });

      expect(res.statusCode).toBe(500);
      // Core does not wrap the save in a transaction, so its deadlock retry keeps working
      const saved = await strapi.db
        .query('admin::role')
        .findOne({ where: { name: `${prefix}_after_save_failed` } });

      expect(saved).not.toBeNull();
      roleIds.push(saved.id);
    });

    test('refuses the values of a plugin that added no params', async () => {
      const res = await createRole({ name: `${prefix}_unknown`, plugins: { other: {} } });

      expect(res.statusCode).toBe(400);
      expect(res.body.error.message).toBe('Invalid key plugins.other');
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
        expect.objectContaining({ entityId: invited.body.data.id, values: { space: 'spain' } })
      );
    });

    test('refuses core values from beforeSave that core would refuse', async () => {
      const res = await rq({
        method: 'PUT',
        url: '/admin/users/1',
        body: { firstname: 'Renamed', plugins: { spaces: { space: 'bad-email' } } },
      });

      expect(res.statusCode).toBe(400);
      expect(afterSave).not.toHaveBeenCalled();
    });

    test('refuses an unknown plugin key', async () => {
      const res = await rq({
        method: 'PUT',
        url: '/admin/users/1',
        body: { plugins: { other: {} } },
      });

      expect(res.statusCode).toBe(400);
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
        expect.objectContaining({ entityId: created.body.data.id, values: { space: 'spain' } })
      );
    });

    test('refuses an unknown plugin key', async () => {
      const res = await rq({
        method: 'POST',
        url: '/admin/api-tokens',
        body: { name: `${prefix}_unknown_token`, type: 'read-only', plugins: { other: {} } },
      });

      expect(res.statusCode).toBe(400);
    });
  });
});
