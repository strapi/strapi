import { describe, expect, it, vi } from 'vitest';
import type { Core } from '@strapi/types';

import { PROFILE_UID, USER_UID, VERIFICATION_UID } from '../../constants';
import { inProfileLifecycle } from '../../utils/profile-lifecycle';
import { cascadeUserDeleteMiddleware } from '../cascade-user-delete';

const SESSION = 'plugin::end-users.session';
const ACCOUNT = 'plugin::end-users.account';
const TWO_FACTOR = 'plugin::end-users.two-factor';
const PASSKEY = 'plugin::end-users.passkey';

/** What the engine says it has: tables, and which of their columns point at a user. */
const tables = [
  { name: 'user', fields: { email: { type: 'string' } } },
  {
    name: 'session',
    fields: {
      token: { type: 'string' },
      userId: { type: 'string', references: { model: 'user', field: 'id' } },
    },
  },
  {
    name: 'account',
    fields: {
      userId: { type: 'string', references: { model: 'user', field: 'id' } },
      password: { type: 'string' },
    },
  },
  {
    name: 'twoFactor',
    fields: { userId: { type: 'string', references: { model: 'user', field: 'id' } } },
  },
  { name: 'verification', fields: { identifier: { type: 'string' }, value: { type: 'string' } } },
  // A column that references something that is not a user, and a table nobody wants created
  { name: 'rateLimit', fields: { key: { type: 'string' } } },
  {
    name: 'ghost',
    disableMigrations: true,
    fields: { userId: { type: 'string', references: { model: 'user', field: 'id' } } },
  },
];

const setup = ({
  profiles = [{ documentId: 'profile-1' }] as Array<{ documentId: string }>,
  engineTables = tables as unknown[],
  contentTypes = {
    [SESSION]: { attributes: { userId: {} } },
    [ACCOUNT]: { attributes: { userId: {} } },
    [TWO_FACTOR]: { attributes: { userId: {} } },
    [PASSKEY]: { attributes: { userId: {} } },
    [VERIFICATION_UID]: { attributes: { value: {} } },
  } as Record<string, unknown>,
} = {}) => {
  const events: string[] = [];
  let inTransaction = false;

  const deleteMany = vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
    events.push(`deleteMany ${JSON.stringify(where)} (in transaction: ${inTransaction})`);
  });
  const query = vi.fn((uid: string) => ({
    deleteMany(params: never) {
      events.push(`query ${uid}`);

      return deleteMany(params);
    },
  }));
  const findMany = vi.fn(async () => profiles);
  const marked: boolean[] = [];
  const remove = vi.fn(async ({ documentId }: { documentId: string }) => {
    marked.push(inProfileLifecycle());
    events.push(`profile ${documentId} deleted (in transaction: ${inTransaction})`);
  });
  const documents = vi.fn(() => ({ findMany, delete: remove }));
  const schema = vi.fn(() => engineTables);
  const get = vi.fn(() => ({ schema }));
  const plugin = vi.fn(() => ({ service: () => ({ get }) }));
  const transaction = vi.fn(async (callback: () => Promise<unknown>) => {
    inTransaction = true;

    try {
      return await callback();
    } finally {
      inTransaction = false;
    }
  });
  const strapi = {
    plugin,
    documents,
    contentTypes,
    db: { query, transaction },
  } as unknown as Core.Strapi;

  const run = async (ctx: Record<string, unknown>) => {
    const next = vi.fn(async () => {
      events.push(`user deleted (in transaction: ${inTransaction})`);

      return { documentId: 'user-1', entries: [] };
    });
    const result = await cascadeUserDeleteMiddleware(strapi)(ctx as never, next as never);

    return { next, result };
  };

  return { run, deleteMany, query, findMany, remove, documents, transaction, events, marked };
};

const deleteUser = (params: Record<string, unknown> = { documentId: 'user-1' }) => ({
  uid: USER_UID,
  action: 'delete',
  params,
});

