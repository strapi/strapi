import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';
import { createUtils } from 'api-tests/utils';
import type { Core } from '@strapi/types';

/**
 * Plugins make some roles read-only with `unstable_addReadOnlyReasons` on
 * `admin::form-extensions`. Core shows the reason and refuses changes to those roles.
 */
describe('Read-only roles (api)', () => {
  let strapi: Core.Strapi;
  let rq: Awaited<ReturnType<typeof createAuthRequest>>;
  let utils: ReturnType<typeof createUtils>;

  const prefix = 'read_only_roles_test';
  const reason = 'Shared roles are edited in the Control center.';
  const roleIds: number[] = [];
  let sharedRoleId: number;
  let ownRoleId: number;

  const createRole = async (name: string) => {
    const res = await rq({ method: 'POST', url: '/admin/roles', body: { name } });
    roleIds.push(res.body.data.id);

    return res.body.data.id as number;
  };

  beforeAll(async () => {
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
    utils = createUtils(strapi);

    strapi.service('admin::form-extensions').unstable_addReadOnlyReasons('role', {
      spaces: async ({ entityId }: { entityId: number }) => {
        const role = await strapi.db.query('admin::role').findOne({ where: { id: entityId } });

        return role?.name.startsWith(`${prefix}_shared`) ? reason : null;
      },
    });

    sharedRoleId = await createRole(`${prefix}_shared`);
    ownRoleId = await createRole(`${prefix}_own`);
  });

  afterAll(async () => {
    await utils.deleteRolesById(roleIds);
    await strapi.destroy();
  });

  test('marks read-only roles in the list and on their own, and only them', async () => {
    const list = await rq({ method: 'GET', url: '/admin/roles' });
    const shared = list.body.data.find((role: { id: number }) => role.id === sharedRoleId);
    const own = list.body.data.find((role: { id: number }) => role.id === ownRoleId);

    expect(shared).toMatchObject({ readOnly: true, readOnlyReason: reason });
    expect(own).not.toHaveProperty('readOnly');
    expect(own).not.toHaveProperty('readOnlyReason');

    const one = await rq({ method: 'GET', url: `/admin/roles/${sharedRoleId}` });

    expect(one.body.data).toMatchObject({
      id: sharedRoleId,
      readOnly: true,
      readOnlyReason: reason,
    });
  });

  test('refuses to update a read-only role or its permissions', async () => {
    const update = await rq({
      method: 'PUT',
      url: `/admin/roles/${sharedRoleId}`,
      body: { name: `${prefix}_shared_renamed` },
    });
    const permissions = await rq({
      method: 'PUT',
      url: `/admin/roles/${sharedRoleId}/permissions`,
      body: { permissions: [] },
    });

    expect(update.statusCode).toBe(400);
    expect(update.body.error.message).toBe(reason);
    expect(permissions.statusCode).toBe(400);
    expect(permissions.body.error.message).toBe(reason);

    const one = await rq({ method: 'GET', url: `/admin/roles/${sharedRoleId}` });
    expect(one.body.data.name).toBe(`${prefix}_shared`);
  });

  test('refuses to delete a read-only role, alone or in a batch', async () => {
    const deleteOne = await rq({ method: 'DELETE', url: `/admin/roles/${sharedRoleId}` });
    const deleteMany = await rq({
      method: 'POST',
      url: '/admin/roles/batch-delete',
      body: { ids: [ownRoleId, sharedRoleId] },
    });

    expect(deleteOne.statusCode).toBe(400);
    expect(deleteOne.body.error.message).toBe(reason);
    expect(deleteMany.statusCode).toBe(400);

    // The batch deleted nothing, not even the role that is not read-only
    for (const id of [sharedRoleId, ownRoleId]) {
      const one = await rq({ method: 'GET', url: `/admin/roles/${id}` });
      expect(one.statusCode).toBe(200);
    }
  });

  test('lets other roles change as before', async () => {
    const update = await rq({
      method: 'PUT',
      url: `/admin/roles/${ownRoleId}`,
      body: { name: `${prefix}_own_renamed` },
    });

    expect(update.statusCode).toBe(200);
    expect(update.body.data.name).toBe(`${prefix}_own_renamed`);
  });

  test('still refuses the Super Admin role with its own message', async () => {
    const superAdmin = await utils.getSuperAdminRole();
    const res = await rq({
      method: 'PUT',
      url: `/admin/roles/${superAdmin.id}`,
      body: { name: 'x' },
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.error.message).toBe("Super admin can't be edited.");
  });
});
