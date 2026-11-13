import { describe, expect, it, vi } from 'vitest';

import { PROFILE_UID, USER_UID } from '../../constants';
import { asProfileLifecycle } from '../../utils/profile-lifecycle';
import { oneProfilePerUserMiddleware } from '../one-profile-per-user';
import { createTransaction, fakeStrapi } from '../../__tests__/utils/fake-strapi';

const REFUSAL = 'A profile is created and deleted with its user';

const setup = ({
  existing = null as unknown,
  current = { id: 1, documentId: 'user-1' } as unknown,
} = {}) => {
  const events: string[] = [];
  const findOne = vi.fn(async (params: { where: Record<string, unknown> }) => {
    // The profile being updated, with the user it has now
    if (!('user' in params.where)) {
      return current === null
        ? null
        : { id: 5, documentId: params.where.documentId, user: current };
    }

    events.push(
      `checked ${JSON.stringify(params.where.user)} (in transaction: ${inTransaction()})`
    );

    return existing;
  });
  const query = vi.fn(() => ({ findOne }));

  // The lock: `queryBuilder(USER_UID).select().where().first().forUpdate().execute()`
  const lockCalls: Array<{ uid: string; select: unknown; where: unknown; calls: string[] }> = [];
  const queryBuilder = vi.fn((uid: string) => {
    const call = {
      uid,
      select: undefined as unknown,
      where: undefined as unknown,
      calls: [] as string[],
    };
    const chain = {
      select: vi.fn((columns: unknown) => {
        call.select = columns;
        call.calls.push('select');

        return chain;
      }),
      where: vi.fn((filters: unknown) => {
        call.where = filters;
        call.calls.push('where');

        return chain;
      }),
      first: vi.fn(() => {
        call.calls.push('first');

        return chain;
      }),
      forUpdate: vi.fn(() => {
        call.calls.push('forUpdate');

        return chain;
      }),
      execute: vi.fn(async () => {
        call.calls.push('execute');
        events.push(`locked ${JSON.stringify(call.where)} (in transaction: ${inTransaction()})`);

        return { id: 1 };
      }),
    };

    lockCalls.push(call);

    return chain;
  });

  const { transaction, inTransaction } = createTransaction();
  const strapi = fakeStrapi({ db: { query, queryBuilder, transaction } });

  // `own`: the call is the plugin's own (`create-profile`, `cascade-user-delete`, the start)
  const run = async (
    ctx: Record<string, unknown>,
    next = vi.fn().mockResolvedValue('result'),
    { own = true } = {}
  ) => {
    const wrapped = vi.fn(async () => {
      events.push(`written (in transaction: ${inTransaction()})`);

      return next();
    });
    const call = () => oneProfilePerUserMiddleware(strapi)(ctx as never, wrapped as never);
    const result = await (own ? asProfileLifecycle(call) : call());

    return { next, result };
  };

  return { run, findOne, query, queryBuilder, transaction, lockCalls, events };
};

const write = (action: string, data: unknown, documentId?: string) => ({
  uid: PROFILE_UID,
  action,
  params: { ...(documentId ? { documentId } : {}), data },
});