describe('cascade-user-delete', () => {
  it('deletes the profile of the user, through the Document Service', async () => {
    const { run, documents, findMany, remove } = setup({
      profiles: [{ documentId: 'profile-1' }, { documentId: 'profile-2' }],
    });

    await run(deleteUser());

    expect(documents).toHaveBeenCalledWith(PROFILE_UID);
    expect(findMany).toHaveBeenCalledWith({
      filters: { user: { documentId: 'user-1' } },
      fields: ['documentId'],
    });
    expect(remove).toHaveBeenCalledTimes(2);
    expect(remove).toHaveBeenCalledWith({ documentId: 'profile-1' });
    expect(remove).toHaveBeenCalledWith({ documentId: 'profile-2' });
  });

  it('still deletes the profile with its user, as the plugin`s own delete', async () => {
    const { run, remove, marked } = setup();

    await run(deleteUser());

    expect(remove).toHaveBeenCalledWith({ documentId: 'profile-1' });
    // `one-profile-per-user` refuses every profile delete that is not marked
    expect(marked).toEqual([true]);
    expect(inProfileLifecycle()).toBe(false);
  });

  it('deletes a user who has no profile: nothing is removed through the Document Service, and the rest still goes', async () => {
    const { run, remove, query } = setup({ profiles: [] });

    const { next } = await run(deleteUser());

    expect(remove).not.toHaveBeenCalled();
    expect(query).toHaveBeenCalledWith(SESSION);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('deletes the sessions, accounts and two-factor record, by the column that holds the user', async () => {
    const { run, query, deleteMany } = setup();

    await run(deleteUser());

    expect(query.mock.calls.map(([uid]) => uid).sort()).toEqual(
      [ACCOUNT, SESSION, TWO_FACTOR, VERIFICATION_UID].sort()
    );
    expect(deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
  });

  it('deletes the verification rows that hold the user`s documentId', async () => {
    const { run, query, deleteMany } = setup();

    await run(deleteUser());

    expect(query).toHaveBeenCalledWith(VERIFICATION_UID);
    expect(deleteMany).toHaveBeenCalledWith({ where: { value: 'user-1' } });
  });

  it('follows the engine: a table of a Better Auth plugin that points at the user goes too', async () => {
    const { run, query } = setup({
      engineTables: [
        ...tables,
        {
          name: 'passkey',
          fields: { userId: { type: 'string', references: { model: 'user', field: 'id' } } },
        },
      ],
    });

    await run(deleteUser());

    expect(query).toHaveBeenCalledWith(PASSKEY);
  });

  it('uses the attribute a field is stored under, when it is not the field`s key', async () => {
    const { run, deleteMany } = setup({
      engineTables: [
        {
          name: 'passkey',
          fields: {
            owner: {
              fieldName: 'ownerId',
              type: 'string',
              references: { model: 'user', field: 'id' },
            },
          },
        },
      ],
      contentTypes: {
        [PASSKEY]: { attributes: { ownerId: {} } },
        [VERIFICATION_UID]: { attributes: { value: {} } },
      },
    });

    await run(deleteUser());

    expect(deleteMany).toHaveBeenCalledWith({ where: { ownerId: 'user-1' } });
  });

  it('never deletes by a column Strapi has no attribute for: it would match every row', async () => {
    const { run, query } = setup({
      contentTypes: {
        [SESSION]: { attributes: { token: {} } },
        [ACCOUNT]: { attributes: { userId: {} } },
        [VERIFICATION_UID]: { attributes: { value: {} } },
      },
    });

    await run(deleteUser());

    expect(query.mock.calls.map(([uid]) => uid)).not.toContain(SESSION);
    expect(query.mock.calls.map(([uid]) => uid)).toContain(ACCOUNT);
  });

  it('leaves out tables the engine does not create, and ones that point at no user', async () => {
    const { run, query } = setup({
      contentTypes: {
        [SESSION]: { attributes: { userId: {} } },
        'plugin::end-users.ghost': { attributes: { userId: {} } },
        'plugin::end-users.rate-limit': { attributes: { key: {} } },
        [VERIFICATION_UID]: { attributes: { value: {} } },
      },
    });

    await run(deleteUser());

    const uids = query.mock.calls.map(([uid]) => uid);

    expect(uids).not.toContain('plugin::end-users.ghost');
    expect(uids).not.toContain('plugin::end-users.rate-limit');
  });

  it('deletes the profile before the user, and all of it in one transaction', async () => {
    const { run, events } = setup();

    await run(deleteUser());

    expect(events[0]).toBe('profile profile-1 deleted (in transaction: true)');
    expect(events.at(-1)).toBe('user deleted (in transaction: true)');
    expect(
      events.every((event) => event.includes('(in transaction: true)') || event.startsWith('query'))
    ).toBe(true);
  });

  it('answers what deleting the user answered', async () => {
    const { run } = setup();

    const { result } = await run(deleteUser());

    expect(result).toEqual({ documentId: 'user-1', entries: [] });
  });

  it('fails the delete when something cannot be removed, so nothing is half gone', async () => {
    const { run, deleteMany } = setup();

    deleteMany.mockRejectedValueOnce(new Error('database is locked'));

    await expect(run(deleteUser())).rejects.toThrow('database is locked');
  });

  it.each([
    ['no documentId', {}],
    ['an empty documentId', { documentId: '' }],
    ['a documentId that is not a string', { documentId: 5 }],
  ])(
    'deletes nothing of its own for %s: the filter would be dropped and match everyone',
    async (_name, params) => {
      const { run, query, findMany, transaction } = setup();

      const { next } = await run(deleteUser(params));

      expect(next).toHaveBeenCalledTimes(1);
      expect(query).not.toHaveBeenCalled();
      expect(findMany).not.toHaveBeenCalled();
      expect(transaction).not.toHaveBeenCalled();
    }
  );

  it('leaves other content types and other actions alone', async () => {
    const { run, query, transaction } = setup();

    for (const ctx of [
      { uid: PROFILE_UID, action: 'delete', params: { documentId: 'p' } },
      { uid: USER_UID, action: 'update', params: { documentId: 'user-1', data: {} } },
      { uid: USER_UID, action: 'create', params: { data: {} } },
    ]) {
      // eslint-disable-next-line no-await-in-loop
      const { next } = await run(ctx);

      expect(next).toHaveBeenCalledTimes(1);
    }

    expect(query).not.toHaveBeenCalled();
    expect(transaction).not.toHaveBeenCalled();
  });
});
