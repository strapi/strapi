import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DENY_ALL_FILTER } from '@strapi/utils';
import type { Core } from '@strapi/types';

import instantiatePermissionsUtilities from '..';
import type { ContentApiConditionDefinition } from '../conditions';
import type { ConditionUser, ContentApiPermission } from '../types';

const NOTE = 'api::note.note';
const ARTICLE = 'api::article.article';
const USER_UID = 'plugin::end-users.user';

const user: ConditionUser = {
  uid: USER_UID,
  id: 7,
  documentId: 'u1',
  email: 'a@x.io',
  roles: [{ documentId: 'r1' }],
};

const ownerOf = { owner: { documentId: { $eq: 'u1' } } };
/** What `toFilters` gives for one row conditioned by test.mine, and what its group filter is */
const MINE = { $or: [{ $and: [{ $or: [ownerOf] }] }] };

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
      // What a condition's filters can't name: a password, a dynamic zone and a morph relation
      attributes: {
        secret: { type: 'password' },
        blocks: { type: 'dynamiczone', components: [] },
        related: { type: 'relation', relation: 'morphToOne' },
      },
    },
    [ARTICLE]: { uid: ARTICLE, options: { draftAndPublish: true } },
    [USER_UID]: { uid: USER_UID, options: { draftAndPublish: false } },
  };

  return {
    isLoaded: false,
    log: { debug: vi.fn() },
    contentTypes,
    contentType: (uid: string) => contentTypes[uid],
    getModel: (uid: string) => contentTypes[uid],
    apis: {
      note: {
        controllers: { note: contentApi('find', 'findOne', 'create', 'update', 'delete') },
      },
      article: { controllers: { article: contentApi('find', 'findOne', 'create', 'update') } },
    },
    plugins: {
      'end-users': { controllers: { me: contentApi('find') } },
    },
  } as unknown as Core.Strapi;
};

