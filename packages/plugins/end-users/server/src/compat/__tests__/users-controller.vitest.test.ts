import { afterEach, describe, expect, it, vi } from 'vitest';
import type Koa from 'koa';
import type { Core } from '@strapi/types';

import { PLUGIN_ID, PROFILE_UID, ROLE_UID, USER_UID } from '../../constants';
import { compatOr, createUsersCompat, splitRoleQuery } from '../users-controller';
import { createTransaction } from '../../__tests__/utils/fake-strapi';

afterEach(() => {
  vi.unstubAllGlobals();
});

const userSchema = { uid: USER_UID, modelType: 'contentType', attributes: {} };
const profileSchema = {
  uid: PROFILE_UID,
  modelType: 'contentType',
  attributes: { bio: { type: 'string' }, user: { type: 'relation' } },
};

const stored = (id: number, documentId: string) => ({
  id,
  documentId,
  email: `${documentId}@example.com`,
  username: documentId,
  emailVerified: true,
  banned: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
});

const setup = ({ compat = true, users = [stored(7, 'doc-a'), stored(8, 'doc-b')] } = {}) => {
  const service = {
    find: vi.fn(async () => ({ results: users })),
    findOne: vi.fn<
      (documentId: string, query?: object) => Promise<ReturnType<typeof stored> | null>
    >(async (documentId) => users.find((u) => u.documentId === documentId) ?? null),
  };
  const documents = {
    create: vi.fn(async () => ({ documentId: 'doc-new' })),
    update: vi.fn(async () => ({})),
    delete: vi.fn(async () => ({})),
    count: vi.fn(async () => 2),
  };
  const profiles = {
    findForUser: vi.fn(async () => ({ documentId: 'profile-1' })),
    updateForUser: vi.fn(async () => ({})),
  };
  const permissions = {
    assertEntry: vi.fn(async () => {}),
    assertWritten: vi.fn(async () => {}),
  };
  const sanitize = {
    query: vi.fn(async (query: Record<string, unknown>) => query),
    input: vi.fn(async (data: object) => data),
    output: vi.fn(async (data: object) => data),
  };
  const validate = {
    query: vi.fn<(query: object, schema: object, options: { action?: string }) => Promise<void>>(
      async () => {}
    ),
    input: vi.fn(async () => {}),
  };
  const dbQuery = vi.fn(() => ({
    findOne: vi.fn(async ({ where }: { where: { id?: number; documentId?: string } }) => {
      const found = users.find((u) => u.id === where.id || u.documentId === where.documentId);

      return found ? { id: found.id, documentId: found.documentId } : null;
    }),
    findMany: vi.fn(async () =>
      users.map((u) => ({
        documentId: u.documentId,
        emailVerified: u.emailVerified,
        banned: u.banned,
        roles: [{ id: 3, name: 'Authenticated', description: 'd', type: 'authenticated' }],
      }))
    ),
  }));
  // `banned` is private to the core payload: the output rules drop it
  const core = {
    sanitizeOutput: vi.fn(async (data: unknown) =>
      (data as Array<Record<string, unknown>>).map(({ banned: _banned, ...rest }) => rest)
    ),
  };

  // The private-attribute lookup of the utils reads the global
  vi.stubGlobal('strapi', { config: { get: (_key: string, fallback?: unknown) => fallback } });

  const strapi = {
    config: {
      get: vi.fn((key: string) =>
        key === `plugin::end-users.compat.usersPermissions` ? compat : undefined
      ),
    },
    contentType: (uid: string) =>
      ({ [USER_UID]: userSchema, [ROLE_UID]: { uid: ROLE_UID, attributes: {} } })[uid] ??
      profileSchema,
    controller: () => core,
    service: () => service,
    plugin: (id: string) => ({ service: () => (id === PLUGIN_ID ? profiles : undefined) }),
    documents: (uid: string) => (uid === USER_UID ? documents : { findMany: async () => [] }),
    contentAPI: { sanitize, validate, permissions },
    db: {
      query: dbQuery,
      transaction: createTransaction().transaction,
    },
  } as unknown as Core.Strapi;

  const ctx = (extra: Record<string, unknown> = {}) =>
    ({
      query: {},
      params: {},
      state: { auth: { strategy: { name: 'users-permissions' } } },
      request: { body: {} },
      set: vi.fn(),
      ...extra,
    }) as unknown as Koa.Context & { body?: unknown; status?: number };

  return { strapi, service, documents, profiles, permissions, sanitize, validate, core, ctx };
};

