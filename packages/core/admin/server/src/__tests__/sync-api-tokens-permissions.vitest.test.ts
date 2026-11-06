import { describe, test, expect, vi } from 'vitest';

import { syncAPITokensPermissions, REMOVED_API_TOKEN_PERMISSIONS_BATCH_SIZE } from '../bootstrap';

type StoredPermission = { id: number; action: string; token: { id: number; name: string } | null };

type FindManyParams = {
  where?: { action: { $in: string[] } };
  populate?: unknown;
  limit?: number;
  offset?: number;
};

const setup = (permissionsInDB: StoredPermission[], registeredActions: string[]) => {
  const warn = vi.fn();
  // Mimics the query engine: rows only carry their token when it is populated
  const findMany = vi.fn((params?: FindManyParams) => {
    const rows = permissionsInDB
      .filter((row) => params?.where === undefined || params.where.action.$in.includes(row.action))
      .map(({ token, ...row }) => (params?.populate === undefined ? row : { ...row, token }));
    const offset = params?.offset ?? 0;

    return Promise.resolve(
      rows.slice(offset, params?.limit === undefined ? undefined : offset + params.limit)
    );
  });
  const deleteMany = vi.fn(() => Promise.resolve());

  global.strapi = {
    log: { warn },
    contentAPI: {
      permissions: { providers: { action: { keys: () => registeredActions } } },
    },
    db: { query: () => ({ findMany, deleteMany }) },
  } as any;

  return { warn, findMany, deleteMany };
};

const removedRowsQuery = (actions: string[], offset: number) => ({
  select: ['id', 'action'],
  where: { action: { $in: actions } },
  populate: { token: { select: ['id', 'name'] } },
  orderBy: { id: 'asc' },
  limit: REMOVED_API_TOKEN_PERMISSIONS_BATCH_SIZE,
  offset,
});

describe('syncAPITokensPermissions', () => {
  test('warns with the count, actions and API tokens of the removed permissions', async () => {
    const readOnly = { id: 1, name: 'Read Only' };
    const importer = { id: 2, name: 'importer' };
    const { warn, deleteMany } = setup(
      [
        { id: 1, action: 'api::article.article.find', token: readOnly },
        { id: 2, action: 'api::legacy.legacy.find', token: readOnly },
        { id: 3, action: 'api::legacy.legacy.find', token: importer },
        { id: 4, action: 'api::legacy.legacy.create', token: importer },
        { id: 5, action: 'api::legacy.legacy.create', token: null },
      ],
      ['api::article.article.find']
    );

    await syncAPITokensPermissions();

    expect(deleteMany).toHaveBeenCalledWith({
      where: { action: { $in: ['api::legacy.legacy.find', 'api::legacy.legacy.create'] } },
    });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      'Removed 4 stored API token permission(s) whose action is no longer registered. ' +
        'Actions: api::legacy.legacy.find, api::legacy.legacy.create. ' +
        'API tokens: "Read Only" (id 1), "importer" (id 2). ' +
        'Without API token: 1.'
    );
  });

  test('reads every stored permission without populating tokens, and populates only the removed ones before deleting them', async () => {
    const { findMany, deleteMany } = setup(
      [
        { id: 1, action: 'api::article.article.find', token: { id: 1, name: 'Read Only' } },
        { id: 2, action: 'api::legacy.legacy.find', token: { id: 1, name: 'Read Only' } },
      ],
      ['api::article.article.find']
    );

    await syncAPITokensPermissions();

    expect(findMany).toHaveBeenCalledTimes(2);
    // The full read binds no `IN` list: same as before the warning existed
    expect(findMany.mock.calls[0]).toEqual([]);
    expect(findMany.mock.calls[1]).toEqual([removedRowsQuery(['api::legacy.legacy.find'], 0)]);
    expect(findMany.mock.invocationCallOrder[1]).toBeLessThan(
      deleteMany.mock.invocationCallOrder[0]
    );
  });

  test('populates the tokens of the removed permissions in batches', async () => {
    const removedCount = REMOVED_API_TOKEN_PERMISSIONS_BATCH_SIZE + 1;
    const { warn, findMany } = setup(
      Array.from({ length: removedCount }, (_, index) => ({
        id: index + 1,
        action: 'api::legacy.legacy.find',
        token: { id: 1, name: 'Read Only' },
      })),
      []
    );

    await syncAPITokensPermissions();

    expect(findMany.mock.calls.slice(1)).toEqual([
      [removedRowsQuery(['api::legacy.legacy.find'], 0)],
      [removedRowsQuery(['api::legacy.legacy.find'], REMOVED_API_TOKEN_PERMISSIONS_BATCH_SIZE)],
    ]);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining(`Removed ${removedCount} stored API token permission(s)`)
    );
  });

  test('quotes API token names so the warning stays on one line', async () => {
    const { warn } = setup(
      [{ id: 1, action: 'api::legacy.legacy.find', token: { id: 1, name: 'evil\nToken "x"' } }],
      []
    );

    await syncAPITokensPermissions();

    expect(warn).toHaveBeenCalledTimes(1);
    const message = warn.mock.calls[0][0] as string;
    expect(message).not.toMatch(/[\r\n]/);
    expect(message).toContain('API tokens: "evil\\nToken \\"x\\"" (id 1). ');
  });

  test('does not warn when nothing is removed', async () => {
    const { warn, findMany, deleteMany } = setup(
      [{ id: 1, action: 'api::article.article.find', token: { id: 1, name: 'Read Only' } }],
      ['api::article.article.find']
    );

    await syncAPITokensPermissions();

    expect(findMany).toHaveBeenCalledTimes(1);
    expect(deleteMany).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });
});
