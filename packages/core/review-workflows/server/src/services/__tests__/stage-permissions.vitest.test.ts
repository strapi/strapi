import { beforeEach, describe, expect, test, vi } from 'vitest';
import stagePermissionsFactory from '../stage-permissions';
import { STAGE_TRANSITION_UID } from '../../constants/workflows';

const { createMany } = vi.hoisted(() => ({ createMany: vi.fn() }));

/**
 * The admin `role.addPermissions` hands the permissions, with their role, to the admin
 * `permission.createMany`, which stores each row and returns `toPermission(rows)`.
 */
vi.mock('../../utils', () => ({
  getAdminService: vi.fn((name: string) => {
    if (name === 'role') {
      return {
        addPermissions: (roleId: number, permissions: object[]) =>
          createMany(permissions.map((permission) => ({ ...permission, role: roleId }))),
      };
    }

    return {};
  }),
}));

/**
 * What the admin `permission.createMany` (`admin/server/src/services/permission/queries.ts`) returns
 * for one stored `admin::permission` row: `toPermission` keeps the `permissionFields` of the row
 * (`admin/server/src/domain/permission/index.ts`), over the defaults `subject: null`,
 * `properties: {}` and `conditions: []`. The stored row has no populated `role` nor `apiToken`.
 */
const createdPermission = (actionParameters: Record<string, number>) => ({
  id: 12,
  action: STAGE_TRANSITION_UID,
  actionParameters,
  subject: null,
  properties: {},
  conditions: [],
});

const contractFields = ['action', 'actionParameters', 'conditions', 'id', 'properties', 'subject'];

describe('stage-permissions service', () => {
  const service = stagePermissionsFactory({ strapi: {} as any });

  beforeEach(() => {
    createMany.mockReset();
  });

  test('register resolves the created admin permissions with the fields of the contract', async () => {
    createMany.mockImplementation(async () => [createdPermission({ from: 3 })]);

    const permissions = await service.register({
      roleId: 2,
      action: STAGE_TRANSITION_UID,
      fromStage: 3,
    });

    expect(createMany).toHaveBeenCalledWith([
      { action: STAGE_TRANSITION_UID, actionParameters: { from: 3 }, role: 2 },
    ]);
    expect(permissions).toEqual([
      {
        id: 12,
        action: STAGE_TRANSITION_UID,
        actionParameters: { from: 3 },
        subject: null,
        properties: {},
        conditions: [],
      },
    ]);
    expect(Object.keys(permissions[0]).sort()).toEqual(contractFields);
  });

  test('registerTo resolves the created admin permissions with the fields of the contract', async () => {
    createMany.mockImplementation(async () => [createdPermission({ to: 4 })]);

    const permissions = await service.registerTo({
      roleId: 2,
      action: STAGE_TRANSITION_UID,
      toStage: 4,
    });

    expect(createMany).toHaveBeenCalledWith([
      { action: STAGE_TRANSITION_UID, actionParameters: { to: 4 }, role: 2 },
    ]);
    expect(permissions).toEqual([
      {
        id: 12,
        action: STAGE_TRANSITION_UID,
        actionParameters: { to: 4 },
        subject: null,
        properties: {},
        conditions: [],
      },
    ]);
    expect(Object.keys(permissions[0]).sort()).toEqual(contractFields);
  });

  test('register rejects an action other than the stage transition', async () => {
    await expect(
      service.register({ roleId: 2, action: 'admin::other', fromStage: 3 })
    ).rejects.toThrow('Invalid action admin::other');
    expect(createMany).not.toHaveBeenCalled();
  });
});
