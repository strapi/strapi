import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Core } from '@strapi/types';

import instantiatePermissionsUtilities from '..';
import { applyCondition, evaluateCondition, resolvePlaceholders } from '../conditions';
import type { ConditionContext, ContentApiConditionDefinition } from '../conditions';
import { DATA_ABILITY } from '../types';

const NOTE = 'api::note.note';
const ARTICLE = 'api::article.article';

const user = {
  uid: 'plugin::end-users.user',
  id: 7,
  documentId: 'u1',
  email: 'a@x.io',
  roles: [{ documentId: 'r1' }, { documentId: 'r2' }],
};
const ctx = { user, uid: NOTE, now: new Date('2026-10-28T00:00:00Z') };

const mine: ContentApiConditionDefinition = {
  name: 'test.mine',
  displayName: 'Mine',
  subjects: [NOTE],
  query: { owner: { documentId: { $eq: '$user.documentId' } } },
};

const shared: ContentApiConditionDefinition = {
  name: 'test.shared',
  displayName: 'Shared',
  query: { shared: { $eq: true } },
};

/** The route ability answers `can(action)` with no subject, which CASL's own typing doesn't allow */
const canCallRoute = (ability: unknown, action: string) =>
  (ability as { can(action: string): boolean }).can(action);

const contentApi = (...names: string[]) =>
  Object.fromEntries(
    names.map((name) => [
      name,
      Object.assign(() => {}, { [Symbol.for('__type__')]: ['content-api'] }),
    ])
  );

const createStrapi = () =>
  ({
    isLoaded: false,
    log: { debug: vi.fn(), error: vi.fn() },
    contentTypes: {
      [NOTE]: { uid: NOTE, options: { draftAndPublish: false } },
      [ARTICLE]: { uid: ARTICLE, options: { draftAndPublish: true } },
    },
    apis: {
      note: { controllers: { note: contentApi('find', 'findOne', 'update', 'create') } },
      article: { controllers: { article: contentApi('find', 'findOne') } },
    },
    plugins: {},
  }) as unknown as Core.Strapi;

describe('Content API conditions: placeholders', () => {
  it('replaces placeholders in values', () => {
    expect(
      resolvePlaceholders(
        {
          owner: { documentId: { $eq: '$user.documentId' } },
          role: { $in: '$user.roles.documentId' },
          at: { $lte: '$now' },
          s: '$params.state',
        },
        { ...ctx, params: { state: 'open' } }
      ).value
    ).toEqual({
      owner: { documentId: { $eq: 'u1' } },
      role: { $in: ['r1', 'r2'] },
      at: { $lte: '2026-10-28T00:00:00.000Z' },
      s: 'open',
    });
  });

  it('leaves keys and strings that are not whole placeholders as they are', () => {
    const query = { '$user.email': { $eq: 'mail of $user.email' }, $or: [{ a: '$nowhere' }] };

    expect(resolvePlaceholders(query, { ...ctx, params: {} })).toEqual({
      value: query,
      missing: [],
    });
  });

  it('counts $user.id, object, null and list attributes and unknown params as missing', () => {
    const withExtras = { ...user, meta: { $ne: null }, team: null, tags: ['a', 'b'] };

    const { value, missing } = resolvePlaceholders(
      {
        a: '$user.id',
        b: '$user.meta',
        c: '$user.team',
        d: '$user.roles',
        e: '$params.nope',
        f: '$user.constructor',
        g: '$user.tags',
      },
      { ...ctx, user: withExtras, params: {} }
    );

    expect(missing).toEqual([
      '$user.id',
      '$user.meta',
      '$user.team',
      '$user.roles',
      '$params.nope',
      '$user.constructor',
      '$user.tags',
    ]);
    expect(value).toBeUndefined();
  });

  // Only $user.roles.documentId is a list
  it('resolves a list for $user.roles.documentId only: a list attribute or param is missing', () => {
    const withTags = { ...user, tags: ['a', 'b'] };
    const resolve = (query: unknown, params: Record<string, unknown> = {}) =>
      resolvePlaceholders(query, { ...ctx, user: withTags, params });

    expect(resolve({ $in: '$user.roles.documentId' })).toEqual({
      value: { $in: ['r1', 'r2'] },
      missing: [],
    });
    expect(resolve({ $eq: '$user.tags' })).toEqual({ value: undefined, missing: ['$user.tags'] });
    expect(resolve({ $in: '$params.list' }, { list: ['a'] })).toEqual({
      value: undefined,
      missing: ['$params.list'],
    });
    expect(resolve({ $in: '$params.list' }, { list: [] })).toEqual({
      value: undefined,
      missing: ['$params.list'],
    });
  });

  // '' under $startsWith / $endsWith / $contains is LIKE '%', which matches every row
  it('counts an empty string and an empty or holey role list as missing', () => {
    const resolve = (query: unknown, caller: Record<string, unknown>, params = {}) =>
      resolvePlaceholders(query, { ...ctx, user: { ...user, ...caller }, params });

    expect(resolve({ $startsWith: '$user.orgPath' }, { orgPath: '' }).missing).toEqual([
      '$user.orgPath',
    ]);
    expect(resolve({ $startsWith: '$user.orgPath' }, { orgPath: '/a' }).missing).toEqual([]);
    expect(resolve({ $contains: '$params.q' }, {}, { q: '' }).missing).toEqual(['$params.q']);
    expect(resolve({ $contains: '$params.q' }, {}, { q: 'x' }).missing).toEqual([]);
    expect(resolve({ $in: '$user.roles.documentId' }, { roles: [] }).missing).toEqual([
      '$user.roles.documentId',
    ]);
    expect(
      resolve(
        { $in: '$user.roles.documentId' },
        { roles: [{ documentId: '' }, { documentId: 'r' }] }
      ).missing
    ).toEqual(['$user.roles.documentId']);
    expect(
      resolve(
        { $in: '$user.roles.documentId' },
        { roles: [{ name: 'no id' }, { documentId: 'r' }] }
      ).missing
    ).toEqual(['$user.roles.documentId']);
    expect(resolve({ $in: '$user.roles.documentId' }, { roles: undefined }).missing).toEqual([
      '$user.roles.documentId',
    ]);
  });

  // Only '' is an empty value: 0 and false are values a condition can match on, an invalid date is not
  it('resolves 0 and false as values and counts an invalid date as missing', () => {
    const resolve = (query: unknown, caller: Record<string, unknown>, params = {}) =>
      resolvePlaceholders(query, { ...ctx, user: { ...user, ...caller }, params });

    expect(resolve({ credits: { $eq: '$user.credits' } }, { credits: 0 })).toEqual({
      value: { credits: { $eq: 0 } },
      missing: [],
    });
    expect(resolve({ banned: { $eq: '$user.banned' } }, { banned: false })).toEqual({
      value: { banned: { $eq: false } },
      missing: [],
    });
    expect(resolve({ n: '$params.n', f: '$params.f' }, {}, { n: 0, f: false })).toEqual({
      value: { n: 0, f: false },
      missing: [],
    });
    expect(
      evaluateCondition(
        { ...shared, query: { n: { $eq: '$user.credits' } } },
        {},
        {
          ...ctx,
          user: { ...user, credits: 0 },
        }
      )
    ).toEqual({ n: { $eq: 0 } });

    // A date is its ISO string when valid, missing when not; a number must be finite
    expect(
      resolve({ at: { $lte: '$user.since' } }, { since: new Date('2026-01-02T03:04:05Z') })
    ).toEqual({
      value: { at: { $lte: '2026-01-02T03:04:05.000Z' } },
      missing: [],
    });
    expect(resolve({ at: { $lte: '$user.since' } }, { since: new Date('not a date') })).toEqual({
      value: undefined,
      missing: ['$user.since'],
    });
    expect(
      evaluateCondition(
        { ...shared, query: { at: { $lte: '$user.since' } } },
        {},
        {
          ...ctx,
          user: { ...user, since: new Date('not a date') },
        }
      )
    ).toBe(false);
    expect(resolve({ n: '$user.n' }, { n: Number.NaN }).missing).toEqual(['$user.n']);
    expect(resolve({ n: '$user.n' }, { n: Number.POSITIVE_INFINITY }).missing).toEqual(['$user.n']);
    expect(
      resolvePlaceholders({ at: { $lte: '$now' } }, { ...ctx, now: new Date('nope'), params: {} })
    ).toEqual({ value: undefined, missing: ['$now'] });
  });

  it('gives no value at all when anything is missing, not one with holes', () => {
    expect(
      resolvePlaceholders(
        { a: '$user.documentId', b: { $eq: '$user.nickname' }, c: '$params.nope' },
        { ...ctx, params: {} }
      )
    ).toEqual({ value: undefined, missing: ['$user.nickname', '$params.nope'] });
  });
});