describe('one-profile-per-user', () => {
  it('lets a profile be made for a user who has none', async () => {
    const { run, findOne, query } = setup();

    const { next, result } = await run(write('create', { user: { connect: ['user-1'] } }));

    expect(query).toHaveBeenCalledWith(PROFILE_UID);
    expect(findOne).toHaveBeenCalledWith({
      where: { user: { documentId: 'user-1' } },
      select: ['id'],
    });
    expect(next).toHaveBeenCalledTimes(1);
    expect(result).toBe('result');
  });

  it('refuses a second profile for the same user, naming the field', async () => {
    const { run } = setup({ existing: { id: 1 } });

    await expect(run(write('create', { user: { connect: ['user-1'] } }))).rejects.toMatchObject({
      name: 'ValidationError',
      message: 'This user already has a profile',
      details: { errors: [{ path: ['user'], message: 'This user already has a profile' }] },
    });
  });

  it('writes nothing when it refuses', async () => {
    const { run } = setup({ existing: { id: 1 } });
    const next = vi.fn();

    await expect(run(write('create', { user: 'user-1' }), next)).rejects.toBeDefined();

    expect(next).not.toHaveBeenCalled();
  });

  it.each([
    ['a documentId', 'user-1', { documentId: 'user-1' }],
    ['a numeric id', 7, { id: 7 }],
    ['longhand with a documentId', { documentId: 'user-1' }, { documentId: 'user-1' }],
    ['longhand with an id', { id: 7 }, { id: 7 }],
    ['a list', ['user-1'], { documentId: 'user-1' }],
    ['a connect', { connect: ['user-1'] }, { documentId: 'user-1' }],
    ['a connect of one value', { connect: 'user-1' }, { documentId: 'user-1' }],
    ['a connect of longhand', { connect: [{ documentId: 'user-1' }] }, { documentId: 'user-1' }],
    ['a set', { set: ['user-1'] }, { documentId: 'user-1' }],
  ])('reads the user from %s', async (_name, value, expected) => {
    const { run, findOne } = setup();

    await run(write('create', { user: value }));

    expect(findOne).toHaveBeenCalledWith({ where: { user: expected }, select: ['id'] });
  });

  it('checks every user a write names', async () => {
    const { run, findOne } = setup();

    await run(write('create', { user: { connect: ['user-1', 'user-2'] } }));

    expect(findOne).toHaveBeenCalledTimes(2);
  });

  it('does not check a create that names no user, nor one that disconnects only', async () => {
    const { run, findOne } = setup();

    await run(write('create', { company: 'Acme' }));
    await run(write('create', { user: { connect: [], disconnect: ['user-1'] } }));

    expect(findOne).not.toHaveBeenCalled();
  });

  describe('the lock on the user', () => {
    it('is taken on the user row, FOR UPDATE, before anything else', async () => {
      const { run, queryBuilder, lockCalls } = setup();

      await run(write('create', { user: { connect: ['user-1'] } }));

      expect(queryBuilder).toHaveBeenCalledTimes(1);
      expect(lockCalls[0]).toMatchObject({
        uid: USER_UID,
        select: 'id',
        where: { documentId: 'user-1' },
        calls: ['select', 'where', 'first', 'forUpdate', 'execute'],
      });
    });

    it('is taken on a numeric id the same way', async () => {
      const { run, lockCalls } = setup();

      await run(write('create', { user: 7 }));

      expect(lockCalls[0]).toMatchObject({ uid: USER_UID, where: { id: 7 } });
    });

    it('is taken, the check made and the write done in one transaction, in that order', async () => {
      const { run, transaction, events } = setup();

      await run(write('create', { user: { connect: ['user-1'] } }));

      expect(transaction).toHaveBeenCalledTimes(1);
      expect(events).toEqual([
        'locked {"documentId":"user-1"} (in transaction: true)',
        'checked {"documentId":"user-1"} (in transaction: true)',
        'written (in transaction: true)',
      ]);
    });

    it('is held when it refuses: nothing is written, and the transaction fails with it', async () => {
      const { run, transaction, events } = setup({ existing: { id: 1 } });

      await expect(run(write('create', { user: 'user-1' }))).rejects.toThrow(
        'This user already has a profile'
      );

      expect(transaction).toHaveBeenCalledTimes(1);
      expect(events.some((event) => event.startsWith('written'))).toBe(false);
    });

    it('is taken on every user a write names, in one order whichever way they are listed', async () => {
      const first = setup();
      const second = setup();

      await first.run(write('create', { user: { connect: ['user-b', 'user-a'] } }));
      await second.run(write('create', { user: { connect: ['user-a', 'user-b'] } }));

      const expected = [{ documentId: 'user-a' }, { documentId: 'user-b' }];

      expect(first.lockCalls.map((call) => call.where)).toEqual(expected);
      expect(second.lockCalls.map((call) => call.where)).toEqual(expected);
      // All the locks come before any check
      expect(first.events.slice(0, 2).every((event) => event.startsWith('locked'))).toBe(true);
    });

    it('is not taken, and no transaction is opened, for a write that names no user', async () => {
      const { run, queryBuilder, transaction, findOne } = setup();

      await run(write('create', { company: 'Acme' }));
      await run(write('update', { company: 'Acme' }, 'profile-1'));
      await run(write('create', { user: { connect: [], disconnect: ['user-1'] } }));

      expect(queryBuilder).not.toHaveBeenCalled();
      expect(transaction).not.toHaveBeenCalled();
      expect(findOne).not.toHaveBeenCalled();
    });

    it('is not taken for other content types and actions', async () => {
      const { run, queryBuilder, transaction } = setup();

      for (const ctx of [
        { uid: USER_UID, action: 'create', params: { data: { user: 'user-1' } } },
        { uid: PROFILE_UID, action: 'findMany', params: {} },
        { uid: PROFILE_UID, action: 'delete', params: { documentId: 'p' } },
      ]) {
        // eslint-disable-next-line no-await-in-loop
        await run(ctx);
      }

      expect(queryBuilder).not.toHaveBeenCalled();
      expect(transaction).not.toHaveBeenCalled();
    });
  });

  describe('a profile on its own', () => {
    const refusal = { name: 'ValidationError', message: REFUSAL };

    it('refuses to create, delete or re-point a profile on its own', async () => {
      const first = setup();
      const next = vi.fn();

      await expect(
        first.run(write('create', { user: { connect: ['user-1'] } }), next, { own: false })
      ).rejects.toMatchObject({ ...refusal, details: { errors: [{ path: ['user'] }] } });
      await expect(
        first.run(
          { uid: PROFILE_UID, action: 'delete', params: { documentId: 'profile-1' } },
          next,
          {
            own: false,
          }
        )
      ).rejects.toMatchObject(refusal);
      await expect(
        first.run(write('update', { user: { connect: ['user-2'] } }, 'profile-1'), next, {
          own: false,
        })
      ).rejects.toMatchObject(refusal);

      expect(next).not.toHaveBeenCalled();
      // Refused before any lock or check
      expect(first.queryBuilder).not.toHaveBeenCalled();
      expect(first.transaction).not.toHaveBeenCalled();
    });

    it('refuses a create that names no user, and a clone, however it is given', async () => {
      const { run } = setup();

      await expect(
        run(write('create', { company: 'Acme' }), undefined, { own: false })
      ).rejects.toThrow(REFUSAL);
      await expect(
        run(write('clone', { user: 'user-9' }, 'profile-1'), undefined, { own: false })
      ).rejects.toThrow(REFUSAL);
      await expect(
        run(write('clone', { company: 'Copy' }, 'profile-1'), undefined, { own: false })
      ).rejects.toThrow(REFUSAL);
    });

    it.each([
      ['another user', { connect: ['user-2'] }],
      ['another user as a plain value', 'user-2'],
      ['a set of another user', { set: ['user-2'] }],
      ['an empty set', { set: [] }],
      ['a disconnect', { connect: [], disconnect: ['user-1'] }],
      ['null', null],
      ['an empty list', []],
      ['a string id', { connect: [{ id: '7' }] }],
      ['a string id that is not a number', { connect: [{ id: 'abc' }] }],
      [
        'a mixed list, the own user and a string id',
        { connect: [{ documentId: 'user-1' }, { id: '7' }] },
      ],
      ['a mixed list, the own user and junk', { connect: ['user-1', { foo: 1 }] }],
      ['a disconnect of a string id', { disconnect: [{ id: '7' }] }],
      ['a disconnect of junk', { disconnect: [{ foo: 1 }] }],
      ['a disconnect of a lone value', { disconnect: 'user-1' }],
      ['a numeric documentId', { connect: [{ documentId: 5 }] }],
      ['a set with an unparseable entry', { set: ['user-1', { id: 'abc' }] }],
      ['a bare value that is not a ref', { id: 'abc' }],
      ['a connect of an object that is not a ref', { connect: [{}] }],
      ['a documentId that names another user beside the own id', { documentId: 'user-2', id: 1 }],
    ])('refuses an update that moves the profile: %s', async (_name, user) => {
      const { run } = setup();

      await expect(
        run(write('update', { user }, 'profile-1'), undefined, { own: false })
      ).rejects.toThrow(REFUSAL);
    });

    it.each([
      ['no user', { company: 'Acme' }],
      ['its own user, as a documentId', { company: 'Acme', user: 'user-1' }],
      ['its own user, as a connect', { user: { connect: [{ documentId: 'user-1' }] } }],
      ['its own user, as a set', { user: { set: ['user-1'] } }],
      ['its own user, by numeric id', { user: { id: 1 } }],
      ['nothing changed', { user: { connect: [], disconnect: [] } }],
      ['its own user, by numeric string id', { user: { connect: [{ id: '1' }] } }],
      ['its own user, whole entry sent back', { user: { documentId: 'user-1', id: 1 } }],
    ])('lets an update that leaves the user alone through: %s', async (_name, data) => {
      const { run, queryBuilder } = setup();

      const { next } = await run(write('update', data, 'profile-1'), undefined, { own: false });

      expect(next).toHaveBeenCalledTimes(1);
      expect(queryBuilder).not.toHaveBeenCalled();
    });

    it('lets an update through when the profile is not there: it fails on its own', async () => {
      const { run } = setup({ current: null });
      const { next } = await run(write('update', { user: 'user-2' }, 'profile-1'), undefined, {
        own: false,
      });

      expect(next).toHaveBeenCalledTimes(1);
    });

    it('still lets reads through', async () => {
      const { run } = setup();

      const { next } = await run({ uid: PROFILE_UID, action: 'findMany', params: {} }, undefined, {
        own: false,
      });

      expect(next).toHaveBeenCalledTimes(1);
    });

    it('lets the plugin`s own delete through, and does not mistake a request for it', async () => {
      const own = setup();
      const forged = setup();
      const ctx = { uid: PROFILE_UID, action: 'delete', params: { documentId: 'profile-1' } };

      const { next } = await own.run(ctx);

      expect(next).toHaveBeenCalledTimes(1);
      // The same call, made by anything else: nothing in `params` or `data` marks it
      await expect(
        forged.run(
          { ...ctx, params: { ...ctx.params, data: { endUsersLifecycle: true } } },
          undefined,
          { own: false }
        )
      ).rejects.toThrow(REFUSAL);
    });
  });

  it('leaves other content types and actions alone', async () => {
    const { run, findOne } = setup({ existing: { id: 1 } });

    for (const ctx of [
      { uid: USER_UID, action: 'create', params: { data: { user: 'user-1' } } },
      { uid: PROFILE_UID, action: 'findMany', params: {} },
      { uid: PROFILE_UID, action: 'delete', params: { documentId: 'p' } },
    ]) {
      // eslint-disable-next-line no-await-in-loop
      const { next } = await run(ctx);

      expect(next).toHaveBeenCalledTimes(1);
    }

    expect(findOne).not.toHaveBeenCalled();
  });
});
