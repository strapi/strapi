import type { Context } from 'koa';

import roleController from '../role';

/**
 * EE role deletion: the validation runs the role service's deletion checks, plus the SSO ones
 * when the SSO feature is enabled, before the controller deletes and sanitizes the roles.
 */

const setup = ({ sso = false, deletionError }: { sso?: boolean; deletionError?: string } = {}) => {
  const roleService = {
    checkRolesIdForDeletion: jest.fn(async () => {
      if (deletionError !== undefined) {
        throw new Error(deletionError);
      }
    }),
    ssoCheckRolesIdForDeletion: jest.fn(async () => {}),
    deleteByIds: jest.fn(async (ids: number[]) =>
      ids.map((id) => ({ id, name: `role-${id}`, users: [] }))
    ),
    sanitizeRole: jest.fn(({ users: _, ...role }: { users: unknown[] }) => role),
  };

  global.strapi = {
    admin: { services: { role: roleService } },
    ee: { features: { isEnabled: (feature: string) => sso && feature === 'sso' } },
  } as any;

  return { roleService };
};

const createCtx = ({ params = {}, body = {} }: { params?: object; body?: object } = {}) =>
  ({ params, request: { body }, deleted: jest.fn((data) => data) }) as unknown as Context & {
    deleted: jest.Mock;
  };

describe('EE role controller', () => {
  describe('deleteOne', () => {
    test('deletes the role and responds with it sanitized', async () => {
      const { roleService } = setup();
      const ctx = createCtx({ params: { id: 3 } });

      await roleController.deleteOne(ctx);

      expect(roleService.checkRolesIdForDeletion).toHaveBeenCalledWith([3]);
      expect(roleService.ssoCheckRolesIdForDeletion).not.toHaveBeenCalled();
      expect(roleService.deleteByIds).toHaveBeenCalledWith([3]);
      expect(ctx.deleted).toHaveBeenCalledWith({ data: { id: 3, name: 'role-3' } });
    });

    test('responds with null data when no role was deleted', async () => {
      const { roleService } = setup();
      roleService.deleteByIds.mockResolvedValue([]);
      const ctx = createCtx({ params: { id: 3 } });

      await roleController.deleteOne(ctx);

      expect(ctx.deleted).toHaveBeenCalledWith({ data: null });
    });

    test('runs the SSO deletion checks when the SSO feature is enabled', async () => {
      const { roleService } = setup({ sso: true });

      await roleController.deleteOne(createCtx({ params: { id: 3 } }));

      expect(roleService.ssoCheckRolesIdForDeletion).toHaveBeenCalledWith([3]);
    });

    test('rejects the deletion when a deletion check fails', async () => {
      const { roleService } = setup({ deletionError: 'You cannot delete the super admin role' });

      await expect(roleController.deleteOne(createCtx({ params: { id: 1 } }))).rejects.toThrow(
        'You cannot delete the super admin role'
      );
      expect(roleService.deleteByIds).not.toHaveBeenCalled();
    });
  });

  describe('deleteMany', () => {
    test('deletes the roles and responds with them sanitized', async () => {
      const { roleService } = setup({ sso: true });
      const ctx = createCtx({ body: { ids: [3, 4] } });

      await roleController.deleteMany(ctx);

      expect(roleService.checkRolesIdForDeletion).toHaveBeenCalledWith([3, 4]);
      expect(roleService.ssoCheckRolesIdForDeletion).toHaveBeenCalledWith([3, 4]);
      expect(ctx.deleted).toHaveBeenCalledWith({
        data: [
          { id: 3, name: 'role-3' },
          { id: 4, name: 'role-4' },
        ],
      });
    });

    test('rejects the deletion when a deletion check fails', async () => {
      const { roleService } = setup({ deletionError: 'Some roles are still in use' });

      await expect(roleController.deleteMany(createCtx({ body: { ids: [3, 4] } }))).rejects.toThrow(
        'Some roles are still in use'
      );
      expect(roleService.deleteByIds).not.toHaveBeenCalled();
    });
  });
});