describe('Content API conditions: evaluateCondition', () => {
  it('fails closed for Public when the query uses $user', () =>
    expect(evaluateCondition(mine, {}, { ...ctx, user: null })).toBe(false));

  it('fails closed on a missing attribute and on $user.id', () => {
    const nickname = { ...mine, query: { nickname: { $eq: '$user.nickname' } } };
    const byId = { ...mine, query: { owner: { id: '$user.id' } } };

    expect(evaluateCondition(nickname, {}, ctx)).toBe(false);
    expect(evaluateCondition(byId, {}, ctx)).toBe(false);
    expect(evaluateCondition(mine, {}, ctx)).toEqual({ owner: { documentId: { $eq: 'u1' } } });
  });

  it('fails closed outside the subjects and without a required param', () => {
    const byField: ContentApiConditionDefinition = {
      name: 'test.by-field',
      displayName: 'By field',
      subjects: (uid) => uid === NOTE,
      params: { field: { type: 'attribute', required: true } },
      query: ({ params }) => ({ [params.field as string]: { $eq: '$user.email' } }),
    };

    expect(evaluateCondition(mine, {}, { ...ctx, uid: ARTICLE })).toBe(false);
    expect(evaluateCondition(byField, { field: 'author' }, { ...ctx, uid: ARTICLE })).toBe(false);
    expect(evaluateCondition(byField, {}, ctx)).toBe(false);
    expect(evaluateCondition(byField, undefined, ctx)).toBe(false);
    expect(evaluateCondition(byField, { field: 'author' }, ctx)).toEqual({
      author: { $eq: 'a@x.io' },
    });
  });

  it('fails closed on an undefined value a query function returns, and keeps null', () => {
    const returning = (query: Record<string, unknown>): ContentApiConditionDefinition => ({
      name: 'test.returning',
      displayName: 'Returning',
      query: () => query,
    });

    expect(evaluateCondition(returning({ title: { $eq: undefined } }), {}, ctx)).toBe(false);
    expect(evaluateCondition(returning({ title: { $in: ['a', undefined] } }), {}, ctx)).toBe(false);
    expect(evaluateCondition(returning({ title: { $null: true } }), {}, ctx)).toEqual({
      title: { $null: true },
    });
    expect(evaluateCondition(returning({ title: { $eq: null } }), {}, ctx)).toEqual({
      title: { $eq: null },
    });
  });

  it('applies param defaults', () => {
    const query = vi.fn<(context: ConditionContext) => Record<string, unknown>>(() => ({}));
    const definition: ContentApiConditionDefinition = {
      name: 'test.defaults',
      displayName: 'Defaults',
      params: { setOnCreate: { type: 'boolean', default: true }, field: { type: 'attribute' } },
      query,
    };

    evaluateCondition(definition, { field: 'owner' }, ctx);
    evaluateCondition(definition, { field: 'owner', setOnCreate: false }, ctx);

    expect(query.mock.calls.map(([{ params }]) => params)).toEqual([
      { field: 'owner', setOnCreate: true },
      { field: 'owner', setOnCreate: false },
    ]);
  });

  it('fails closed on a param of the wrong type', () => {
    const definition: ContentApiConditionDefinition = {
      name: 'test.typed',
      displayName: 'Typed',
      params: { limit: { type: 'number' } },
      query: { views: { $lte: '$params.limit' } },
    };

    expect(evaluateCondition(definition, { limit: '5' }, ctx)).toBe(false);
    expect(evaluateCondition(definition, { limit: 5 }, ctx)).toEqual({ views: { $lte: 5 } });
  });

  it('calls a query function with the context: true is unrestricted, anything else not an object denies', () => {
    const query = vi.fn<(context: ConditionContext) => Record<string, unknown> | boolean>(
      () => true
    );
    const definition = { ...shared, query };

    expect(evaluateCondition(definition, { a: 1 }, ctx)).toEqual({});
    expect(query).toHaveBeenCalledWith({ ...ctx, params: { a: 1 } });

    query.mockReturnValueOnce(false);
    expect(evaluateCondition(definition, {}, ctx)).toBe(false);

    query.mockReturnValueOnce(null as never);
    expect(evaluateCondition(definition, {}, ctx)).toBe(false);
  });

  it('fails closed on an empty $user value under the LIKE operators, and on a list or empty roles', () => {
    const byPath: ContentApiConditionDefinition = {
      ...shared,
      name: 'test.by-path',
      query: { path: { $startsWith: '$user.orgPath' } },
    };
    const byRole: ContentApiConditionDefinition = {
      ...shared,
      name: 'test.by-role',
      query: { role: { documentId: { $in: '$user.roles.documentId' } } },
    };
    const byTag: ContentApiConditionDefinition = {
      ...shared,
      name: 'test.by-tag',
      query: { tag: { $eq: '$user.tags' } },
    };
    const as = (extra: Record<string, unknown>) => ({ ...ctx, user: { ...user, ...extra } });

    expect(evaluateCondition(byPath, {}, as({ orgPath: '' }))).toBe(false);
    expect(evaluateCondition(byPath, {}, as({ orgPath: '/acme' }))).toEqual({
      path: { $startsWith: '/acme' },
    });
    expect(evaluateCondition(byRole, {}, as({ roles: [] }))).toBe(false);
    expect(
      evaluateCondition(byRole, {}, as({ roles: [{ documentId: '' }, { documentId: 'r' }] }))
    ).toBe(false);
    expect(evaluateCondition(byRole, {}, ctx)).toEqual({
      role: { documentId: { $in: ['r1', 'r2'] } },
    });
    expect(evaluateCondition(byTag, {}, as({ tags: ['a'] }))).toBe(false);
  });

  it('fails closed on an empty string param, and on a list in a string param', () => {
    const definition: ContentApiConditionDefinition = {
      ...shared,
      name: 'test.search',
      params: { prefix: { type: 'string', required: true } },
      query: { title: { $startsWith: '$params.prefix' } },
    };

    expect(evaluateCondition(definition, { prefix: '' }, ctx)).toBe(false);
    expect(evaluateCondition(definition, { prefix: ['a'] }, ctx)).toBe(false);
    expect(evaluateCondition(definition, { prefix: 'a' }, ctx)).toEqual({
      title: { $startsWith: 'a' },
    });
  });

  it('gives no filter for a query function that returns {}: only true is unrestricted', () => {
    const definition = { ...shared, query: vi.fn<() => Record<string, unknown> | boolean>() };

    definition.query.mockReturnValueOnce({}).mockReturnValueOnce(true);

    expect(evaluateCondition(definition, {}, ctx)).toBe(false);
    expect(evaluateCondition(definition, {}, ctx)).toEqual({});
  });

  it('gives each function a copy of the caller, so changing it changes nothing', () => {
    const seen: ConditionContext[] = [];
    const definition: ContentApiConditionDefinition = {
      ...shared,
      name: 'test.nosy',
      params: { a: { type: 'string' } },
      query(context) {
        seen.push(context);
        context.user!.email = 'evil@x.io';
        (context.user!.roles as unknown[]).length = 0;
        context.now.setFullYear(1999);
        context.params.a = 'changed';

        return { email: { $eq: '$user.email' } };
      },
    };
    const caller = structuredClone(user);
    const now = new Date(ctx.now);
    const params = { a: 'kept' };

    expect(evaluateCondition(definition, params, { ...ctx, user: caller, now })).toEqual({
      email: { $eq: 'evil@x.io' },
    });
    expect(evaluateCondition(definition, params, { ...ctx, user: caller, now })).toEqual({
      email: { $eq: 'evil@x.io' },
    });
    expect(seen[0].user).not.toBe(caller);
    expect(seen[1].user).not.toBe(seen[0].user);
    expect(caller).toEqual(user);
    expect(now).toEqual(ctx.now);
    expect(params).toEqual({ a: 'kept' });
  });
});

