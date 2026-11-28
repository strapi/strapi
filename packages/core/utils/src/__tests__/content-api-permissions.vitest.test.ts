import { beforeEach, describe, expect, it, vi } from 'vitest';
import { curry as lodashCurry } from 'lodash';

import {
  DATA_ABILITY,
  DENY_ALL_FILTER,
  createRelationRestriction,
  deniesAll,
  queryActionFor,
  readActionFor,
  restrictsEntries,
  withDeny,
  type PermissionChecker,
} from '../content-api-permissions';
import { curry } from '../curry';
import { createAPISanitizers } from '../sanitize';
import { createAPIValidators } from '../validate';
import type { Model } from '../types';
import * as utils from '..';

describe('Content API permissions: shared values', () => {
  it('turns a missing rule into the deny filter and passes filters through', () => {
    const filters = { a: 1 };

    expect(withDeny(null)).toEqual(DENY_ALL_FILTER);
    expect(DENY_ALL_FILTER).toEqual({ id: { $null: true } });
    expect(withDeny(filters)).toBe(filters);
    expect(withDeny({})).toEqual({});
  });

  it('keeps the deny filter from being changed through what withDeny returns', () => {
    const denied = withDeny(null) as { id: Record<string, unknown> };

    denied.id.$null = false;

    expect(DENY_ALL_FILTER).toEqual({ id: { $null: true } });
    expect(Object.isFrozen(DENY_ALL_FILTER)).toBe(true);
    expect(Object.isFrozen(DENY_ALL_FILTER.id)).toBe(true);
  });

  it('denies a filter that is not an object', () =>
    expect(withDeny(undefined as never)).toEqual(DENY_ALL_FILTER));

  it('denies an array and any other object that is not a plain filter object', () => {
    class Filters {
      id = { $eq: 1 };
    }

    for (const notFilters of [
      [],
      [{ id: { $eq: 1 } }],
      new Filters(),
      new Map(),
      new Date(),
      'id',
      0,
      true,
    ]) {
      expect(withDeny(notFilters as never)).toEqual(DENY_ALL_FILTER);
      expect(withDeny(notFilters as never)).not.toBe(notFilters);
    }
  });

  it('passes a plain object through, whatever its prototype and however it is frozen', () => {
    const bare = Object.assign(Object.create(null), { id: { $eq: 1 } });
    const frozen = Object.freeze({ id: { $eq: 1 } });

    expect(withDeny(bare)).toBe(bare);
    expect(withDeny(frozen)).toBe(frozen);
  });

  it('says a filter denies every entry when it is null or the deny filter, however it was made', () => {
    expect(deniesAll(null)).toBe(true);
    expect(deniesAll(DENY_ALL_FILTER)).toBe(true);
    expect(deniesAll(withDeny(null))).toBe(true);
    expect(deniesAll({ id: { $null: true } })).toBe(true);
    expect(deniesAll(Object.assign(Object.create(null), { id: { $null: true } }))).toBe(true);
  });

  it('does not say a filter denies when it may match an entry', () => {
    expect(deniesAll({})).toBe(false);
    expect(deniesAll({ id: { $null: false } })).toBe(false);
    expect(deniesAll({ id: { $notNull: true } })).toBe(false);
    expect(deniesAll({ $or: [{ id: { $null: true } }] })).toBe(false);
    // Narrower than the deny filter, but not it: only the exact filter is known to match nothing
    expect(deniesAll({ id: { $null: true }, shared: { $eq: true } })).toBe(false);
    expect(deniesAll({ owner: { documentId: { $eq: 'u1' } } })).toBe(false);
  });

  it('answers as withDeny does for what is not a plain object: it denies', () => {
    for (const notFilters of [
      undefined,
      [],
      [{ id: { $null: true } }],
      new Map(),
      new Date(),
      'id',
      0,
    ]) {
      expect(deniesAll(notFilters as never)).toBe(true);
    }

    // The two agree: a filter denies exactly when withDeny gives the deny filter for it
    for (const filters of [null, {}, DENY_ALL_FILTER, { a: 1 }, [], undefined]) {
      expect(deniesAll(filters as never)).toBe(
        JSON.stringify(withDeny(filters as never)) === JSON.stringify(DENY_ALL_FILTER)
      );
    }
  });

  it('keys the data ability with the registered symbol, exported from the package', () => {
    expect(DATA_ABILITY).toBe(Symbol.for('strapi.content-api.data-ability'));
    expect(utils.DATA_ABILITY).toBe(DATA_ABILITY);
    expect(utils.DENY_ALL_FILTER).toBe(DENY_ALL_FILTER);
    expect(utils.withDeny).toBe(withDeny);
    expect(utils.deniesAll).toBe(deniesAll);
  });
});

