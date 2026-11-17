import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Ability, AbilityBuilder } from '@casl/ability';
import * as utils from '@strapi/utils';
import type { Core } from '@strapi/types';

import instantiatePermissionsUtilities from '..';
import { DENY_ALL_FILTER, fromCaslQuery, toFilters, withDeny } from '../to-filters';
import type { ContentApiConditionDefinition } from '../conditions';
import { DATA_ABILITY } from '../types';
import type { ConditionUser, ContentApiPermission } from '../types';

const NOTE = 'api::note.note';
const ARTICLE = 'api::article.article';
const PERSON = 'api::person.person';
const BLOCK = 'shared.block';
// Not a uid a real content type can have, but the name of CASL's "any subject"
const ALL = 'all';

const user = {
  uid: 'plugin::end-users.user',
  id: 7,
  documentId: 'u1',
  email: 'a@x.io',
  roles: [{ documentId: 'r1' }],
};

const mine: ContentApiConditionDefinition = {
  name: 'test.mine',
  displayName: 'Mine',
  query: { owner: { documentId: { $eq: '$user.documentId' } } },
};

const shared: ContentApiConditionDefinition = {
  name: 'test.shared',
  displayName: 'Shared',
  query: { shared: { $eq: true } },
};

const ownerOf = { owner: { documentId: { $eq: 'u1' } } };

const contentApi = (...names: string[]) =>
  Object.fromEntries(
    names.map((name) => [
      name,
      Object.assign(() => {}, { [Symbol.for('__type__')]: ['content-api'] }),
    ])
  );

const createStrapi = () => {
  const contentTypes: Record<string, unknown> = {
    [NOTE]: {
      uid: NOTE,
      options: { draftAndPublish: false },
      attributes: {
        tenant: { type: 'string', private: true },
        secret: { type: 'password' },
        tags: { type: 'json' },
        body: { type: 'dynamiczone', components: [BLOCK] },
        author: { type: 'relation', relation: 'manyToOne', target: PERSON },
        editor: { type: 'relation', relation: 'manyToOne', target: PERSON },
        cover: { type: 'component', component: BLOCK },
        // A morph relation has no target
        related: { type: 'relation', relation: 'morphToOne' },
        links: { type: 'relation', relation: 'morphToMany' },
      },
    },
    [PERSON]: {
      uid: PERSON,
      options: { draftAndPublish: false },
      attributes: {
        name: { type: 'string' },
        pin: { type: 'password' },
        pinned: { type: 'relation', relation: 'morphToOne' },
      },
    },
    [ARTICLE]: { uid: ARTICLE, options: { draftAndPublish: true } },
    [ALL]: { uid: ALL, options: { draftAndPublish: false } },
  };
  const components: Record<string, unknown> = {
    [BLOCK]: {
      uid: BLOCK,
      attributes: {
        code: { type: 'password' },
        label: { type: 'string' },
        subject: { type: 'relation', relation: 'morphToMany' },
      },
    },
  };

  return {
    isLoaded: false,
    log: { debug: vi.fn() },
    contentTypes,
    components,
    // What toFilters reads the attributes of a condition's type from
    getModel: (uid: string) => contentTypes[uid] ?? components[uid],
    apis: {
      note: {
        controllers: { note: contentApi('find', 'findOne', 'update', 'delete', 'manage') },
      },
      article: { controllers: { article: contentApi('find', 'findOne') } },
    },
    plugins: {},
  } as unknown as Core.Strapi;
};