describe('Content API conditions: applyCondition', () => {
  const isOwner = (stamp = vi.fn(), lockedFields = vi.fn()): ContentApiConditionDefinition => ({
    name: 'test.is-owner',
    displayName: 'Is owner',
    subjects: [NOTE],
    params: { setOnCreate: { type: 'boolean', default: true } },
    query: { owner: { documentId: { $eq: '$user.documentId' } } },
    stamp: stamp.mockImplementation(({ user: caller, params }: ConditionContext) =>
      params.setOnCreate ? { owner: caller!.documentId } : null
    ),
    lockedFields: lockedFields.mockImplementation(() => ['owner']),
  });

  const bind = (definition: ContentApiConditionDefinition, params = {}) => ({ definition, params });

  it('gives the filter, the stamp and the locked fields of a caller the condition holds for', () => {
    expect(applyCondition(bind(isOwner()), ctx)).toEqual({
      filter: { owner: { documentId: { $eq: 'u1' } } },
      stamp: { owner: 'u1' },
      lockedFields: ['owner'],
    });
  });

  it('never runs stamp or lockedFields for Public, a uid outside the subjects or a missing param', () => {
    const stamp = vi.fn();
    const lockedFields = vi.fn();
    const definition = {
      ...isOwner(stamp, lockedFields),
      params: { field: { type: 'attribute' as const, required: true } },
    };

    expect(applyCondition(bind(definition, { field: 'owner' }), { ...ctx, user: null })).toBe(
      false
    );
    expect(applyCondition(bind(definition, { field: 'owner' }), { ...ctx, uid: ARTICLE })).toBe(
      false
    );
    expect(applyCondition(bind(definition, {}), ctx)).toBe(false);
    expect(applyCondition(undefined, ctx)).toBe(false);
    expect(stamp).not.toHaveBeenCalled();
    expect(lockedFields).not.toHaveBeenCalled();
  });

  it('is false for Public when the definition has a stamp, without calling it', () => {
    const stamp = vi.fn(({ user: caller }: ConditionContext) => ({ owner: caller!.documentId }));
    const definition: ContentApiConditionDefinition = { ...shared, query: () => true, stamp };

    expect(() => applyCondition(bind(definition), { ...ctx, user: null })).not.toThrow();
    expect(applyCondition(bind(definition), { ...ctx, user: null })).toBe(false);
    expect(stamp).not.toHaveBeenCalled();

    // The same definition holds, with its stamp, for a user
    expect(applyCondition(bind(definition), ctx)).toEqual({ filter: {}, stamp: { owner: 'u1' } });

    // No stamp: a query that holds for Public still holds for Public
    expect(applyCondition(bind({ ...shared, query: () => true }), { ...ctx, user: null })).toEqual({
      filter: {},
    });
  });

  it('is false for a condition whose filter denies, and never reads its stamp', () => {
    const stamp = vi.fn(() => ({ owner: 'x' }));
    const definition = { ...shared, query: () => false, stamp };

    expect(applyCondition(bind(definition), ctx)).toBe(false);
    expect(stamp).not.toHaveBeenCalled();
  });

  it('fills the declared defaults in for stamp, and leaves out what a condition does not give', () => {
    const stamp = vi.fn();
    const definition = isOwner(stamp);

    expect(applyCondition(bind(definition, { setOnCreate: false }), ctx)).toEqual({
      filter: { owner: { documentId: { $eq: 'u1' } } },
      lockedFields: ['owner'],
    });
    expect(stamp.mock.calls[0][0].params).toEqual({ setOnCreate: false });
    expect(
      Object.keys(applyCondition(bind(definition, { setOnCreate: false }), ctx) as object)
    ).toEqual(['filter', 'lockedFields']);
    expect(Object.keys(applyCondition(bind(shared), ctx) as object)).toEqual(['filter']);
    expect(applyCondition(bind({ ...shared, query: () => true }), ctx)).toEqual({ filter: {} });
  });

  it('is false for a stamp that is not an object and a lockedFields that is not a list of names', () => {
    const asStamp = (stamp: unknown) =>
      applyCondition(bind({ ...shared, stamp: () => stamp as never }), ctx);
    const asLocked = (fields: unknown) =>
      applyCondition(bind({ ...shared, lockedFields: () => fields as never }), ctx);

    expect(asStamp('owner')).toBe(false);
    expect(asStamp(['owner'])).toBe(false);
    expect(asStamp(null)).toEqual({ filter: shared.query });
    expect(asLocked('owner')).toBe(false);
    expect(asLocked([1])).toBe(false);
    expect(asLocked([])).toEqual({ filter: shared.query, lockedFields: [] });
  });

  // `every` skips the holes of a sparse array, so `[ , 'owner']` would pass a shape check made with it
  it('is false for a sparse lockedFields: a hole is not a field name', () => {
    const sparse = [] as string[];

    sparse.length = 2;

    sparse[1] = 'owner';

    expect(0 in sparse).toBe(false);
    expect(applyCondition(bind({ ...shared, lockedFields: () => sparse }), ctx)).toBe(false);

    const full = ['owner', 'tenant'];

    expect(applyCondition(bind({ ...shared, lockedFields: () => full }), ctx)).toEqual({
      filter: shared.query,
      lockedFields: ['owner', 'tenant'],
    });
  });

  it('is what providers.condition.get gives, for a ref and for a name nobody registered', async () => {
    global.strapi = createStrapi();
    const p = instantiatePermissionsUtilities(global.strapi);
    await p.providers.condition.register(isOwner());

    const forUser = (ref: Parameters<typeof p.providers.condition.get>[0], caller = user) =>
      applyCondition(p.providers.condition.get(ref), { ...ctx, user: caller });

    expect(forUser({ name: 'test.is-owner', params: { setOnCreate: false } })).toEqual({
      filter: { owner: { documentId: { $eq: 'u1' } } },
      lockedFields: ['owner'],
    });
    expect(forUser('test.is-owner')).toMatchObject({ stamp: { owner: 'u1' } });
    expect(forUser('test.is-owner', null as never)).toBe(false);
    expect(forUser('api::gone')).toBe(false);
  });
});

