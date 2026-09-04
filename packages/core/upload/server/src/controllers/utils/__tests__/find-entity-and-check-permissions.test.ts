import type { Core } from '@strapi/types';

import { ACTIONS, FILE_MODEL_UID } from '../../../constants';
import { findEntityAndCheckPermissions } from '../find-entity-and-check-permissions';

describe('findEntityAndCheckPermissions', () => {
  test('resolves the entity and permissions from the injected Strapi instance', async () => {
    const file = { id: 1, createdBy: { id: 9 } };
    const findOne = jest.fn().mockResolvedValue(file);
    const findUser = jest.fn().mockResolvedValue({ id: 9, roles: [{ id: 2 }] });
    const cannot = jest.fn().mockReturnValue(false);
    const toSubject = jest.fn((entity: unknown) => entity);
    const permissionsManager = {
      action: ACTIONS.update,
      ability: { cannot },
      toSubject,
    };
    const createPermissionsManager = jest.fn().mockReturnValue(permissionsManager);
    const uploadPlugin = {
      service: jest.fn().mockReturnValue({ findOne }),
    };
    const strapi = {
      plugin: jest.fn().mockReturnValue(uploadPlugin),
      service: jest.fn((uid: string) => {
        if (uid === 'admin::permission') return { createPermissionsManager };
        if (uid === 'admin::user') return { findOne: findUser };
        throw new Error(`Unexpected service: ${uid}`);
      }),
    } as unknown as Core.Strapi;

    await findEntityAndCheckPermissions(strapi, {}, ACTIONS.update, FILE_MODEL_UID, 1);

    expect(strapi.plugin).toHaveBeenCalledWith('upload');
    expect(findOne).toHaveBeenCalledWith(1, ['createdBy', 'folder']);
    expect(strapi.service).toHaveBeenCalledWith('admin::permission');
    expect(strapi.service).toHaveBeenCalledWith('admin::user');
    expect(createPermissionsManager).toHaveBeenCalledWith({
      ability: {},
      action: ACTIONS.update,
      model: FILE_MODEL_UID,
    });
    expect(findUser).toHaveBeenCalledWith(9, ['roles']);
    expect(cannot).toHaveBeenCalledWith(
      ACTIONS.update,
      expect.objectContaining({ createdBy: { id: 9, roles: [{ id: 2 }] } })
    );
  });
});
