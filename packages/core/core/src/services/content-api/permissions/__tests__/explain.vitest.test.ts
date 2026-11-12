import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ExplainEntry } from '@strapi/utils';
import type { Core } from '@strapi/types';

import instantiatePermissionsUtilities from '..';
import * as explain from '../explain';
import type { ConditionUser, ContentApiPermission } from '../types';

const NOTE = 'api::note.note';

const user: ConditionUser = {
  uid: 'plugin::end-users.user',
  id: 7,
  documentId: 'u1',
  email: 'a@x.io',
  roles: [{ documentId: 'r1' }],
};

const removed = (path = 'secret'): ExplainEntry => ({
  kind: 'field-removed',
  uid: NOTE,
  action: 'find',
  path,
  roles: [],
});

describe('explain: the collector', () => {
  it('has nothing for a request that was never asked about', () => {
    expect(explain.read({})).toEqual({ checked: false, entryChecked: false, entries: [] });
    expect(explain.read(null)).toEqual({ checked: false, entryChecked: false, entries: [] });
  });

  it('says a check ran once it is told so, and records nothing by that', () => {
    const key = {};

    explain.markChecked(key);

    expect(explain.read(key)).toEqual({ checked: true, entryChecked: false, entries: [] });
  });

  it('records an entry once, however often it is recorded, in the order it first came', () => {
    const key = {};

    explain.record(key, removed('secret'));
    explain.record(key, removed('notes'));

    for (let index = 0; index < 100; index += 1) {
      explain.record(key, removed('secret'));
    }

    expect(explain.read(key).entries.map((entry) => (entry as { path: string }).path)).toEqual([
      'secret',
      'notes',
    ]);
  });

  it('tells entries apart by everything they say, not by their kind', () => {
    const key = {};

    explain.record(key, { kind: 'relation-removed', uid: NOTE, path: 'folder', target: 'a' });
    explain.record(key, { kind: 'relation-removed', uid: NOTE, path: 'folder', target: 'b' });
    explain.record(key, {
      kind: 'condition-applied',
      uid: NOTE,
      action: 'find',
      at: 'root',
      conditions: [],
      roles: [],
    });
    explain.record(key, {
      kind: 'condition-applied',
      uid: NOTE,
      action: 'find',
      at: 'populate',
      path: 'folder',
      conditions: [],
      roles: [],
    });

    expect(explain.read(key).entries).toHaveLength(4);
  });

  it('completes an entry only when it is new', () => {
    const key = {};
    const complete = vi.fn((entry: ExplainEntry) => ({ ...entry, roles: ['Authenticated'] }));

    explain.record(key, removed(), complete as never);
    explain.record(key, removed(), complete as never);

    expect(complete).toHaveBeenCalledTimes(1);
    expect(explain.read(key).entries).toEqual([{ ...removed(), roles: ['Authenticated'] }]);
  });

  it('keeps the story of one request apart from another', () => {
    const first = {};
    const second = {};

    explain.record(first, removed('secret'));
    explain.markChecked(second);

    expect(explain.read(first).entries).toHaveLength(1);
    expect(explain.read(second)).toEqual({ checked: true, entryChecked: false, entries: [] });
  });

  it('stops growing at a bound, so a request never carries an unbounded list', () => {
    const key = {};

    for (let index = 0; index < 600; index += 1) {
      explain.record(key, removed(`field${index}`));
    }

    const { entries } = explain.read(key);

    expect(entries).toHaveLength(500);
    expect(entries[0]).toEqual(removed('field0'));
  });

  it('hands out copies, so what the reader does never changes what was recorded', () => {
    const key = {};

    explain.record(key, removed());

    const [entry] = explain.read(key).entries as Array<{ roles: string[]; path: string }>;

    entry.path = 'changed';
    entry.roles.push('Admin');

    expect(explain.read(key).entries).toEqual([removed()]);
  });
});