// A condition function that throws is false for that row, and logged once per condition
describe('Content API conditions: a function that throws', () => {
  const owned = { owner: { documentId: { $eq: '$user.documentId' } } };

  const boom = (parts: Partial<ContentApiConditionDefinition> = {}) =>
    ({
      name: 'test.boom',
      displayName: 'Boom',
      query: owned,
      ...parts,
    }) as ContentApiConditionDefinition;

  const bind = (definition: ContentApiConditionDefinition, params = {}) => ({ definition, params });

  const logged = () =>
    (global.strapi.log.error as ReturnType<typeof vi.fn>).mock.calls.map(([message]) =>
      String(message)
    );

  beforeEach(() => {
    global.strapi = createStrapi();
  });

  it('is false for a query that throws, from evaluateCondition and from applyCondition', () => {
    const definition = boom({
      query() {
        throw new Error('query exploded');
      },
    });

    expect(() => evaluateCondition(definition, {}, ctx)).not.toThrow();
    expect(evaluateCondition(definition, {}, ctx)).toBe(false);
    expect(applyCondition(bind(definition), ctx)).toBe(false);
  });

  it('is false for a subjects function, a stamp and a lockedFields that throw, and runs nothing after the throw', () => {
    const lockedFields = vi.fn(() => ['owner']);
    const stamp = vi.fn(() => ({ owner: 'u1' }));

    expect(
      applyCondition(
        bind(
          boom({
            name: 'test.boom-subjects',
            subjects() {
              throw new Error('subjects exploded');
            },
            stamp,
            lockedFields,
          })
        ),
        ctx
      )
    ).toBe(false);
    expect(
      applyCondition(
        bind(
          boom({
            name: 'test.boom-stamp',
            stamp() {
              throw new Error('stamp exploded');
            },
            lockedFields,
          })
        ),
        ctx
      )
    ).toBe(false);
    expect(
      applyCondition(
        bind(
          boom({
            name: 'test.boom-locks',
            lockedFields() {
              throw new Error('locks exploded');
            },
          })
        ),
        ctx
      )
    ).toBe(false);

    // The stamp that threw stopped the condition before its lockedFields; a throwing subjects
    // function stopped everything
    expect(stamp).not.toHaveBeenCalled();
    expect(lockedFields).not.toHaveBeenCalled();
  });

  it('logs once per condition name, with the name and the error', () => {
    const throwing = (name: string, message: string) =>
      boom({
        name,
        query() {
          throw new Error(message);
        },
      });
    const first = throwing('test.boom-a', 'a exploded');
    const second = throwing('test.boom-b', 'b exploded');

    for (let call = 0; call < 5; call += 1) {
      applyCondition(bind(first), ctx);
      evaluateCondition(first, {}, ctx);
      applyCondition(bind(second), ctx);
    }

    const messages = logged();

    expect(messages).toHaveLength(2);
    expect(messages[0]).toContain('test.boom-a');
    expect(messages[0]).toContain('a exploded');
    expect(messages[1]).toContain('test.boom-b');
    expect(messages[1]).toContain('b exploded');
  });

  it('still denies when there is no logger to tell', () => {
    global.strapi = {} as never;

    const definition = boom({
      query() {
        throw new Error('no logger');
      },
    });

    expect(applyCondition(bind(definition), ctx)).toBe(false);
  });

  it('does not touch a condition that does not throw', () => {
    expect(applyCondition(bind(boom()), ctx)).toEqual({
      filter: { owner: { documentId: { $eq: 'u1' } } },
    });
    expect(logged()).toEqual([]);
  });

  // A thrown value is anything: `throw Object.create(null)` has no toString, so printing it throws
  // too. That must not turn the deny into a failure of the request
  describe('with a thrown value that cannot be printed', () => {
    const unprintable: Record<string, () => unknown> = {
      'an object with no prototype': () => Object.create(null),
      'an object whose toString throws': () => ({
        toString() {
          throw new Error('no string for you');
        },
      }),
      'an error whose stack throws when read': () =>
        Object.defineProperty(new Error('hidden'), 'stack', {
          get() {
            throw new Error('stack exploded');
          },
        }),
    };

    it.each(Object.keys(unprintable))('is false, and logged once, for %s', (label) => {
      const definition = boom({
        query() {
          throw unprintable[label]();
        },
      });

      expect(() => evaluateCondition(definition, {}, ctx)).not.toThrow();
      expect(evaluateCondition(definition, {}, ctx)).toBe(false);
      expect(applyCondition(bind(definition), ctx)).toBe(false);

      const messages = logged();

      expect(messages).toHaveLength(1);
      expect(messages[0]).toContain('test.boom');
      expect(messages[0]).toContain('unprintable error');
    });

    it('is false for subjects, stamp and lockedFields that throw one, too', () => {
      const throwsNothingPrintable = () => {
        throw Object.create(null);
      };

      for (const [name, parts] of [
        ['test.boom-locks', { lockedFields: throwsNothingPrintable }],
        ['test.boom-stamp', { stamp: throwsNothingPrintable }],
        ['test.boom-subjects', { subjects: throwsNothingPrintable }],
      ] as const) {
        const definition = boom({ name, ...parts });

        expect(() => applyCondition(bind(definition), ctx), name).not.toThrow();
        expect(applyCondition(bind(definition), ctx), name).toBe(false);
      }

      expect(logged()).toHaveLength(3);
    });

    it('still prints an error, a string and a number', () => {
      [new Error('plain error'), 'a string', 42].forEach((value, index) => {
        applyCondition(
          bind(
            boom({
              name: `test.boom-${index}`,
              query() {
                // eslint-disable-next-line @typescript-eslint/no-throw-literal -- anything can be thrown
                throw value;
              },
            })
          ),
          ctx
        );
      });

      const messages = logged();

      expect(messages).toHaveLength(3);
      expect(messages[0]).toContain('plain error');
      expect(messages[1]).toContain('a string');
      expect(messages[2]).toContain('42');
      expect(messages.join('\n')).not.toContain('unprintable error');
    });
  });

  // `query`, `stamp`, `lockedFields` and `subjects` are typed synchronous. An `async` one gives a
  // promise: its answer can't be read, so the condition is false, and a rejection nobody handles
  // would be an unhandled one
  describe('with a function that returns a promise', () => {
    /** The unhandled rejections the process sees while `work` runs and the event loop turns */
    const unhandledDuring = async (work: () => void) => {
      const seen: unknown[] = [];
      const listener = (reason: unknown) => {
        seen.push(reason);
      };

      process.on('unhandledRejection', listener);

      try {
        work();
        // Node reports an unhandled rejection once the microtasks of the tick have run
        await new Promise((resolve) => {
          setTimeout(resolve, 20);
        });
      } finally {
        process.off('unhandledRejection', listener);
      }

      return seen;
    };

    const answers = {
      rejects: () => Promise.reject(new Error('rejected')),
      resolves: (value: unknown) => () => Promise.resolve(value),
    };

    /** The definition whose `role` function is `fn`, with the rest of it holding for the caller */
    const withAsync = (role: string, fn: () => unknown) =>
      boom({
        name: `test.async-${role}`,
        ...({ subjects: undefined, [role]: fn } as Partial<ContentApiConditionDefinition>),
      });

    const roles: Array<[string, unknown]> = [
      ['subjects', true],
      ['query', { owner: { documentId: { $eq: '$user.documentId' } } }],
      ['stamp', { owner: 'u1' }],
      ['lockedFields', ['owner']],
    ];

    describe.each(roles)('%s', (role, value) => {
      it('is false when the promise rejects, and the rejection is handled', async () => {
        const definition = withAsync(role, answers.rejects);

        const seen = await unhandledDuring(() => {
          expect(applyCondition(bind(definition), ctx)).toBe(false);
          // `evaluateCondition` reads `subjects` and `query`, and not `stamp` or `lockedFields`
          expect(evaluateCondition(definition, {}, ctx)).toEqual(
            role === 'subjects' || role === 'query'
              ? false
              : { owner: { documentId: { $eq: 'u1' } } }
          );
        });

        expect(seen).toEqual([]);
      });

      it('is false when the promise resolves, even to what the function should give', async () => {
        const definition = withAsync(role, answers.resolves(value));

        const seen = await unhandledDuring(() => {
          expect(applyCondition(bind(definition), ctx)).toBe(false);
        });

        expect(seen).toEqual([]);
      });

      it('says once, per condition, that it must be synchronous', async () => {
        const definition = withAsync(role, answers.resolves(value));

        for (let call = 0; call < 4; call += 1) {
          applyCondition(bind(definition), ctx);
          evaluateCondition(definition, {}, ctx);
        }

        const messages = logged();

        expect(messages).toHaveLength(1);
        expect(messages[0]).toContain(`test.async-${role}`);
        expect(messages[0]).toContain(`its ${role} function`);
        expect(messages[0]).toContain('must be synchronous');
      });
    });

    it('is false for an async arrow and an async function that throw', async () => {
      const definitions = [
        withAsync('query', async () => {
          throw new Error('async arrow');
        }),
        withAsync('stamp', async function stamp() {
          throw new Error('async function');
        }),
      ];

      const seen = await unhandledDuring(() => {
        for (const definition of definitions) {
          expect(applyCondition(bind(definition), ctx)).toBe(false);
        }
      });

      expect(seen).toEqual([]);
    });

    it('is false for a thenable that is not a Promise, and for one whose then throws when read', () => {
      const thenable = {
        then(_resolve: unknown, reject: (error: Error) => void) {
          reject(new Error('foreign'));
        },
      };
      const reading = {
        get then() {
          throw new Error('then exploded');
        },
      };

      expect(applyCondition(bind(withAsync('query', () => thenable)), ctx)).toBe(false);
      expect(applyCondition(bind(withAsync('stamp', () => reading)), ctx)).toBe(false);
      expect(logged()).toHaveLength(2);
    });

    it('denies the row in the provider, and the ability still builds', async () => {
      const p = instantiatePermissionsUtilities(global.strapi);

      await p.registerActions();
      await p.providers.condition.register(mine);
      await p.providers.condition.register(
        withAsync('query', async () => ({ owner: { $notNull: true } }))
      );

      const ability = await p.generateAbility(
        [
          { action: `${NOTE}.find`, conditions: [{ name: 'test.async-query' }] },
          { action: `${NOTE}.findOne`, conditions: [{ name: 'test.mine' }] },
        ],
        { user }
      );
      const auth = { ability };

      expect(p.checker.filtersFor(auth, 'find', NOTE)).toBeNull();
      expect(p.checker.filtersFor(auth, 'findOne', NOTE)).toEqual({
        $or: [{ $and: [{ $or: [{ owner: { documentId: { $eq: 'u1' } } }] }] }],
      });
      expect(canCallRoute(ability, `${NOTE}.find`)).toBe(true);
    });
  });

  describe('in the provider and the data ability', () => {
    let p: ReturnType<typeof instantiatePermissionsUtilities>;

    beforeEach(async () => {
      p = instantiatePermissionsUtilities(global.strapi);
      await p.registerActions();
      await p.providers.condition.register(mine);
      await p.providers.condition.register(shared);
      await p.providers.condition.register(
        boom({
          query() {
            throw new Error('query exploded');
          },
        })
      );
      await p.providers.condition.register(
        boom({
          name: 'test.boom-stamp',
          query: () => true,
          stamp() {
            throw new Error('stamp exploded');
          },
        })
      );
      await p.providers.condition.register(
        boom({
          name: 'test.boom-locks',
          query: () => true,
          lockedFields() {
            throw new Error('locks exploded');
          },
        })
      );
    });

    const handlerOf = (name: string) =>
      p.providers.condition.get(name)!.handler({ user, permission: { subject: NOTE } });

    it('gives false from the handler instead of throwing', () => {
      expect(() => handlerOf('test.boom')).not.toThrow();
      expect(handlerOf('test.boom')).toBe(false);
      expect(handlerOf('test.boom-stamp')).toBe(false);
      expect(handlerOf('test.boom-locks')).toBe(false);
    });

    it('builds the ability: the row with the throwing condition denies, other rows are unaffected', async () => {
      const ability = await p.generateAbility(
        [
          { action: `${NOTE}.find`, conditions: [{ name: 'test.boom' }] },
          { action: `${NOTE}.findOne`, conditions: [{ name: 'test.mine' }] },
          { action: `${NOTE}.update`, conditions: [{ name: 'test.boom-locks' }] },
          { action: `${NOTE}.create`, conditions: [{ name: 'test.boom-stamp' }] },
        ],
        { user }
      );
      const auth = { ability };
      const data = ability[DATA_ABILITY]!.ability;

      // The rows the throwing conditions sit on are held, and give no data rule: denied
      for (const action of ['find', 'update', 'create']) {
        expect(data.rulesFor(action, NOTE), action).toHaveLength(0);
        expect(p.checker.filtersFor(auth, action, NOTE), action).toBeNull();
        expect(p.checker.fieldsFor(auth, action, NOTE), action).toEqual({
          always: [],
          conditional: [],
        });
      }

      expect(p.checker.lockedFields(auth, NOTE)).toEqual([]);
      expect(p.checker.stampFor(auth, NOTE)).toEqual({});

      // The row beside them is untouched
      expect(data.rulesFor('findOne', NOTE)).toHaveLength(1);
      expect(p.checker.filtersFor(auth, 'findOne', NOTE)).toEqual({
        $or: [{ $and: [{ $or: [{ owner: { documentId: { $eq: 'u1' } } }] }] }],
      });

      // The route scopes stay callable
      expect(canCallRoute(ability, `${NOTE}.find`)).toBe(true);
    });

    it('drops only the throwing condition from a row: the others still decide', async () => {
      const ability = await p.generateAbility(
        [
          {
            action: `${NOTE}.find`,
            conditions: [{ name: 'test.boom' }, { name: 'test.mine' }],
          },
        ],
        { user }
      );

      expect(p.checker.filtersFor({ ability }, 'find', NOTE)).toEqual({
        $or: [{ $and: [{ $or: [{ owner: { documentId: { $eq: 'u1' } } }] }] }],
      });
    });

    it('logs one line per condition name across the engine and the checker', async () => {
      const rows = [
        { action: `${NOTE}.find`, conditions: [{ name: 'test.boom' }] },
        {
          action: `${NOTE}.update`,
          conditions: [{ name: 'test.boom-locks' }, { name: 'test.boom' }],
        },
        { action: `${NOTE}.create`, conditions: [{ name: 'test.boom-stamp' }] },
      ];

      for (let round = 0; round < 3; round += 1) {
        const ability = await p.generateAbility(rows, { user });

        p.checker.filtersFor({ ability }, 'find', NOTE);
        p.checker.lockedFields({ ability }, NOTE);
        p.checker.stampFor({ ability }, NOTE);
        p.checker.fieldsFor({ ability }, 'update', NOTE);
      }

      const messages = logged();

      expect(messages).toHaveLength(3);
      expect(messages.filter((message) => message.includes('"test.boom"'))).toHaveLength(1);
      expect(messages.filter((message) => message.includes('"test.boom-stamp"'))).toHaveLength(1);
      expect(messages.filter((message) => message.includes('"test.boom-locks"'))).toHaveLength(1);
    });
  });
});

