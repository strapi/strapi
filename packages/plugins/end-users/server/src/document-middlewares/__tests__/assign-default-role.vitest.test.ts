import { describe, expect, it, vi } from 'vitest';
import type { Core } from '@strapi/types';

import { PLUGIN_ID, USER_UID } from '../../constants';
import { assignDefaultRoleMiddleware } from '../assign-default-role';

const setup = ({
  defaultRole = { documentId: 'role-authenticated' } as unknown,
  defaultRoles = [] as string[],
  existing = undefined as string[] | undefined,
} = {}) => {
  const getDefault = vi.fn(async () => {
    if (!defaultRole) throw new Error('The default role does not exist');

    return defaultRole;
  });
  const get = vi.fn(async () => ({ signUp: { defaultRoles } }));
  const services: Record<string, unknown> = { role: { getDefault }, settings: { get } };
  const service = vi.fn((name: string) => services[name]);
  const plugin = vi.fn(() => ({ service }));
  const findMany = vi.fn(async () =>
    (existing ?? defaultRoles).map((documentId) => ({ documentId }))
  );
  const query = vi.fn(() => ({ findMany }));
  const middleware = assignDefaultRoleMiddleware({
    plugin,
    db: { query },
  } as unknown as Core.Strapi);

  const run = async (ctx: Record<string, unknown>) => {
    const next = vi.fn().mockResolvedValue('result');
    const result = await middleware(ctx as never, next);

    return { next, result };
  };

  return { run, middleware, getDefault, service, plugin, findMany };
};

