import { describe, expect, it, vi } from 'vitest';
import type { Core } from '@strapi/types';

import { PROFILE_UID, USER_UID } from '../../constants';
import { setPendingProfile } from '../../utils/pending-profile';
import { inProfileLifecycle } from '../../utils/profile-lifecycle';
import { createProfileMiddleware } from '../create-profile';

const setup = ({ state = {} as Record<string, unknown> | null } = {}) => {
  const events: string[] = [];
  let inTransaction = false;

  const marked: boolean[] = [];
  const create = vi.fn(async () => {
    marked.push(inProfileLifecycle());
    events.push(`profile created (in transaction: ${inTransaction})`);

    return { documentId: 'profile-1' };
  });
  const documents = vi.fn(() => ({ create }));
  const transaction = vi.fn(async (callback: () => Promise<unknown>) => {
    inTransaction = true;

    try {
      return await callback();
    } finally {
      inTransaction = false;
    }
  });
  const warn = vi.fn();
  const profileValues = vi.fn(async () => ({}));
  const strapi = {
    documents,
    db: { transaction },
    log: { warn },
    plugin: () => ({ service: () => ({ profileValues }) }),
    requestContext: { get: () => (state ? { state } : undefined) },
  } as unknown as Core.Strapi;

  const run = async (ctx: Record<string, unknown>, user: unknown = { documentId: 'user-1' }) => {
    const next = vi.fn(async () => {
      events.push(`user written (in transaction: ${inTransaction})`);

      return user;
    });
    const result = await createProfileMiddleware(strapi)(ctx as never, next as never);

    return { next, result };
  };

  return {
    strapi,
    run,
    create,
    documents,
    transaction,
    events,
    state,
    marked,
    warn,
    profileValues,
  };
};

const createUser = () => ({
  uid: USER_UID,
  action: 'create',
  params: { data: { email: 'a@x.io' } },
});

describe('create-profile', () => {
  it('makes the profile of a new user, connected to the user, once the user is written', async () => {
    const { run, create, documents, events } = setup();

    const { result } = await run(createUser());

    expect(documents).toHaveBeenCalledWith(PROFILE_UID);
    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith({ data: { user: { connect: ['user-1'] } } });
    expect(events[0]).toMatch(/^user written/);
    expect(events[1]).toMatch(/^profile created/);
    expect(result).toEqual({ documentId: 'user-1' });
  });

  it('writes the user and the profile in one transaction', async () => {
    const { run, events, transaction } = setup();

    await run(createUser());

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(events).toEqual([
      'user written (in transaction: true)',
      'profile created (in transaction: true)',
    ]);
  });

  it('fails the create of the user when the profile cannot be made, so neither is kept', async () => {
    const { run, create } = setup();

    create.mockRejectedValueOnce(new Error('company must be defined'));

    await expect(run(createUser())).rejects.toThrow('company must be defined');
  });

  it('leaves other content types and other actions alone', async () => {
    const { run, create, transaction } = setup();

    for (const ctx of [
      { uid: 'api::note.note', action: 'create', params: { data: {} } },
      { uid: PROFILE_UID, action: 'create', params: { data: {} } },
      { uid: USER_UID, action: 'update', params: { documentId: 'u', data: {} } },
      { uid: USER_UID, action: 'delete', params: { documentId: 'u' } },
      { uid: USER_UID, action: 'findMany', params: {} },
    ]) {
      // eslint-disable-next-line no-await-in-loop
      const { next } = await run(ctx);

      expect(next).toHaveBeenCalledTimes(1);
    }

    expect(create).not.toHaveBeenCalled();
    expect(transaction).not.toHaveBeenCalled();
  });

  it('makes a profile for every user create, whatever the source', async () => {
    // No setting turns it off: the middleware reads none, and the strapi it is given has no config
    const { run, create } = setup();

    for (const source of [
      { uid: USER_UID, action: 'create', params: { data: { email: 'a@x.io' } } },
      {
        uid: USER_UID,
        action: 'create',
        params: { data: { email: 'b@x.io', provider: 'github' } },
      },
      { uid: USER_UID, action: 'create', params: {} },
    ]) {
      // eslint-disable-next-line no-await-in-loop
      await run(source);
    }

    expect(create).toHaveBeenCalledTimes(3);
  });

  it('makes the profile as the plugin`s own create, which `one-profile-per-user` lets through', async () => {
    const { run, marked } = setup();

    await run(createUser());

    expect(marked).toEqual([true]);
    // And only around that call: it is not left on for whatever runs next
    expect(inProfileLifecycle()).toBe(false);
  });

  describe('profile fields of a sign-up', () => {
    it('are written with the profile, in the same create', async () => {
      const { run, create, strapi } = setup();

      setPendingProfile(strapi, { fields: { company: 'Acme', newsletter: true } });
      await run(createUser());

      expect(create).toHaveBeenCalledTimes(1);
      expect(create).toHaveBeenCalledWith({
        data: { company: 'Acme', newsletter: true, user: { connect: ['user-1'] } },
      });
    });

    it('cannot name another owner: the user of the profile is the user just made', async () => {
      const { run, create, strapi } = setup();

      setPendingProfile(strapi, { fields: { company: 'Acme', user: 'someone-else' } });
      await run(createUser());

      expect(create).toHaveBeenCalledWith({
        data: { company: 'Acme', user: { connect: ['user-1'] } },
      });
    });

    it('are used once: the next user made in the same request gets none of them', async () => {
      const { run, create, strapi } = setup();

      setPendingProfile(strapi, { fields: { company: 'Acme' } });
      await run(createUser());
      await run(createUser(), { documentId: 'user-2' });

      expect(create).toHaveBeenNthCalledWith(2, { data: { user: { connect: ['user-2'] } } });
    });

    it('are not there outside a request: the profile is made without them', async () => {
      const { run, create } = setup({ state: null });

      await run(createUser());

      expect(create).toHaveBeenCalledWith({ data: { user: { connect: ['user-1'] } } });
    });
  });

  it('makes no profile for a create that wrote no user', async () => {
    const { run, create } = setup();

    await run(createUser(), null);

    expect(create).not.toHaveBeenCalled();
  });

  it('makes the profile without the provider claims when mapping them throws', async () => {
    const { run, create, state, warn, profileValues } = setup();

    (state as Record<string, unknown>).endUsersProviderClaims = {
      providerId: 'github',
      profile: { company: 'Strapi' },
    };
    profileValues.mockRejectedValue(new Error('store is down'));

    const { result } = await run(createUser());

    expect(result).toEqual({ documentId: 'user-1' });
    expect(create).toHaveBeenCalledWith({ data: { user: { connect: ['user-1'] } } });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('store is down'));
  });
});
