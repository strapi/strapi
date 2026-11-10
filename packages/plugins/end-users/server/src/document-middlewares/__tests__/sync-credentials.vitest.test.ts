import { describe, expect, it, vi } from 'vitest';

import { PLUGIN_ID, USER_UID } from '../../constants';
import { syncCredentialsMiddleware } from '../sync-credentials';
import { createTransaction, fakeStrapi } from '../../__tests__/utils/fake-strapi';

const setup = () => {
  const events: string[] = [];
  const setPassword = vi.fn(async () => {
    events.push(`password set (in transaction: ${inTransaction()})`);
  });
  const revokeSessions = vi.fn(async () => {
    events.push(`sessions revoked (in transaction: ${inTransaction()})`);
  });
  const get = vi.fn(() => ({ setPassword, revokeSessions }));
  const service = vi.fn(() => ({ get }));
  const plugin = vi.fn(() => ({ service }));
  const { transaction, inTransaction } = createTransaction();
  const strapi = fakeStrapi({ plugin, db: { transaction } });

  const run = async (ctx: Record<string, unknown>, written: unknown = { documentId: 'user-1' }) => {
    const seen: { data?: unknown } = {};
    const next = vi.fn(async () => {
      seen.data = (ctx.params as { data?: unknown } | undefined)?.data;
      events.push(`user written (in transaction: ${inTransaction()})`);

      return written;
    });
    const result = await syncCredentialsMiddleware(strapi)(ctx as never, next as never);

    return { next, result, seen };
  };

  return { run, setPassword, revokeSessions, plugin, service, get, transaction, events };
};

const create = (data: Record<string, unknown>) => ({
  uid: USER_UID,
  action: 'create',
  params: { data },
});
const update = (data: Record<string, unknown>) => ({
  uid: USER_UID,
  action: 'update',
  params: { documentId: 'user-9', data },
});