describe('Content API permissions: the checker', () => {
  let p: ReturnType<typeof instantiatePermissionsUtilities>;
  let mineStamp: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    global.strapi = createStrapi();
    p = instantiatePermissionsUtilities(global.strapi);
    await p.registerActions();

    mineStamp = vi.fn((ctx: { user: ConditionUser | null }) => ({
      owner: { set: [{ documentId: ctx.user!.documentId }] },
    }));

    const conditions: ContentApiConditionDefinition[] = [
      {
        name: 'test.mine',
        displayName: 'Mine',
        query: { owner: { documentId: { $eq: '$user.documentId' } } },
        stamp: mineStamp as unknown as ContentApiConditionDefinition['stamp'],
        lockedFields: () => ['owner'],
      },
      {
        name: 'test.my-email',
        displayName: 'My email',
        query: { email: { $eq: '$user.email' } },
        stamp: () => ({ source: 'api' }),
        lockedFields: () => ['email'],
      },
      {
        name: 'test.shared',
        displayName: 'Shared',
        query: { shared: { $eq: true } },
      },
      {
        name: 'test.anyone',
        displayName: 'Anyone',
        query: () => true,
        lockedFields: () => ['status'],
      },
      {
        // The Document Service strips a password from the filters, so this can't be written as one
        name: 'test.by-secret',
        displayName: 'By secret',
        query: { secret: { $eq: 'x' } },
      },
      {
        name: 'test.by-blocks',
        displayName: 'By blocks',
        query: { blocks: { $notNull: true } },
      },
      {
        name: 'test.by-related',
        displayName: 'By related',
        query: { related: { title: { $eq: 'x' } } },
      },
      {
        // lodash's `set` skips a `constructor` key, so this condition can't be written as a filter
        name: 'test.by-constructor',
        displayName: 'By constructor',
        query: { constructor: { documentId: { $eq: '$user.documentId' } } },
      },
    ];

    for (const condition of conditions) {
      await p.providers.condition.register(condition);
    }
  });

  const authOf = async (rows: ContentApiPermission[], caller: ConditionUser | null = user) => ({
    strategy: { name: 'end-users' },
    credentials: caller,
    ability: await p.generateAbility(rows, { user: caller }),
  });

  /** Every answer of the checker for (action, uid), and the uid-level ones */
  const answers = (auth: unknown, action: string, uid: string) => ({
    filtersFor: p.checker.filtersFor(auth, action, uid),
    fieldsFor: p.checker.fieldsFor(auth, action, uid),
    readableFields: p.checker.readableFields(auth, action, uid),
    populateDepth: p.checker.populateDepth(auth, action, uid),
  });

  describe('which callers it answers for', () => {
    it('is inactive for token and U&P abilities and active for generateAbility', async () => {
      const routeAbility = await p.engine.generateAbility([{ action: `${NOTE}.find` }]);
      const token = { strategy: { name: 'api-token' }, credentials: {}, ability: routeAbility };
      const usersPermissions = {
        strategy: { name: 'users-permissions' },
        credentials: { id: 1 },
        ability: routeAbility,
      };

      for (const auth of [token, usersPermissions, null, undefined, {}, { ability: null }]) {
        expect(p.checker.isActive(auth)).toBe(false);
      }

      expect(p.checker.isActive(await authOf([{ action: `${NOTE}.find` }]))).toBe(true);
      expect(p.checker.isActive(await authOf([]))).toBe(true);
    });

    it('answers an inactive caller as today: no filter, every field, nothing locked or stamped', async () => {
      const token = {
        strategy: { name: 'api-token' },
        ability: await p.engine.generateAbility([{ action: `${ARTICLE}.find` }]),
      };

      for (const action of ['find', 'findOne', 'update', 'read-drafts', 'publish']) {
        expect(answers(token, action, ARTICLE)).toEqual({
          filtersFor: {},
          fieldsFor: { always: null, conditional: [] },
          readableFields: null,
          populateDepth: null,
        });
      }

      expect(p.checker.canReadDrafts(token, ARTICLE)).toBe(true);
      expect(p.checker.writableFields(token, 'create', ARTICLE)).toBeNull();
      expect(p.checker.lockedFields(token, ARTICLE)).toEqual([]);
      expect(p.checker.stampFor(token, ARTICLE)).toEqual({});
    });

    it('is the one the content API service gives its sanitizers', async () => {
      expect(p.checker).toEqual(expect.objectContaining({ isActive: expect.any(Function) }));
      expect(p.checker.record(await authOf([]), { kind: 'route-only', route: 'x' })).toBe(
        undefined
      );
    });
  });

  describe('explain mode', () => {
    it('routes record to the collector of the request, and fills in the roles of the rows', async () => {
      const auth = await authOf([{ action: `${NOTE}.find`, origin: { role: 'Authenticated' } }]);

      p.checker.record(auth, {
        kind: 'field-removed',
        uid: NOTE,
        action: 'find',
        path: 'secret',
        roles: [],
      });

      expect(p.readExplain(auth)).toEqual({
        checked: true,
        entries: [
          {
            kind: 'field-removed',
            uid: NOTE,
            action: 'find',
            path: 'secret',
            roles: ['Authenticated'],
          },
        ],
      });
    });

    it('marks the request checked when it answers, not when it is only asked who is active', async () => {
      const auth = await authOf([{ action: `${NOTE}.find` }]);

      p.checker.isActive(auth);

      expect(p.readExplain(auth).checked).toBe(false);

      p.checker.filtersFor(auth, 'find', NOTE);

      expect(p.readExplain(auth)).toEqual({ checked: true, entries: [] });
    });

    it('explains nothing for a caller that is not active', async () => {
      const token = {
        strategy: { name: 'api-token' },
        ability: await p.engine.generateAbility([{ action: `${NOTE}.find` }]),
      };

      p.checker.record(token, { kind: 'route-only', route: 'x' });
      p.checker.fieldsFor(token, 'find', NOTE);

      expect(p.readExplain(token)).toEqual({ checked: false, entries: [] });
    });
  });

  describe('rows the caller holds and rows it does not', () => {
    it('treats a uid the caller holds no row for as route-level only', async () => {
      // plugin::end-users.me.find belongs to no content type: it opens its route and nothing else
      const auth = await authOf([{ action: 'plugin::end-users.me.find' }]);

      expect(answers(auth, 'find', USER_UID)).toEqual({
        filtersFor: {},
        fieldsFor: { always: null, conditional: [] },
        readableFields: null,
        populateDepth: null,
      });
      expect(p.checker.writableFields(auth, 'update', USER_UID)).toBeNull();
      expect(p.checker.lockedFields(auth, USER_UID)).toEqual([]);
      expect(p.checker.stampFor(auth, USER_UID)).toEqual({});
    });

    it('gives null for read-drafts and publish when the caller holds no row for them', async () => {
      const auth = await authOf([{ action: `${ARTICLE}.find` }]);

      expect(p.checker.filtersFor(auth, 'find', ARTICLE)).toEqual({});
      expect(p.checker.filtersFor(auth, 'read-drafts', ARTICLE)).toBeNull();
      expect(p.checker.filtersFor(auth, 'publish', ARTICLE)).toBeNull();
      // Any other data action without a row stays route-level
      expect(p.checker.filtersFor(auth, 'update', ARTICLE)).toEqual({});

      const granted = await authOf([
        { action: `${ARTICLE}.find` },
        { action: `${ARTICLE}.read-drafts` },
        { action: `${ARTICLE}.publish` },
      ]);

      expect(p.checker.filtersFor(granted, 'read-drafts', ARTICLE)).toEqual({});
      expect(p.checker.filtersFor(granted, 'publish', ARTICLE)).toEqual({});
    });

    it("denies when every condition of the caller's row fails", async () => {
      // Public has no user, so is-owner style conditions can't hold
      const auth = await authOf(
        [
          {
            action: `${NOTE}.find`,
            properties: { populateDepth: 2 },
            conditions: [{ name: 'test.mine' }],
          },
        ],
        null
      );

      expect(answers(auth, 'find', NOTE)).toEqual({
        filtersFor: null,
        fieldsFor: { always: [], conditional: [] },
        readableFields: [],
        populateDepth: 0,
      });
    });

    it('denies for a held row whose action is not registered', async () => {
      // A stale row: the note controller has no `archive` method
      const auth = await authOf([{ action: `${NOTE}.archive` }]);

      expect(answers(auth, 'archive', NOTE)).toEqual({
        filtersFor: null,
        fieldsFor: { always: [], conditional: [] },
        readableFields: [],
        populateDepth: 0,
      });
    });

    it('denies for a row stored under another content type, and lets it widen nothing', async () => {
      const stray = {
        action: `${NOTE}.update`,
        subject: ARTICLE,
        properties: { populateDepth: null },
      };

      const alone = await authOf([stray]);

      expect(answers(alone, 'update', NOTE)).toEqual({
        filtersFor: null,
        fieldsFor: { always: [], conditional: [] },
        readableFields: [],
        populateDepth: 0,
      });

      // Next to a matching row it adds no field, no depth and no unlock
      const auth = await authOf([
        stray,
        {
          action: `${NOTE}.update`,
          properties: { fields: ['title'], populateDepth: 1 },
          conditions: [{ name: 'test.mine' }],
        },
      ]);

      expect(p.checker.filtersFor(auth, 'update', NOTE)).toEqual(MINE);
      expect(p.checker.fieldsFor(auth, 'update', NOTE)).toEqual({
        always: [],
        conditional: [{ filter: MINE, fields: ['title'] }],
      });
      expect(p.checker.populateDepth(auth, 'update', NOTE)).toBe(1);
      expect(p.checker.lockedFields(auth, NOTE)).toEqual(['owner']);
    });
  });

  describe('drafts', () => {
    it('needs a read-drafts row to read drafts', async () => {
      const findOnly = await authOf([{ action: `${ARTICLE}.find` }]);

      expect(p.checker.canReadDrafts(findOnly, ARTICLE)).toBe(false);

      const withRow = await authOf([
        { action: `${ARTICLE}.find` },
        { action: `${ARTICLE}.read-drafts` },
      ]);

      expect(p.checker.canReadDrafts(withRow, ARTICLE)).toBe(true);
    });

    it('reads drafts under a read-drafts condition only when it holds', async () => {
      const rows = [
        { action: `${ARTICLE}.find` },
        { action: `${ARTICLE}.read-drafts`, conditions: [{ name: 'test.mine' }] },
      ];

      expect(p.checker.canReadDrafts(await authOf(rows), ARTICLE)).toBe(true);
      expect(p.checker.canReadDrafts(await authOf(rows, null), ARTICLE)).toBe(false);
    });

    it('denies a read-drafts row whose condition hits a key the filter would drop', async () => {
      const auth = await authOf([
        { action: `${ARTICLE}.find` },
        { action: `${ARTICLE}.read-drafts`, conditions: [{ name: 'test.by-constructor' }] },
      ]);

      // A filter, not null, and still a deny: a yes/no never reads `!== null` alone
      expect(p.checker.filtersFor(auth, 'read-drafts', ARTICLE)).toEqual(DENY_ALL_FILTER);
      expect(p.checker.canReadDrafts(auth, ARTICLE)).toBe(false);
    });
  });

  describe('fields', () => {
    it('unions fields and takes the largest populate depth across roles', async () => {
      const auth = await authOf([
        {
          action: `${NOTE}.find`,
          properties: { fields: ['title'], populateDepth: 1 },
          origin: { role: 'A' },
        },
        {
          action: `${NOTE}.find`,
          properties: { fields: ['body', 'title'], populateDepth: 3 },
          origin: { role: 'B' },
        },
      ]);

      expect(p.checker.readableFields(auth, 'find', NOTE)).toEqual(['title', 'body']);
      expect(p.checker.fieldsFor(auth, 'find', NOTE)).toEqual({
        always: ['title', 'body'],
        conditional: [],
      });
      expect(p.checker.populateDepth(auth, 'find', NOTE)).toBe(3);

      const unlimited = await authOf([
        { action: `${NOTE}.find`, properties: { fields: ['title'], populateDepth: 1 } },
        { action: `${NOTE}.find`, properties: {} },
      ]);

      expect(p.checker.readableFields(unlimited, 'find', NOTE)).toBeNull();
      expect(p.checker.populateDepth(unlimited, 'find', NOTE)).toBeNull();
    });

    it('reads findOne fields from the find rows when no findOne row is held', async () => {
      const findOnly = await authOf([
        { action: `${NOTE}.find`, properties: { fields: ['title'], populateDepth: 1 } },
      ]);

      expect(p.checker.readableFields(findOnly, 'findOne', NOTE)).toEqual(['title']);
      expect(p.checker.populateDepth(findOnly, 'findOne', NOTE)).toBe(1);

      const withFindOne = await authOf([
        { action: `${NOTE}.find`, properties: { fields: ['title'] } },
        { action: `${NOTE}.findOne`, properties: { fields: ['title', 'secret'] } },
      ]);

      expect(p.checker.readableFields(withFindOne, 'findOne', NOTE)).toEqual(['title', 'secret']);

      const neither = await authOf([
        { action: `${NOTE}.update`, properties: { fields: ['title'] } },
      ]);

      expect(p.checker.readableFields(neither, 'findOne', NOTE)).toBeNull();
    });

    it('gives a conditioned role its fields only on the entries its condition matches', async () => {
      // A reads titles everywhere; B reads every field of the caller's own notes
      const auth = await authOf([
        { action: `${NOTE}.find`, properties: { fields: ['title'] }, origin: { role: 'A' } },
        { action: `${NOTE}.find`, conditions: [{ name: 'test.mine' }], origin: { role: 'B' } },
      ]);

      expect(p.checker.filtersFor(auth, 'find', NOTE)).toEqual({});
      expect(p.checker.fieldsFor(auth, 'find', NOTE)).toEqual({
        always: ['title'],
        conditional: [{ filter: MINE, fields: null }],
      });
      // Every entry gets `always`, never B's fields
      expect(p.checker.readableFields(auth, 'find', NOTE)).toEqual(['title']);
    });

    it('gives a conditioned row that adds no field no group', async () => {
      const auth = await authOf([
        { action: `${NOTE}.find`, properties: { fields: ['title', 'seo'] } },
        {
          action: `${NOTE}.find`,
          properties: { fields: ['title', 'seo.metaTitle'] },
          conditions: [{ name: 'test.mine' }],
        },
      ]);

      expect(p.checker.fieldsFor(auth, 'find', NOTE)).toEqual({
        always: ['title', 'seo'],
        conditional: [],
      });
    });

    it('groups conditioned rows by filter and lists only the fields they add', async () => {
      const auth = await authOf([
        {
          action: `${NOTE}.find`,
          properties: { fields: ['title', 'body'] },
          conditions: [{ name: 'test.mine' }],
        },
        {
          action: `${NOTE}.find`,
          properties: { fields: ['secret'] },
          conditions: [{ name: 'test.mine' }],
        },
        {
          action: `${NOTE}.find`,
          properties: { fields: ['title', 'shared'] },
          conditions: [{ name: 'test.shared' }],
        },
      ]);

      expect(p.checker.fieldsFor(auth, 'find', NOTE)).toEqual({
        // No row restricts no entry
        always: [],
        conditional: [
          { filter: MINE, fields: ['title', 'body', 'secret'] },
          {
            filter: { $or: [{ $and: [{ $or: [{ shared: { $eq: true } }] }] }] },
            fields: ['title', 'shared'],
          },
        ],
      });
    });

    it('counts a condition that holds with no filter as restricting no entry', async () => {
      const auth = await authOf([
        { action: `${NOTE}.find`, properties: { fields: ['title'] } },
        {
          action: `${NOTE}.find`,
          properties: { fields: ['body'] },
          conditions: [{ name: 'test.anyone' }],
        },
      ]);

      expect(p.checker.fieldsFor(auth, 'find', NOTE)).toEqual({
        always: ['title', 'body'],
        conditional: [],
      });
    });

    it('gives the fields of a condition that cannot be written as a filter to no entry', async () => {
      const auth = await authOf([
        { action: `${NOTE}.find`, properties: { fields: ['title'] } },
        { action: `${NOTE}.find`, conditions: [{ name: 'test.by-constructor' }] },
      ]);

      // The unconditioned row lets every entry through, but the stray condition opens no field
      expect(p.checker.filtersFor(auth, 'find', NOTE)).toEqual({});
      expect(p.checker.fieldsFor(auth, 'find', NOTE)).toEqual({
        always: ['title'],
        conditional: [],
      });
    });

    // The field groups read their filters through the same guard as `filtersFor`
    it('gives the fields of a condition on a password, dynamic-zone or morph attribute to no entry', async () => {
      for (const name of ['test.by-secret', 'test.by-blocks', 'test.by-related']) {
        const auth = await authOf([
          { action: `${NOTE}.find`, properties: { fields: ['title'] } },
          { action: `${NOTE}.find`, properties: { fields: ['body'] }, conditions: [{ name }] },
        ]);

        expect(p.checker.filtersFor(auth, 'find', NOTE), name).toEqual({});
        expect(p.checker.fieldsFor(auth, 'find', NOTE), name).toEqual({
          always: ['title'],
          conditional: [],
        });
      }
    });

    it('keeps the group of a condition that can be written beside one that cannot', async () => {
      const auth = await authOf([
        { action: `${NOTE}.find`, properties: { fields: ['title'] } },
        {
          action: `${NOTE}.find`,
          properties: { fields: ['body'] },
          conditions: [{ name: 'test.by-secret' }],
        },
        {
          action: `${NOTE}.find`,
          properties: { fields: ['seo'] },
          conditions: [{ name: 'test.mine' }],
        },
      ]);

      expect(p.checker.fieldsFor(auth, 'find', NOTE)).toEqual({
        always: ['title'],
        conditional: [{ filter: MINE, fields: ['seo'] }],
      });
    });

    it('gives writes the same shape, and a create every field its rows allow', async () => {
      const auth = await authOf([
        { action: `${NOTE}.update`, properties: { fields: ['title'] } },
        { action: `${NOTE}.update`, conditions: [{ name: 'test.mine' }] },
        {
          action: `${NOTE}.create`,
          properties: { fields: ['title', 'body'] },
          conditions: [{ name: 'test.mine' }],
        },
      ]);

      expect(p.checker.fieldsFor(auth, 'update', NOTE)).toEqual({
        always: ['title'],
        conditional: [{ filter: MINE, fields: null }],
      });
      expect(p.checker.writableFields(auth, 'update', NOTE)).toEqual(['title']);
      // A create has no stored entry to match: the condition held for the caller, so its fields count
      expect(p.checker.fieldsFor(auth, 'create', NOTE)).toEqual({
        always: ['title', 'body'],
        conditional: [],
      });
      expect(p.checker.writableFields(auth, 'create', NOTE)).toEqual(['title', 'body']);
      // Public: the create condition fails, so nothing is writable
      const publicAuth = await authOf(
        [
          {
            action: `${NOTE}.create`,
            properties: { fields: ['title'] },
            conditions: [{ name: 'test.mine' }],
          },
        ],
        null
      );

      expect(p.checker.writableFields(publicAuth, 'create', NOTE)).toEqual([]);
    });

    it('hands out copies', async () => {
      const auth = await authOf([
        { action: `${NOTE}.find`, properties: { fields: ['title'] } },
        {
          action: `${NOTE}.find`,
          properties: { fields: ['body'] },
          conditions: [{ name: 'test.mine' }],
        },
      ]);

      const first = p.checker.fieldsFor(auth, 'find', NOTE);

      first.always!.push('secret');
      first.conditional[0].fields!.push('secret');
      (first.conditional[0].filter as { $or: unknown[] }).$or.push({});

      expect(p.checker.fieldsFor(auth, 'find', NOTE)).toEqual({
        always: ['title'],
        conditional: [{ filter: MINE, fields: ['body'] }],
      });
    });
  });

  describe('writes', () => {
    const update = (conditions?: ContentApiPermission['conditions']) => ({
      action: `${NOTE}.update`,
      ...(conditions ? { conditions } : {}),
    });

    it('locks the union of the locked fields of the update conditions that hold', async () => {
      const auth = await authOf([
        update([{ name: 'test.mine' }]),
        update([{ name: 'test.my-email' }, { name: 'test.shared' }]),
      ]);

      expect(p.checker.lockedFields(auth, NOTE)).toEqual(['owner', 'email']);
    });

    it('locks nothing when an update row has no condition', async () => {
      const auth = await authOf([update([{ name: 'test.mine' }]), update()]);

      expect(p.checker.lockedFields(auth, NOTE)).toEqual([]);
    });

    it('keeps the locks of a condition that holds with no filter', async () => {
      const auth = await authOf([
        update([{ name: 'test.anyone' }]),
        update([{ name: 'test.mine' }]),
      ]);

      expect(p.checker.lockedFields(auth, NOTE)).toEqual(['status', 'owner']);
    });

    it('merges the stamps of the create conditions that hold', async () => {
      const auth = await authOf([
        { action: `${NOTE}.create`, conditions: [{ name: 'test.mine' }] },
        { action: `${NOTE}.create`, conditions: [{ name: 'test.my-email' }] },
        { action: `${NOTE}.create` },
      ]);

      expect(p.checker.stampFor(auth, NOTE)).toEqual({
        owner: { set: [{ documentId: 'u1' }] },
        source: 'api',
      });
    });

    it('never runs a stamp or a lock for a caller the condition denies', async () => {
      const auth = await authOf(
        [
          { action: `${NOTE}.create`, conditions: [{ name: 'test.mine' }] },
          update([{ name: 'test.mine' }]),
        ],
        null
      );

      expect(p.checker.stampFor(auth, NOTE)).toEqual({});
      expect(p.checker.lockedFields(auth, NOTE)).toEqual([]);
      expect(mineStamp).not.toHaveBeenCalled();
    });
  });

  describe('describe', () => {
    it('describes routes and subjects', async () => {
      const authA = await authOf([
        {
          action: `${NOTE}.find`,
          properties: { fields: ['title'], populateDepth: 2 },
          conditions: [{ name: 'test.mine' }],
        },
      ]);

      expect(p.describe(authA)).toEqual({
        routes: ['api::note.note.find'],
        subjects: {
          'api::note.note': {
            find: { fields: ['title'], conditions: ['test.mine'], populateDepth: 2 },
          },
        },
      });
    });

    it('combines the rows of several roles and lists route-only actions as routes', async () => {
      const auth = await authOf([
        { action: 'plugin::end-users.me.find' },
        { action: `${NOTE}.find`, properties: { fields: ['title'], populateDepth: 1 } },
        {
          action: `${NOTE}.find`,
          properties: { fields: ['body'], populateDepth: 3 },
          conditions: [{ name: 'test.mine' }, { name: 'test.shared' }],
        },
        { action: `${NOTE}.update`, conditions: [{ name: 'test.mine' }] },
        { action: `${ARTICLE}.read-drafts` },
      ]);

      expect(p.describe(auth)).toEqual({
        routes: ['api::note.note.find', 'api::note.note.update', 'plugin::end-users.me.find'],
        subjects: {
          [NOTE]: {
            find: {
              fields: ['title', 'body'],
              conditions: ['test.mine', 'test.shared'],
              populateDepth: 3,
            },
            update: { fields: null, conditions: ['test.mine'], populateDepth: null },
          },
          [ARTICLE]: {
            'read-drafts': { fields: null, conditions: [], populateDepth: null },
          },
        },
      });
    });

    it('describes the routes of a caller without data rules, and no subjects', async () => {
      const token = {
        ability: await p.engine.generateAbility([{ action: `${NOTE}.find` }]),
      };

      expect(p.describe(token)).toEqual({ routes: ['api::note.note.find'], subjects: {} });
      expect(p.describe(null)).toEqual({ routes: [], subjects: {} });
    });
  });
});
