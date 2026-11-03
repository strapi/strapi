import type { Context } from 'koa';

import adminFolderFileController from '../admin-folder-file';
import { getService } from '../../utils';
import { emitMediaMoves, readMediaMoves } from '../../audit-logs';

jest.mock('../../utils');
jest.mock('../validation/admin/folder-file', () => ({
  validateMoveManyFoldersFiles: jest.fn(),
  validateDeleteManyFoldersFiles: jest.fn(),
}));
jest.mock('../../audit-logs', () => ({
  readMediaMoves: jest.fn(),
  emitMediaMoves: jest.fn(),
}));

const mockGetService = getService as jest.MockedFunction<typeof getService>;

/** A query builder whose methods chain and whose result is `result`. */
const chain = (result: unknown) => {
  const builder: any = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === 'then') {
          return (resolve: (value: unknown) => unknown) => resolve(result);
        }
        if (prop === 'execute') {
          return async () => result;
        }
        return () => builder;
      },
    }
  );

  return builder;
};

const joinTable = (name: string) => ({
  name,
  joinColumn: { name: 'join_id' },
  inverseJoinColumn: { name: 'inv_id' },
});

describe('Admin Folder File Controller - moveMany', () => {
  const moves = [{ kind: 'file', id: 1, name: 'a.png', from: null, to: null }];
  let trx: { get: jest.Mock; commit: jest.Mock; rollback: jest.Mock };
  let getConnection: jest.Mock;
  let ctx: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockGetService.mockReturnValue({ trackUsage: jest.fn() } as any);
    jest.mocked(readMediaMoves).mockResolvedValue(moves as any);
    jest.mocked(emitMediaMoves).mockResolvedValue(undefined);

    trx = { get: jest.fn(() => 'knex-trx'), commit: jest.fn(), rollback: jest.fn() };
    getConnection = jest.fn(() => chain(0));

    global.strapi = {
      admin: {
        services: {
          permission: {
            createPermissionsManager: () => ({ sanitizeOutput: (x: unknown) => x }),
          },
        },
      },
      db: {
        transaction: jest.fn(async () => trx),
        queryBuilder: jest.fn((uid: string) =>
          chain(uid === 'plugin::upload.file' ? [{ id: 1, name: 'a.png' }] : [])
        ),
        getConnection,
        query: () => ({ findMany: async () => [] }),
        metadata: {
          get: (uid: string) => ({
            attributes: {
              folder: { joinTable: joinTable(`${uid}-folder`) },
              parent: { joinTable: joinTable(`${uid}-parent`) },
              folderPath: { columnName: 'folder_path' },
              path: { columnName: 'path' },
            },
          }),
        },
        dialect: { client: 'sqlite' },
        connection: { raw: jest.fn() },
      },
      getModel: (uid: string) => ({ collectionName: `${uid}-table` }),
      log: { error: jest.fn() },
    } as any;

    ctx = {
      request: { body: { fileIds: [1], folderIds: [], destinationFolderId: null } },
      state: { userAbility: {} },
    };
  });

  test('reads the moves inside the transaction and emits them after the commit', async () => {
    jest.mocked(emitMediaMoves).mockImplementation(async () => {
      expect(trx.commit).toHaveBeenCalled();
    });

    await adminFolderFileController.moveMany(ctx as Context);

    expect(readMediaMoves).toHaveBeenCalledWith(expect.any(Function), {
      files: [{ id: 1, name: 'a.png' }],
      folders: [],
      destinationFolderId: null,
      fileFolderJoinTable: joinTable('plugin::upload.file-folder'),
      folderParentJoinTable: joinTable('plugin::upload.folder-parent'),
      folderTable: 'plugin::upload.folder-table',
    });
    expect(emitMediaMoves).toHaveBeenCalledWith({ strapi: global.strapi }, moves);

    // The reader runs its queries in the move transaction.
    const read = jest.mocked(readMediaMoves).mock.calls[0][0];
    const transacting = jest.fn();
    getConnection.mockReturnValueOnce({ transacting });
    read('some_table');
    expect(getConnection).toHaveBeenLastCalledWith('some_table');
    expect(transacting).toHaveBeenCalledWith('knex-trx');
  });

  test('responds without waiting for the audit rows', async () => {
    jest.mocked(emitMediaMoves).mockReturnValue(new Promise(() => {}));

    await adminFolderFileController.moveMany(ctx as Context);

    expect(ctx.body).toEqual({ data: { files: [], folders: [] } });
  });

  test('logs an error when the audit rows cannot be written', async () => {
    jest.mocked(emitMediaMoves).mockRejectedValue(new Error('insert failed'));

    await adminFolderFileController.moveMany(ctx as Context);
    await new Promise(process.nextTick);

    expect(global.strapi.log.error).toHaveBeenCalledWith(
      'Could not record media moves in audit logs: insert failed'
    );
  });

  test('emits nothing when the move is rolled back', async () => {
    getConnection.mockImplementation(() => {
      throw new Error('write failed');
    });

    await expect(adminFolderFileController.moveMany(ctx as Context)).rejects.toThrow(
      'write failed'
    );

    expect(trx.rollback).toHaveBeenCalled();
    expect(emitMediaMoves).not.toHaveBeenCalled();
  });
});