describe('sync-credentials', () => {
  it('hands the password of a created user to the engine, for the user just written', async () => {
    const { run, setPassword, plugin, service } = setup();

    await run(create({ email: 'a@x.io', password: 'Passw0rd!long' }));

    expect(plugin).toHaveBeenCalledWith(PLUGIN_ID);
    expect(service).toHaveBeenCalledWith('engine');
    expect(setPassword).toHaveBeenCalledTimes(1);
    expect(setPassword).toHaveBeenCalledWith('user-1', 'Passw0rd!long');
  });

  it('ends no session for a created user: there are none yet', async () => {
    const { run, revokeSessions } = setup();

    await run(create({ email: 'a@x.io', password: 'Passw0rd!long' }));

    expect(revokeSessions).not.toHaveBeenCalled();
  });

  it('takes the password out of the data, so it is never written to the user', async () => {
    const { run } = setup();
    const ctx = create({ email: 'a@x.io', password: 'Passw0rd!long' });

    const { seen } = await run(ctx);

    expect(seen.data).toEqual({ email: 'a@x.io' });
  });

  it('does not change the object the caller passed', async () => {
    const { run } = setup();
    const data = { email: 'a@x.io', password: 'Passw0rd!long' };

    await run(create(data));

    expect(data).toEqual({ email: 'a@x.io', password: 'Passw0rd!long' });
  });

  it('sets the password after the user is written, and in the same transaction', async () => {
    const { run, events } = setup();

    await run(create({ email: 'a@x.io', password: 'Passw0rd!long' }));

    expect(events).toEqual([
      'user written (in transaction: true)',
      'password set (in transaction: true)',
    ]);
  });

  it('fails the create when the engine refuses the password, so no user is kept without one', async () => {
    const { run, setPassword } = setup();

    setPassword.mockRejectedValueOnce(
      new Error('The password must be at least 8 characters long.')
    );

    await expect(run(create({ email: 'a@x.io', password: 'short' }))).rejects.toThrow(
      'at least 8 characters'
    );
  });

  it('returns what the write returned', async () => {
    const { run } = setup();

    const { result } = await run(create({ email: 'a@x.io', password: 'Passw0rd!long' }), {
      documentId: 'user-1',
      email: 'a@x.io',
    });

    expect(result).toEqual({ documentId: 'user-1', email: 'a@x.io' });
  });

  describe('an update', () => {
    it('sets the password of the user it names', async () => {
      const { run, setPassword } = setup();

      const { seen } = await run(update({ name: 'New', password: 'Passw0rd!long' }), {
        documentId: 'user-9',
      });

      expect(seen.data).toEqual({ name: 'New' });
      expect(setPassword).toHaveBeenCalledWith('user-9', 'Passw0rd!long');
    });

    it('ends all the sessions of the user, after the password is written, in the same transaction', async () => {
      const { run, revokeSessions, events } = setup();

      await run(update({ password: 'Passw0rd!long' }), { documentId: 'user-9' });

      expect(revokeSessions).toHaveBeenCalledTimes(1);
      // Every session: no `except`
      expect(revokeSessions).toHaveBeenCalledWith('user-9');
      expect(events).toEqual([
        'user written (in transaction: true)',
        'password set (in transaction: true)',
        'sessions revoked (in transaction: true)',
      ]);
    });

    it('keeps the old sessions when the engine refuses the new password', async () => {
      const { run, setPassword, revokeSessions } = setup();

      setPassword.mockRejectedValueOnce(new Error('The password must be at least 8 characters.'));

      await expect(run(update({ password: 'short' }))).rejects.toThrow('at least 8 characters');
      expect(revokeSessions).not.toHaveBeenCalled();
    });

    it('fails the update when the sessions cannot be ended, so a password never changes beside them', async () => {
      const { run, revokeSessions } = setup();

      revokeSessions.mockRejectedValueOnce(new Error('database is locked'));

      await expect(run(update({ password: 'Passw0rd!long' }))).rejects.toThrow(
        'database is locked'
      );
    });

    it('that sets no password ends no session', async () => {
      const { run, revokeSessions } = setup();

      await run(update({ name: 'New' }));
      await run(update({ name: 'New', password: '' }));
      await run(update({ name: 'New', password: null }));

      expect(revokeSessions).not.toHaveBeenCalled();
    });

    it('of a user that is not there sets no password and ends no session', async () => {
      const { run, setPassword, revokeSessions } = setup();

      await run(update({ password: 'Passw0rd!long' }), null);

      expect(setPassword).not.toHaveBeenCalled();
      expect(revokeSessions).not.toHaveBeenCalled();
    });
  });

  describe('an empty password', () => {
    it.each([
      ['an empty string', ''],
      ['null', null],
      ['undefined', undefined],
    ])('is no password: %s', async (_name, password) => {
      const { run, setPassword, transaction } = setup();

      const { next, seen } = await run(update({ name: 'New', password }));

      expect(next).toHaveBeenCalledTimes(1);
      expect(setPassword).not.toHaveBeenCalled();
      expect(transaction).not.toHaveBeenCalled();
      // And it is not stored on the user either
      expect(seen.data).toEqual({ name: 'New' });
    });
  });

  it('refuses a password that is not a string, naming the field', async () => {
    const { run, setPassword } = setup();

    await expect(run(create({ email: 'a@x.io', password: 12345678 }))).rejects.toMatchObject({
      name: 'ValidationError',
      details: { errors: [{ path: ['password'] }] },
    });
    expect(setPassword).not.toHaveBeenCalled();
  });

  it('leaves a write with no password, other content types and other actions alone', async () => {
    const { run, setPassword, transaction, plugin } = setup();

    for (const ctx of [
      create({ email: 'a@x.io' }),
      { uid: 'api::note.note', action: 'create', params: { data: { password: 'x' } } },
      { uid: USER_UID, action: 'delete', params: { documentId: 'user-1' } },
      { uid: USER_UID, action: 'clone', params: { documentId: 'user-1', data: { password: 'x' } } },
      { uid: USER_UID, action: 'create', params: {} },
    ]) {
      // eslint-disable-next-line no-await-in-loop
      const { next } = await run(ctx);

      expect(next).toHaveBeenCalledTimes(1);
    }

    expect(setPassword).not.toHaveBeenCalled();
    expect(transaction).not.toHaveBeenCalled();
    expect(plugin).not.toHaveBeenCalled();
  });
});