const folder = {
  uid: 'api::folder.folder',
  modelType: 'contentType' as const,
  kind: 'collectionType' as const,
  info: { singularName: 'folder', pluralName: 'folders', displayName: 'Folder' },
  options: {},
  attributes: { name: { type: 'string' } },
} satisfies Model;

const note = {
  uid: 'api::note.note',
  modelType: 'contentType' as const,
  kind: 'collectionType' as const,
  info: { singularName: 'note', pluralName: 'notes', displayName: 'Note' },
  options: { draftAndPublish: true },
  attributes: {
    title: { type: 'string' },
    body: { type: 'text' },
    folder: { type: 'relation', relation: 'manyToOne', target: 'api::folder.folder' },
  },
} satisfies Model;

const models: Record<string, Model> = { [note.uid]: note, [folder.uid]: folder };
const getModel = (uid: string) => models[uid];

const auth = { strategy: { name: 'end-users' }, credentials: { id: 1 }, ability: {} };

/** A registry sanitizer or validator that changes nothing, declaring both its parameters */
const passThrough = () => {
  const calls = vi.fn<(schema: Model, options?: unknown) => void>();
  const registered = (schema: Model, options?: unknown) => {
    calls(schema, options);

    return ((data: unknown) => data) as never;
  };

  return Object.assign(registered, { calls });
};

const createAPI = (permissions?: PermissionChecker) => {
  const registry = {
    input: passThrough(),
    output: passThrough(),
    validateInput: passThrough(),
  };

  return {
    registry,
    sanitize: createAPISanitizers({
      getModel,
      sanitizers: { input: [registry.input], output: [registry.output] },
      permissions,
    }),
    validate: createAPIValidators({
      getModel,
      validators: { input: [registry.validateInput] },
      permissions,
    }),
  };
};

const CHECKER_METHODS = [
  'isActive',
  'filtersFor',
  'canReadDrafts',
  'fieldsFor',
  'readableFields',
  'writableFields',
  'lockedFields',
  'stampFor',
  'populateDepth',
  'record',
] as const;

const callsOf = new WeakMap<PermissionChecker, string[]>();

/** A checker that records which of its methods are called; inactive answers by default */
const spyChecker = (overrides: Partial<PermissionChecker> = {}): PermissionChecker => {
  const answers: PermissionChecker = {
    isActive: () => false,
    filtersFor: () => ({}),
    canReadDrafts: () => true,
    fieldsFor: () => ({ always: null, conditional: [] }),
    readableFields: () => null,
    writableFields: () => null,
    lockedFields: () => [],
    stampFor: () => ({}),
    populateDepth: () => null,
    record() {},
    ...overrides,
  };
  const calls: string[] = [];
  const checker = Object.fromEntries(
    CHECKER_METHODS.map((name) => [
      name,
      (...args: unknown[]) => {
        calls.push(name);

        return (answers[name] as (...a: unknown[]) => unknown)(...args);
      },
    ])
  ) as unknown as PermissionChecker;

  callsOf.set(checker, calls);

  return checker;
};

const calledMethods = (checker: PermissionChecker) => callsOf.get(checker) ?? [];

/**
 * Every sanitize and validate entry point, with filters, sort, populate and `status=draft`. Gives
 * the names of the entry points it ran.
 */
const runEveryEntryPoint = async (checker: PermissionChecker) => {
  const api = createAPI(checker);
  const query = {
    filters: { title: { $eq: 'a' }, folder: { name: { $eq: 'b' } } },
    sort: ['title:asc'],
    fields: ['title'],
    populate: { folder: { fields: ['name'] } },
    status: 'draft',
  };
  const find = { auth, action: 'find' };
  const ran: string[] = [];
  const run = async (name: string, call: () => Promise<unknown>) => {
    await call();
    ran.push(name);
  };

  await run('sanitize.query', () => api.sanitize.query(query, note, find));
  await run('sanitize.output', () =>
    api.sanitize.output([{ title: 'a', folder: { name: 'b' } }], note, find)
  );
  await run('sanitize.input', () =>
    api.sanitize.input({ title: 'a' }, note, { auth, action: 'create' })
  );
  await run('sanitize.filters', () => api.sanitize.filters(query.filters, note, find));
  await run('sanitize.sort', () => api.sanitize.sort(query.sort, note, find));
  await run('sanitize.fields', () => api.sanitize.fields(query.fields, note, find));
  await run('sanitize.populate', () => api.sanitize.populate(query.populate, note, find));
  await run('validate.query', () => api.validate.query(query, note, find));
  await run('validate.input', () =>
    api.validate.input({ title: 'a' }, note, { auth, action: 'update' })
  );
  await run('validate.filters', () => api.validate.filters(query.filters, note, find));
  await run('validate.sort', () => api.validate.sort(query.sort, note, find));
  await run('validate.fields', () => api.validate.fields(query.fields, note, find));
  await run('validate.populate', () => api.validate.populate(query.populate, note, find));

  return { ran, registry: api.registry };
};

