import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Core } from '@strapi/types';

import instantiatePermissionsUtilities from '..';
import { DATA_ABILITY } from '../types';
import type { ContentApiPermission } from '../types';

const contentApi = (...names: string[]) =>
  Object.fromEntries(
    names.map((name) => [
      name,
      Object.assign(() => {}, { [Symbol.for('__type__')]: ['content-api'] }),
    ])
  );

const NOTE = 'api::note.note';
const ARTICLE = 'api::article.article';

const caller = {
  uid: 'plugin::end-users.user',
  id: 7,
  documentId: 'u1',
  email: 'a@x.io',
  roles: [{ documentId: 'r1' }],
};

/** The route ability answers `can(action)` with no subject, which CASL's own typing doesn't allow */
const canCallRoute = (ability: unknown, action: string) =>
  (ability as { can(action: string): boolean }).can(action);

const createStrapi = (onContentTypesRead: () => void = () => {}) => {
  // A plain object, like the registry's: `contentTypes.constructor` finds an inherited value
  const contentTypes: Record<string, unknown> = {
    [NOTE]: { uid: NOTE, options: { draftAndPublish: false } },
    [ARTICLE]: { uid: ARTICLE, options: { draftAndPublish: true } },
    'api::banner.banner': {
      uid: 'api::banner.banner',
      kind: 'singleType',
      options: { draftAndPublish: false },
    },
  };

  return {
    isLoaded: false,
    log: { debug: vi.fn() },
    // Reading the map builds a copy of every schema in the real registry
    get contentTypes() {
      onContentTypesRead();

      return contentTypes;
    },
    contentType: (uid: string) => contentTypes[uid],
    apis: {
      note: { controllers: { note: contentApi('find', 'findOne', 'update') } },
      article: { controllers: { article: contentApi('find', 'findOne') } },
      search: { controllers: { search: contentApi('find') } },
    },
    plugins: {},
  } as unknown as Core.Strapi;
};