describe('assign-default-role', () => {
  it('connects the default role to a user created without roles', async () => {
    const { run, plugin, service } = setup();
    const ctx = {
      uid: USER_UID,
      action: 'create',
      params: { data: { email: 'a@x.io', name: 'A' } },
    };

    const { next, result } = await run(ctx);

    expect(plugin).toHaveBeenCalledWith(PLUGIN_ID);
    expect(service).toHaveBeenCalledWith('role');
    expect(service).toHaveBeenCalledWith('settings');
    expect(ctx.params.data).toEqual({
      email: 'a@x.io',
      name: 'A',
      roles: { connect: ['role-authenticated'] },
    });
    expect(next).toHaveBeenCalledTimes(1);
    expect(result).toBe('result');
  });

  it('writes the role in the same call as the user: it is in the data when next runs', async () => {
    const { middleware } = setup();
    const ctx = { uid: USER_UID, action: 'create', params: { data: { email: 'a@x.io' } } };
    let seen: unknown;

    await middleware(
      ctx as never,
      (async () => {
        seen = (ctx.params.data as Record<string, unknown>).roles;
      }) as never
    );

    expect(seen).toEqual({ connect: ['role-authenticated'] });
  });

  it.each([
    ['a list of ids', ['role-a']],
    ['a single id', 'role-a'],
    ['a connect', { connect: ['role-a'] }],
    ['a connect of documents', { connect: [{ documentId: 'role-a' }] }],
    ['a set', { set: ['role-a', 'role-b'] }],
    ['a list of longhand objects', [{ documentId: 'role-a' }, { id: 5 }]],
    ['a numeric id', 5],
    // The shapes the Document Service wraps for the caller: one object, and one value where a list goes
    ['a single longhand object with a documentId', { documentId: 'role-a' }],
    ['a single longhand object with an id', { id: 5 }],
    ['a connect of one id, not in a list', { connect: 'role-a' }],
    ['a connect of one numeric id', { connect: 5 }],
    ['a connect of one longhand object', { connect: { documentId: 'role-a' } }],
    ['a connect of one longhand object with an id', { connect: { id: 5 } }],
    ['a set of one id, not in a list', { set: 'role-a' }],
    ['a set of one longhand object', { set: { documentId: 'role-a' } }],
    ['a connect next to a disconnect', { connect: ['role-a'], disconnect: ['role-b'] }],
    ['a set next to a connect that names the same', { set: ['role-a'], connect: ['role-a'] }],
    // `set: null` is not a set, to the Document Service or to the database layer
    ['a connect next to a null set', { connect: ['role-a'], set: null }],
    ['a connect next to a set that is not there', { connect: ['role-a'], set: undefined }],
    // An entry that names no role does not hide one that does: one real entry is still a choice
    ['a list with an empty string next to an id', ['', 'role-a']],
    ['a list with a null next to an id', [null, 'role-a']],
    ['a list with an undefined next to a numeric id', [undefined, 5]],
    ['a connect with a null next to an id', { connect: [null, 'role-a'] }],
    ['a set with a zero next to an id', { set: [0, 'role-a'] }],
    ['a large whole number', 9007199254740991],
  ])('keeps the roles the caller chose: %s', async (_label, roles) => {
    const { run, getDefault } = setup();
    const ctx = { uid: USER_UID, action: 'create', params: { data: { email: 'a@x.io', roles } } };

    const { next } = await run(ctx);

    expect(ctx.params.data.roles).toBe(roles);
    expect(getDefault).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['no roles key', undefined],
    ['undefined', { roles: undefined }],
    ['null', { roles: null }],
    ['an empty list', { roles: [] }],
    ['an empty connect', { roles: { connect: [] } }],
    [
      'an empty connect and an empty disconnect, as the Content Manager sends',
      { roles: { connect: [], disconnect: [] } },
    ],
    ['an empty set', { roles: { set: [] } }],
    ['an object that connects nothing', { roles: {} }],
    ['only a disconnect', { roles: { disconnect: ['role-a'] } }],
    // When `set` is there it wins over `connect`, both in the Document Service and in the database
    // layer, and an empty one leaves the user with no role at all
    ['a connect next to an empty set', { roles: { connect: ['role-a'], set: [] } }],
    ['an empty connect next to an empty set', { roles: { connect: [], set: [] } }],
    ['a connect of one id next to an empty set', { roles: { connect: 'role-a', set: [] } }],
    ['an empty string', { roles: '' }],
    ['a connect that is an empty string', { roles: { connect: '' } }],
    ['a set that is null', { roles: { set: null } }],
    ['a longhand object with no id', { roles: { documentId: '' } }],
    ['a connect that is an empty object', { roles: { connect: {} } }],
    // A list is judged by its entries: none of these names a role, however long the list is, so the
    // create gets the default role
    ['a list of an empty string', { roles: [''] }],
    ['a list of a null', { roles: [null] }],
    ['a list of an undefined', { roles: [undefined] }],
    ['a list of a zero', { roles: [0] }],
    ['a list of nothing but falsy entries', { roles: ['', null, undefined, 0] }],
    ['a list of a longhand object with no id', { roles: [{ documentId: '' }, { id: 0 }] }],
    ['a connect of an empty string in a list', { roles: { connect: [''] } }],
    ['a connect of a null in a list', { roles: { connect: [null] } }],
    ['a set of an undefined in a list', { roles: { set: [undefined] } }],
    [
      'a connect of one next to a set of an empty string',
      { roles: { connect: ['role-a'], set: [''] } },
    ],
    // Not ids: only a positive whole number is one
    ['a NaN', { roles: Number.NaN }],
    ['a negative number', { roles: -1 }],
    ['a fraction', { roles: 1.5 }],
    ['an infinite number', { roles: Number.POSITIVE_INFINITY }],
    ['a longhand object with a negative id', { roles: { id: -3 } }],
    ['a longhand object with a NaN id', { roles: { id: Number.NaN } }],
    ['a connect of a fraction', { roles: { connect: 2.5 } }],
    ['a list of numbers that are not ids', { roles: [Number.NaN, -1, 0.5] }],
  ])('gives the default role to a create that chose none: %s', async (_label, extra) => {
    const { run, getDefault } = setup();
    const ctx = {
      uid: USER_UID,
      action: 'create',
      params: { data: { email: 'a@x.io', ...extra } },
    };

    const { next } = await run(ctx);

    // Whatever was there is replaced, not added to
    expect((ctx.params.data as Record<string, unknown>).roles).toEqual({
      connect: ['role-authenticated'],
    });
    expect(getDefault).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('gives new users every default role, or Authenticated when none are set', async () => {
    const some = setup({ defaultRoles: ['role-a', 'role-b'] });
    const ctx = { uid: USER_UID, action: 'create', params: { data: { email: 'a@x.io' } } };

    await some.run(ctx);

    expect((ctx.params.data as Record<string, unknown>).roles).toEqual({
      connect: ['role-a', 'role-b'],
    });
    expect(some.getDefault).not.toHaveBeenCalled();

    const none = setup({ defaultRoles: [] });
    const other = { uid: USER_UID, action: 'create', params: { data: { email: 'b@x.io' } } };

    await none.run(other);

    expect((other.params.data as Record<string, unknown>).roles).toEqual({
      connect: ['role-authenticated'],
    });
    expect(none.findMany).not.toHaveBeenCalled();
  });

  it('leaves out a default role that has been deleted, and falls back to Authenticated when none is left', async () => {
    const partly = setup({ defaultRoles: ['role-a', 'gone'], existing: ['role-a'] });
    const ctx = { uid: USER_UID, action: 'create', params: { data: { email: 'a@x.io' } } };

    await partly.run(ctx);

    expect((ctx.params.data as Record<string, unknown>).roles).toEqual({ connect: ['role-a'] });

    const none = setup({ defaultRoles: ['gone'], existing: [] });
    const other = { uid: USER_UID, action: 'create', params: { data: { email: 'b@x.io' } } };

    await none.run(other);

    expect((other.params.data as Record<string, unknown>).roles).toEqual({
      connect: ['role-authenticated'],
    });
  });

  it('keeps the roles a caller chose, whatever the default roles are', async () => {
    const { run, findMany } = setup({ defaultRoles: ['role-a'] });
    const ctx = {
      uid: USER_UID,
      action: 'create',
      params: { data: { email: 'a@x.io', roles: ['role-z'] } },
    };

    await run(ctx);

    expect((ctx.params.data as Record<string, unknown>).roles).toEqual(['role-z']);
    expect(findMany).not.toHaveBeenCalled();
  });

  it('does not change the object the caller passed in', async () => {
    const { run } = setup();
    const data = { email: 'a@x.io' };
    const ctx = { uid: USER_UID, action: 'create', params: { data } };

    await run(ctx);

    expect(data).toEqual({ email: 'a@x.io' });
    expect(ctx.params.data).not.toBe(data);
  });

  it('asks for the default role once per user', async () => {
    const { run, getDefault } = setup();

    await run({ uid: USER_UID, action: 'create', params: { data: { email: 'a@x.io' } } });
    await run({ uid: USER_UID, action: 'create', params: { data: { email: 'b@x.io' } } });

    expect(getDefault).toHaveBeenCalledTimes(2);
  });

  it('fails the create, writing nothing, when the default role does not exist', async () => {
    const { middleware } = setup({ defaultRole: null });
    const next = vi.fn();

    await expect(
      middleware(
        { uid: USER_UID, action: 'create', params: { data: { email: 'a@x.io' } } } as never,
        next
      )
    ).rejects.toThrow('default role');

    expect(next).not.toHaveBeenCalled();
  });

  it('leaves the other content types and the other actions alone', async () => {
    const { run, getDefault } = setup();

    for (const ctx of [
      { uid: 'api::article.article', action: 'create' },
      { uid: USER_UID, action: 'update' },
      { uid: USER_UID, action: 'clone' },
      { uid: USER_UID, action: 'findMany' },
      { uid: USER_UID, action: 'delete' },
    ]) {
      const params = { documentId: 'u1', data: { email: 'a@x.io' } };
      // eslint-disable-next-line no-await-in-loop
      const { next } = await run({ ...ctx, params });

      expect(next, `${ctx.uid} ${ctx.action}`).toHaveBeenCalledTimes(1);
      expect(params.data).toEqual({ email: 'a@x.io' });
    }

    expect(getDefault).not.toHaveBeenCalled();
  });

  it('copes with a call that has no data', async () => {
    const { run, getDefault } = setup();

    for (const params of [undefined, {}, { data: undefined }, { data: null }]) {
      // eslint-disable-next-line no-await-in-loop
      const { next } = await run({ uid: USER_UID, action: 'create', params });

      expect(next).toHaveBeenCalledTimes(1);
    }

    expect(getDefault).not.toHaveBeenCalled();
  });
});
