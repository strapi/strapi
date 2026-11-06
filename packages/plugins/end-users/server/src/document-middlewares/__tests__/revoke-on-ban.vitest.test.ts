import { describe, expect, it, vi } from 'vitest';
import type { Core } from '@strapi/types';

import { PLUGIN_ID, USER_UID } from '../../constants';
import { revokeOnBanMiddleware } from '../revoke-on-ban';

const setup = () => {
  const events: string[] = [];
  let inTransaction = false;

  const revokeSessions = vi.fn(async () => {
    events.push(`sessions revoked (in transaction: ${inTransaction})`);
  });
  const get = vi.fn(() => ({ revokeSessions }));
  const service = vi.fn(() => ({ get }));
  const plugin = vi.fn(() => ({ service }));
  const transaction = vi.fn(async (callback: () => Promise<unknown>) => {
    inTransaction = true;

    try {
      return await callback();
    } finally {
      inTransaction = false;
    }
  });
  // What the database holds for the user, read when the write's result leaves `banned` out
  let stored: Record<string, unknown> | null = { banned: true };
  const findOne = vi.fn(async () => {
    events.push(`user read again (in transaction: ${inTransaction})`);

    return stored;
  });
  const query = vi.fn(() => ({ findOne }));
  const strapi = { plugin, db: { transaction, query } } as unknown as Core.Strapi;
  const store = (row: Record<string, unknown> | null) => {
    stored = row;
  };

  const run = async (
    ctx: Record<string, unknown>,
    written: unknown = { documentId: 'user-1', banned: true }
  ) => {
    const next = vi.fn(async () => {
      events.push(`user written (in transaction: ${inTransaction})`);

      return written;
    });
    const result = await revokeOnBanMiddleware(strapi)(ctx as never, next as never);

    return { next, result };
  };

  return { run, revokeSessions, plugin, service, transaction, events, query, findOne, store };
};

const update = (data: Record<string, unknown>, documentId: string | null = 'user-1') => ({
  uid: USER_UID,
  action: 'update',
  params: { ...(documentId === null ? {} : { documentId }), data },
});