describe('Content API permissions: generateAbility', () => {
  let p: ReturnType<typeof instantiatePermissionsUtilities>;

  beforeEach(async () => {
    global.strapi = createStrapi();
    p = instantiatePermissionsUtilities(global.strapi);
    await p.registerActions();
    await p.providers.condition.register({
      name: 'test.mine',
      displayName: 'Mine',
      subjects: [NOTE],
      query: { owner: { documentId: { $eq: '$user.documentId' } } },
    });
  });

  const rows = [
    { action: 'api::note.note.find', subject: 'api::note.note', properties: { fields: ['title'] } },
  ];

  const dataOf = async (
    permissions: Parameters<typeof p.generateAbility>[0],
    who: typeof caller | null = null
  ) => (await p.generateAbility(permissions, { user: who }))[DATA_ABILITY]!;

  it('builds the same route rules as engine.generateAbility for action-only rows', async () => {
    const plain = [{ action: 'api::note.note.find' }, { action: 'api::search.search.find' }];
    const { rules } = await p.generateAbility(plain, { user: null });

    expect(rules).not.toEqual([]);
    expect(rules).toEqual((await p.engine.generateAbility(plain)).rules);
  });

  it('answers the route scope of a subject row', async () => {
    expect(canCallRoute(await p.generateAbility(rows, { user: null }), 'api::note.note.find')).toBe(
      true
    );
  });

  it('puts field rules on the data ability under the short action', async () => {
    const data = (await dataOf(rows)).ability;

    expect(data.can('find', 'api::note.note', 'title')).toBe(true);
    expect(data.can('find', 'api::note.note', 'secret')).toBe(false);
  });

  // `manage` and `all` are CASL's "any action" and "any subject": on the data ability they are
  // ordinary names, because a controller method may be called `manage`
  it('keeps manage an ordinary action on the data ability', async () => {
    await p.providers.action.register(`${NOTE}.manage`, { uid: `${NOTE}.manage` });

    const manage = (await dataOf([{ action: `${NOTE}.manage` }])).ability;

    expect(manage.can('manage', NOTE)).toBe(true);

    for (const action of ['find', 'findOne', 'update', 'delete', 'read-drafts', 'publish']) {
      expect(manage.can(action, NOTE)).toBe(false);
    }

    // The other way round: no other action answers manage
    const find = (await dataOf([{ action: `${NOTE}.find` }])).ability;

    expect(find.can('manage', NOTE)).toBe(false);
    expect(find.can('find', NOTE)).toBe(true);
  });

  it('keeps a subject named all an ordinary subject on the data ability', async () => {
    global.strapi = createStrapi();
    (global.strapi.contentTypes as Record<string, unknown>).all = {
      uid: 'all',
      options: { draftAndPublish: false },
    };
    p = instantiatePermissionsUtilities(global.strapi);
    await p.registerActions();
    await p.providers.action.register('all.find', { uid: 'all.find' });

    const data = (await dataOf([{ action: 'all.find' }])).ability;

    expect(data.can('find', 'all')).toBe(true);
    expect(data.can('find', NOTE)).toBe(false);
    expect(data.can('find', ARTICLE)).toBe(false);
  });

  it('derives the subject of a row stored with subject null, as the first version of the plugin stored every row', async () => {
    const compiled = await dataOf([
      { action: 'api::note.note.update', subject: null, properties: {}, conditions: [] },
    ]);

    expect(compiled.ability.can('update', 'api::note.note')).toBe(true);
    expect(compiled.ability.can('update', 'api::note.note', 'anything')).toBe(true);
    expect(compiled.rules).toEqual([
      {
        action: 'api::note.note.update',
        dataAction: 'update',
        subject: 'api::note.note',
        fields: null,
        locales: null,
        populateDepth: null,
        conditions: [],
      },
    ]);
  });

  it('names the content type of an action and null for any other', () => {
    expect([
      p.subjectOf('api::note.note.find'),
      p.subjectOf('plugin::end-users.me.find'),
      p.subjectOf('api::search.search.find'),
      p.subjectOf('find'),
    ]).toEqual(['api::note.note', null, null, null]);
  });

  it('looks up the one uid in the registry, and never matches an inherited key', async () => {
    const read = vi.fn();

    global.strapi = createStrapi(read);
    p = instantiatePermissionsUtilities(global.strapi);
    await p.registerActions();
    read.mockClear();

    expect([
      p.subjectOf('api::note.note.find'),
      p.subjectOf('api::article.article.publish'),
      p.subjectOf('api::gone.gone.find'),
      p.subjectOf('constructor.find'),
      p.subjectOf('__proto__.find'),
      p.subjectOf('toString.find'),
      p.subjectOf('hasOwnProperty.find'),
    ]).toEqual([NOTE, ARTICLE, null, null, null, null, null]);
    expect(read).not.toHaveBeenCalled();
  });

  it("holds a row whose subject is not its action's content type, with no data rule", async () => {
    const ability = await p.generateAbility(
      [
        {
          action: 'api::note.note.find',
          subject: ARTICLE,
          properties: { fields: ['title'] },
          conditions: [{ name: 'test.mine' }],
          origin: { role: 'Editor' },
        },
        { action: 'api::note.note.update', subject: ARTICLE, properties: { fields: ['title'] } },
      ],
      { user: caller }
    );
    const compiled = ability[DATA_ABILITY]!;

    // The route scope is open, and the data ability has no rule for either type
    expect(canCallRoute(ability, 'api::note.note.find')).toBe(true);
    expect(canCallRoute(ability, 'api::note.note.update')).toBe(true);
    expect(compiled.ability.rules).toEqual([]);
    expect(compiled.ability.can('find', NOTE)).toBe(false);
    expect(compiled.ability.can('update', NOTE)).toBe(false);
    expect(compiled.ability.can('find', ARTICLE)).toBe(false);

    // The rows are held under their action's type, with what limited them
    expect(compiled.rules).toEqual([
      {
        action: 'api::note.note.find',
        dataAction: 'find',
        subject: NOTE,
        fields: ['title'],
        locales: null,
        populateDepth: null,
        conditions: [{ name: 'test.mine', params: {} }],
        origin: { role: 'Editor' },
      },
      {
        action: 'api::note.note.update',
        dataAction: 'update',
        subject: NOTE,
        fields: ['title'],
        locales: null,
        populateDepth: null,
        conditions: [],
      },
    ]);
  });

  it('keeps the data rule of a matching row next to a held row of another subject', async () => {
    const compiled = await dataOf([
      { action: 'api::note.note.find', subject: ARTICLE, properties: { fields: ['title'] } },
      { action: 'api::note.note.find', subject: NOTE, properties: { fields: ['body'] } },
    ]);

    expect(compiled.rules).toHaveLength(2);
    expect(compiled.ability.rules).toHaveLength(1);
    expect(compiled.ability.can('find', NOTE, 'body')).toBe(true);
    expect(compiled.ability.can('find', NOTE, 'title')).toBe(false);
  });

  it('keeps a row whose action belongs to no content type route-only', async () => {
    const ability = await p.generateAbility([{ action: 'api::search.search.find' }], {
      user: null,
    });

    expect(canCallRoute(ability, 'api::search.search.find')).toBe(true);
    expect(ability[DATA_ABILITY]!.ability.rules).toEqual([]);
    expect(ability[DATA_ABILITY]!.rules).toEqual([]);
  });

  it('keeps a custom route route-only even when its row names a subject', async () => {
    const ability = await p.generateAbility(
      [{ action: 'api::search.search.find', subject: NOTE, properties: { fields: ['title'] } }],
      { user: null }
    );

    expect(canCallRoute(ability, 'api::search.search.find')).toBe(true);
    expect(ability[DATA_ABILITY]!.ability.rules).toEqual([]);
    expect(ability[DATA_ABILITY]!.rules).toEqual([]);
  });

  it('opens no route and gives no data rule for a row whose fields list is empty, but holds it', async () => {
    const ability = await p.generateAbility(
      [{ action: 'api::note.note.find', subject: 'api::note.note', properties: { fields: [] } }],
      { user: null }
    );
    const compiled = ability[DATA_ABILITY]!;

    expect(canCallRoute(ability, 'api::note.note.find')).toBe(false);
    expect(compiled.ability.can('find', 'api::note.note')).toBe(false);
    expect(compiled.ability.rules).toEqual([]);
    expect(compiled.grants).toEqual([]);
    expect(compiled.rules).toEqual([expect.objectContaining({ dataAction: 'find', fields: [] })]);
  });

  it('gives a row with a condition nobody registered no data rule, but keeps it as a held row', async () => {
    const ability = await p.generateAbility(
      [
        {
          action: 'api::note.note.find',
          subject: 'api::note.note',
          conditions: [{ name: 'plugin::end-users.is-owner', params: { field: 'owner' } }],
          origin: { role: 'Authenticated' },
        },
      ],
      { user: null }
    );
    const compiled = ability[DATA_ABILITY]!;

    expect(canCallRoute(ability, 'api::note.note.find')).toBe(true);
    expect(compiled.ability.can('find', 'api::note.note')).toBe(false);
    expect(compiled.rules).toEqual([
      expect.objectContaining({
        dataAction: 'find',
        subject: 'api::note.note',
        conditions: [{ name: 'plugin::end-users.is-owner', params: { field: 'owner' } }],
        origin: { role: 'Authenticated' },
      }),
    ]);
  });

  it('reads null properties and conditions as none, as a row from JSON carries them', async () => {
    const compiled = await dataOf([
      {
        action: 'api::note.note.update',
        subject: null,
        properties: null,
        conditions: null,
      } as unknown as ContentApiPermission,
      {
        action: 'api::note.note.findOne',
        properties: { fields: null, locales: null, populateDepth: null },
        conditions: [{ name: 'test.mine', params: null }],
        origin: null,
      } as unknown as ContentApiPermission,
    ]);

    expect(compiled.rules).toEqual([
      {
        action: 'api::note.note.update',
        dataAction: 'update',
        subject: NOTE,
        fields: null,
        locales: null,
        populateDepth: null,
        conditions: [],
      },
      {
        action: 'api::note.note.findOne',
        dataAction: 'findOne',
        subject: NOTE,
        fields: null,
        locales: null,
        populateDepth: null,
        conditions: [{ name: 'test.mine', params: {} }],
      },
    ]);
    expect(compiled.ability.can('update', NOTE)).toBe(true);
  });

  it('grants the data rule when one role holds the action plain and another conditioned', async () => {
    const conditioned = { action: 'api::note.note.find', conditions: [{ name: 'test.mine' }] };
    const plain = { action: 'api::note.note.find' };

    const conditionedOnly = (await dataOf([{ ...conditioned, origin: { role: 'A' } }], caller))
      .ability;

    expect(conditionedOnly.rulesFor('find', NOTE)).toHaveLength(1);
    expect(conditionedOnly.rulesFor('find', NOTE)[0].conditions).toBeDefined();

    for (const order of [
      [
        { ...conditioned, origin: { role: 'A' } },
        { ...plain, origin: { role: 'B' } },
      ],
      [
        { ...plain, origin: { role: 'B' } },
        { ...conditioned, origin: { role: 'A' } },
      ],
    ]) {
      const compiled = await dataOf(order, caller);
      const granted = compiled.ability.rulesFor('find', NOTE);

      expect(compiled.rules).toHaveLength(2);
      expect(granted).toHaveLength(2);
      expect(granted.filter((rule) => rule.conditions === undefined)).toHaveLength(1);
    }
  });

  it('gives an action held by several rows one route rule', async () => {
    const ability = await p.generateAbility(
      [
        { action: 'api::note.note.find', origin: { role: 'A' } },
        { action: 'api::note.note.update', origin: { role: 'A' } },
        { action: 'api::note.note.find', subject: NOTE, origin: { role: 'B' } },
        { action: 'api::note.note.find', properties: { fields: ['title'] }, origin: { role: 'C' } },
        { action: 'api::note.note.update', conditions: [{ name: 'test.mine' }] },
      ],
      { user: caller }
    );
    const once = [{ action: 'api::note.note.find' }, { action: 'api::note.note.update' }];

    expect(ability.rules).toHaveLength(2);
    expect(ability.rules).toEqual((await p.engine.generateAbility(once)).rules);
    expect(ability[DATA_ABILITY]!.rules).toHaveLength(5);
  });

  it('leaves the rows it is given as they were, and gives out copies', async () => {
    const input = [
      {
        action: 'api::note.note.find',
        subject: NOTE,
        properties: { fields: ['title'], locales: ['en'], populateDepth: 2 },
        conditions: [{ name: 'test.mine', params: { state: 'open' } }],
        origin: { role: 'A' },
      },
      { action: 'api::note.note.update', subject: null },
      { action: 'api::note.note.find', subject: ARTICLE, properties: { fields: ['title'] } },
      { action: 'api::search.search.find' },
      { action: 'api::note.note.update', properties: { fields: [] } },
      { action: 'api::article.article.publish', properties: {}, conditions: [] },
    ] as ContentApiPermission[];
    const before = structuredClone(input);

    const ability = await p.generateAbility(input, { user: caller });

    expect(input).toStrictEqual(before);

    // What comes out belongs to the ability: changing it does not reach the rows
    for (const rule of ability[DATA_ABILITY]!.rules) {
      rule.fields?.push('changed');
      rule.locales?.push('changed');
      rule.conditions.forEach(({ params }) => Object.assign(params, { changed: true }));
      rule.conditions.push({ name: 'changed', params: {} });

      if (rule.origin) {
        rule.origin.role = 'changed';
      }
    }

    expect(input).toStrictEqual(before);
  });

  it('registers read-drafts and publish for draft-and-publish types only, outside providers.action', async () => {
    expect(p.providers.syntheticAction.keys()).toEqual(
      expect.arrayContaining(['api::article.article.read-drafts', 'api::article.article.publish'])
    );
    expect(p.providers.syntheticAction.keys()).not.toContain('api::note.note.publish');
    expect(p.providers.syntheticAction.keys()).not.toContain('api::note.note.read-drafts');
    expect(p.providers.action.keys()).not.toContain('api::article.article.publish');
    expect(p.providers.action.keys()).not.toContain('api::article.article.read-drafts');
  });

  it("registers a single type's create outside providers.action: the update route creates its first document", async () => {
    expect(p.providers.syntheticAction.keys()).toContain('api::banner.banner.create');
    expect(p.providers.syntheticAction.keys()).not.toContain('api::note.note.create');
    expect(p.providers.syntheticAction.keys()).not.toContain('api::banner.banner.publish');
    expect(p.providers.action.keys()).not.toContain('api::banner.banner.create');

    const ability = await p.generateAbility(
      [{ action: 'api::banner.banner.create', subject: 'api::banner.banner' }],
      { user: null }
    );

    // A data rule, and no route rule
    expect(ability[DATA_ABILITY]!.ability.can('create', 'api::banner.banner')).toBe(true);
    expect(ability.rules).toEqual([]);
  });

  it('grants read-drafts and publish on the data ability only', async () => {
    const ability = await p.generateAbility(
      [
        { action: 'api::article.article.read-drafts', subject: 'api::article.article' },
        { action: 'api::article.article.publish', subject: null },
      ],
      { user: null }
    );
    const data = ability[DATA_ABILITY]!.ability;

    expect(data.can('read-drafts', 'api::article.article')).toBe(true);
    expect(data.can('publish', 'api::article.article')).toBe(true);
    expect(ability.rules).toEqual([]);
    expect(global.strapi.log.debug).not.toHaveBeenCalled();
  });

  it('gives no data rule for read-drafts on a type without draft & publish', async () => {
    const data = (await dataOf([{ action: 'api::note.note.read-drafts' }])).ability;

    expect(data.can('read-drafts', 'api::note.note')).toBe(false);
  });

  it('keeps the user it was built for', async () => {
    const user = { uid: 'plugin::end-users.user', id: 7, documentId: 'u1', roles: [] };

    expect((await p.generateAbility([], { user }))[DATA_ABILITY]!.user).toBe(user);
  });

  it('is subject-aware only for abilities built by generateAbility', async () => {
    expect(
      p.isSubjectAware({
        ability: await p.engine.generateAbility([{ action: 'api::note.note.find' }]),
      })
    ).toBe(false);
    expect(p.isSubjectAware({ ability: await p.generateAbility([], { user: null }) })).toBe(true);
    expect(p.isSubjectAware({})).toBe(false);
    expect(p.isSubjectAware(null)).toBe(false);
  });
});
