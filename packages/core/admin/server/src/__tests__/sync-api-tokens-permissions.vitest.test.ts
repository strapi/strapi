import { describe, test, expect, vi } from 'vitest';

import { syncAPITokensPermissions } from '../bootstrap';

const setup = (permissionsInDB: unknown[], registeredActions: string[]) => {
  const warn = vi.fn();
  const findMany = vi.fn(() => Promise.resolve(permissionsInDB));
  const deleteMany = vi.fn(() => Promise.resolve());

  global.strapi = {
    log: { warn },
    contentAPI: {
      permissions: { providers: { action: { keys: () => registeredActions } } },
    },
    db: { query: () => ({ findMany, deleteMany }) },
  } as any;

  return { warn, deleteMany };
};

describe('syncAPITokensPermissions', () => {
  test('warns with the count, actions and API tokens of the removed permissions', async () => {
    const readOnly = { id: 1, name: 'Read Only' };
    const importer = { id: 2, name: 'importer' };
    const { warn, deleteMany } = setup(
      [
        { action: 'api::article.article.find', token: readOnly },
        { action: 'api::legacy.legacy.find', token: readOnly },
        { action: 'api::legacy.legacy.find', token: importer },
        { action: 'api::legacy.legacy.create', token: importer },
      ],
      ['api::article.article.find']
    );

    await syncAPITokensPermissions();

    expect(deleteMany).toHaveBeenCalledWith({
      where: { action: { $in: ['api::legacy.legacy.find', 'api::legacy.legacy.create'] } },
    });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      'Removed 3 stored API token permission(s) whose action is no longer registered. ' +
        'Actions: api::legacy.legacy.find, api::legacy.legacy.create. ' +
        'API tokens: "Read Only" (id 1), "importer" (id 2).'
    );
  });

  test('does not warn when nothing is removed', async () => {
    const { warn, deleteMany } = setup(
      [{ action: 'api::article.article.find', token: { id: 1, name: 'Read Only' } }],
      ['api::article.article.find']
    );

    await syncAPITokensPermissions();

    expect(deleteMany).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });
});
