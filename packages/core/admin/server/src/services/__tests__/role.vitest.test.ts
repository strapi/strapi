import { describe, test, expect, vi } from 'vitest';
import _ from 'lodash';
import { queryParams, errors } from '@strapi/utils';
import constants from '../constants';
import { create as createPermission, toPermission } from '../../domain/permission';
import roleContentType from '../../content-types/Role';
import roleService from '../role';

const {
  sanitizeRole,
  create,
  findOne,
  findOneWithUsersCount,
  find,
  findAllWithUsersCount,
  update,
  count,
  deleteByIds,
  getUsersCount,
  createRolesIfNoneExist,
  displayWarningIfNoSuperAdmin,
  addPermissions,
  assignPermissions,
  checkPermissionsCeiling,
  resetSuperAdminPermissions,
} = roleService;

const { SUPER_ADMIN_CODE } = constants;

const strapiMock = {
  get(name: string) {
    if (name === 'query-params') {
      const transformer = queryParams.createTransformer({
        getModel(name: string) {
          return strapi.getModel(name as any);
        },
      });

      return {
        transform: transformer.transformQueryParams,
      };
    }
  },
};

describe('Role', () => {
  describe('create', () => {
    test('Creates a role', async () => {
      const dbCreate = vi.fn(({ data }) => Promise.resolve(data));
      const dbCount = vi.fn(() => Promise.resolve(0));

      global.strapi = {
        ...strapiMock,
        db: { query: () => ({ create: dbCreate, count: dbCount }) },
        eventHub: {
          emit: vi.fn(),
        },
      } as any;

      const input = {
        name: 'super_admin',
        description: "Have all permissions. Can't be delete",
        code: 'super-admin',
      };

      const createdRole = await create(input);

      expect(dbCreate).toHaveBeenCalledWith({ data: input });
      expect(createdRole).toStrictEqual(input);
    });

    test('Keeps the generated code within 255 characters for a long name', async () => {
      const dbCreate = vi.fn(({ data }) => Promise.resolve(data));
      const dbCount = vi.fn(() => Promise.resolve(0));

      global.strapi = {
        ...strapiMock,
        db: { query: () => ({ create: dbCreate, count: dbCount }) },
        eventHub: {
          emit: vi.fn(),
        },
      } as any;

      // A valid 255-character name: kebab-casing inserts a dash between letters and digits, so it grows to 425
      const name = 'a1'.repeat(85) + 'b'.repeat(85);

      const createdRole = await create({ name });

      expect(createdRole.code.length).toBeLessThanOrEqual(255);
      // The truncated prefix keeps its kebab-case shape and never leaves a dangling dash
      expect(createdRole.code).toMatch(/^a-1-a-1-[a-z0-9-]*[a-z0-9]-[0-9a-z]+$/);
      expect(createdRole.code).not.toContain('--');
    });
  });

  describe('findOne', () => {
    test('Finds a role', async () => {
      const role = {
        id: 1,
        name: 'super_admin',
        description: "Have all permissions. Can't be delete",
      };
      const dbFindOne = vi.fn(({ where: { id } }) => Promise.resolve(_.find([role], { id })));

      global.strapi = {
        ...strapiMock,
        db: { query: () => ({ findOne: dbFindOne }) },
      } as any;

      const foundRole = await findOne({ id: role.id });

      expect(dbFindOne).toHaveBeenCalledWith({ where: { id: role.id } });
      expect(foundRole).toStrictEqual(role);
    });

    test('Finds a role with usersCount', async () => {
      const role = {
        id: 1,
        name: 'super_admin',
        description: "Have all permissions. Can't be delete",
        usersCount: 0,
      };
      const dbFindOne = vi.fn(({ where: { id } }) =>
        Promise.resolve(_.find([_.omit(role, ['usersCount'])], { id }))
      );
      const dbCount = vi.fn(() => Promise.resolve(0));
      global.strapi = {
        ...strapiMock,
        db: { query: () => ({ findOne: dbFindOne, count: dbCount }) },
      } as any;

      const foundRole = await findOneWithUsersCount({ id: role.id });

      expect(dbFindOne).toHaveBeenCalledWith({ where: { id: role.id } });
      expect(dbCount).toHaveBeenCalledWith({ where: { roles: { id: role.id } } });
      expect(foundRole).toStrictEqual(role);
    });
  });

  describe('find', () => {
    test('Finds roles', async () => {
      const roles = [
        {
          id: 1,
          name: 'super_admin',
          description: "Have all permissions. Can't be delete",
        },
      ];

      const dbFind = vi.fn(() => Promise.resolve(roles));

      global.strapi = {
        ...strapiMock,
        db: { query: () => ({ findMany: dbFind }) },
      } as any;

      // @ts-expect-error - fix types
      const foundRoles = await find();

      expect(dbFind).toHaveBeenCalledWith({ where: {} });
      expect(foundRoles).toStrictEqual(roles);
    });
  });

  describe('findAll', () => {
    test('Finds all roles', async () => {
      const roles = [
        {
          id: 1,
          name: 'super_admin',
          description: "Have all permissions. Can't be delete",
          usersCount: 0,
        },
      ];
      const dbCount = vi.fn(() => Promise.resolve(0));
      const findMany = vi.fn(() => Promise.resolve(roles));

      global.strapi = {
        ...strapiMock,
        getModel: () => roleContentType,
        db: { query: () => ({ count: dbCount, findMany }) },
      } as any;

      const params = {
        where: {
          $and: [
            {
              name: {
                $contains: 'super_admin',
              },
            },
          ],
        },
      };

      const foundRoles = await findAllWithUsersCount(params);

      expect(findMany).toHaveBeenCalledWith(params);
      expect(foundRoles).toStrictEqual(roles);
    });
  });

  describe('update', () => {
    test('Updates a role', async () => {
      const role = {
        id: 1,
        name: 'super_admin',
        description: 'AAA',
      };

      const expectedUpdatedRole = {
        id: 1,
        name: 'super_admin_updated',
        description: 'AAA_updated',
      };

      const dbUpdate = vi.fn(() => Promise.resolve(expectedUpdatedRole));
      const dbCount = vi.fn(() => Promise.resolve(0));

      global.strapi = {
        db: { query: () => ({ update: dbUpdate, count: dbCount }) },
        eventHub: {
          emit: vi.fn(),
        },
      } as any;

      const updatedRole = await update(
        {
          id: role.id,
        },
        {
          name: expectedUpdatedRole.name,
          description: expectedUpdatedRole.description,
        }
      );

      expect(dbUpdate).toHaveBeenCalledWith({
        where: {
          id: role.id,
        },
        data: {
          name: expectedUpdatedRole.name,
          description: expectedUpdatedRole.description,
        },
      });

      expect(updatedRole).toStrictEqual(expectedUpdatedRole);
    });

    test('Cannot update code of super admin role', async () => {
      const dbUpdate = vi.fn();
      const dbFind = vi.fn(() => [{ id: '1' }]);
      const dbFindOne = vi.fn(() => ({ id: '1', code: SUPER_ADMIN_CODE }));
      const badRequest = vi.fn(() => {});

      global.strapi = {
        db: { query: () => ({ find: dbFind, findOne: dbFindOne, update: dbUpdate }) },
        admin: { config: { superAdminCode: SUPER_ADMIN_CODE } },
        errors: { badRequest },
        eventHub: {
          emit: vi.fn(),
        },
      } as any;

      await update({ id: 1 }, { code: 'new_code' });

      expect(dbUpdate).toHaveBeenCalledWith({ where: { id: 1 }, data: {} });
    });
  });

  describe('count', () => {
    test('getUsersCount', async () => {
      const roleId = 1;
      const dbCount = vi.fn(() => Promise.resolve(0));
      global.strapi = {
        db: { query: () => ({ count: dbCount }) },
      } as any;

      const usersCount = await getUsersCount(roleId);

      expect(dbCount).toHaveBeenCalledWith({ where: { roles: { id: roleId } } });
      expect(usersCount).toEqual(0);
    });
  });

  describe('delete', () => {
    test('Delete a role', async () => {
      const role = {
        id: 3,
        name: 'admin',
        description: 'Description',
        users: [],
      };
      const dbCount = vi.fn(() => Promise.resolve(0));
      const dbFindOne = vi.fn(() => ({ id: 1, code: SUPER_ADMIN_CODE }));
      const dbDelete = vi.fn(() => Promise.resolve(role));
      const dbDeleteByRolesIds = vi.fn(() => Promise.resolve());

      global.strapi = {
        db: { query: () => ({ delete: dbDelete, count: dbCount, findOne: dbFindOne }) },
        store: () => ({
          get: () => ({
            providers: {
              defaultRole: null,
            },
          }),
        }),
        admin: {
          services: {
            permission: { deleteByRolesIds: dbDeleteByRolesIds },
          },
          config: { superAdminCode: SUPER_ADMIN_CODE },
        },
        eventHub: {
          emit: vi.fn(),
        },
      } as any;

      const deletedRoles = await deleteByIds([role.id]);

      expect(dbCount).toHaveBeenCalledWith({ where: { roles: { id: role.id } } });
      expect(dbDelete).toHaveBeenCalledWith({ where: { id: role.id } });

      expect(deletedRoles).toStrictEqual([role]);
    });

    test('Delete two roles', async () => {
      const roles = [
        {
          id: 1,
          name: 'admin 1',
          description: 'Description',
          users: [],
        },
        {
          id: 2,
          name: 'admin 2',
          description: 'Description',
          users: [],
        },
      ];
      const dbCount = vi.fn(() => Promise.resolve(0));
      const dbFindOne = vi.fn(() => ({ id: 3, code: SUPER_ADMIN_CODE }));
      const rolesIds = roles.map((r) => r.id);
      const dbDelete = vi
        .fn()
        .mockImplementationOnce(() => Promise.resolve(roles[0]))
        .mockImplementationOnce(() => Promise.resolve(roles[1]));

      const dbGetUsersCount = vi.fn(() => Promise.resolve(0));
      const dbDeleteByRolesIds = vi.fn(() => Promise.resolve());

      global.strapi = {
        db: { query: () => ({ delete: dbDelete, count: dbCount, findOne: dbFindOne }) },
        store: () => ({
          get: () => ({
            providers: {
              defaultRole: null,
            },
          }),
        }),
        admin: {
          services: {
            permission: { deleteByRolesIds: dbDeleteByRolesIds },
            role: { getUsersCount: dbGetUsersCount },
          },
          config: { superAdminCode: SUPER_ADMIN_CODE },
        },
        eventHub: {
          emit: vi.fn(),
        },
      } as any;

      const deletedRoles = await deleteByIds(rolesIds);

      expect(dbCount).toHaveBeenNthCalledWith(1, { where: { roles: { id: rolesIds[0] } } });
      expect(dbCount).toHaveBeenNthCalledWith(2, { where: { roles: { id: rolesIds[1] } } });
      expect(dbCount).toHaveBeenCalledTimes(2);
      expect(dbDelete).toHaveBeenNthCalledWith(1, { where: { id: rolesIds[0] } });
      expect(dbDelete).toHaveBeenNthCalledWith(2, { where: { id: rolesIds[1] } });
      expect(deletedRoles).toStrictEqual(roles);
    });

    test('Cannot delete super admin role', async () => {
      const dbFind = vi.fn(() => [{ id: '1' }]);
      const dbFindOne = vi.fn(() => ({ id: '1', code: SUPER_ADMIN_CODE }));

      global.strapi = {
        db: {
          query: () => ({ find: dbFind, findOne: dbFindOne }),
        },
        store: () => ({
          get: () => ({
            providers: {
              defaultRole: null,
            },
          }),
        }),
        admin: { config: { superAdminCode: SUPER_ADMIN_CODE } },
      } as any;

      await expect(() => deleteByIds([1])).rejects.toThrowError(
        'You cannot delete the super admin role'
      );
    });

    test('Cannot delete a role attached to some user', async () => {
      const dbFind = vi.fn(() => []);
      const dbFindOne = vi.fn(() => ({}));
      const dbCount = vi.fn(() => 2);

      global.strapi = {
        db: { query: () => ({ find: dbFind, findOne: dbFindOne, count: dbCount }) },
        store: () => ({
          get: () => ({
            providers: {
              defaultRole: null,
            },
          }),
        }),
        admin: { config: { superAdminCode: SUPER_ADMIN_CODE } },
      } as any;

      await expect(() => deleteByIds([1])).rejects.toThrowError(
        'Some roles are still assigned to some users'
      );
    });
  });

  describe('Count roles', () => {
    test('Count roles without params', async () => {
      const dbCount = vi.fn(() => Promise.resolve(2));
      global.strapi = {
        db: { query: () => ({ count: dbCount }) },
      } as any;

      const amount = await count();

      expect(amount).toBe(2);
      expect(dbCount).toHaveBeenCalledWith({});
    });

    test('Count roles with params', async () => {
      const dbCount = vi.fn(() => Promise.resolve(2));
      global.strapi = {
        db: { query: () => ({ count: dbCount }) },
      } as any;

      const params = { foo: 'bar' };
      const amount = await count(params);

      expect(amount).toBe(2);
      expect(dbCount).toHaveBeenCalledWith(params);
    });
  });

  describe('createRolesIfNoneExist', () => {
    test("Don't create roles if one already exist", async () => {
      const count = vi.fn(() => Promise.resolve(1));
      const create = vi.fn();
      global.strapi = {
        db: { query: () => ({ count, create }) },
      } as any;
      await createRolesIfNoneExist();

      expect(create).toHaveBeenCalledTimes(0);
    });

    test('Create 3 roles if none exist', async () => {
      const actions = [
        {
          actionId: 'action-1',
          subjects: ['country'],
          section: 'contentTypes',
          options: {
            applyToProperties: ['fields'],
          },
        },
      ];

      const permissions = [
        {
          action: 'action-1',
          actionParameters: {},
          subject: 'country',
          properties: { fields: ['name'] },
          conditions: [],
        },
      ];

      const defaultPermissions = [
        {
          action: 'plugin::upload.read',
          actionParameters: {},
          conditions: ['admin::is-creator'],
          properties: {},
          subject: null,
        },
        {
          action: 'plugin::upload.configure-view',
          actionParameters: {},
          conditions: [],
          properties: {},
          subject: null,
        },
        {
          action: 'plugin::upload.assets.create',
          actionParameters: {},
          conditions: [],
          properties: {},
          subject: null,
        },
        {
          action: 'plugin::upload.assets.update',
          actionParameters: {},
          conditions: ['admin::is-creator'],
          properties: {},
          subject: null,
        },
        {
          action: 'plugin::upload.assets.download',
          actionParameters: {},
          conditions: [],
          properties: {},
          subject: null,
        },
        {
          action: 'plugin::upload.assets.copy-link',
          actionParameters: {},
          conditions: [],
          properties: {},
          subject: null,
        },
      ];

      const count = vi.fn(() => Promise.resolve(0));
      let id = 1;
      const create = vi.fn(({ data }) => {
        const res = { ...data, id };
        id += 1;
        return res;
      });
      const values = vi.fn(() => actions);
      const createMany = vi.fn();
      const assignARoleToAll = vi.fn();
      const getPermissionsWithNestedFields = vi.fn(() => permissions.map(createPermission)); // cloned, otherwise it is modified inside createRolesIfNoneExist()

      global.strapi = {
        contentTypes: {
          'plugin::users-permissions.role': {
            uid: 'plugin::users-permissions.role',
            pluginOptions: { 'content-manager': { visible: false } },
          },
        },
        db: { query: () => ({ count, create }) },
        admin: {
          services: {
            permission: {
              actionProvider: { values },
              createMany,
              conditionProvider: { has: () => true },
            },
            condition: { isValidCondition: () => true },
            'content-type': { getPermissionsWithNestedFields },
            user: { assignARoleToAll },
          },
        },
        eventHub: {
          emit: vi.fn(),
        },
      } as any;

      await createRolesIfNoneExist();

      expect(create).toHaveBeenCalledTimes(3);

      expect(create).toHaveBeenNthCalledWith(1, {
        data: {
          name: 'Super Admin',
          code: 'strapi-super-admin',
          description: 'Super Admins can access and manage all features and settings.',
        },
      });

      expect(assignARoleToAll).toHaveBeenCalledWith(1);

      expect(create).toHaveBeenNthCalledWith(2, {
        data: {
          name: 'Editor',
          code: 'strapi-editor',
          description: 'Editors can manage and publish contents including those of other users.',
        },
      });

      expect(create).toHaveBeenNthCalledWith(3, {
        data: {
          name: 'Author',
          code: 'strapi-author',
          description: 'Authors can manage the content they have created.',
        },
      });

      expect(getPermissionsWithNestedFields).toHaveBeenCalledWith(actions, {
        restrictedSubjects: ['plugin::users-permissions.user', 'plugin::users-permissions.role'],
      });

      expect(createMany).toHaveBeenCalledTimes(2);

      expect(createMany).toHaveBeenNthCalledWith(
        1,
        [
          ...permissions,
          ...defaultPermissions.map((d) => ({
            ...d,
            conditions: [],
          })),
        ].map((p) => ({ ...p, role: 2 }))
      );

      expect(createMany).toHaveBeenNthCalledWith(
        2,
        [{ ...permissions[0], conditions: ['admin::is-creator'] }, ...defaultPermissions].map(
          (p) => ({ ...p, role: 3 })
        )
      );
    });
  });

  describe('displayWarningIfNoSuperAdmin', () => {
    test('superAdmin role exists & a user is superAdmin', async () => {
      const findOne = vi.fn(() => ({ id: 1 }));
      const count = vi.fn(() => Promise.resolve(1));
      const exists = vi.fn(() => Promise.resolve(true));
      const warn = vi.fn();

      global.strapi = {
        db: { query: () => ({ findOne, count }) },
        admin: { services: { user: { exists } } },
        log: { warn },
      } as any;

      await displayWarningIfNoSuperAdmin();

      expect(warn).toHaveBeenCalledTimes(0);
    });

    test("superAdmin role doesn't exist", async () => {
      const findOne = vi.fn(() => undefined);
      const count = vi.fn(() => Promise.resolve(0));
      const exists = vi.fn(() => Promise.resolve(false));
      const warn = vi.fn();

      global.strapi = {
        db: { query: () => ({ findOne, count }) },
        admin: { services: { user: { exists } } },
        log: { warn },
      } as any;

      await displayWarningIfNoSuperAdmin();

      expect(warn).toHaveBeenCalledWith("Your application doesn't have a super admin role.");
    });

    test('superAdmin role exist & no user is superAdmin', async () => {
      const findOne = vi.fn(() => ({ id: 1 }));
      const count = vi.fn(() => Promise.resolve(0));
      const exists = vi.fn(() => Promise.resolve(true));
      const warn = vi.fn();

      global.strapi = {
        db: { query: () => ({ findOne, count }) },
        admin: { services: { user: { exists } } },
        log: { warn },
      } as any;

      await displayWarningIfNoSuperAdmin();

      expect(warn).toHaveBeenCalledWith("Your application doesn't have a super admin user.");
    });
  });

  describe('resetSuperAdminPermissions', () => {
    test('No superAdmin role exist', async () => {
      const getSuperAdmin = vi.fn(() => Promise.resolve(undefined));
      const createMany = vi.fn();

      global.strapi = {
        db: { query: () => ({ createMany }) },
        admin: { services: { role: { getSuperAdmin } } },
      } as any;

      await resetSuperAdminPermissions();

      expect(createMany).toHaveBeenCalledTimes(0);
    });

    test('Reset super admin permissions', async () => {
      const roleId = 1;
      const actions = [
        {
          actionId: 'action-1',
          subjects: ['country'],
          section: 'contentTypes',
          options: {
            applyToProperties: ['fields'],
          },
        },
        {
          actionId: 'action-test2',
          subjects: ['test-subject1', 'test-subject2'],
          section: 'settings',
        },
        {
          actionId: 'action-test3',
          subjects: null,
          section: 'plugin',
        },
      ];
      const permissions = [
        {
          action: 'action-1',
          actionParameters: {},
          subject: 'country',
          properties: { fields: ['name'] },
          conditions: [],
        },
        {
          action: 'action-test2',
          actionParameters: {},
          subject: 'test-subject1',
          properties: {},
          conditions: [],
        },
        {
          action: 'action-test2',
          actionParameters: {},
          subject: 'test-subject2',
          properties: {},
          conditions: [],
        },
        {
          action: 'action-test3',
          actionParameters: {},
          subject: null,
          properties: {},
          conditions: [],
        },
      ];
      const values = vi.fn(() => actions);
      const getAllConditions = vi.fn(() => []);
      const findMany = vi.fn(() => [{ action: 'action-2', id: 2, properties: {} }]);
      const getPermissionsWithNestedFields = vi.fn(() => [
        {
          ...permissions[0],
        },
      ]); // cloned, otherwise it is modified inside resetSuperAdminPermissions()
      const deleteByIds = vi.fn();
      const getSuperAdmin = vi.fn(() => Promise.resolve({ id: roleId }));
      const createMany = vi.fn(() => []);
      const isValidCondition = vi.fn(() => true);

      global.strapi = {
        admin: {
          services: {
            permission: {
              createMany,
              findMany,
              actionProvider: { values },
              conditionProvider: { getAll: getAllConditions },
              deleteByIds,
            },
            condition: { isValidCondition },
            'content-type': { getPermissionsWithNestedFields },
            role: { getSuperAdmin },
            'api-token-admin': { syncPermissionsForRole: vi.fn() },
          },
        },
        eventHub: {
          emit: vi.fn(),
        },
      } as any;

      await resetSuperAdminPermissions();

      expect(deleteByIds).toHaveBeenCalledWith([2]);
      expect(createMany).toHaveBeenCalledWith(
        expect.arrayContaining(
          permissions.map((perm) => ({
            ...perm,
            role: roleId,
          }))
        )
      );
    });
  });

  describe('Assign permissions', () => {
    test('Delete previous permissions', async () => {
      const createMany = vi.fn(() => Promise.resolve([]));
      const getSuperAdmin = vi.fn(() => Promise.resolve({ id: 0 }));
      const sendDidUpdateRolePermissions = vi.fn();
      const findMany = vi.fn(() => Promise.resolve([{ id: 3 }]));
      const deleteByIds = vi.fn();
      const values = vi.fn(() => []);

      global.strapi = {
        admin: {
          services: {
            metrics: { sendDidUpdateRolePermissions },
            permission: { findMany, createMany, actionProvider: { values }, deleteByIds },
            role: { getSuperAdmin },
            'api-token-admin': { syncPermissionsForRole: vi.fn() },
          },
        },
        eventHub: {
          emit: vi.fn(),
        },
      } as any;

      await assignPermissions(1, []);

      expect(deleteByIds).toHaveBeenCalledWith([3]);
    });

    test('Create new permissions', async () => {
      const permissions = Array(5)
        .fill(0)
        .map((v, i) => ({ action: `action-${i}` }));

      const createMany = vi.fn(() => Promise.resolve([]));
      const getSuperAdmin = vi.fn(() => Promise.resolve({ id: 0 }));
      const sendDidUpdateRolePermissions = vi.fn();
      const findMany = vi.fn(() => Promise.resolve([]));
      const values = vi.fn(() => permissions.map((perm) => ({ actionId: perm.action })));
      const conditionProviderHas = vi.fn((cond) => cond === 'cond');
      const syncPermissionsForRole = vi.fn();

      global.strapi = {
        admin: {
          services: {
            metrics: { sendDidUpdateRolePermissions },
            role: { getSuperAdmin },
            'api-token-admin': { syncPermissionsForRole },
            permission: {
              findMany,
              createMany,
              actionProvider: { values },
              conditionProvider: {
                has: conditionProviderHas,
                values: vi.fn(() => [{ id: 'admin::is-creator' }]),
              },
            },
          },
        },
        eventHub: {
          emit: vi.fn(),
        },
      } as any;

      const permissionsToAssign: any = [...permissions];
      permissionsToAssign[4] = {
        ...permissions[4],
        conditions: ['cond'],
      };

      await assignPermissions(1, permissionsToAssign);

      expect(createMany).toHaveBeenCalledTimes(1);
      expect(createMany).toHaveBeenCalledWith([
        {
          action: 'action-0',
          actionParameters: {},
          conditions: [],
          properties: {},
          role: 1,
          subject: null,
        },
        {
          action: 'action-1',
          actionParameters: {},
          conditions: [],
          properties: {},
          role: 1,
          subject: null,
        },
        {
          action: 'action-2',
          actionParameters: {},
          conditions: [],
          properties: {},
          role: 1,
          subject: null,
        },
        {
          action: 'action-3',
          actionParameters: {},
          conditions: [],
          properties: {},
          role: 1,
          subject: null,
        },
        {
          action: 'action-4',
          actionParameters: {},
          conditions: ['cond'],
          properties: {},
          role: 1,
          subject: null,
        },
      ]);
      expect(syncPermissionsForRole).toHaveBeenCalledTimes(1);
      expect(syncPermissionsForRole).toHaveBeenCalledWith(1);
    });

    test('Filter internal permissions on create', async () => {
      const permissions = [
        { action: `action-0` },
        { action: `action-1` },
        { action: 'action-internal' },
      ] as any;

      const createMany = vi.fn(() => Promise.resolve([]));
      const getSuperAdmin = vi.fn(() => Promise.resolve({ id: 0 }));
      const sendDidUpdateRolePermissions = vi.fn();
      const findMany = vi.fn(() => Promise.resolve([]));
      const values = vi.fn(() => [
        { actionId: 'action-0', section: 'plugins' },
        { actionId: 'action-1', section: 'plugins' },
        { actionId: 'action-internal', section: 'internal' },
      ]);
      const conditionProviderHas = vi.fn((cond) => cond === 'cond');
      const syncPermissionsForRole = vi.fn();

      global.strapi = {
        admin: {
          services: {
            metrics: { sendDidUpdateRolePermissions },
            role: { getSuperAdmin },
            'api-token-admin': { syncPermissionsForRole },
            permission: {
              findMany,
              createMany,
              actionProvider: { values },
              conditionProvider: {
                has: conditionProviderHas,
                values: vi.fn(() => [{ id: 'admin::is-creator' }]),
              },
            },
          },
        },
        eventHub: {
          emit: vi.fn(),
        },
      } as any;

      await assignPermissions(1, permissions);

      expect(createMany).toHaveBeenCalledTimes(1);
      expect(createMany).toHaveBeenCalledWith([
        {
          action: 'action-0',
          actionParameters: {},
          conditions: [],
          properties: {},
          role: 1,
          subject: null,
        },
        {
          action: 'action-1',
          actionParameters: {},
          conditions: [],
          properties: {},
          role: 1,
          subject: null,
        },
      ]);
      expect(syncPermissionsForRole).toHaveBeenCalledTimes(1);
      expect(syncPermissionsForRole).toHaveBeenCalledWith(1);
    });

    test('Filter internal permissions on delete', async () => {
      const permissions = [{ action: `action-0` }, { action: `action-1` }] as any;

      const createMany = vi.fn(() => Promise.resolve(permissions));
      const getSuperAdmin = vi.fn(() => Promise.resolve({ id: 0 }));
      const sendDidUpdateRolePermissions = vi.fn();
      const findMany = vi.fn(() =>
        Promise.resolve([{ action: 'action-internal', id: 1, properties: {} }])
      );
      const deleteByIds = vi.fn();
      const syncPermissionsForRole = vi.fn();
      const values = vi.fn(() => [
        { actionId: 'action-0', section: 'plugins' },
        { actionId: 'action-1', section: 'plugins' },
        { actionId: 'action-internal', section: 'internal' },
      ]);
      const conditionProviderHas = vi.fn((cond) => cond === 'cond');

      global.strapi = {
        admin: {
          services: {
            metrics: { sendDidUpdateRolePermissions },
            role: { getSuperAdmin },
            'api-token-admin': { syncPermissionsForRole },
            permission: {
              deleteByIds,
              findMany,
              createMany,
              actionProvider: { values },
              conditionProvider: {
                has: conditionProviderHas,
                values: vi.fn(() => [{ id: 'admin::is-creator' }]),
              },
            },
          },
        },
        eventHub: {
          emit: vi.fn(),
        },
      } as any;

      const returnedPermissions = await assignPermissions(1, permissions);
      expect(deleteByIds).toHaveBeenCalledTimes(0);
      expect(returnedPermissions).toEqual(permissions);
    });

    test('Does not delete and recreate a permission that only changed order', async () => {
      const createMany = vi.fn(() => Promise.resolve([]));
      const deleteByIds = vi.fn();
      const sendDidUpdateRolePermissions = vi.fn();
      const syncPermissionsForRole = vi.fn();
      const findMany = vi.fn(() =>
        Promise.resolve([
          {
            id: 3,
            action: 'action-0',
            subject: 'api::article.article',
            properties: { fields: ['body', 'title'] },
            conditions: ['admin::has-same-role-as-creator', 'admin::is-creator'],
            actionParameters: {},
            role: { id: 1 },
          },
        ])
      );

      global.strapi = {
        admin: {
          services: {
            metrics: { sendDidUpdateRolePermissions },
            role: { getSuperAdmin: vi.fn(() => Promise.resolve({ id: 0 })) },
            'api-token-admin': { syncPermissionsForRole },
            permission: {
              findMany,
              createMany,
              deleteByIds,
              actionProvider: {
                values: vi.fn(() => [
                  {
                    actionId: 'action-0',
                    section: 'contentTypes',
                    subjects: ['api::article.article'],
                  },
                ]),
              },
            },
          },
        },
        eventHub: {
          emit: vi.fn(),
        },
      } as any;

      await assignPermissions(1, [
        {
          action: 'action-0',
          subject: 'api::article.article',
          properties: { fields: ['title', 'body'] },
          conditions: ['admin::is-creator', 'admin::has-same-role-as-creator'],
        },
      ] as any);

      expect(deleteByIds).not.toHaveBeenCalled();
      expect(createMany).not.toHaveBeenCalled();
      expect(sendDidUpdateRolePermissions).not.toHaveBeenCalled();
      expect(syncPermissionsForRole).not.toHaveBeenCalled();
    });
  });

  describe('checkPermissionsCeiling', () => {
    const ROLE_ID = 7;
    const READ = 'plugin::content-manager.explorer.read';
    const CREATE = 'plugin::content-manager.explorer.create';
    const ARTICLE = 'api::article.article';
    const AUTHOR = 'api::author.author';

    const user = { id: 1, roles: [{ code: 'strapi-editor' }] } as any;
    const superAdminUser = { id: 2, roles: [{ code: SUPER_ADMIN_CODE }] } as any;

    const setupStrapi = ({
      userPermissions = [],
      rolePermissions = [],
      localizedSubjects = [],
      registeredConditions,
    }: {
      userPermissions?: any[];
      rolePermissions?: any[];
      localizedSubjects?: string[];
      /** Every condition is registered when not given */
      registeredConditions?: string[];
    } = {}) => {
      const findUserPermissions = vi.fn(() => Promise.resolve(toPermission(userPermissions)));
      const findMany = vi.fn(() => Promise.resolve(toPermission(rolePermissions)));
      const actionProvider = {
        has: () => true,
        appliesToProperty: vi.fn(
          async (property: string, _action: string, subject?: string | null) =>
            property === 'locales' && !!subject && localizedSubjects.includes(subject)
        ),
      };

      const conditionProvider = {
        has: (condition: string) =>
          registeredConditions === undefined || registeredConditions.includes(condition),
      };

      global.strapi = {
        admin: {
          services: {
            permission: { findUserPermissions, findMany, actionProvider, conditionProvider },
          },
        },
      } as any;

      return { findUserPermissions, findMany };
    };

    const expectForbidden = async (promise: Promise<unknown>, rejectedPermissions: unknown[]) => {
      let error: any;

      try {
        await promise;
      } catch (e) {
        error = e;
      }

      expect(error).toBeInstanceOf(errors.ForbiddenError);
      expect(error.message).toBe('You cannot grant permissions you do not hold yourself');
      expect(error.details).toEqual({ permissions: rejectedPermissions });
    };

    test('Super admins are not checked', async () => {
      const { findUserPermissions, findMany } = setupStrapi();

      await expect(
        checkPermissionsCeiling({ user: superAdminUser }, ROLE_ID, [
          { action: READ, subject: ARTICLE },
        ])
      ).resolves.toBeUndefined();

      expect(findUserPermissions).not.toHaveBeenCalled();
      expect(findMany).not.toHaveBeenCalled();
    });

    test('Loads the requester permissions and the current role permissions', async () => {
      const { findUserPermissions, findMany } = setupStrapi({
        userPermissions: [{ action: READ, subject: ARTICLE }],
      });

      await checkPermissionsCeiling({ user }, ROLE_ID, [{ action: READ, subject: ARTICLE }]);

      expect(findUserPermissions).toHaveBeenCalledWith(user);
      expect(findMany).toHaveBeenCalledWith({ where: { role: { id: ROLE_ID } } });
    });

    test('Rejects a permission the requester does not hold (action + subject)', async () => {
      setupStrapi({ userPermissions: [{ action: READ, subject: ARTICLE }] });

      await expectForbidden(
        checkPermissionsCeiling({ user }, ROLE_ID, [
          { action: READ, subject: ARTICLE },
          { action: READ, subject: AUTHOR },
          { action: CREATE, subject: ARTICLE },
        ]),
        [
          { action: READ, subject: AUTHOR, properties: {}, conditions: [] },
          { action: CREATE, subject: ARTICLE, properties: {}, conditions: [] },
        ]
      );
    });

    test('Matches null and undefined subjects', async () => {
      setupStrapi({ userPermissions: [{ action: 'admin::roles.read', subject: null }] });

      await expect(
        checkPermissionsCeiling({ user }, ROLE_ID, [{ action: 'admin::roles.read' }])
      ).resolves.toBeUndefined();
    });

    test('Checks the other properties when a property lists no value', async () => {
      setupStrapi({
        userPermissions: [
          { action: READ, subject: ARTICLE, properties: { fields: ['title'], locales: ['en'] } },
        ],
      });

      await expectForbidden(
        checkPermissionsCeiling({ user }, ROLE_ID, [
          { action: READ, subject: ARTICLE, properties: { fields: ['body'], locales: [] } },
        ]),
        [
          {
            action: READ,
            subject: ARTICLE,
            properties: { fields: ['body'], locales: [] },
            conditions: [],
          },
        ]
      );
    });

    describe('a held permission with no locales key', () => {
      // Stored without a `locales` key, as `assignPermissions` can leave it
      const heldTitle = { action: READ, subject: ARTICLE, properties: { fields: ['title'] } };
      const requestTitle = (locales: string[] | null) => ({
        action: READ,
        subject: ARTICLE,
        properties: { fields: ['title'], locales },
      });
      const rejected = (locales: string[] | null) => ({ ...requestTitle(locales), conditions: [] });

      test('Holds no locale on a localized subject, as i18n enforces it', async () => {
        setupStrapi({ userPermissions: [heldTitle], localizedSubjects: [ARTICLE] });

        await expectForbidden(checkPermissionsCeiling({ user }, ROLE_ID, [requestTitle(null)]), [
          rejected(null),
        ]);
        await expectForbidden(checkPermissionsCeiling({ user }, ROLE_ID, [requestTitle(['fr'])]), [
          rejected(['fr']),
        ]);
      });

      test('Ignores locales on a subject that is not localized', async () => {
        setupStrapi({ userPermissions: [heldTitle] });

        await expect(
          checkPermissionsCeiling({ user }, ROLE_ID, [requestTitle(['fr'])])
        ).resolves.toBeUndefined();
      });

      test('Holds no locale on a token whose owner is a super admin', async () => {
        // i18n's super-admin skip reads `context.user`, which the engine never sets
        setupStrapi({ localizedSubjects: [ARTICLE] });

        await expectForbidden(
          checkPermissionsCeiling(
            { tokenPermissions: toPermission([heldTitle]), owner: superAdminUser },
            ROLE_ID,
            [requestTitle(['fr'])]
          ),
          [rejected(['fr'])]
        );
      });

      test('Holds no locale on a token whose owner is not a super admin', async () => {
        setupStrapi({
          userPermissions: [{ action: READ, subject: ARTICLE, properties: { locales: null } }],
          localizedSubjects: [ARTICLE],
        });

        await expectForbidden(
          checkPermissionsCeiling(
            { tokenPermissions: toPermission([heldTitle]), owner: user },
            ROLE_ID,
            [requestTitle(['fr'])]
          ),
          [rejected(['fr'])]
        );
      });
    });

    describe('unregistered conditions', () => {
      const UNKNOWN = 'admin::does-not-exist';
      const IS_CREATOR = 'admin::is-creator';
      const readTitle = (conditions: string[]) => ({
        action: READ,
        subject: ARTICLE,
        properties: { fields: ['title'] },
        conditions,
      });

      const setup = (options: { userPermissions?: any[]; rolePermissions?: any[] }) =>
        setupStrapi({ ...options, registeredConditions: [IS_CREATOR] });

      test('Does not count a held permission under an unregistered condition only', async () => {
        setup({ userPermissions: [readTitle([UNKNOWN])] });

        await expectForbidden(checkPermissionsCeiling({ user }, ROLE_ID, [readTitle([UNKNOWN])]), [
          readTitle([UNKNOWN]),
        ]);
      });

      test('Checks a requested unregistered condition as no condition', async () => {
        // Regression guard: already rejected before, since the held condition differs
        setup({ userPermissions: [readTitle([IS_CREATOR])] });

        await expectForbidden(checkPermissionsCeiling({ user }, ROLE_ID, [readTitle([UNKNOWN])]), [
          readTitle([UNKNOWN]),
        ]);
      });

      test('Ignores a requested unregistered condition next to a held one', async () => {
        setup({ userPermissions: [readTitle([IS_CREATOR])] });

        await expect(
          checkPermissionsCeiling({ user }, ROLE_ID, [readTitle([IS_CREATOR, UNKNOWN])])
        ).resolves.toBeUndefined();
      });

      test('Does not count a held permission with action parameters', async () => {
        // The engine registers it as `<action>?from=1`, which grants nothing on the plain action
        setup({ userPermissions: [{ ...readTitle([]), actionParameters: { from: 1 } }] });

        await expectForbidden(checkPermissionsCeiling({ user }, ROLE_ID, [readTitle([])]), [
          readTitle([]),
        ]);
      });

      test('Lets a permission the role already carries be resent as it is', async () => {
        // Regression guard: the row is left unchanged
        setup({ rolePermissions: [readTitle([UNKNOWN])] });

        await expect(
          checkPermissionsCeiling({ user }, ROLE_ID, [readTitle([UNKNOWN])])
        ).resolves.toBeUndefined();
      });

      test('Lets a permission be resent when it is stored as a row the role carries', async () => {
        // Stored without the unregistered condition, so the row is deleted and re-added as it was
        setup({ rolePermissions: [readTitle([IS_CREATOR])] });

        await expect(
          checkPermissionsCeiling({ user }, ROLE_ID, [readTitle([IS_CREATOR, UNKNOWN])])
        ).resolves.toBeUndefined();
      });
    });

    describe('admin token requesters', () => {
      // Everything a super admin would hold on articles, but not on authors
      const superAdminLikeTokenPermissions = toPermission([
        { action: READ, subject: ARTICLE },
        { action: CREATE, subject: ARTICLE },
        { action: 'admin::roles.update' },
      ]);

      describe('owned by a super admin', () => {
        const owner = superAdminUser;

        test('Checks the token permissions only', async () => {
          const { findUserPermissions, findMany } = setupStrapi();

          await expectForbidden(
            checkPermissionsCeiling(
              { tokenPermissions: superAdminLikeTokenPermissions, owner },
              ROLE_ID,
              [
                { action: READ, subject: ARTICLE },
                { action: READ, subject: AUTHOR },
              ]
            ),
            [{ action: READ, subject: AUTHOR, properties: {}, conditions: [] }]
          );

          expect(findUserPermissions).not.toHaveBeenCalled();
          expect(findMany).toHaveBeenCalledWith({ where: { role: { id: ROLE_ID } } });
        });

        test('Allows permissions the token holds', async () => {
          const { findUserPermissions } = setupStrapi();

          await expect(
            checkPermissionsCeiling(
              { tokenPermissions: superAdminLikeTokenPermissions, owner },
              ROLE_ID,
              [
                { action: READ, subject: ARTICLE },
                { action: CREATE, subject: ARTICLE, properties: { fields: ['title'] } },
              ]
            )
          ).resolves.toBeUndefined();

          expect(findUserPermissions).not.toHaveBeenCalled();
        });

        test('Rejects everything when the token holds no permission', async () => {
          setupStrapi();

          await expectForbidden(
            checkPermissionsCeiling({ tokenPermissions: [], owner }, ROLE_ID, [
              { action: READ, subject: ARTICLE },
            ]),
            [{ action: READ, subject: ARTICLE, properties: {}, conditions: [] }]
          );
        });
      });

      describe('owned by another admin', () => {
        const owner = user;

        test('Rejects a permission the token holds but its owner no longer does', async () => {
          const { findUserPermissions } = setupStrapi({
            userPermissions: [{ action: READ, subject: ARTICLE }],
          });

          await expectForbidden(
            checkPermissionsCeiling(
              { tokenPermissions: superAdminLikeTokenPermissions, owner },
              ROLE_ID,
              [
                { action: READ, subject: ARTICLE },
                { action: CREATE, subject: ARTICLE },
              ]
            ),
            [{ action: CREATE, subject: ARTICLE, properties: {}, conditions: [] }]
          );

          expect(findUserPermissions).toHaveBeenCalledWith(owner);
        });

        test('Rejects a permission the owner holds but the token does not', async () => {
          setupStrapi({ userPermissions: [{ action: READ, subject: AUTHOR }] });

          await expectForbidden(
            checkPermissionsCeiling(
              { tokenPermissions: superAdminLikeTokenPermissions, owner },
              ROLE_ID,
              [{ action: READ, subject: AUTHOR }]
            ),
            [{ action: READ, subject: AUTHOR, properties: {}, conditions: [] }]
          );
        });

        test('Lists a permission both lack once', async () => {
          setupStrapi({ userPermissions: [{ action: READ, subject: ARTICLE }] });

          await expectForbidden(
            checkPermissionsCeiling({ tokenPermissions: [], owner }, ROLE_ID, [
              { action: READ, subject: AUTHOR },
            ]),
            [{ action: READ, subject: AUTHOR, properties: {}, conditions: [] }]
          );
        });

        test('Allows a permission both the token and its owner hold', async () => {
          setupStrapi({ userPermissions: [{ action: READ, subject: ARTICLE }] });

          await expect(
            checkPermissionsCeiling(
              { tokenPermissions: superAdminLikeTokenPermissions, owner },
              ROLE_ID,
              [{ action: READ, subject: ARTICLE, properties: { fields: ['title'] } }]
            )
          ).resolves.toBeUndefined();
        });
      });
    });

    describe('permissions the role already holds', () => {
      test('Preserves an existing out-of-scope permission and only rejects new ones', async () => {
        setupStrapi({
          userPermissions: [{ action: READ, subject: ARTICLE }],
          rolePermissions: [
            {
              id: 1,
              role: ROLE_ID,
              action: CREATE,
              subject: ARTICLE,
              properties: { fields: ['title'] },
            },
          ],
        });

        await expect(
          checkPermissionsCeiling({ user }, ROLE_ID, [
            { action: READ, subject: ARTICLE },
            { action: CREATE, subject: ARTICLE, properties: { fields: ['title'] } },
          ])
        ).resolves.toBeUndefined();

        await expectForbidden(
          checkPermissionsCeiling({ user }, ROLE_ID, [
            { action: READ, subject: ARTICLE },
            { action: CREATE, subject: ARTICLE, properties: { fields: ['title'] } },
            { action: CREATE, subject: AUTHOR },
          ]),
          [{ action: CREATE, subject: AUTHOR, properties: {}, conditions: [] }]
        );
      });

      test('Rejects a change to an existing out-of-scope permission', async () => {
        setupStrapi({
          userPermissions: [{ action: READ, subject: ARTICLE }],
          rolePermissions: [
            {
              id: 1,
              role: ROLE_ID,
              action: CREATE,
              subject: ARTICLE,
              properties: { fields: ['title'] },
            },
          ],
        });

        await expectForbidden(
          checkPermissionsCeiling({ user }, ROLE_ID, [
            { action: CREATE, subject: ARTICLE, properties: { fields: ['title', 'body'] } },
          ]),
          [
            {
              action: CREATE,
              subject: ARTICLE,
              properties: { fields: ['title', 'body'] },
              conditions: [],
            },
          ]
        );
      });

      test('Treats a reordered existing permission as unchanged', async () => {
        setupStrapi({
          userPermissions: [{ action: READ, subject: ARTICLE }],
          rolePermissions: [
            {
              id: 1,
              role: ROLE_ID,
              action: CREATE,
              subject: ARTICLE,
              properties: { fields: ['body', 'title'], locales: ['fr', 'en'] },
              conditions: ['admin::has-same-role-as-creator', 'admin::is-creator'],
            },
          ],
        });

        await expect(
          checkPermissionsCeiling({ user }, ROLE_ID, [
            {
              action: CREATE,
              subject: ARTICLE,
              properties: { fields: ['title', 'body'], locales: ['en', 'fr'] },
              conditions: ['admin::is-creator', 'admin::has-same-role-as-creator'],
            },
          ])
        ).resolves.toBeUndefined();

        await expectForbidden(
          checkPermissionsCeiling({ user }, ROLE_ID, [
            {
              action: CREATE,
              subject: ARTICLE,
              properties: { fields: ['title', 'body', 'slug'], locales: ['en', 'fr'] },
              conditions: ['admin::is-creator', 'admin::has-same-role-as-creator'],
            },
          ]),
          [
            {
              action: CREATE,
              subject: ARTICLE,
              properties: { fields: ['title', 'body', 'slug'], locales: ['en', 'fr'] },
              conditions: ['admin::is-creator', 'admin::has-same-role-as-creator'],
            },
          ]
        );
      });

      test('Treats duplicated members as the same set', async () => {
        setupStrapi({
          userPermissions: [{ action: READ, subject: ARTICLE }],
          rolePermissions: [
            {
              id: 1,
              role: ROLE_ID,
              action: CREATE,
              subject: ARTICLE,
              properties: { fields: ['title'] },
            },
          ],
        });

        await expect(
          checkPermissionsCeiling({ user }, ROLE_ID, [
            { action: CREATE, subject: ARTICLE, properties: { fields: ['title', 'title'] } },
          ])
        ).resolves.toBeUndefined();
      });

      test('Allows removing an existing out-of-scope permission', async () => {
        setupStrapi({
          userPermissions: [{ action: READ, subject: ARTICLE }],
          rolePermissions: [{ id: 1, role: ROLE_ID, action: CREATE, subject: ARTICLE }],
        });

        await expect(checkPermissionsCeiling({ user }, ROLE_ID, [])).resolves.toBeUndefined();
      });
    });
  });

  describe('addPermissions', () => {
    test('Add role to permissions and call permissions service creation method', async () => {
      const createMany = vi.fn(() => []);
      const roleId = 1;
      const permissions = [
        {
          action: 'someAction',
          actionParameters: {},
          conditions: [],
          properties: { fields: [] },
          subject: null,
        },
      ];

      const input = toPermission(permissions);

      const expected = permissions.map((permission) => ({
        ...permission,
        role: roleId,
      }));

      global.strapi = {
        admin: {
          services: {
            permission: {
              createMany,
            },
            condition: { isValidCondition: () => true },
          },
        },
      } as any;

      await addPermissions(roleId, input);

      expect(createMany).toHaveBeenCalledWith(expect.arrayContaining(expected));
    });
  });

  test('sanitizeRole removes users and permissions', () => {
    const role = {
      id: 1,
      name: 'Some Role',
      users: [{ id: 1 }],
      permissions: [{ id: 1 }],
    };

    expect(sanitizeRole(role)).toEqual({
      id: 1,
      name: 'Some Role',
    });
  });
});
