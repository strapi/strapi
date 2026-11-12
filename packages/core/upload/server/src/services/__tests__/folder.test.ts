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
    let trx: { get: jest.Mock; commit: jest.Mock; rollback: jest.Mock };
    let queryBuilder: jest.Mock;

    beforeEach(() => {
      trx = { get: jest.fn(), commit: jest.fn(), rollback: jest.fn() };

      // The moved folder, then the destination folder: deleted after the request validation
      // checked it, so the lookup (`first()`) answers nothing.
      const folderResults: unknown[] = [{ pathId: 2, path: '/2' }, undefined];
      queryBuilder = jest.fn((uid: string) => {
        const chain: Record<string, unknown> = {
          execute: jest.fn(async () => (uid === joinTableName ? 0 : folderResults.shift())),
        };
        ['select', 'where', 'transacting', 'forUpdate', 'first', 'delete', 'insert'].forEach(
          (method) => {
            chain[method] = () => chain;
          }
        );
        return chain;
      });

      global.strapi = {
        db: {
          query: () => ({ findOne: jest.fn(async () => ({ id: 2, name: 'moved', parent: null })) }),
          transaction: jest.fn(async () => trx),
          queryBuilder,
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
              },
            }),
          },
        },
      } as any;
    });

    test('rejects with a ValidationError when the destination folder no longer exists', async () => {
      await expect(
        folderService.update(2, { name: 'moved', parent: 1 }, { user: { id: 1 } })
      ).rejects.toThrow(new errors.ValidationError('parent folder does not exist'));

      expect(trx.rollback).toHaveBeenCalled();
      expect(trx.commit).not.toHaveBeenCalled();
      // The parent link is left untouched: no row points at the missing folder.
      expect(queryBuilder).not.toHaveBeenCalledWith(joinTableName);
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
