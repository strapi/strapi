import { errors } from '@strapi/utils';

import folderService from '../folder';

const folderUID = '1';
const rootPathRegex = /^\/[0-9]*$/i;
const folderPathRegex = new RegExp(`^/${folderUID}/[0-9]*$`, 'i');

describe('folder', () => {
  describe('setPathIdAndPath', () => {
    beforeAll(() => {
      global.strapi = {
        db: {
          queryBuilder: () => ({
            max: () => ({
              first: () => ({
                execute: () => ({ max: 2 }),
              }),
            }),
          }),
          query() {
            return {
              findOne: jest.fn(() => ({ path: `/${folderUID}` })),
            };
          },
        },
      } as any;
    });

    test.each([
      [{ parent: 1 }, folderPathRegex],
      [{}, rootPathRegex],
      [{ parent: null }, rootPathRegex],
    ])('inputs %s', async (folder, expectedPath) => {
      const clonedFolder = { ...folder };
      const result = await folderService.setPathIdAndPath(clonedFolder);

      expect(result).toBe(clonedFolder);
      expect(result).toMatchObject({
        ...folder,
        pathId: expect.any(Number),
        path: expect.stringMatching(expectedPath),
      });
    });
  });

  describe('update', () => {
    const joinTableName = 'upload_folders_parent_lnk';

    type Chain = Record<string, (...args: unknown[]) => unknown> & { calls: string[] };

    let trx: { get: jest.Mock; commit: jest.Mock; rollback: jest.Mock };
    let queryBuilder: jest.Mock;
    let connectionChains: Chain[];

    // `movedFolder` is what the locked lookup of the moved folder answers, `destinationFolder`
    // what the lookup of the new parent answers (`undefined`: the row is gone).
    const mockDatabase = ({
      movedFolder,
      destinationFolder,
    }: {
      movedFolder: { pathId: number; path: string } | undefined;
      destinationFolder: { path: string } | undefined;
    }) => {
      trx = { get: jest.fn(), commit: jest.fn(), rollback: jest.fn() };
      connectionChains = [];

      const createChain = (resolve: (calls: string[]) => unknown): Chain => {
        const chain = { calls: [] } as unknown as Chain;
        [
          'select',
          'where',
          'orWhere',
          'transacting',
          'forUpdate',
          'forShare',
          'first',
          'delete',
          'insert',
          'update',
          'execute',
        ].forEach((method) => {
          chain[method] = () => {
            chain.calls.push(method);
            if (method === 'execute') {
              return Promise.resolve(resolve(chain.calls));
            }
            return chain;
          };
        });
        // The knex chain is awaited directly, without `execute()`.
        chain.then = (onFulfilled: unknown, onRejected: unknown) =>
          Promise.resolve(resolve(chain.calls)).then(
            onFulfilled as (value: unknown) => unknown,
            onRejected as (reason: unknown) => unknown
          );
        return chain;
      };

      queryBuilder = jest.fn((uid: string) =>
        createChain(() => (uid === joinTableName ? 0 : movedFolder))
      );

      global.strapi = {
        getModel: (uid: string) => ({ collectionName: uid }),
        db: {
          query: () => ({
            findOne: jest.fn(async () => ({ id: 2, name: 'moved', parent: null })),
            update: jest.fn(async () => ({ id: 2, name: 'moved' })),
          }),
          transaction: jest.fn(async () => trx),
          queryBuilder,
          getConnection: jest.fn(() => {
            const chain = createChain((calls) => (calls.includes('first') ? destinationFolder : 1));
            connectionChains.push(chain);
            return chain;
          }),
          connection: { raw: jest.fn() },
          metadata: {
            get: () => ({
              attributes: {
                parent: {
                  joinTable: {
                    name: joinTableName,
                    joinColumn: { name: 'folder_id' },
                    inverseJoinColumn: { name: 'inv_folder_id' },
                  },
                },
                path: { columnName: 'path' },
                folderPath: { columnName: 'folder_path' },
              },
            }),
          },
        },
        eventHub: { emit: jest.fn() },
      } as any;
    };

    test('rejects with a ValidationError when the destination folder no longer exists', async () => {
      // Deleted after the request validation checked it: the lookup answers nothing.
      mockDatabase({ movedFolder: { pathId: 2, path: '/2' }, destinationFolder: undefined });

      await expect(
        folderService.update(2, { name: 'moved', parent: 1 }, { user: { id: 1 } })
      ).rejects.toThrow(new errors.ValidationError('parent folder does not exist'));

      expect(trx.rollback).toHaveBeenCalled();
      expect(trx.commit).not.toHaveBeenCalled();
      // The parent link is left untouched: no row points at the missing folder.
      expect(queryBuilder).not.toHaveBeenCalledWith(joinTableName);
    });

    test('answers nothing when the moved folder does not exist', async () => {
      mockDatabase({ movedFolder: undefined, destinationFolder: { path: '/1' } });

      await expect(
        folderService.update(2, { name: 'moved', parent: 1 }, { user: { id: 1 } })
      ).resolves.toBeUndefined();

      expect(trx.rollback).toHaveBeenCalled();
      expect(trx.commit).not.toHaveBeenCalled();
      expect(queryBuilder).not.toHaveBeenCalledWith(joinTableName);
      expect(connectionChains).toHaveLength(0);
    });

    test('takes a share lock on the destination folder, not an exclusive one', async () => {
      mockDatabase({ movedFolder: { pathId: 2, path: '/2' }, destinationFolder: { path: '/1' } });

      await folderService.update(2, { name: 'moved', parent: 1 }, { user: { id: 1 } });

      expect(trx.commit).toHaveBeenCalled();
      // A share lock keeps the destination from being deleted or moved until the move commits,
      // and still lets other requests create subfolders or upload files into it.
      const destinationLookup = connectionChains.find((chain) => chain.calls.includes('first'));
      expect(destinationLookup?.calls).toEqual(
        expect.arrayContaining(['transacting', 'forShare', 'first'])
      );
      expect(destinationLookup?.calls).not.toContain('forUpdate');
    });
  });

  describe('getStructure', () => {
    beforeAll(() => {
      const rows = [
        { id: 1, name: 'b-root', parent: null },
        { id: 2, name: 'a-root', parent: null },
        { id: 3, name: 'child', parent: 1 },
      ];
      const qb = {
        getAlias: () => 't1',
        alias: 't0',
        select: () => qb,
        join: () => qb,
        execute: async () => rows,
      };

      global.strapi = {
        db: {
          metadata: {
            get: () => ({
              attributes: {
                parent: {
                  joinTable: {
                    name: 'upload_folders_parent_lnk',
                    joinColumn: { name: 'folder_id', referencedColumn: 'id' },
                    inverseJoinColumn: { name: 'inv_folder_id' },
                  },
                },
              },
            }),
          },
          queryBuilder: () => qb,
        },
      } as any;
    });

    test('returns a tree of { id, name, children } nodes sorted by name', async () => {
      const tree = await folderService.getStructure();

      expect(tree).toEqual([
        { id: 2, name: 'a-root', children: [] },
        { id: 1, name: 'b-root', children: [{ id: 3, name: 'child', children: [] }] },
      ]);

      // Type-level check: children are nodes, not ids (verified by test:ts:back)
      // @ts-expect-error - a node's children cannot be read as a list of ids
      const childIds: number[] = tree[1].children;
      expect(childIds).toHaveLength(1);
    });
  });

  describe('getNamePaths', () => {
    const findMany = jest.fn(async () => [
      { pathId: 1, name: 'Clients' },
      { pathId: 2, name: 'Acme' },
    ]);

    beforeAll(() => {
      global.strapi = {
        db: {
          query: () => ({ findMany }),
        },
      } as any;
    });

    beforeEach(() => {
      findMany.mockClear();
    });

    test.each([
      ['/1/2', '/Clients/Acme'],
      ['/imported', '/'],
      ['/legacy/nested', '/'],
      ['/1/xx/2', '/Clients/Acme'],
    ])('maps %s to %s', async (path, namePath) => {
      expect(await folderService.getNamePaths([path])).toEqual({ [path]: namePath });
    });

    test('skips a folder without a path', async () => {
      expect(await folderService.getNamePaths([null, '/1'])).toEqual({ '/1': '/Clients' });
    });

    test.each(['99999999999', '2147483648', '1e21'])(
      'skips the out-of-range segment %s without querying it',
      async (segment) => {
        const path = `/1/${segment}/2`;

        expect(await folderService.getNamePaths([path])).toEqual({ [path]: '/Clients/Acme' });
        expect(findMany).toHaveBeenCalledWith(
          expect.objectContaining({ where: { pathId: { $in: [1, 2] } } })
        );
      }
    );
  });
});