describe('Content API conditions: provider and data ability', () => {
  let p: ReturnType<typeof instantiatePermissionsUtilities>;

  beforeEach(async () => {
    global.strapi = createStrapi();
    p = instantiatePermissionsUtilities(global.strapi);
    await p.registerActions();
    await p.providers.condition.register(mine);
    await p.providers.condition.register(shared);
  });

  const dataFor = async (
    conditions: Array<{ name: string; params?: Record<string, unknown> }>,
    caller: typeof user | null = user
  ) => {
    const ability = await p.generateAbility([{ action: `${NOTE}.find`, conditions }], {
      user: caller,
    });

    return { ability, data: ability[DATA_ABILITY]!.ability };
  };

  it('fails closed on a condition name nobody registered', async () => {
    const { data } = await dataFor([{ name: 'api::gone' }]);

    expect(data.can('find', NOTE)).toBe(false);
  });

  it('ORs two conditions on one row', async () => {
    const data = (
      await p.generateAbility(
        [
          {
            action: 'api::note.note.find',
            conditions: [{ name: 'test.mine' }, { name: 'test.shared' }],
          },
        ],
        { user }
      )
    )[DATA_ABILITY]!.ability;

    expect(data.rulesFor('find', 'api::note.note')[0].conditions).toEqual({
      $and: [{ $or: [{ owner: { documentId: { $eq: 'u1' } } }, { shared: { $eq: true } }] }],
    });
  });

  describe('a condition whose stamp or lockedFields is malformed', () => {
    const owned = { owner: { documentId: { $eq: '$user.documentId' } } };

    const register = (name: string, parts: Partial<ContentApiConditionDefinition>) =>
      p.providers.condition.register({
        name,
        displayName: name,
        query: owned,
        ...parts,
      } as ContentApiConditionDefinition);

    const abilityFor = (action: string, conditions: Array<{ name: string }>) =>
      p.generateAbility([{ action, conditions }], { user });

    const handlerOf = (name: string, caller: typeof user | null = user) =>
      p.providers.condition.get(name)!.handler({ user: caller, permission: { subject: NOTE } });

    it('gives no data rule: it cannot keep its filter while its locks are dropped', async () => {
      await register('test.bad-locks', { lockedFields: (() => 'owner') as never });
      await register('test.good-locks', { lockedFields: () => ['owner'] });

      const ability = await abilityFor(`${NOTE}.update`, [{ name: 'test.bad-locks' }]);
      const auth = { ability };

      expect(handlerOf('test.bad-locks')).toBe(false);
      expect(ability[DATA_ABILITY]!.ability.rulesFor('update', NOTE)).toHaveLength(0);
      expect(ability[DATA_ABILITY]!.ability.can('update', NOTE)).toBe(false);

      // The row is held, so the checker denies; the route scope stays
      expect(p.checker.filtersFor(auth, 'update', NOTE)).toBeNull();
      expect(p.checker.fieldsFor(auth, 'update', NOTE)).toEqual({ always: [], conditional: [] });
      expect(p.checker.populateDepth(auth, 'update', NOTE)).toBe(0);
      expect(p.checker.lockedFields(auth, NOTE)).toEqual([]);
      expect(canCallRoute(ability, `${NOTE}.update`)).toBe(true);

      // The same definition with a lockedFields that is a list of names keeps its filter and its locks
      const good = await abilityFor(`${NOTE}.update`, [{ name: 'test.good-locks' }]);

      expect(handlerOf('test.good-locks')).toEqual({ owner: { documentId: { $eq: 'u1' } } });
      expect(good[DATA_ABILITY]!.ability.rulesFor('update', NOTE)).toHaveLength(1);
      expect(p.checker.lockedFields({ ability: good }, NOTE)).toEqual(['owner']);
    });

    it('gives no data rule for a stamp that is not a plain object', async () => {
      const stamps: Array<[string, unknown]> = [
        ['string', 'owner'],
        ['list', [{ owner: 'u1' }]],
        ['number', 42],
        ['map', new Map([['owner', 'u1']])],
        ['date', new Date()],
      ];

      for (const [label, stamp] of stamps) {
        await register(`test.bad-stamp-${label}`, { stamp: (() => stamp) as never });

        const ability = await abilityFor(`${NOTE}.find`, [{ name: `test.bad-stamp-${label}` }]);

        expect(handlerOf(`test.bad-stamp-${label}`), label).toBe(false);
        expect(ability[DATA_ABILITY]!.ability.rulesFor('find', NOTE), label).toHaveLength(0);
        expect(p.checker.filtersFor({ ability }, 'find', NOTE), label).toBeNull();
      }
    });

    it('gives no data rule for lockedFields that is not a list of field names', async () => {
      const lists: Array<[string, unknown]> = [
        ['string', 'owner'],
        ['numbers', [1]],
        ['holes', ['owner', null]],
        ['object', { owner: true }],
        ['undefined', undefined],
      ];

      for (const [label, fields] of lists) {
        await register(`test.bad-locked-${label}`, { lockedFields: (() => fields) as never });

        const ability = await abilityFor(`${NOTE}.update`, [{ name: `test.bad-locked-${label}` }]);

        expect(handlerOf(`test.bad-locked-${label}`), label).toBe(false);
        expect(ability[DATA_ABILITY]!.ability.rulesFor('update', NOTE), label).toHaveLength(0);
        expect(p.checker.filtersFor({ ability }, 'update', NOTE), label).toBeNull();
      }
    });

    it('drops only that condition from a row: the others still decide', async () => {
      await register('test.bad-locks', {
        query: { title: { $eq: 'x' } },
        lockedFields: (() => 'owner') as never,
      });

      const both = await abilityFor(`${NOTE}.find`, [
        { name: 'test.bad-locks' },
        { name: 'test.mine' },
      ]);

      expect(both[DATA_ABILITY]!.ability.rulesFor('find', NOTE)[0].conditions).toEqual({
        $and: [{ $or: [{ owner: { documentId: { $eq: 'u1' } } }] }],
      });
      expect(p.checker.filtersFor({ ability: both }, 'find', NOTE)).toEqual({
        $or: [{ $and: [{ $or: [{ owner: { documentId: { $eq: 'u1' } } }] }] }],
      });
    });

    it('does not read a stamp or lockedFields for a caller the condition denies', async () => {
      const stamp = vi.fn(() => ({ owner: 'x' }));
      const lockedFields = vi.fn(() => ['owner']);

      await register('test.spied', { stamp, lockedFields });

      expect(handlerOf('test.spied', null)).toBe(false);
      expect(stamp).not.toHaveBeenCalled();
      expect(lockedFields).not.toHaveBeenCalled();
      expect(handlerOf('test.spied')).toEqual({ owner: { documentId: { $eq: 'u1' } } });
      expect(stamp).toHaveBeenCalledTimes(1);
      expect(lockedFields).toHaveBeenCalledTimes(1);
    });
  });

  it('keeps the route scope when every condition is false', async () => {
    const { ability, data } = await dataFor([{ name: 'test.mine' }, { name: 'api::gone' }], null);

    expect(canCallRoute(ability, `${NOTE}.find`)).toBe(true);
    expect(data.can('find', NOTE)).toBe(false);
  });

  it('gives an unconditioned rule when one condition of the row holds without a filter', async () => {
    await p.providers.condition.register({
      name: 'test.open',
      displayName: 'Open',
      query: () => true,
    });

    const { data } = await dataFor([{ name: 'test.mine' }, { name: 'test.open' }]);

    expect(data.rulesFor('find', NOTE)).toHaveLength(1);
    expect(data.rulesFor('find', NOTE)[0].conditions).toBeUndefined();
  });

  it('binds the params of a ref in get, and takes a plain name', async () => {
    await p.providers.condition.register({
      name: 'test.state',
      displayName: 'State',
      params: { state: { type: 'string', required: true } },
      query: { state: { $eq: '$params.state' } },
    });

    const bound = p.providers.condition.get({ name: 'test.state', params: { state: 'open' } })!;
    const options = { user, permission: { subject: NOTE } };

    expect(bound.name).toBe('test.state');
    expect(bound.definition.displayName).toBe('State');
    expect(bound.handler(options)).toEqual({ state: { $eq: 'open' } });
    expect(p.providers.condition.get('test.state')!.handler(options)).toBe(false);
    expect(p.providers.condition.get('test.mine')!.handler(options)).toEqual({
      owner: { documentId: { $eq: 'u1' } },
    });
    expect(p.providers.condition.get('api::gone')).toBeUndefined();
    expect(p.providers.condition.get({ name: 'api::gone' })).toBeUndefined();
  });

  it('refuses a duplicate name and registration after load', async () => {
    await expect(p.providers.condition.register({ ...shared })).rejects.toThrow(
      'Duplicated item key: test.shared'
    );

    global.strapi.isLoaded = true;

    await expect(p.providers.condition.register({ ...shared, name: 'test.late' })).rejects.toThrow(
      `You can't register new conditions outside the bootstrap function.`
    );
    expect(p.providers.condition.has('test.late')).toBe(false);
  });

  it('refuses a malformed definition', async () => {
    const register = (definition: unknown) =>
      p.providers.condition.register(definition as ContentApiConditionDefinition);

    await expect(register({ displayName: 'No name', query: { a: 1 } })).rejects.toThrow(
      'A Content API condition needs a name'
    );
    await expect(register({ name: 'test.bad', displayName: 'Bad', query: 'x' })).rejects.toThrow(
      'Condition "test.bad": query must be a filter object or a function'
    );
    await expect(
      register({
        name: 'test.bad',
        displayName: 'Bad',
        params: { a: { type: 'date' } },
        query: { a: 1 },
      })
    ).rejects.toThrow('Condition "test.bad": param "a" has an unknown type');
    expect(p.providers.condition.has('test.bad')).toBe(false);
  });

  it('refuses a static empty query: unrestricted is a function returning true', async () => {
    const register = (definition: Partial<ContentApiConditionDefinition>) =>
      p.providers.condition.register({
        name: 'test.nothing',
        displayName: 'Nothing',
        ...definition,
      } as ContentApiConditionDefinition);

    await expect(register({ query: {} })).rejects.toThrow(
      'Condition "test.nothing": query is an empty filter; a condition with no restriction is a query function returning true'
    );
    expect(p.providers.condition.has('test.nothing')).toBe(false);

    await register({ query: () => true });

    expect(applyCondition(p.providers.condition.get('test.nothing'), ctx)).toEqual({ filter: {} });
  });

  it('refuses a param default that is not of the declared type, at registration', async () => {
    const register = (type: string, fallback: unknown) =>
      p.providers.condition.register({
        name: 'test.default',
        displayName: 'Default',
        params: { value: { type, default: fallback } },
        query: { a: 1 },
      } as unknown as ContentApiConditionDefinition);

    await expect(register('boolean', 'yes')).rejects.toThrow(
      'Condition "test.default": the default of param "value" is not of its type (boolean)'
    );
    await expect(register('number', '5')).rejects.toThrow('is not of its type (number)');
    await expect(register('number', Number.NaN)).rejects.toThrow('is not of its type (number)');
    await expect(register('string', 5)).rejects.toThrow('is not of its type (string)');
    await expect(register('attribute', true)).rejects.toThrow('is not of its type (attribute)');
    expect(p.providers.condition.has('test.default')).toBe(false);

    await register('boolean', true);

    expect(p.providers.condition.has('test.default')).toBe(true);
  });

  // '' is a missing value for a placeholder, so a default of '' would make the condition false on every request
  it("refuses a default of '' for a string or an attribute param, at registration", async () => {
    const register = (type: string, fallback: unknown) =>
      p.providers.condition.register({
        name: 'test.empty-default',
        displayName: 'Empty default',
        params: { value: { type, default: fallback } },
        query: { a: '$params.value' },
      } as unknown as ContentApiConditionDefinition);

    await expect(register('string', '')).rejects.toThrow(
      'Condition "test.empty-default": the default of param "value" is an empty string'
    );
    await expect(register('attribute', '')).rejects.toThrow(
      'Condition "test.empty-default": the default of param "value" is an empty string'
    );
    expect(p.providers.condition.has('test.empty-default')).toBe(false);

    // A non-empty string, and a falsy default of another type, are fine
    await register('string', 'open');
    await p.providers.condition.delete('test.empty-default');
    await register('number', 0);
    await p.providers.condition.delete('test.empty-default');
    await register('boolean', false);

    expect(p.providers.condition.has('test.empty-default')).toBe(true);
  });

  it('stores a frozen copy: neither the registrant nor a reader can change a registered condition', async () => {
    const definition: ContentApiConditionDefinition = {
      name: 'test.frozen',
      displayName: 'Frozen',
      subjects: [NOTE],
      params: { field: { type: 'attribute', required: true } },
      query: { owner: { documentId: { $eq: '$user.documentId' } } },
    };

    await p.providers.condition.register(definition);

    const stored = p.providers.condition.get('test.frozen')!.definition;

    expect(stored).not.toBe(definition);
    expect(stored).toEqual(definition);
    expect(Object.isFrozen(stored)).toBe(true);
    expect(Object.isFrozen(stored.params)).toBe(true);
    expect(Object.isFrozen(stored.params!.field)).toBe(true);
    expect(Object.isFrozen(stored.subjects)).toBe(true);
    expect(Object.isFrozen(stored.query)).toBe(true);
    expect(p.providers.condition.values().every((value) => Object.isFrozen(value))).toBe(true);

    // The registrant's object is not frozen, and changing it does not reach the registry
    definition.displayName = 'Changed';
    definition.subjects = [ARTICLE];
    (definition.params!.field as { required?: boolean }).required = false;
    definition.query = { shared: { $eq: true } };

    const after = p.providers.condition.get('test.frozen')!.definition;

    expect(after.displayName).toBe('Frozen');
    expect(after.subjects).toEqual([NOTE]);
    expect(after.params!.field.required).toBe(true);
    expect(after.query).toEqual({ owner: { documentId: { $eq: '$user.documentId' } } });
  });
});

