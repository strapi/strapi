/**
 * Pins how the stage permissions service uses the admin role and permission services. The same
 * mock is handed to the factory and stubbed as the global `strapi`, so these tests hold whether
 * the code reads the injected instance or the global one.
 */
import type { Core } from '@strapi/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { STAGE_TRANSITION_UID } from '../../constants/workflows';
import stagePermissionsService from '../stage-permissions';

const createStrapiMock = () => {
  const role = {
    addPermissions: vi.fn(async (roleId: number, permissions: unknown[]) =>
      permissions.map((_, index) => ({ id: roleId * 10 + index }))
    ),
  };
  const permission = { deleteByIds: vi.fn(async () => {}) };
  const admin: Record<string, unknown> = { 'admin::role': role, 'admin::permission': permission };

  const strapi = {
    service: vi.fn((uid: string) => admin[uid]),
    requestContext: { get: vi.fn(() => undefined) },
  };

  return { strapi, role, permission };
};

describe('review-workflows stage permissions service', () => {
  let mock: ReturnType<typeof createStrapiMock>;
  let service: ReturnType<typeof stagePermissionsService>;

  beforeEach(() => {
    mock = createStrapiMock();
    vi.stubGlobal('strapi', mock.strapi);
    service = stagePermissionsService({ strapi: mock.strapi as unknown as Core.Strapi });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('register adds a "from" stage permission to the role', async () => {
    await expect(
      service.register({ roleId: 1, action: STAGE_TRANSITION_UID, fromStage: 3 })
    ).resolves.toEqual([{ id: 10 }]);

    expect(mock.strapi.service).toHaveBeenCalledWith('admin::role');
    expect(mock.role.addPermissions).toHaveBeenCalledWith(1, [
      { action: STAGE_TRANSITION_UID, actionParameters: { from: 3 } },
    ]);
  });

  it('registerTo adds a "to" stage permission to the role', async () => {
    await expect(
      service.registerTo({ roleId: 2, action: STAGE_TRANSITION_UID, toStage: 3 })
    ).resolves.toEqual([{ id: 20 }]);

    expect(mock.role.addPermissions).toHaveBeenCalledWith(2, [
      { action: STAGE_TRANSITION_UID, actionParameters: { to: 3 } },
    ]);
  });

  it('registerMany and registerManyTo register each permission', async () => {
    await expect(
      service.registerMany([
        { roleId: 1, action: STAGE_TRANSITION_UID, fromStage: 3 },
        { roleId: 2, action: STAGE_TRANSITION_UID, fromStage: 3 },
      ])
    ).resolves.toEqual([[{ id: 10 }], [{ id: 20 }]]);
    await expect(
      service.registerManyTo([{ roleId: 3, action: STAGE_TRANSITION_UID, toStage: 4 }])
    ).resolves.toEqual([[{ id: 30 }]]);

    expect(mock.role.addPermissions).toHaveBeenCalledTimes(3);
  });

  it.each(['register', 'registerTo'] as const)('%s rejects an unknown action', async (method) => {
    await expect(
      service[method]({ roleId: 1, action: 'admin::unknown', fromStage: 3, toStage: 3 })
    ).rejects.toMatchObject({ name: 'ApplicationError', message: 'Invalid action admin::unknown' });
    expect(mock.role.addPermissions).not.toHaveBeenCalled();
  });

  it('unregister deletes the permissions by id', async () => {
    await service.unregister([{ id: 4 }, { id: 5 }]);

    expect(mock.strapi.service).toHaveBeenCalledWith('admin::permission');
    expect(mock.permission.deleteByIds).toHaveBeenCalledWith([4, 5]);
  });
});
