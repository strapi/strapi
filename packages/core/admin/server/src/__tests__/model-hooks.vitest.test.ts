import { describe, test, expect, vi } from 'vitest';

import { registerModelHooks } from '../bootstrap';

type Subscriber = {
  models: string[];
  beforeDelete: (event: {
    params: { where?: Record<string, unknown> };
    state: Record<string, unknown>;
  }) => Promise<void>;
};

type Row = { id: number };

/**
 * Mimics the query engine for the two models the hooks read: `findOne` returns the first row
 * matching `where` (by `id`, `email` or `code`), or null.
 */
const setup = ({
  users,
  roles,
}: {
  users: Array<Row & { email: string }>;
  roles: Array<Row & { code: string }>;
}) => {
  const subscribers: Subscriber[] = [];
  const deleteTokensForUser = vi.fn(() => Promise.resolve());
  const findOneUser = vi.fn(({ where }: { where: Record<string, unknown> }) =>
    Promise.resolve(
      users.find((row) =>
        Object.entries(where).every(([key, value]) => row[key as keyof typeof row] === value)
      ) ?? null
    )
  );
  const findOneRole = vi.fn(({ where }: { where: Record<string, unknown> }) =>
    Promise.resolve(
      roles.find((row) =>
        Object.entries(where).every(([key, value]) => row[key as keyof typeof row] === value)
      ) ?? null
    )
  );
  const findManyUsers = vi.fn(() => Promise.resolve([{ id: 10 }, { id: 11 }]));

  global.strapi = {
    admin: {
      services: {
        metrics: { sendDidChangeInterfaceLanguage: vi.fn() },
        'api-token-admin': { deleteTokensForUser },
      },
    },
    db: {
      lifecycles: { subscribe: (subscriber: Subscriber) => subscribers.push(subscriber) },
      query(uid: string) {
        if (uid === 'admin::user') {
          return { findOne: findOneUser, findMany: findManyUsers };
        }
        if (uid === 'admin::role') {
          return { findOne: findOneRole };
        }
        throw new Error(`Unexpected query ${uid}`);
      },
    },
  } as any;

  registerModelHooks();

  const subscriberFor = (uid: string) => {
    const subscriber = subscribers.find((candidate) => candidate.models.includes(uid));
    if (subscriber === undefined) {
      throw new Error(`No subscriber for ${uid}`);
    }
    return subscriber;
  };

  return {
    userBeforeDelete: subscriberFor('admin::user').beforeDelete,
    roleBeforeDelete: subscriberFor('admin::role').beforeDelete,
    deleteTokensForUser,
    findManyUsers,
  };
};

const fixtures = {
  users: [
    { id: 1, email: 'first@example.com' },
    { id: 2, email: 'second@example.com' },
  ],
  roles: [
    { id: 5, code: 'editor' },
    { id: 6, code: 'author' },
  ],
};

describe('admin::user beforeDelete', () => {
  test('deletes the tokens of the user matched by id', async () => {
    const { userBeforeDelete, deleteTokensForUser } = setup(fixtures);

    await userBeforeDelete({ params: { where: { id: 2 } }, state: {} });

    expect(deleteTokensForUser).toHaveBeenCalledTimes(1);
    expect(deleteTokensForUser).toHaveBeenCalledWith(2);
  });

  test('deletes the tokens of the user matched by a where without id', async () => {
    const { userBeforeDelete, deleteTokensForUser } = setup(fixtures);

    await userBeforeDelete({ params: { where: { email: 'second@example.com' } }, state: {} });

    expect(deleteTokensForUser).toHaveBeenCalledTimes(1);
    expect(deleteTokensForUser).toHaveBeenCalledWith(2);
  });

  test('deletes no tokens when no user matches', async () => {
    const { userBeforeDelete, deleteTokensForUser } = setup(fixtures);

    await userBeforeDelete({ params: { where: { email: 'missing@example.com' } }, state: {} });

    expect(deleteTokensForUser).not.toHaveBeenCalled();
  });

  test.each([
    ['undefined', undefined],
    ['empty', {}],
  ])('deletes no tokens when where is %s', async (_label, where) => {
    const { userBeforeDelete, deleteTokensForUser } = setup(fixtures);

    await userBeforeDelete({ params: { where }, state: {} });

    expect(deleteTokensForUser).not.toHaveBeenCalled();
  });
});

describe('admin::role beforeDelete', () => {
  test('records the users of the role matched by id', async () => {
    const { roleBeforeDelete, findManyUsers } = setup(fixtures);
    const state: Record<string, unknown> = {};

    await roleBeforeDelete({ params: { where: { id: 6 } }, state });

    expect(findManyUsers).toHaveBeenCalledWith({ where: { roles: { id: 6 } }, select: ['id'] });
    expect(state.affectedUserIds).toStrictEqual([10, 11]);
  });

  test('records the users of the role matched by a where without id', async () => {
    const { roleBeforeDelete, findManyUsers } = setup(fixtures);
    const state: Record<string, unknown> = {};

    await roleBeforeDelete({ params: { where: { code: 'author' } }, state });

    expect(findManyUsers).toHaveBeenCalledWith({ where: { roles: { id: 6 } }, select: ['id'] });
    expect(state.affectedUserIds).toStrictEqual([10, 11]);
  });

  test('records no users when no role matches', async () => {
    const { roleBeforeDelete, findManyUsers } = setup(fixtures);
    const state: Record<string, unknown> = {};

    await roleBeforeDelete({ params: { where: { code: 'missing' } }, state });

    expect(findManyUsers).not.toHaveBeenCalled();
    expect(state.affectedUserIds).toBeUndefined();
  });

  test.each([
    ['undefined', undefined],
    ['empty', {}],
  ])('records no users when where is %s', async (_label, where) => {
    const { roleBeforeDelete, findManyUsers } = setup(fixtures);
    const state: Record<string, unknown> = {};

    await roleBeforeDelete({ params: { where }, state });

    expect(findManyUsers).not.toHaveBeenCalled();
    expect(state.affectedUserIds).toBeUndefined();
  });
});