describe('explain: through the checker', () => {
  let p: ReturnType<typeof instantiatePermissionsUtilities>;

  const createStrapi = () => {
    const contentTypes: Record<string, unknown> = {
      [NOTE]: { uid: NOTE, options: { draftAndPublish: false } },
    };

    return {
      isLoaded: false,
      log: { debug: vi.fn() },
      contentTypes,
      contentType: (uid: string) => contentTypes[uid],
      getModel: (uid: string) => contentTypes[uid],
      apis: {
        note: {
          controllers: {
            note: Object.fromEntries(
              ['find', 'findOne', 'create'].map((name) => [
                name,
                Object.assign(() => {}, { [Symbol.for('__type__')]: ['content-api'] }),
              ])
            ),
          },
        },
      },
      plugins: {},
    } as unknown as Core.Strapi;
  };

  beforeEach(async () => {
    global.strapi = createStrapi();
    p = instantiatePermissionsUtilities(global.strapi);
    await p.registerActions();
    await p.providers.condition.register({
      name: 'test.owned-by',
      displayName: 'Owned by',
      params: { state: { type: 'string' } },
      query: { owner: { documentId: { $eq: '$user.documentId' } } },
    });
  });

  const authOf = async (rows: ContentApiPermission[], caller: ConditionUser | null = user) => ({
    strategy: { name: 'end-users' },
    credentials: caller,
    ability: await p.generateAbility(rows, { user: caller }),
  });

  const row = (
    action: string,
    role: string,
    extra: Partial<ContentApiPermission> = {}
  ): ContentApiPermission => ({ action: `${NOTE}.${action}`, origin: { role }, ...extra });

  it('says nothing was checked until a check asks for the caller rows', async () => {
    const auth = await authOf([row('find', 'Authenticated')]);

    expect(p.readExplain(auth)).toEqual({ checked: false, entryChecked: false, entries: [] });

    // Asking whether the caller has rules is not a check
    p.checker.isActive(auth);

    expect(p.readExplain(auth)).toEqual({ checked: false, entryChecked: false, entries: [] });
  });

  it.each([
    ['filtersFor', (auth: unknown) => p.checker.filtersFor(auth, 'find', NOTE)],
    ['canReadDrafts', (auth: unknown) => p.checker.canReadDrafts(auth, NOTE)],
    ['fieldsFor', (auth: unknown) => p.checker.fieldsFor(auth, 'find', NOTE)],
    ['readableFields', (auth: unknown) => p.checker.readableFields(auth, 'find', NOTE)],
    ['writableFields', (auth: unknown) => p.checker.writableFields(auth, 'create', NOTE)],
    ['lockedFields', (auth: unknown) => p.checker.lockedFields(auth, NOTE)],
    ['stampFor', (auth: unknown) => p.checker.stampFor(auth, NOTE)],
    ['populateDepth', (auth: unknown) => p.checker.populateDepth(auth, 'find', NOTE)],
  ])('marks the request checked when %s is asked', async (_name, ask) => {
    const auth = await authOf([row('find', 'Authenticated')]);

    ask(auth);

    expect(p.readExplain(auth)).toEqual({ checked: true, entryChecked: false, entries: [] });
  });

  it('marks it checked even when the caller holds no row for the type', async () => {
    const auth = await authOf([]);

    p.checker.filtersFor(auth, 'find', NOTE);

    expect(p.readExplain(auth)).toEqual({ checked: true, entryChecked: false, entries: [] });
  });

  it('names every role that holds the rows a removed field was decided by', async () => {
    const auth = await authOf([
      row('find', 'Authenticated', { properties: { fields: ['title'] } }),
      row('find', 'Editor', { properties: { fields: ['title', 'body'] } }),
      row('create', 'Writer'),
    ]);

    p.checker.record(auth, removed());

    expect(p.readExplain(auth).entries).toEqual([
      {
        kind: 'field-removed',
        uid: NOTE,
        action: 'find',
        path: 'secret',
        roles: ['Authenticated', 'Editor'],
      },
    ]);
  });

  it('reads the find rows for a findOne when the caller holds no findOne row', async () => {
    const auth = await authOf([row('find', 'Authenticated'), row('findOne', 'Editor')]);

    p.checker.record(auth, { ...removed(), action: 'findOne' } as ExplainEntry);

    expect(p.readExplain(auth).entries).toEqual([
      expect.objectContaining({ action: 'findOne', roles: ['Editor'] }),
    ]);

    const onlyFind = await authOf([row('find', 'Authenticated')]);

    p.checker.record(onlyFind, { ...removed(), action: 'findOne' } as ExplainEntry);

    expect(p.readExplain(onlyFind).entries).toEqual([
      expect.objectContaining({ action: 'findOne', roles: ['Authenticated'] }),
    ]);
  });

  it('names the conditions of a condition filter, never their parameters', async () => {
    const auth = await authOf([
      row('find', 'Authenticated', {
        conditions: [{ name: 'test.owned-by', params: { state: 'top-secret-param' } }],
      }),
      row('find', 'Editor'),
    ]);

    p.checker.record(auth, {
      kind: 'condition-applied',
      uid: NOTE,
      action: 'find',
      at: 'root',
      conditions: [],
      roles: [],
    });

    const { entries } = p.readExplain(auth);

    expect(entries).toEqual([
      {
        kind: 'condition-applied',
        uid: NOTE,
        action: 'find',
        at: 'root',
        conditions: ['test.owned-by'],
        roles: ['Authenticated', 'Editor'],
      },
    ]);
    expect(JSON.stringify(entries)).not.toContain('top-secret-param');
  });

  it('never names a role the caller does not hold', async () => {
    const other = await authOf([row('find', 'Moderator')], null);
    const caller = await authOf([row('find', 'Authenticated')]);

    p.checker.record(caller, removed());
    p.checker.record(other, removed());

    expect(p.readExplain(caller).entries).toEqual([
      expect.objectContaining({ roles: ['Authenticated'] }),
    ]);
    expect(p.readExplain(other).entries).toEqual([
      expect.objectContaining({ roles: ['Moderator'] }),
    ]);
  });

  it('leaves roles empty for a row that names none, and lists a role once', async () => {
    const auth = await authOf([
      { action: `${NOTE}.find` },
      row('find', 'Authenticated'),
      row('find', 'Authenticated', { properties: { fields: ['title'] } }),
    ]);

    p.checker.record(auth, removed());

    expect(p.readExplain(auth).entries).toEqual([
      expect.objectContaining({ roles: ['Authenticated'] }),
    ]);
  });

  it('passes the entries that name no role or condition through as they are', async () => {
    const auth = await authOf([row('find', 'Authenticated')]);
    const entries: ExplainEntry[] = [
      { kind: 'relation-removed', uid: NOTE, path: 'folder', target: 'api::folder.folder' },
      { kind: 'draft-status-removed', uid: NOTE },
      { kind: 'write-as-draft', uid: NOTE },
      { kind: 'query-narrowed', uid: NOTE, at: 'sort', path: 'folder', reason: 'sort-dropped' },
    ];

    entries.forEach((entry) => p.checker.record(auth, entry));

    expect(p.readExplain(auth).entries).toEqual(entries);
  });

  it('records for a caller that is not active as nothing', async () => {
    const routeAbility = await p.engine.generateAbility([{ action: `${NOTE}.find` }]);
    const token = { strategy: { name: 'api-token' }, ability: routeAbility };

    p.checker.record(token, removed());
    p.checker.filtersFor(token, 'find', NOTE);

    expect(p.readExplain(token)).toEqual({ checked: false, entryChecked: false, entries: [] });
    expect(p.readExplain(null)).toEqual({ checked: false, entryChecked: false, entries: [] });
    expect(p.readExplain({})).toEqual({ checked: false, entryChecked: false, entries: [] });
  });

  it('keeps one request apart from the next one of the same role', async () => {
    const rows = [row('find', 'Authenticated')];
    const first = await authOf(rows);
    const second = await authOf(rows);

    p.checker.record(first, removed());

    expect(p.readExplain(first).entries).toHaveLength(1);
    expect(p.readExplain(second)).toEqual({ checked: false, entryChecked: false, entries: [] });
  });

  it('never throws, whatever it is given', async () => {
    const auth = await authOf([row('find', 'Authenticated')]);
    const cyclic: Record<string, unknown> = { kind: 'route-only', route: 'x' };

    cyclic.self = cyclic;

    expect(() => p.checker.record(auth, cyclic as unknown as ExplainEntry)).not.toThrow();
    expect(() => p.checker.record(auth, null as unknown as ExplainEntry)).not.toThrow();
  });
});