describe('Content API conditions: $profile placeholders', () => {
  const profileCtx = (profile: Record<string, unknown> | null | undefined) => ({
    ...ctx,
    params: {},
    user: { ...user, ...(profile === undefined ? {} : { profile }) },
  });

  it('resolves $profile.<attribute> from ctx.user.profile', () => {
    const { value, missing } = resolvePlaceholders(
      { plan: { $eq: '$profile.plan' }, joined: { $gte: '$profile.joinedAt' } },
      profileCtx({ plan: 'pro', joinedAt: new Date('2026-01-02T00:00:00Z') })
    );

    expect(missing).toEqual([]);
    expect(value).toEqual({
      plan: { $eq: 'pro' },
      joined: { $gte: '2026-01-02T00:00:00.000Z' },
    });
  });

  it('resolves $profile.<relation>.documentId', () => {
    const { value, missing } = resolvePlaceholders(
      { organization: { documentId: { $eq: '$profile.organization.documentId' } } },
      profileCtx({ organization: { documentId: 'org1' } })
    );

    expect(missing).toEqual([]);
    expect(value).toEqual({ organization: { documentId: { $eq: 'org1' } } });
  });

  it('is false when the profile is null or the attribute missing', () => {
    const query = { organization: { documentId: { $eq: '$profile.organization.documentId' } } };
    const definition: ContentApiConditionDefinition = {
      name: 'test.org',
      displayName: 'Org',
      query,
    };
    const evaluate = (profile: Record<string, unknown> | null | undefined) =>
      evaluateCondition(definition, undefined, profileCtx(profile));

    expect(evaluate({ organization: { documentId: 'org1' } })).toEqual({
      organization: { documentId: { $eq: 'org1' } },
    });
    // No profile, none loaded, a missing attribute, a null or an object value, a list, a bad path
    expect(evaluate(null)).toBe(false);
    expect(evaluate(undefined)).toBe(false);
    expect(evaluate({})).toBe(false);
    expect(evaluate({ organization: null })).toBe(false);
    expect(evaluate({ organization: { documentId: null } })).toBe(false);
    expect(evaluate({ organization: { documentId: '' } })).toBe(false);
    expect(evaluate({ organization: 'org1' })).toBe(false);
    expect(evaluate({ organization: [{ documentId: 'org1' }] })).toBe(false);
    expect(
      evaluateCondition({ ...definition, query: { a: '$profile.plan' } }, undefined, {
        ...ctx,
        user: null,
      })
    ).toBe(false);

    for (const placeholder of [
      '$profile',
      '$profile.',
      '$profile.id',
      '$profile.a.b.c',
      '$profile.a.id',
    ]) {
      expect(
        resolvePlaceholders({ a: placeholder }, profileCtx({ a: { id: 1, b: 'x' }, id: 3 })).missing
      ).toEqual([placeholder]);
    }

    // An object value is never put into a filter
    expect(
      resolvePlaceholders({ a: '$profile.plan' }, profileCtx({ plan: { $ne: null } })).missing
    ).toEqual(['$profile.plan']);
  });

  describe('readsProfile', () => {
    let p: ReturnType<typeof instantiatePermissionsUtilities>;

    beforeEach(() => {
      global.strapi = createStrapi();
      p = instantiatePermissionsUtilities(global.strapi);
    });

    it('readsProfile is true for a static query with a $profile placeholder', async () => {
      await p.providers.condition.register({
        name: 'test.org',
        displayName: 'Org',
        query: {
          $or: [{ organization: { documentId: { $eq: '$profile.organization.documentId' } } }],
        },
      });

      expect(p.conditions.readsProfile()).toBe(true);
      expect(p.providers.condition.get('test.org')!.definition.usesProfile).toBe(true);
    });

    it('readsProfile is true for usesProfile: true', async () => {
      await p.providers.condition.register({
        name: 'test.fn',
        displayName: 'Fn',
        usesProfile: true,
        query: (c) => ({ plan: { $eq: String(c.user?.profile?.plan) } }),
      });

      expect(p.conditions.readsProfile()).toBe(true);
    });

    it('readsProfile is false otherwise', async () => {
      expect(p.conditions.readsProfile()).toBe(false);

      await p.providers.condition.register(mine);
      await p.providers.condition.register({
        name: 'test.fn',
        displayName: 'Fn',
        query: () => true,
      });
      await p.providers.condition.register({
        name: 'test.text',
        displayName: 'Text',
        // A longer string, and a key, are not placeholders
        query: { '$profile.x': { $eq: 'a $profile.x' } },
      });

      expect(p.conditions.readsProfile()).toBe(false);
    });
  });
});