describe('users in the users-permissions shape', () => {
  it('turns the core { data, meta } list into a bare array and the count into a bare number', async () => {
    const { strapi, ctx, core, documents } = setup();
    const compat = createUsersCompat(strapi);
    const list = ctx();
    const count = ctx();

    await compat.find(list);
    await compat.count(count);

    expect(Array.isArray(list.body)).toBe(true);
    expect(list.body).toHaveLength(2);
    expect(list.body).not.toHaveProperty('data');
    expect(core.sanitizeOutput).toHaveBeenCalled();
    expect(count.body).toBe(2);
    expect(documents.count).toHaveBeenCalledWith({});
  });

  it('shows numeric id and documentId, derives the flags and leaves out engine columns', async () => {
    const { strapi, ctx } = setup({
      users: [
        { ...stored(7, 'doc-a'), emailVerified: false, banned: true, image: 'x' } as ReturnType<
          typeof stored
        >,
      ],
    });
    const list = ctx();

    await createUsersCompat(strapi).find(list);

    expect(list.body).toEqual([
      expect.objectContaining({
        id: 7,
        documentId: 'doc-a',
        provider: 'local',
        confirmed: false,
        blocked: true,
      }),
    ]);
    expect(list.body).not.toEqual([expect.objectContaining({ image: 'x' })]);
    expect((list.body as object[])[0]).not.toHaveProperty('role');
  });

  it('resolves a numeric id and a documentId to the same user', async () => {
    const { strapi, ctx } = setup();
    const compat = createUsersCompat(strapi);
    const byNumber = ctx({ params: { id: '7' } });
    const byDocument = ctx({ params: { id: 'doc-a' } });

    await compat.findOne(byNumber);
    await compat.findOne(byDocument);

    expect(byNumber.body).toEqual(byDocument.body);
    expect(byNumber.body).toMatchObject({ id: 7, documentId: 'doc-a' });
  });

  it('answers 404, not 204, for a missing user', async () => {
    const { strapi, ctx } = setup();
    const compat = createUsersCompat(strapi);

    await expect(compat.findOne(ctx({ params: { id: '999' } }))).rejects.toMatchObject({
      name: 'NotFoundError',
    });
    await expect(compat.findOne(ctx({ params: { id: 'nobody' } }))).rejects.toMatchObject({
      name: 'NotFoundError',
    });
    await expect(compat.update(ctx({ params: { id: '999' } }))).rejects.toMatchObject({
      name: 'NotFoundError',
    });
    await expect(compat.delete(ctx({ params: { id: '999' } }))).rejects.toMatchObject({
      name: 'NotFoundError',
    });
  });

  it('answers a write on a missing user with the entry check wording', async () => {
    const { strapi, ctx } = setup();
    const compat = createUsersCompat(strapi);

    await expect(compat.update(ctx({ params: { id: '999' } }))).rejects.toMatchObject({
      name: 'NotFoundError',
      message: 'Not Found',
    });
    await expect(compat.delete(ctx({ params: { id: '999' } }))).rejects.toMatchObject({
      name: 'NotFoundError',
      message: 'Not Found',
    });
  });

  it('refuses role, confirmed, blocked and provider in a write, naming the field', async () => {
    const { strapi, ctx, documents } = setup();
    const compat = createUsersCompat(strapi);

    for (const field of ['role', 'confirmed', 'blocked', 'provider']) {
      // eslint-disable-next-line no-await-in-loop
      await expect(
        compat.update(ctx({ params: { id: '7' }, request: { body: { [field]: 1 } } }))
      ).rejects.toMatchObject({
        name: 'ApplicationError',
        message: `Invalid parameters: ${field}`,
      });
    }

    await expect(
      compat.create(
        ctx({
          request: { body: { email: 'a@b.io', username: 'a', password: 'x', role: 1 } },
        })
      )
    ).rejects.toMatchObject({ message: 'Invalid parameters: role' });
    expect(documents.update).not.toHaveBeenCalled();
    expect(documents.create).not.toHaveBeenCalled();
  });

  it('refuses a password on update, naming it, and writes nothing', async () => {
    const { strapi, ctx, documents, profiles } = setup();

    await expect(
      createUsersCompat(strapi).update(
        ctx({ params: { id: '7' }, request: { body: { username: 'x', password: 'a-password' } } })
      )
    ).rejects.toMatchObject({ name: 'ApplicationError', message: 'Invalid parameters: password' });
    expect(documents.update).not.toHaveBeenCalled();
    expect(profiles.updateForUser).not.toHaveBeenCalled();
  });

  it('counts under the count rules and their conditions', async () => {
    const { strapi, ctx, documents, sanitize } = setup();

    sanitize.query.mockImplementation(async () => ({ filters: { $and: [{ id: { $gt: 1 } }] } }));

    const count = ctx();

    await createUsersCompat(strapi).count(count);

    expect(sanitize.query).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ action: 'count' })
    );
    expect(documents.count).toHaveBeenCalledWith({ filters: { $and: [{ id: { $gt: 1 } }] } });
  });

  it('counts only by fields the caller may read through find', async () => {
    const { strapi, ctx, documents, validate } = setup();

    validate.query.mockImplementation(async (_query, _schema, options) => {
      if (options.action === 'find') {
        throw Object.assign(new Error('Invalid key secret'), { name: 'ValidationError' });
      }
    });

    const filters = { secret: { $eq: 'x' } };

    await expect(
      createUsersCompat(strapi).count(ctx({ query: { filters } }))
    ).rejects.toMatchObject({ name: 'ValidationError' });
    expect(validate.query).toHaveBeenCalledWith(
      { filters },
      expect.anything(),
      expect.objectContaining({ action: 'find' })
    );
    expect(documents.count).not.toHaveBeenCalled();
  });

  it('shows a role only with the fields the role type lets the caller read', async () => {
    const { strapi, ctx, sanitize } = setup();

    sanitize.output.mockImplementation(async (data: object) => {
      const { id, name } = data as { id: number; name: string };

      return { id, name };
    });

    const list = ctx({ query: { populate: 'role' } });

    await createUsersCompat(strapi).find(list);

    expect((list.body as Array<{ role: unknown }>)[0].role).toEqual({
      id: 3,
      name: 'Authenticated',
    });
    expect(sanitize.output).toHaveBeenCalledWith(
      expect.objectContaining({ id: 3 }),
      expect.objectContaining({ uid: ROLE_UID }),
      expect.objectContaining({ action: 'find' })
    );
  });

  it('hides confirmed when the caller may not read emailVerified', async () => {
    const { strapi, ctx, core } = setup();

    core.sanitizeOutput.mockImplementation(async (data: unknown) =>
      (data as Array<Record<string, unknown>>).map(
        ({ banned: _banned, emailVerified: _emailVerified, ...rest }) => rest
      )
    );

    const list = ctx();

    await createUsersCompat(strapi).find(list);

    expect((list.body as object[])[0]).not.toHaveProperty('confirmed');
    expect((list.body as object[])[0]).toHaveProperty('blocked', false);
  });

  it('sets the name of a new user only from what the field rules of the caller let through', async () => {
    const { strapi, ctx, documents, sanitize, service } = setup();
    const body = { email: 'new@example.com', username: 'newbie', name: 'Given', password: 'pw' };

    service.findOne.mockImplementation(async () => stored(9, 'doc-new'));

    const created = async (allowed: Record<string, unknown>) => {
      sanitize.input.mockImplementationOnce(async () => allowed);
      documents.create.mockClear();

      await createUsersCompat(strapi).create(ctx({ request: { body } }));

      return (documents.create.mock.calls[0] as unknown as [{ data: { name: string } }])[0].data
        .name;
    };

    expect(await created({ name: 'Given', username: 'newbie' })).toBe('Given');
    // `name` stripped: the username the rules let through, never the one of the body alone
    expect(await created({ username: 'newbie' })).toBe('newbie');
    expect(await created({ email: 'new@example.com' })).toBe('new');
    expect(await created({})).toBe('user');
  });

  it('answers an update that left the caller read conditions with the identity alone', async () => {
    const { strapi, ctx, service, sanitize } = setup();

    sanitize.query.mockImplementation(async () => ({ filters: { id: { $eq: 999 } } }));
    // The re-read is under the caller's conditions: the user is not one of the rows they match now
    service.findOne.mockImplementation(async (_documentId: string, query?: object) =>
      query && 'filters' in query ? null : stored(7, 'doc-a')
    );

    const update = ctx({ params: { id: '7' }, request: { body: { username: 'new' } } });

    await createUsersCompat(strapi).update(update);

    expect(service.findOne).toHaveBeenLastCalledWith('doc-a', {
      filters: { id: { $eq: 999 } },
    });
    expect(update.body).toEqual({ id: 7, documentId: 'doc-a' });
  });

  it('answers an update with the user, shaped, while it is still readable', async () => {
    const { strapi, ctx } = setup();
    const update = ctx({ params: { id: '7' }, request: { body: { username: 'new' } } });

    await createUsersCompat(strapi).update(update);

    expect(update.body).toMatchObject({ id: 7, documentId: 'doc-a', email: 'doc-a@example.com' });
  });

  it('writes profile keys to the profile and the rest to the user', async () => {
    const { strapi, ctx, documents, profiles, permissions } = setup();
    const update = ctx({
      params: { id: '7' },
      request: { body: { username: 'new', bio: 'hello' } },
    });

    await createUsersCompat(strapi).update(update);

    expect(documents.update).toHaveBeenCalledWith({
      documentId: 'doc-a',
      data: { username: 'new' },
    });
    expect(profiles.updateForUser).toHaveBeenCalledWith('doc-a', { data: { bio: 'hello' } });
    expect(permissions.assertEntry).toHaveBeenCalledWith(
      expect.anything(),
      'update',
      PROFILE_UID,
      'profile-1'
    );
  });

  it('creates with 201, a bare user and the profile keys on the profile', async () => {
    const { strapi, ctx, documents, profiles, service } = setup();

    service.findOne.mockImplementation(async () => stored(9, 'doc-new'));

    const create = ctx({
      request: {
        body: { email: 'new@example.com', username: 'new', password: 'a-password', bio: 'hi' },
      },
    });

    await createUsersCompat(strapi).create(create);

    expect(create.status).toBe(201);
    expect(create.body).toMatchObject({ id: 9, documentId: 'doc-new' });
    expect(documents.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ email: 'new@example.com', password: 'a-password' }),
    });
    expect(profiles.updateForUser).toHaveBeenCalledWith('doc-new', { data: { bio: 'hi' } });
  });

  it('answers 400 for a missing required field of a create', async () => {
    const { strapi, ctx } = setup();

    await expect(
      createUsersCompat(strapi).create(ctx({ request: { body: { username: 'a', password: 'b' } } }))
    ).rejects.toMatchObject({ name: 'ValidationError', message: 'email is a required field' });
  });

  it('returns the deleted user', async () => {
    const { strapi, ctx, documents } = setup();
    const del = ctx({ params: { id: '8' } });

    await createUsersCompat(strapi).delete(del);

    expect(del.body).toMatchObject({ id: 8, documentId: 'doc-b' });
    expect(documents.delete).toHaveBeenCalledWith({ documentId: 'doc-b' });
  });

  it('shows the role on me only with populate=role', async () => {
    const { strapi, ctx } = setup();
    const compat = createUsersCompat(strapi);
    const plain = ctx({ state: { auth: {}, user: { documentId: 'doc-a' } } });
    const populated = ctx({
      query: { populate: 'role' },
      state: { auth: {}, user: { documentId: 'doc-a' } },
    });

    await compat.me(plain);
    await compat.me(populated);

    expect(plain.body).not.toHaveProperty('role');
    expect(populated.body).toMatchObject({
      role: { id: 3, name: 'Authenticated', description: 'd', type: 'authenticated' },
    });
    expect(plain.set).toHaveBeenCalledWith('Cache-Control', 'private, no-store');
  });

  it("populates the caller's own role on /users/me", async () => {
    const { strapi, ctx, sanitize } = setup();
    // The caller may not read roles: the sanitizer drops the populate
    sanitize.query.mockImplementation(
      async ({ populate: _populate, ...rest }: Record<string, unknown>) => rest
    );

    const me = ctx({
      query: { populate: 'role' },
      state: { auth: {}, user: { documentId: 'doc-a' } },
    });

    await createUsersCompat(strapi).me(me);

    expect(me.body).toMatchObject({ role: { type: 'authenticated' } });
  });

  it('does not populate role on /users for a caller who cannot read roles', async () => {
    const { strapi, ctx, sanitize } = setup();

    sanitize.query.mockImplementation(
      async ({ populate: _populate, ...rest }: Record<string, unknown>) => rest
    );

    const list = ctx({ query: { populate: 'role' } });

    await createUsersCompat(strapi).find(list);

    expect(list.body).toHaveLength(2);
    expect((list.body as object[])[0]).not.toHaveProperty('role');
  });

  it('answers 401 on me without a signed-in user', async () => {
    const { strapi, ctx } = setup();

    await expect(createUsersCompat(strapi).me(ctx())).rejects.toMatchObject({
      name: 'UnauthorizedError',
    });
  });
});