describe('revoke-on-ban', () => {
  it('signs a user out everywhere when they are banned', async () => {
    const { run, revokeSessions, plugin, service } = setup();

    const { result } = await run(update({ banned: true, banReason: 'spam' }));

    expect(plugin).toHaveBeenCalledWith(PLUGIN_ID);
    expect(service).toHaveBeenCalledWith('engine');
    expect(revokeSessions).toHaveBeenCalledTimes(1);
    expect(revokeSessions).toHaveBeenCalledWith('user-1');
    expect(result).toEqual({ documentId: 'user-1', banned: true });
  });

  it('does it once the ban is written, in the same transaction', async () => {
    const { run, events } = setup();

    await run(update({ banned: true }));

    expect(events).toEqual([
      'user written (in transaction: true)',
      'sessions revoked (in transaction: true)',
    ]);
  });

  it('fails the update when the sessions cannot be ended, so a ban is never in place beside them', async () => {
    const { run, revokeSessions } = setup();

    revokeSessions.mockRejectedValueOnce(new Error('database is locked'));

    await expect(run(update({ banned: true }))).rejects.toThrow('database is locked');
  });

  it('ends nothing for an update of a user who is not there', async () => {
    const { run, revokeSessions } = setup();

    await run(update({ banned: true }), null);

    expect(revokeSessions).not.toHaveBeenCalled();
  });

  describe('a value that is stored as true', () => {
    // The Document Service casts what it is given; the stored value is what decides
    it.each([
      ['the string true', 'true'],
      ['the number 1', 1],
      ['the string 1', '1'],
    ])('ends the sessions when %s is sent, and the user comes back banned', async (_name, sent) => {
      const { run, revokeSessions, transaction, events } = setup();

      await run(update({ banned: sent }), { documentId: 'user-1', banned: true });

      expect(transaction).toHaveBeenCalledTimes(1);
      expect(revokeSessions).toHaveBeenCalledWith('user-1');
      expect(events).toEqual([
        'user written (in transaction: true)',
        'sessions revoked (in transaction: true)',
      ]);
    });

    it('is read from what the write returned, not from what was sent', async () => {
      const { run, revokeSessions } = setup();

      // Sent as true, but the user is not banned afterwards: nothing to end
      await run(update({ banned: true }), { documentId: 'user-1', banned: false });

      expect(revokeSessions).not.toHaveBeenCalled();
    });
  });

  describe('a write whose result leaves banned out (the caller asked for some fields)', () => {
    it('reads what was stored, in the same transaction, and ends the sessions of a banned user', async () => {
      const { run, revokeSessions, query, findOne, events } = setup();

      const { result } = await run(update({ banned: true }), { documentId: 'user-1', name: 'A' });

      expect(query).toHaveBeenCalledWith(USER_UID);
      expect(findOne).toHaveBeenCalledWith({
        where: { documentId: 'user-1' },
        select: ['banned'],
      });
      expect(revokeSessions).toHaveBeenCalledWith('user-1');
      expect(events).toEqual([
        'user written (in transaction: true)',
        'user read again (in transaction: true)',
        'sessions revoked (in transaction: true)',
      ]);
      // The caller still gets what it asked for
      expect(result).toEqual({ documentId: 'user-1', name: 'A' });
    });

    it.each([
      ['not banned', { banned: false }],
      ['banned as null', { banned: null }],
      ['gone', null],
    ])('ends nothing when the stored user is %s', async (_name, row) => {
      const { run, revokeSessions, findOne, store } = setup();

      store(row);
      await run(update({ banned: true }), { documentId: 'user-1' });

      expect(findOne).toHaveBeenCalledTimes(1);
      expect(revokeSessions).not.toHaveBeenCalled();
    });

    it('does not read again when the result carries banned', async () => {
      const { run, findOne } = setup();

      await run(update({ banned: true }), { documentId: 'user-1', banned: false });

      expect(findOne).not.toHaveBeenCalled();
    });
  });

  it.each([
    ['lifts a ban', { banned: false }, { documentId: 'user-1', banned: false }],
    ['sets it to null', { banned: null }, { documentId: 'user-1', banned: null }],
    [
      'sets it to something that is stored as false',
      { banned: 'false' },
      { documentId: 'user-1', banned: false },
    ],
    ['leaves the ban flag alone', { name: 'New' }, { documentId: 'user-1', banned: true }],
  ])('ends nothing for an update that %s', async (_name, data, written) => {
    const { run, revokeSessions } = setup();

    const { next } = await run(update(data), written);

    expect(next).toHaveBeenCalledTimes(1);
    expect(revokeSessions).not.toHaveBeenCalled();
  });

  it('does not open a transaction, or look for the engine, for an update that does not name banned', async () => {
    const { run, transaction, plugin } = setup();

    await run(update({ name: 'New' }));

    expect(transaction).not.toHaveBeenCalled();
    expect(plugin).not.toHaveBeenCalled();
  });

  it('opens one for every write that names banned, so a cast value cannot slip by', async () => {
    const { run, transaction } = setup();

    await run(update({ banned: 'true' }));
    await run(update({ banned: false }));

    expect(transaction).toHaveBeenCalledTimes(2);
  });

  it('ends nothing for an update that names no user: there is no one to sign out', async () => {
    const { run, revokeSessions } = setup();

    await run(update({ banned: true }, null));

    expect(revokeSessions).not.toHaveBeenCalled();
  });

  it('leaves other content types and other actions alone', async () => {
    const { run, revokeSessions } = setup();

    for (const ctx of [
      {
        uid: 'api::note.note',
        action: 'update',
        params: { documentId: 'n', data: { banned: true } },
      },
      { uid: USER_UID, action: 'create', params: { data: { banned: true } } },
      { uid: USER_UID, action: 'delete', params: { documentId: 'user-1' } },
    ]) {
      // eslint-disable-next-line no-await-in-loop
      const { next } = await run(ctx);

      expect(next).toHaveBeenCalledTimes(1);
    }

    expect(revokeSessions).not.toHaveBeenCalled();
  });
});