describe('Content API permissions: what sanitizers and validators are given', () => {
  beforeEach(() => {
    // The relation visitors ask `strapi.auth.verify` whether the caller may read the target
    (globalThis as unknown as { strapi: unknown }).strapi = {
      contentTypes: models,
      components: {},
      getModel,
      auth: { verify: () => true },
    };
  });

  it('passes auth and action to registry sanitizers and validators', async () => {
    const api = createAPI();

    await api.sanitize.output({}, note, { auth, action: 'find' });
    expect(api.registry.output.calls).toHaveBeenCalledWith(note, { auth, action: 'find' });

    await api.sanitize.output([{}, {}], note, { auth, action: 'findOne' });
    expect(api.registry.output.calls).toHaveBeenLastCalledWith(note, { auth, action: 'findOne' });
    expect(api.registry.output.calls).toHaveBeenCalledTimes(3);

    await api.sanitize.input([{ title: 'a' }], note, { auth, action: 'create' });
    expect(api.registry.input.calls).toHaveBeenCalledWith(note, { auth, action: 'create' });

    await api.validate.input({ title: 'a' }, note, { auth, action: 'update' });
    expect(api.registry.validateInput.calls).toHaveBeenCalledWith(note, {
      auth,
      action: 'update',
    });
  });

  it('keeps calling a curried registry function with the schema alone', async () => {
    // users-permissions registers `curry((schema, entity) => …)`: a second argument would run it
    // at once, with the options as the entity
    const seen: unknown[] = [];
    const mark = (schema: Model, data: any) => {
      seen.push(schema);

      return { ...data, marked: true };
    };
    const api = {
      sanitize: createAPISanitizers({
        getModel,
        sanitizers: { output: [lodashCurry(mark) as never, curry(mark) as never] },
      }),
      validate: createAPIValidators({
        getModel,
        validators: { input: [lodashCurry(mark) as never] },
      }),
    };

    expect(await api.sanitize.output({ title: 'a' }, note, { auth, action: 'find' })).toEqual({
      title: 'a',
      marked: true,
    });
    await expect(
      api.validate.input({ title: 'a' }, note, { auth, action: 'update' })
    ).resolves.toBeUndefined();
    expect(seen).toEqual([note, note, note]);
  });

  it('asks an inactive checker nothing but isActive', async () => {
    const checker = spyChecker({ isActive: () => false });
    const { ran, registry } = await runEveryEntryPoint(checker);

    // Every entry point ran, with the options reaching the registry
    expect(ran).toHaveLength(13);
    expect(registry.output.calls).toHaveBeenCalledWith(note, { auth, action: 'find' });

    expect(calledMethods(checker).every((method) => method === 'isActive')).toBe(true);
  });

  it('reads output rules with findOne for findOne, create and update, and with find otherwise', () => {
    expect(['findOne', 'create', 'update'].map(readActionFor)).toEqual([
      'findOne',
      'findOne',
      'findOne',
    ]);
    expect(['find', 'delete', 'me', 'read-drafts', undefined].map(readActionFor)).toEqual([
      'find',
      'find',
      'find',
      'find',
      'find',
    ]);
  });

  it("narrows a query's root by update and delete themselves, and by the read action otherwise", () => {
    expect(['update', 'delete'].map(queryActionFor)).toEqual(['update', 'delete']);
    expect(['find', 'findOne', 'create', 'me', undefined].map(queryActionFor)).toEqual([
      'find',
      'findOne',
      'findOne',
      'find',
      'find',
    ]);
  });

  it('counts every filtersFor answer but {} as a restriction', () => {
    expect(restrictsEntries({})).toBe(false);

    for (const answer of [null, DENY_ALL_FILTER, { a: 1 }, [], 'x', undefined]) {
      expect(restrictsEntries(answer)).toBe(true);
    }
  });

  it('asks the checker about each related type once per restriction it makes', () => {
    const filtersFor = vi.fn((_auth: unknown, _action: string, uid: string) =>
      uid === 'api::note.note' ? { owner: { id: 1 } } : {}
    );
    const isRestricted = createRelationRestriction(
      { filtersFor } as unknown as PermissionChecker,
      'auth'
    );

    expect([isRestricted('api::note.note'), isRestricted('api::folder.folder')]).toEqual([
      true,
      false,
    ]);
    expect([isRestricted('api::note.note'), isRestricted('api::folder.folder')]).toEqual([
      true,
      false,
    ]);
    expect(filtersFor.mock.calls).toEqual([
      ['auth', 'find', 'api::note.note'],
      ['auth', 'find', 'api::folder.folder'],
    ]);
  });
});