describe('Content API permissions: toFilters', () => {
  let p: ReturnType<typeof instantiatePermissionsUtilities>;

  beforeEach(async () => {
    global.strapi = createStrapi();
    p = instantiatePermissionsUtilities(global.strapi);
    await p.registerActions();
    await p.providers.condition.register(mine);
    await p.providers.condition.register(shared);
  });

  const authOf = async (rows: ContentApiPermission[], caller: ConditionUser | null = user) => ({
    strategy: { name: 'end-users' },
    credentials: caller,
    ability: await p.generateAbility(rows, { user: caller }),
  });

  it('returns {} for an unconditioned rule and null without a rule', async () => {
    const auth = await authOf([{ action: `${NOTE}.find`, properties: { fields: ['title'] } }]);

    expect(toFilters(auth, 'find', NOTE)).toEqual({});
    expect(toFilters(auth, 'update', NOTE)).toBeNull();
    expect(toFilters(auth, 'find', ARTICLE)).toBeNull();
  });

  it('returns the condition of a single conditioned rule', async () => {
    const authA = await authOf([{ action: `${NOTE}.find`, conditions: [{ name: 'test.mine' }] }]);

    expect(toFilters(authA, 'find', NOTE)).toEqual({
      $or: [{ $and: [{ $or: [ownerOf] }] }],
    });
  });

  it('ORs the conditioned rows of two roles', async () => {
    const auth = await authOf([
      { action: `${NOTE}.find`, conditions: [{ name: 'test.mine' }], origin: { role: 'r1' } },
      { action: `${NOTE}.find`, conditions: [{ name: 'test.shared' }], origin: { role: 'r2' } },
    ]);

    expect(toFilters(auth, 'find', NOTE)).toEqual({
      $or: [{ $and: [{ $or: [{ shared: { $eq: true } }] }] }, { $and: [{ $or: [ownerOf] }] }],
    });
  });

  it('lets an unconditioned role win over a conditioned one', async () => {
    const auth = await authOf([
      { action: `${NOTE}.find`, conditions: [{ name: 'test.mine' }], origin: { role: 'r1' } },
      { action: `${NOTE}.find`, origin: { role: 'r2' } },
    ]);

    expect(toFilters(auth, 'find', NOTE)).toEqual({});
  });

  it('returns null when every condition of the held row fails', async () => {
    const auth = await authOf(
      [{ action: `${NOTE}.find`, conditions: [{ name: 'test.mine' }] }],
      null
    );

    expect(toFilters(auth, 'find', NOTE)).toBeNull();
  });

  it('reads the synthetic actions from the data ability', async () => {
    const auth = await authOf([
      { action: `${ARTICLE}.find` },
      { action: `${ARTICLE}.read-drafts`, conditions: [{ name: 'test.mine' }] },
    ]);

    expect(toFilters(auth, 'read-drafts', ARTICLE)).toEqual({
      $or: [{ $and: [{ $or: [ownerOf] }] }],
    });
    expect(toFilters(auth, 'publish', ARTICLE)).toBeNull();
  });

  it('returns {} for an ability that is not subject-aware', async () => {
    const tokenAbility = await p.engine.generateAbility([{ action: `${NOTE}.find` }]);

    expect(
      toFilters({ strategy: { name: 'api-token' }, ability: tokenAbility }, 'find', NOTE)
    ).toEqual({});
    expect(toFilters({ ability: tokenAbility }, 'update', NOTE)).toEqual({});
    expect(toFilters(null, 'find', NOTE)).toEqual({});
    expect(toFilters({}, 'find', NOTE)).toEqual({});
  });

  // The condition filters are $and-ed onto the caller's query after the caller's own
  // filters are sanitized; toFilters itself must not sanitize them either. (A password attribute
  // denies instead: see below.)
  it('hands out the condition filters unsanitized: private fields and empty lists survive', async () => {
    await p.providers.condition.register({
      name: 'test.tenant',
      displayName: 'Tenant',
      query: {
        tenant: { $eq: '$user.tenant' },
        author: { name: { $notNull: true } },
        tags: { $in: [] },
      },
    });

    const auth = await authOf([{ action: `${NOTE}.find`, conditions: [{ name: 'test.tenant' }] }], {
      ...user,
      tenant: 't1',
    });

    expect(toFilters(auth, 'find', NOTE)).toEqual({
      $or: [
        {
          $and: [
            {
              $or: [
                { tenant: { $eq: 't1' }, author: { name: { $notNull: true } }, tags: { $in: [] } },
              ],
            },
          ],
        },
      ],
    });
  });

  // The Document Service's query params converter strips password and dynamic-zone
  // attributes from the whole `where`, the conditions ANDed into it included
  describe('a condition on an attribute the query params converter strips', () => {
    const authWith = async (name: string, query: Record<string, unknown>) => {
      await p.providers.condition.register({ name, displayName: name, query });

      return authOf([{ action: `${NOTE}.find`, conditions: [{ name }] }]);
    };

    it.each<[string, Record<string, unknown>]>([
      ['a password attribute', { secret: { $eq: 'x' } }],
      ['a dynamic zone', { body: { $notNull: true } }],
      [
        'a password inside $or',
        { $or: [{ tenant: { $eq: 't1' } }, { secret: { $notNull: true } }] },
      ],
      ['a password of a related type', { author: { pin: { $eq: '1234' } } }],
      ['a password of a component', { cover: { code: { $eq: 'x' } } }],
      ['a password under $elemMatch', { author: { $elemMatch: { pin: { $eq: '1' } } } }],
      // The converter reads a morph relation's filters with no schema, so every attribute but `id`
      // and `documentId` is stripped from them, and the query layer refuses to filter on one
      ['a morph relation', { related: { title: { $eq: 'x' } } }],
      ['a morph relation by id', { related: { id: { $eq: 1 } } }],
      ['a morph relation with an operator', { related: { $null: true } }],
      ['a to-many morph relation', { links: { documentId: { $in: ['a'] } } }],
      [
        'a morph relation inside $or',
        { $or: [{ tenant: { $eq: 't1' } }, { related: { title: { $notNull: true } } }] },
      ],
      ['a morph relation of a related type', { author: { pinned: { name: { $eq: 'x' } } } }],
      ['a morph relation of a component', { cover: { subject: { id: { $eq: 1 } } } }],
      ['a morph relation under $elemMatch', { author: { $elemMatch: { pinned: { id: 1 } } } }],
    ])('denies a condition on %s', async (_label, query) => {
      const auth = await authWith('test.stripped', query);
      const filters = toFilters(auth, 'find', NOTE);

      expect(filters).toEqual(DENY_ALL_FILTER);
      expect(filters).not.toBe(DENY_ALL_FILTER);
    });

    it('keeps a condition on the ordinary fields of the type and of related types', async () => {
      const auth = await authWith('test.ordinary', {
        author: { name: { $eq: 'a' } },
        cover: { label: { $eq: 'b' } },
      });

      expect(toFilters(auth, 'find', NOTE)).toEqual({
        $or: [
          {
            $and: [{ $or: [{ author: { name: { $eq: 'a' } }, cover: { label: { $eq: 'b' } } }] }],
          },
        ],
      });
    });

    it('denies in fromCaslQuery given the uid, and reads no type without one', () => {
      const query = { $or: [{ $and: [{ $or: [{ secret: { $eq: 'x' } }] }] }] };

      expect(fromCaslQuery(query, NOTE)).toEqual(DENY_ALL_FILTER);
      expect(fromCaslQuery(query)).toEqual(query);
      // A type strapi does not know has no attribute to check
      expect(fromCaslQuery(query, 'api::unknown.unknown')).toEqual(query);

      const morph = { $or: [{ $and: [{ $or: [{ related: { title: { $eq: 'x' } } }] }] }] };

      expect(fromCaslQuery(morph, NOTE)).toEqual(DENY_ALL_FILTER);
      expect(fromCaslQuery(morph)).toEqual(morph);
    });

    it('drops only the rule whose condition would not be written, and keeps the others', async () => {
      await p.providers.condition.register({
        name: 'test.bad',
        displayName: 'bad',
        query: { secret: { $eq: 'x' } },
      });
      await p.providers.condition.register({
        name: 'test.good',
        displayName: 'good',
        query: { tenant: { $eq: 't1' } },
      });

      const both = await authOf([
        { action: `${NOTE}.find`, conditions: [{ name: 'test.bad' }] },
        { action: `${NOTE}.find`, conditions: [{ name: 'test.good' }] },
      ]);
      const filters = toFilters(both, 'find', NOTE);

      // The bad row is as if its condition failed: the good row's filter is all there is
      expect(filters).not.toEqual(DENY_ALL_FILTER);
      expect(JSON.stringify(filters)).toContain('t1');
      expect(JSON.stringify(filters)).not.toContain('secret');

      // With no rule left, the action denies
      const onlyBad = await authOf([
        { action: `${NOTE}.find`, conditions: [{ name: 'test.bad' }] },
      ]);

      expect(toFilters(onlyBad, 'find', NOTE)).toEqual(DENY_ALL_FILTER);

      // In fromCaslQuery too
      expect(
        fromCaslQuery({ $or: [{ secret: { $eq: 'x' } }, { tenant: { $eq: 't1' } }] }, NOTE)
      ).toEqual({ $or: [{ tenant: { $eq: 't1' } }] });
    });

    it('keeps a condition on a relation that has a target, next to a morph relation it does not name', async () => {
      const auth = await authWith('test.not-morph', {
        author: { name: { $eq: 'a' } },
        tenant: { $eq: 't1' },
      });

      expect(toFilters(auth, 'find', NOTE)).not.toEqual(DENY_ALL_FILTER);
    });
  });

  it('denies a condition on a key the query builder would drop', async () => {
    await p.providers.condition.register({
      name: 'test.by-constructor',
      displayName: 'By constructor',
      query: { constructor: { documentId: { $eq: '$user.documentId' } } },
    });

    const auth = await authOf([
      { action: `${NOTE}.find`, conditions: [{ name: 'test.by-constructor' }] },
    ]);

    expect(toFilters(auth, 'find', NOTE)).toEqual(DENY_ALL_FILTER);
  });

  describe('actions and subjects that are CASL wildcards', () => {
    // A controller method named `manage` is a content-api action like any other, and so is its
    // data action: it must not answer for every other action
    it('treats a manage action as an ordinary one: it does not widen what delete is filtered by', async () => {
      const auth = await authOf([
        { action: `${NOTE}.manage` },
        { action: `${NOTE}.delete`, conditions: [{ name: 'test.mine' }] },
      ]);

      expect(toFilters(auth, 'delete', NOTE)).toEqual({ $or: [{ $and: [{ $or: [ownerOf] }] }] });
      expect(toFilters(auth, 'manage', NOTE)).toEqual({});
      expect(toFilters(auth, 'find', NOTE)).toBeNull();
    });

    it('gives a manage row no say over find, delete, read-drafts or publish', async () => {
      const auth = await authOf([{ action: `${NOTE}.manage` }, { action: `${ARTICLE}.find` }]);

      expect(toFilters(auth, 'manage', NOTE)).toEqual({});

      for (const action of ['find', 'findOne', 'update', 'delete']) {
        expect(toFilters(auth, action, NOTE)).toBeNull();
      }

      for (const action of ['read-drafts', 'publish']) {
        expect(toFilters(auth, action, ARTICLE)).toBeNull();
      }
    });

    it('keeps the condition of a manage row to manage', async () => {
      const auth = await authOf([
        { action: `${NOTE}.manage`, conditions: [{ name: 'test.mine' }] },
        { action: `${NOTE}.find` },
      ]);

      expect(toFilters(auth, 'manage', NOTE)).toEqual({ $or: [{ $and: [{ $or: [ownerOf] }] }] });
      expect(toFilters(auth, 'find', NOTE)).toEqual({});
      expect(toFilters(auth, 'delete', NOTE)).toBeNull();
    });

    it('treats a subject named all as an ordinary one: it does not widen other content types', async () => {
      await p.providers.action.register(`${ALL}.find`, { uid: `${ALL}.find` });

      const auth = await authOf([{ action: `${ALL}.find` }]);

      expect(toFilters(auth, 'find', ALL)).toEqual({});
      expect(toFilters(auth, 'find', NOTE)).toBeNull();
      expect(toFilters(auth, 'find', ARTICLE)).toBeNull();
    });
  });

  // `generateAbility` builds `can` rules only. A rule that is inverted would make the query the
  // rows the rule forbids, so toFilters denies instead
  describe('an inverted rule', () => {
    const authOfRules = (define: (builder: AbilityBuilder<Ability>) => void) => {
      const builder = new AbilityBuilder(Ability);

      define(builder);

      const ability = Object.defineProperty({}, DATA_ABILITY, {
        value: { ability: builder.build(), rules: [], user: null },
      });

      return { ability };
    };

    it('denies instead of restricting the query to the forbidden rows', () => {
      const auth = authOfRules(({ can, cannot }) => {
        can('find', NOTE);
        cannot('find', NOTE, { secret: { $eq: true } });
      });

      expect(toFilters(auth, 'find', NOTE)).toEqual(DENY_ALL_FILTER);
    });

    it('denies next to a conditioned rule too', () => {
      const auth = authOfRules(({ can, cannot }) => {
        can('find', NOTE, ownerOf);
        cannot('find', NOTE, { secret: { $eq: true } });
      });

      expect(toFilters(auth, 'find', NOTE)).toEqual(DENY_ALL_FILTER);
    });

    it('denies for an unconditioned inverted rule', () => {
      const auth = authOfRules(({ can, cannot }) => {
        can('find', NOTE, ownerOf);
        cannot('find', NOTE);
      });

      expect(toFilters(auth, 'find', NOTE)).toEqual(DENY_ALL_FILTER);
    });

    it('hands out a fresh copy of the deny filter, and leaves other actions alone', () => {
      const auth = authOfRules(({ can, cannot }) => {
        can('find', NOTE, ownerOf);
        can('update', NOTE, ownerOf);
        cannot('find', NOTE);
      });

      const denied = toFilters(auth, 'find', NOTE) as { id: Record<string, unknown> };

      expect(denied).not.toBe(DENY_ALL_FILTER);

      denied.id.$null = false;

      expect(DENY_ALL_FILTER).toEqual({ id: { $null: true } });
      expect(toFilters(auth, 'update', NOTE)).toEqual({ $or: [ownerOf] });
    });
  });

  // buildStrapiQuery writes each key with lodash `set`, so some conditions lose a clause on the way:
  // the filter would then match more than the condition says
  describe('a condition the query builder would lose a clause of', () => {
    const registerCondition = (name: string, query: Record<string, unknown>) =>
      p.providers.condition.register({ name, displayName: name, query });

    const authWith = (name: string) => authOf([{ action: `${NOTE}.find`, conditions: [{ name }] }]);

    it('denies a dotted key that a nested object on the same root overwrites', async () => {
      await registerCondition('test.shadowed', {
        'owner.documentId': { $eq: '$user.documentId' },
        owner: { tenant: { $eq: 't1' } },
      });

      expect(toFilters(await authWith('test.shadowed'), 'find', NOTE)).toEqual(DENY_ALL_FILTER);
    });

    it('denies a dotted key shadowed one level down', async () => {
      await registerCondition('test.shadowed-deep', {
        $or: [
          { 'owner.roles.name': { $eq: 'admin' }, owner: { roles: { type: { $eq: 'a' } } } },
          { shared: { $eq: true } },
        ],
      });

      expect(toFilters(await authWith('test.shadowed-deep'), 'find', NOTE)).toEqual(
        DENY_ALL_FILTER
      );
    });

    it('keeps both clauses when the nested object comes first and the dotted key adds to it', async () => {
      await registerCondition('test.merged', {
        owner: { tenant: { $eq: 't1' } },
        'owner.documentId': { $eq: '$user.documentId' },
      });

      expect(toFilters(await authWith('test.merged'), 'find', NOTE)).toEqual({
        $or: [
          {
            $and: [{ $or: [{ owner: { tenant: { $eq: 't1' }, documentId: { $eq: 'u1' } } }] }],
          },
        ],
      });
    });

    it('keeps the clauses of dotted keys that share a root', async () => {
      await registerCondition('test.dotted', {
        'owner.documentId': { $eq: '$user.documentId' },
        'owner.tenant': { $eq: 't1' },
      });

      expect(toFilters(await authWith('test.dotted'), 'find', NOTE)).toEqual({
        $or: [
          {
            $and: [{ $or: [{ owner: { documentId: { $eq: 'u1' }, tenant: { $eq: 't1' } } }] }],
          },
        ],
      });
    });

    it('denies an $elemMatch that has sibling operators', async () => {
      await registerCondition('test.elem-siblings', {
        tags: { $elemMatch: { name: { $eq: 'a' } }, $exists: true },
      });

      expect(toFilters(await authWith('test.elem-siblings'), 'find', NOTE)).toEqual(
        DENY_ALL_FILTER
      );
    });

    it('unwraps an $elemMatch that stands alone', async () => {
      await registerCondition('test.elem', { tags: { $elemMatch: { name: { $eq: 'a' } } } });

      expect(toFilters(await authWith('test.elem'), 'find', NOTE)).toEqual({
        $or: [{ $and: [{ $or: [{ tags: { name: { $eq: 'a' } } }] }] }],
      });
    });

    // `{ tags: { $elemMatch: {} } }` builds to `{ tags: {} }`, which the database applies as no restriction
    it('denies an $elemMatch that holds an empty object', async () => {
      const queries: Record<string, Record<string, unknown>> = {
        alone: { tags: { $elemMatch: {} } },
        'beside a clause': { tags: { $elemMatch: {} }, shared: { $eq: true } },
        'in an $or': { $or: [{ shared: { $eq: true } }, { tags: { $elemMatch: {} } }] },
        'with a sibling operator': { tags: { $elemMatch: {}, $exists: true } },
        nested: { tags: { $elemMatch: { $elemMatch: {} } } },
        'holding an empty object': { tags: { $elemMatch: { name: {} } } },
        'in a nested object': { owner: { tags: { $elemMatch: {} } } },
      };

      for (const [label, query] of Object.entries(queries)) {
        await registerCondition(`test.elem-empty-${label}`, query);

        expect(toFilters(await authWith(`test.elem-empty-${label}`), 'find', NOTE), label).toEqual(
          DENY_ALL_FILTER
        );
      }
    });

    it('denies an empty $elemMatch from fromCaslQuery too, as the fields groups read it', () => {
      expect(fromCaslQuery({ $or: [{ $and: [{ $or: [{ tags: { $elemMatch: {} } }] }] }] })).toEqual(
        DENY_ALL_FILTER
      );
      expect(
        fromCaslQuery({ $or: [{ $and: [{ $or: [{ tags: { $elemMatch: { a: { $eq: 1 } } } }] }] }] })
      ).toEqual({ $or: [{ $and: [{ $or: [{ tags: { a: { $eq: 1 } } }] }] }] });
    });

    it('denies two operators that become one Strapi operator', async () => {
      await registerCondition('test.same-operator', {
        secret: { $exists: true, $notNull: false },
      });

      expect(toFilters(await authWith('test.same-operator'), 'find', NOTE)).toEqual(
        DENY_ALL_FILTER
      );
    });
  });

  // A literal empty object joins its relation but adds no predicate, and an empty `$and` or `$or` opens
  // a group with nothing in it: the query layer applies each as no restriction
  describe('a condition with a part that restricts nothing', () => {
    const registerCondition = (name: string, query: Record<string, unknown>) =>
      p.providers.condition.register({ name, displayName: name, query });

    const authWith = (name: string) => authOf([{ action: `${NOTE}.find`, conditions: [{ name }] }]);

    it('denies an empty object under a key, at any depth', async () => {
      const queries: Record<string, Record<string, unknown>> = {
        'a value': { tags: {} },
        'a relation value': { author: {} },
        'beside a clause': { author: {}, shared: { $eq: true } },
        'in an $or': { $or: [{ shared: { $eq: true } }, { author: {} }] },
        'in a nested object': { author: { team: {} } },
        'holding only empty objects': { author: { name: {}, team: {} } },
        'an $elemMatch': { tags: { $elemMatch: {} } },
        'an $elemMatch of an empty object': { tags: { $elemMatch: { name: {} } } },
        'an $elemMatch in an $elemMatch': { tags: { $elemMatch: { $elemMatch: {} } } },
      };

      for (const [label, query] of Object.entries(queries)) {
        await registerCondition(`test.empty-${label}`, query);

        expect(toFilters(await authWith(`test.empty-${label}`), 'find', NOTE), label).toEqual(
          DENY_ALL_FILTER
        );
      }
    });

    it('denies an empty $and or $or, and an empty object in a group', () => {
      const queries: Record<string, unknown> = {
        'an empty $or': { $or: [{ $and: [{ $or: [{ $or: [] }] }] }] },
        'an empty $and': { $or: [{ $and: [{ $or: [{ $and: [] }] }] }] },
        'an empty $or in a relation': { $or: [{ $and: [{ $or: [{ author: { $or: [] } }] }] }] },
        'an empty object in a group': { $or: [{ $and: [{ $or: [{ $or: [{}] }] }] }] },
        'an empty object in a group beside a clause': {
          $or: [{ $and: [{ $or: [{ $and: [{}, { shared: { $eq: true } }] }] }] }],
        },
      };

      for (const [label, query] of Object.entries(queries)) {
        expect(fromCaslQuery(query), label).toEqual(DENY_ALL_FILTER);
        expect(fromCaslQuery(query, NOTE), label).toEqual(DENY_ALL_FILTER);
      }
    });

    it('keeps an unconditioned rule, an empty list that matches nothing, and ordinary clauses', async () => {
      // An unconditioned rule is the CASL query `{}`: the root has no clause and restricts nothing
      expect(fromCaslQuery({})).toEqual({});

      await registerCondition('test.nothing-matches', { tags: { $in: [] } });
      await registerCondition('test.ordinary', {
        author: { $or: [{ name: { $eq: 'a' } }, { name: { $eq: 'b' } }] },
      });

      expect(toFilters(await authWith('test.nothing-matches'), 'find', NOTE)).toEqual({
        $or: [{ $and: [{ $or: [{ tags: { $in: [] } }] }] }],
      });
      expect(toFilters(await authWith('test.ordinary'), 'find', NOTE)).not.toEqual(DENY_ALL_FILTER);
    });
  });

  // The query layer merges what each key of a where object gives into one object, so the
  // `$or` a relation filter gives replaces the `$or` of a sibling. A condition with two such keys
  // would lose one of its clauses, and match more than it says
  describe('a condition with sibling keys that each become a group at the query layer', () => {
    const group = (name: string) => ({
      $or: [{ name: { $eq: `${name}1` } }, { name: { $eq: `${name}2` } }],
    });
    const andGroup = (name: string) => ({
      $and: [{ name: { $eq: `${name}1` } }, { name: { $notNull: true } }],
    });

    /** What `toFilters` gives for one row conditioned by a condition with this query */
    const filtersFor = async (query: Record<string, unknown>) => {
      await p.providers.condition.register({ name: 'test.groups', displayName: 'Groups', query });

      return toFilters(
        await authOf([{ action: `${NOTE}.find`, conditions: [{ name: 'test.groups' }] }]),
        'find',
        NOTE
      );
    };

    /** The one condition inside the `$or` / `$and` / `$or` that CASL and the engine wrap it in */
    const conditionOf = (filters: unknown) =>
      (filters as { $or: Array<{ $and: Array<{ $or: unknown[] }> }> }).$or[0].$and[0].$or[0];

    it('splits two relation keys that each hold an $or into an explicit $and, keeping both clauses', async () => {
      const filters = await filtersFor({ author: group('a'), cover: group('c') });

      expect(conditionOf(filters)).toEqual({
        $and: [{ author: group('a') }, { cover: group('c') }],
      });
    });

    it('splits three relation keys that each hold an $or, keeping all three clauses', async () => {
      const filters = await filtersFor({
        author: group('a'),
        editor: group('e'),
        cover: group('c'),
      });

      expect(conditionOf(filters)).toEqual({
        $and: [{ author: group('a') }, { editor: group('e') }, { cover: group('c') }],
      });
    });

    it('splits all the keys when two collide, with a third key that does not, wherever it is', async () => {
      const outsider = { tenant: { $eq: 't1' } };
      const queries: Array<[string, Record<string, unknown>, unknown[]]> = [
        [
          'last',
          { author: group('a'), cover: group('c'), ...outsider },
          [{ author: group('a') }, { cover: group('c') }, outsider],
        ],
        [
          'first',
          { ...outsider, author: group('a'), cover: group('c') },
          [outsider, { author: group('a') }, { cover: group('c') }],
        ],
        [
          'between',
          { author: group('a'), ...outsider, cover: group('c') },
          [{ author: group('a') }, outsider, { cover: group('c') }],
        ],
        // The third key leaves a group of its own kind, so it is no collision, but it is split
        // with the two that are: an object is split whole
        [
          'an $and beside two $or',
          { author: group('a'), editor: andGroup('e'), cover: group('c') },
          [{ author: group('a') }, { editor: andGroup('e') }, { cover: group('c') }],
        ],
      ];

      for (const [label, query, parts] of queries) {
        await p.providers.condition.delete('test.groups').catch(() => undefined);

        expect(conditionOf(await filtersFor(query)), label).toEqual({ $and: parts });
      }
    });

    it('splits an $and and a relation key that holds one', async () => {
      const filters = await filtersFor({ author: andGroup('a'), cover: andGroup('c') });

      expect(conditionOf(filters)).toEqual({
        $and: [{ author: andGroup('a') }, { cover: andGroup('c') }],
      });
    });

    it('splits an $or beside a relation key that holds an $or, in either order', async () => {
      const branches = [{ tenant: { $eq: 't1' } }, { shared: { $eq: true } }];

      expect(conditionOf(await filtersFor({ $or: branches, author: group('a') }))).toEqual({
        $and: [{ $or: branches }, { author: group('a') }],
      });
      await p.providers.condition.delete('test.groups');
      expect(conditionOf(await filtersFor({ author: group('a'), $or: branches }))).toEqual({
        $and: [{ author: group('a') }, { $or: branches }],
      });
    });

    it('splits a where whose keys reach a group through a nested relation', async () => {
      // `author` holds two groups of its own, so it is split first; its `$and` then meets cover's
      const filters = await filtersFor({
        author: { team: group('p'), cover: group('q') },
        cover: andGroup('c'),
      });

      expect(conditionOf(filters)).toEqual({
        $and: [
          { author: { $and: [{ team: group('p') }, { cover: group('q') }] } },
          { cover: andGroup('c') },
        ],
      });
    });

    it('splits inside the items of a group and inside relation values', async () => {
      const filters = await filtersFor({
        $or: [
          { author: group('a'), cover: group('c') },
          { shared: { $eq: true } },
          { author: { team: group('p'), name: { $eq: 'x' }, cover: group('q') } },
        ],
      });

      expect(conditionOf(filters)).toEqual({
        $or: [
          { $and: [{ author: group('a') }, { cover: group('c') }] },
          { shared: { $eq: true } },
          {
            author: { $and: [{ team: group('p') }, { name: { $eq: 'x' } }, { cover: group('q') }] },
          },
        ],
      });
    });

    it('leaves a where alone when no two keys give the same group', async () => {
      const queries: Record<string, Record<string, unknown>> = {
        'one relation group and scalar keys': {
          author: group('a'),
          tenant: { $eq: 't1' },
          shared: { $eq: true },
        },
        'an $or and an $and': { author: group('a'), cover: andGroup('c') },
        'a group beside a negation': { author: group('a'), $not: { tenant: { $eq: 't2' } } },
        'relation keys with attribute keys only': {
          author: { name: { $eq: 'a' } },
          cover: { label: { $eq: 'c' } },
        },
        'an operator map': { tags: { $in: ['a', 'b'], $ne: 'c' } },
      };

      for (const [label, query] of Object.entries(queries)) {
        await p.providers.condition.delete('test.groups').catch(() => undefined);

        expect(conditionOf(await filtersFor(query)), label).toEqual(query);
      }
    });

    it('splits in fromCaslQuery too, as the fields groups read it, and is stable', () => {
      const query = { $or: [{ $and: [{ $or: [{ author: group('a'), cover: group('c') }] }] }] };
      const split = {
        $or: [{ $and: [{ $or: [{ $and: [{ author: group('a') }, { cover: group('c') }] }] }] }],
      };

      expect(fromCaslQuery(query)).toEqual(split);
      // A filter that is already split is returned as it is
      expect(fromCaslQuery(split)).toEqual(split);
    });
  });

  it('re-exports the deny filter and withDeny of @strapi/utils', () => {
    expect(DENY_ALL_FILTER).toBe(utils.DENY_ALL_FILTER);
    expect(withDeny).toBe(utils.withDeny);
  });
});