describe('the mode switch', () => {
  it('returns the core shapes with compat off', () => {
    const on = setup({ compat: true }).strapi;
    const off = setup({ compat: false }).strapi;
    const compat = vi.fn(() => 'compat');
    const core = vi.fn(() => 'core');

    expect(compatOr(on, compat, core)).toBe('compat');
    expect(compatOr(off, compat, core)).toBe('core');
    expect(core).toHaveBeenCalledTimes(1);
  });
});

describe('the role in a query', () => {
  it('takes a bare role out of the populate and reports it', () => {
    expect(splitRoleQuery({ populate: 'role' })).toEqual({ query: {}, wantsRole: true });
    expect(splitRoleQuery({ populate: ['role', 'x'] })).toEqual({
      query: { populate: ['x'] },
      wantsRole: true,
    });
    expect(splitRoleQuery({ populate: { role: true, x: true } })).toEqual({
      query: { populate: { x: true } },
      wantsRole: true,
    });
    expect(splitRoleQuery({ populate: '*' })).toEqual({
      query: { populate: '*' },
      wantsRole: true,
    });
  });

  it('renames a populate below the role and the role in filters and sort', () => {
    expect(splitRoleQuery({ populate: 'role.users' })).toEqual({
      query: { populate: 'roles.users' },
      wantsRole: true,
    });
    expect(
      splitRoleQuery({ filters: { role: { type: 'authenticated' } }, sort: 'role.name:asc' })
    ).toEqual({
      query: { filters: { roles: { type: 'authenticated' } }, sort: 'roles.name:asc' },
      wantsRole: false,
    });
  });
});
