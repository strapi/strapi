import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { errors } from '@strapi/utils';
import type { Core, Modules } from '@strapi/types';

import type { BuilderConditionV2, BuilderValue } from '../../../../shared/builder/types';
import { PERMISSION_UID, PROFILE_UID, USER_UID } from '../../constants';
import { builderRecordsOf } from '../../utils/builder/registry';
import { layoutContentTypeUids } from '../../utils/layout-content-types';
import conditionService from '../condition';
import type { ValidateRead } from '../condition';
import { appliesTo } from './utils/applies-to';

// The register-time set stays the real one: it reads `strapi.contentTypes`, not the action registries
vi.mock('../../utils/layout-content-types', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../utils/layout-content-types')>()),
  layoutContentTypeUids: vi.fn(),
}));

type Definition = Modules.ContentAPI.ContentApiConditionDefinition;

const ARTICLE = 'api::article.article';
const CATEGORY = 'api::category.category';

const definition = (name: string): Definition => ({
  name,
  displayName: name,
  query: { shared: { $eq: true } },
});

const SCHEMAS: Record<string, unknown> = {
  [ARTICLE]: {
    uid: ARTICLE,
    attributes: {
      title: { type: 'string' },
      internalNotes: { type: 'text', private: true },
      owner: { type: 'relation', relation: 'oneToOne', target: USER_UID },
    },
  },
  [CATEGORY]: { uid: CATEGORY, attributes: { title: { type: 'string' } } },
  [USER_UID]: {
    uid: USER_UID,
    attributes: { email: { type: 'email' }, emailVerified: { type: 'boolean' } },
  },
  [PROFILE_UID]: { uid: PROFILE_UID, attributes: { nickname: { type: 'string' } } },
};

/** A builder condition: "the owner is the signed-in user", unless a test says otherwise */
const builderCondition = (extra: Partial<BuilderConditionV2> = {}): BuilderConditionV2 => ({
  version: 2,
  slug: 'mine',
  displayName: 'Mine',
  appliesTo: { kind: 'types', types: [ARTICLE] },
  inputs: [],
  who: { match: 'all', checks: [] },
  which: {
    kind: 'group',
    match: 'all',
    items: [
      {
        kind: 'check',
        target: { path: ['owner', 'documentId'] },
        operator: '$eq',
        value: { kind: 'user', attribute: 'documentId' },
      },
    ],
  },
  onSave: { stamp: [], locked: [] },
  ...extra,
});

/** A condition whose one check is on a field, whatever it holds: version 2 as the preview checks it */
const checking = (path: string[], value: BuilderValue): BuilderConditionV2 =>
  builderCondition({
    which: {
      kind: 'group',
      match: 'all',
      items: [
        {
          kind: 'check',
          target: { path },
          operator: '$eq',
          value,
        },
      ],
    },
  });

/**
 * Core's condition provider, as far as the service reaches it: `register` is async and rejects a
 * name it already holds, `values` lists what it holds.
 */
const setup = (distSrc = '/nonexistent/end-users-conditions/dist/src') => {
  const registered = new Map<string, Definition>();
  const register = vi.fn(async (registering: Definition) => {
    if (registered.has(registering.name)) {
      throw new Error(`Duplicated item key: ${registering.name}`);
    }

    registered.set(registering.name, registering);
  });
  const values = vi.fn(() => [...registered.values()]);

  const warn = vi.fn();
  const strapi = {
    dirs: { dist: { src: distSrc } },
    log: { warn },
    contentTypes: SCHEMAS,
    contentType: vi.fn((uid: string) => SCHEMAS[uid]),
    contentAPI: { permissions: { providers: { condition: { register, values } } } },
  } as unknown as Core.Strapi;

  return { conditions: conditionService({ strapi }), register, values, warn, strapi };
};

const namesRegistered = (register: ReturnType<typeof setup>['register']) =>
  register.mock.calls.map(([registering]) => registering.name);

describe('condition service', () => {
  it('service register returns a promise that rejects on a duplicate name', async () => {
    const { conditions, register } = setup();
    const first = definition('api::shared-notes');

    const registering = conditions.register(first);

    expect(registering).toBeInstanceOf(Promise);
    await expect(registering).resolves.toBeUndefined();
    // Whatever a plugin says of its source, a condition it registers is the plugin's
    expect(register).toHaveBeenCalledWith({ ...first, source: 'plugin' });

    await expect(conditions.register(definition('api::shared-notes'))).rejects.toThrow(
      /api::shared-notes/
    );
  });

  it('lists what the provider holds', async () => {
    const { conditions } = setup();

    await conditions.register(definition('api::a'));
    await conditions.register(definition('api::b'));

    expect(conditions.list().map(({ name }) => name)).toEqual(['api::a', 'api::b']);
  });

  describe('loadProjectConditions', () => {
    let dir: string;
    let conditionsDir: string;

    beforeEach(() => {
      dir = mkdtempSync(join(tmpdir(), 'end-users-conditions-'));
      conditionsDir = join(dir, 'end-users', 'conditions');
      mkdirSync(conditionsDir, { recursive: true });
      // What `contentTypes.isPrivateAttribute` reads for the project-wide private attributes
      vi.stubGlobal('strapi', { config: { get: (_key: string, fallback?: unknown) => fallback } });
      vi.mocked(layoutContentTypeUids).mockReturnValue([ARTICLE, CATEGORY, USER_UID]);
    });

    afterEach(() => {
      rmSync(dir, { recursive: true, force: true });
      vi.unstubAllGlobals();
      vi.mocked(layoutContentTypeUids).mockReset();
    });

    const OWNER = { documentId: { $eq: '$user.documentId' } };
    const V1 = {
      name: 'mine',
      displayName: 'Mine',
      subjects: [ARTICLE],
      query: { $and: [{ owner: OWNER }] },
    };
    const put = (file: string, content: unknown) =>
      writeFileSync(
        join(conditionsDir, file),
        typeof content === 'string' ? content : JSON.stringify(content)
      );
    /** The filter a registered definition gives a signed-in user, which is what it checks */
    const filterOf = (registered: Definition, params: Record<string, unknown> = {}) =>
      (registered.query as (ctx: unknown) => unknown)({
        user: { documentId: 'user-1' },
        uid: ARTICLE,
        params,
        now: new Date('2026-11-05T10:00:00Z'),
      });

    it('loads a code file with api:: on a bare name, and keeps its own namespace', async () => {
      // A compiled TypeScript file: the definition is the default export
      put(
        'editors.js',
        `exports.__esModule = true;
exports.default = {
  name: 'editors-only',
  displayName: 'Editors only',
  query: () => ({ roles: { documentId: { $in: '$user.roles.documentId' } } }),
};`
      );
      // A CommonJS file that names its own namespace
      put(
        'scoped.js',
        `module.exports = { name: 'plugin::other.scoped', displayName: 'Scoped', query: () => true };`
      );
      // Not conditions
      put('editors.d.ts', 'export {};');
      put('editors.js.map', '{}');
      put('README.md', '# conditions');
      mkdirSync(join(conditionsDir, 'nested.js'));

      const { conditions, register } = setup(dir);

      await conditions.loadProjectConditions();

      // In file name order
      expect(namesRegistered(register)).toEqual(['api::editors-only', 'plugin::other.scoped']);
      expect(register.mock.calls.map(([{ source }]) => source)).toEqual(['code', 'code']);
      expect((register.mock.calls[0][0].query as () => unknown)()).toEqual({
        roles: { documentId: { $in: '$user.roles.documentId' } },
      });
    });

    it('sets the source of a code file itself, whatever it says of its own', async () => {
      put(
        'claims-builder.js',
        `module.exports = { name: 'claims-builder', displayName: 'x', query: () => true, source: 'builder' };`
      );

      const { conditions, register } = setup(dir);

      await conditions.loadProjectConditions();

      expect(register.mock.calls[0][0]).toMatchObject({
        name: 'api::claims-builder',
        source: 'code',
      });
    });

    it('registers a version 1 file as its upgrade, through the compiler', async () => {
      put('mine.json', V1);

      const { conditions, register, strapi } = setup(dir);

      await conditions.loadProjectConditions();

      const [registered] = register.mock.calls[0];

      expect(registered).toMatchObject({
        name: 'api::mine',
        displayName: 'Mine',
        source: 'builder',
        subjects: [ARTICLE],
      });
      // An "all of" group of its entry checks, with the signed-in user as a placeholder
      expect(filterOf(registered)).toEqual({ $and: [{ owner: OWNER }] });
      // The list serves it as version 2
      expect(builderRecordsOf(strapi).get('api::mine')).toMatchObject({
        stale: [],
        condition: { version: 2, slug: 'mine', appliesTo: { kind: 'types', types: [ARTICLE] } },
      });
    });

    it('registers a version 2 file as what the compiler makes of it', async () => {
      put('mine.json', checking(['title'], { kind: 'fixed', value: 'x' }));

      const { conditions, register } = setup(dir);

      await conditions.loadProjectConditions();

      expect(register.mock.calls[0][0]).toMatchObject({ name: 'api::mine', source: 'builder' });
      expect(filterOf(register.mock.calls[0][0])).toEqual({ $and: [{ title: { $eq: 'x' } }] });
      // A row that still binds a param the file no longer declares reads as if it were not there
      expect(filterOf(register.mock.calls[0][0], { removed: 'y' })).toEqual({
        $and: [{ title: { $eq: 'x' } }],
      });
    });

    it('registers a version 2 file at start-up while the action registries are still empty', async () => {
      // During register() nothing has filled the registries, so the write-time set is empty
      vi.mocked(layoutContentTypeUids).mockReturnValue([]);
      put('mine.json', checking(['title'], { kind: 'fixed', value: 'x' }));

      const { conditions, register } = setup(dir);

      await conditions.loadProjectConditions();

      expect(register.mock.calls[0][0]).toMatchObject({ name: 'api::mine', source: 'builder' });
      expect(layoutContentTypeUids).not.toHaveBeenCalled();
    });

    it('loads a file whose input accepts a relation to an existing type, with empty registries', async () => {
      vi.mocked(layoutContentTypeUids).mockReturnValue([]);
      put(
        'mine.json',
        builderCondition({
          inputs: [
            { name: 'pick', kind: 'field', accepts: { relation: CATEGORY }, required: true },
          ],
        })
      );

      const { conditions, register } = setup(dir);

      await conditions.loadProjectConditions();

      expect(namesRegistered(register)).toEqual(['api::mine']);
    });

    it('does not take an engine, admin or Strapi-internal type at start-up, naming the file', async () => {
      vi.mocked(layoutContentTypeUids).mockReturnValue([]);
      // Broken beyond a forgiven refusal, so it stops the start
      put('mine.json', {
        ...builderCondition({ appliesTo: { kind: 'types', types: ['admin::user'] } }),
        who: null,
      });

      const { conditions, register } = setup(dir);

      await expect(conditions.loadProjectConditions()).rejects.toThrow(/mine\.json/);
      expect(register).not.toHaveBeenCalled();
    });

    it('fails, naming the file and the field, when a version 1 file can not be carried over', async () => {
      put('mine.json', { ...V1, query: { $and: [{ title: { $eq: '$params.x' } }] } });

      const { conditions, register } = setup(dir);

      await expect(conditions.loadProjectConditions()).rejects.toThrow(
        new RegExp(`${join(conditionsDir, 'mine.json')}.*title.*\\$params\\.x`)
      );
      expect(register).not.toHaveBeenCalled();
    });

    it('fails, naming the file, on a file that is neither version 2 nor a version 1 file', async () => {
      put('odd.json', definition('odd'));

      const { conditions } = setup(dir);

      await expect(conditions.loadProjectConditions()).rejects.toThrow(
        new RegExp(`${join(conditionsDir, 'odd.json')}.*not a builder condition`)
      );
    });

    it('fails, naming the file, on a file that does not pass the checks of a write', async () => {
      // `$gte` is not an operator of a text field
      put('mine.json', {
        ...checking(['title'], { kind: 'fixed', value: 'x' }),
        which: {
          kind: 'group',
          match: 'all',
          items: [
            {
              kind: 'check',
              target: { path: ['title'] },
              operator: '$gte',
              value: { kind: 'fixed', value: 'x' },
            },
          ],
        },
      });

      const { conditions, register } = setup(dir);

      await expect(conditions.loadProjectConditions()).rejects.toThrow(
        new RegExp(`${join(conditionsDir, 'mine.json')}.*\\$gte`)
      );
      expect(register).not.toHaveBeenCalled();
    });

    it('fails, naming the file, on a file over the limits, even when it also names what is gone', async () => {
      const inputs = Array.from({ length: 21 }, (_, n) => ({
        name: `i${n}`,
        kind: 'text' as const,
        required: false,
      }));

      put('many.json', builderCondition({ slug: 'many', inputs }));
      put(
        'huge.json',
        builderCondition({
          slug: 'huge',
          appliesTo: { kind: 'types', types: ['api::gone.gone'] },
          displayName: 'x'.repeat(70_000),
        })
      );

      const { conditions } = setup(dir);

      await expect(conditions.loadProjectConditions()).rejects.toThrow(/huge\.json.*bytes/);

      rmSync(join(conditionsDir, 'huge.json'));
      await expect(setup(dir).conditions.loadProjectConditions()).rejects.toThrow(
        /many\.json.*20 inputs/
      );
    });

    it('registers a file that names what the project no longer has as false, and logs it once', async () => {
      put(
        'mine.json',
        builderCondition({ appliesTo: { kind: 'types', types: ['api::gone.gone'] } })
      );

      const { conditions, register, warn, strapi } = setup(dir);

      await conditions.loadProjectConditions();

      const [registered] = register.mock.calls[0];

      expect(registered).toMatchObject({ name: 'api::mine', source: 'builder' });
      expect(filterOf(registered)).toBe(false);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining(`${join(conditionsDir, 'mine.json')}`)
      );
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('api::gone.gone'));
      expect(builderRecordsOf(strapi).get('api::mine')?.stale).toEqual([
        'content type api::gone.gone',
      ]);
    });

    it('registers a file whose input accepts a type that was deleted as false, with it as stale', async () => {
      put(
        'mine.json',
        builderCondition({
          inputs: [
            {
              name: 'pick',
              kind: 'field',
              accepts: { relation: 'api::gone.gone' },
              required: true,
            },
          ],
        })
      );

      const { conditions, register, warn, strapi } = setup(dir);

      await conditions.loadProjectConditions();

      expect(filterOf(register.mock.calls[0][0])).toBe(false);
      expect(builderRecordsOf(strapi).get('api::mine')?.stale).toEqual([
        'content type api::gone.gone',
      ]);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('api::gone.gone'));
    });

    it('loads a condition on every type when a later type lacks its path, and denies on that type', async () => {
      put('mine.json', builderCondition({ appliesTo: { kind: 'all' } }));

      const { conditions, register, strapi } = setup(dir);

      await conditions.loadProjectConditions();

      const [registered] = register.mock.calls[0];
      const on = (uid: string) =>
        (registered.query as (ctx: unknown) => unknown)({
          user: { documentId: 'user-1' },
          uid,
          params: {},
          now: new Date(),
        });

      expect(builderRecordsOf(strapi).get('api::mine')?.stale).toEqual([]);
      expect(on(ARTICLE)).toEqual({ $and: [{ owner: OWNER }] });
      // The type that has no `owner` is false for it
      expect(on(CATEGORY)).toBe(false);
    });

    it('loads a condition on every type whose stamped field a later type lacks, and denies the stamp there', async () => {
      put(
        'mine.json',
        builderCondition({
          appliesTo: { kind: 'all' },
          which: { kind: 'group', match: 'all', items: [] },
          onSave: { stamp: [{ field: 'owner', value: { kind: 'user' } }], locked: ['owner'] },
        })
      );

      const { conditions, register } = setup(dir);

      await conditions.loadProjectConditions();

      const [registered] = register.mock.calls[0];
      const stamp = (uid: string) =>
        (registered.stamp as (ctx: unknown) => unknown)({
          user: { documentId: 'user-1' },
          uid,
          params: {},
          now: new Date(),
        });

      expect(stamp(ARTICLE)).toEqual({ owner: { set: [{ documentId: 'user-1' }] } });
      expect(() => stamp(CATEGORY)).toThrow(/no field owner/);
    });

    it('registers a condition on every type as false when no type has its path any more', async () => {
      put(
        'mine.json',
        builderCondition({
          appliesTo: { kind: 'all' },
          which: {
            kind: 'group',
            match: 'all',
            items: [
              {
                kind: 'check',
                target: { path: ['vanished'] },
                operator: '$eq',
                value: { kind: 'fixed', value: 'x' },
              },
            ],
          },
        })
      );

      const { conditions, register, strapi } = setup(dir);

      await conditions.loadProjectConditions();

      expect(filterOf(register.mock.calls[0][0])).toBe(false);
      expect(builderRecordsOf(strapi).get('api::mine')?.stale).toEqual([
        'field "vanished" on any content type',
      ]);
    });

    it('stops the start for any other fault, even in a file that also names what is gone', async () => {
      const check = (path: string[], operator: string) => ({
        kind: 'check' as const,
        target: { path },
        operator,
        value: { kind: 'fixed' as const, value: 'x' },
      });

      // The first refusal is a text field asked with `$gte`, not a missing field
      put(
        'mine.json',
        builderCondition({
          which: {
            kind: 'group',
            match: 'all',
            items: [check(['title'], '$gte'), check(['gone'], '$eq')],
          },
        })
      );

      const { conditions, register } = setup(dir);

      await expect(conditions.loadProjectConditions()).rejects.toThrow(/mine\.json.*\$gte/);
      expect(register).not.toHaveBeenCalled();
    });

    it('stops the start for a file that names what is gone and lacks the parts the list reads', async () => {
      const { onSave, ...partial } = builderCondition({
        appliesTo: { kind: 'types', types: ['api::gone.gone'] },
      });

      expect(onSave).toBeDefined();
      put('mine.json', partial);

      const { conditions, register } = setup(dir);

      await expect(conditions.loadProjectConditions()).rejects.toThrow(/mine\.json/);
      expect(register).not.toHaveBeenCalled();
    });

    it('does not stop the start for a role a Who check names that no longer exists', async () => {
      put(
        'mine.json',
        builderCondition({
          who: { match: 'all', checks: [{ kind: 'roles', match: 'any', roles: ['Deleted'] }] },
        })
      );

      const { conditions, register, warn } = setup(dir);

      await conditions.loadProjectConditions();

      expect(register).toHaveBeenCalledTimes(1);
      expect(warn).not.toHaveBeenCalled();
    });

    it('records the file of each builder condition, relative to src, and of nothing else', async () => {
      put('mine.json', V1);
      put(
        'editors.js',
        `module.exports = { name: 'editors', displayName: 'Editors', query: () => true };`
      );

      const { conditions } = setup(dir);

      expect(conditions.builderFileOf('api::mine')).toBeUndefined();

      await conditions.loadProjectConditions();

      expect(conditions.builderFileOf('api::mine')).toBe(
        join('end-users', 'conditions', 'mine.json')
      );
      // A code condition has no file the builder may write
      expect(conditions.builderFileOf('api::editors')).toBeUndefined();
      expect(conditions.builderFileOf('mine')).toBeUndefined();
      expect(conditions.builderFileOf('../x')).toBeUndefined();
      expect(conditions.builderFileOf('constructor')).toBeUndefined();
    });

    it('records no file for a condition the registry refused', async () => {
      put('a.json', V1);
      put('b.json', V1);

      const { conditions } = setup(dir);

      await expect(conditions.loadProjectConditions()).rejects.toThrow(/b\.json/);
      expect(conditions.builderFileOf('api::mine')).toBe(join('end-users', 'conditions', 'a.json'));
    });

    it('loads nothing when the project has no conditions folder', async () => {
      const { conditions, register } = setup(join(dir, 'missing'));

      await expect(conditions.loadProjectConditions()).resolves.toBeUndefined();
      expect(register).not.toHaveBeenCalled();
    });

    it('fails, naming the file, when a project condition is refused', async () => {
      put('a.json', V1);
      put('b.json', V1);

      const { conditions } = setup(dir);

      await expect(conditions.loadProjectConditions()).rejects.toThrow(
        new RegExp(`${join(conditionsDir, 'b.json')}.*api::mine`)
      );
    });

    it('fails, naming the file, on a JSON file that does not parse', async () => {
      put('broken.json', '{ "name": ');

      const { conditions } = setup(dir);

      await expect(conditions.loadProjectConditions()).rejects.toThrow(/broken\.json/);
    });

    it('keeps the original error as the cause of the one that names the file', async () => {
      put('broken.json', '{ "name": ');

      const { conditions } = setup(dir);
      const failure = await conditions.loadProjectConditions().catch((error: unknown) => error);

      expect(failure).toBeInstanceOf(Error);
      expect((failure as Error).cause).toBeInstanceOf(SyntaxError);
    });
  });

  describe('for the admin', () => {
    /** What the loader registers for a builder condition: a function, never a static query */
    const mine = (extra: Partial<Definition> = {}): Definition => ({
      name: 'api::mine',
      displayName: 'Mine',
      subjects: [ARTICLE],
      query: () => true,
      source: 'builder',
      ...extra,
    });

    const BUILDER_INPUT = builderCondition();

    const SAMPLE_USER = { uid: USER_UID, id: 7, documentId: 'user-1', roles: [] };

    /**
     * Fakes of what the service reaches: core's registry and condition utilities, the permission
     * table (`findMany` answers the rows the test gives), the ability service that finds the sample
     * user, the Document Service's `count`, and the `autoReload` setting.
     */
    const setupAdmin = ({
      definitions = [] as Definition[],
      rows = [] as unknown[],
      autoReload = true,
      filter = { owner: { documentId: { $eq: 'user-1' } } } as Record<string, unknown> | false,
      mapped = [] as Array<{ id: string; name: string; attributes: string[] }>,
    } = {}) => {
      const findMany = vi.fn(async () => rows);
      // The profiles a user has, for a preview that finds none it may read: one by default
      const profiles = vi.fn(async () => 1);
      const query = vi.fn(() => ({ findMany, count: profiles }));
      // The matching count has the condition in it, the total has only the admin's scope
      const count = vi.fn(async ({ filters }: { filters: { $and?: unknown } }) =>
        filters.$and ? 12 : 340
      );
      const documents = vi.fn(() => ({ count }));
      const conditionUserFor = vi.fn(
        async (_id: string, _query: object, options?: { profile?: boolean }) =>
          options?.profile ? { ...SAMPLE_USER, profile: { nickname: 'ada' } } : SAMPLE_USER
      );
      const validate = vi.fn((definition: unknown) => definition);
      const evaluate = vi.fn(() => filter);

      const strapi = {
        config: {
          get: vi.fn((key: string, fallback?: unknown) =>
            key === 'autoReload' ? autoReload : fallback
          ),
        },
        plugin: vi.fn(() => ({
          service: vi.fn(() => ({ conditionUserFor, mappedAttributes: async () => mapped })),
        })),
        db: { query },
        documents,
        contentType: vi.fn((uid: string) => SCHEMAS[uid]),
        contentAPI: {
          permissions: {
            providers: { condition: { register: vi.fn(), values: () => definitions } },
            conditions: { validate, evaluate, appliesTo },
          },
        },
      } as unknown as Core.Strapi;

      return {
        conditions: conditionService({ strapi }),
        strapi,
        findMany,
        query,
        count,
        profiles,
        documents,
        conditionUserFor,
        evaluate,
      };
    };

    beforeEach(() => {
      // What `contentTypes.isPrivateAttribute` reads for the project-wide private attributes
      vi.stubGlobal('strapi', { config: { get: (_key: string, fallback?: unknown) => fallback } });
      vi.mocked(layoutContentTypeUids).mockReturnValue([ARTICLE, CATEGORY, USER_UID]);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      vi.mocked(layoutContentTypeUids).mockReset();
    });

    describe('listForAdmin', () => {
      const definitions: Definition[] = [
        {
          name: 'plugin::end-users.is-owner',
          displayName: 'Is owner',
          subjects: (uid: string) => uid === ARTICLE,
          params: {
            field: { type: 'attribute', relationTarget: USER_UID },
            setOnCreate: { type: 'boolean', default: true },
          },
          query: () => true,
          stamp: () => null,
          lockedFields: () => [],
          source: 'builtin',
        },
        { name: 'api::editors', displayName: 'Editors', query: () => true, source: 'code' },
        mine(),
        // Registered by a plugin through the service: no source of its own
        {
          name: 'plugin::other.x',
          displayName: 'X',
          subjects: [CATEGORY, 'api::gone.gone'],
          query: () => true,
        },
      ];

      const rows = [
        {
          conditions: [{ name: 'api::mine', params: {} }],
          role: { documentId: 'role-b', name: 'Beta' },
        },
        // The same role again: a role counts once
        {
          conditions: [{ name: 'api::mine' }, 'plugin::end-users.is-owner'],
          role: { documentId: 'role-b', name: 'Beta' },
        },
        { conditions: [{ name: 'api::mine' }], role: { documentId: 'role-a', name: 'Alpha' } },
        { conditions: [], role: { documentId: 'role-a', name: 'Alpha' } },
        { conditions: null, role: { documentId: 'role-c', name: 'Gamma' } },
        // No role, and refs that name nothing
        { conditions: [{ name: 'plugin::end-users.is-owner' }], role: null },
        { conditions: [{}, 7, null], role: { documentId: 'role-d', name: 'Delta' } },
      ];

      it('lists sources, subjects, what each declares and the roles that use it', async () => {
        const { conditions, strapi } = setupAdmin({ definitions, rows });

        builderRecordsOf(strapi).set('api::mine', { condition: builderCondition(), stale: [] });

        await expect(conditions.listForAdmin()).resolves.toEqual([
          {
            name: 'plugin::end-users.is-owner',
            displayName: 'Is owner',
            // A function is asked about each content type of the layout
            subjects: [ARTICLE],
            source: 'builtin',
            // The declared params: a default and a relation target only where they are declared
            params: [
              { name: 'field', type: 'attribute', required: false, relationTarget: USER_UID },
              // Only matters when an entry is created: the modal shows it on the Create row only
              {
                name: 'setOnCreate',
                type: 'boolean',
                required: false,
                default: true,
                createOnly: true,
              },
            ],
            // Declared by the definition, whatever the functions give
            stamp: true,
            lockedFields: true,
            usedBy: 1,
            usedByRoles: [{ documentId: 'role-b', name: 'Beta' }],
            editable: false,
          },
          {
            name: 'api::editors',
            displayName: 'Editors',
            // No subjects is every content type of the layout
            subjects: [ARTICLE, CATEGORY, USER_UID],
            source: 'code',
            params: [],
            stamp: false,
            lockedFields: false,
            usedBy: 0,
            usedByRoles: [],
            editable: false,
          },
          {
            name: 'api::mine',
            displayName: 'Mine',
            subjects: [ARTICLE],
            source: 'builder',
            params: [],
            stamp: false,
            lockedFields: false,
            usedBy: 2,
            // By name of role
            usedByRoles: [
              { documentId: 'role-a', name: 'Alpha' },
              { documentId: 'role-b', name: 'Beta' },
            ],
            editable: true,
            // The builder opens it as version 2, and it names no role
            builder: builderCondition(),
            rolesNamed: [],
          },
          {
            name: 'plugin::other.x',
            displayName: 'X',
            // A list is what the condition says
            subjects: [CATEGORY, 'api::gone.gone'],
            source: 'plugin',
            params: [],
            stamp: false,
            lockedFields: false,
            usedBy: 0,
            usedByRoles: [],
            editable: false,
          },
        ]);
      });

      it('serves a query when a code definition has a static one, and never a function; a builder condition serves itself', async () => {
        const objectQuery = { $and: [{ title: { $eq: 'x' } }] };
        const { conditions, strapi } = setupAdmin({
          definitions: [
            { name: 'api::coded', displayName: 'Coded', query: objectQuery, source: 'code' },
            { name: 'plugin::p.shared', displayName: 'Shared', query: objectQuery },
            {
              name: 'plugin::end-users.is-self',
              displayName: 'Is self',
              query: objectQuery,
              source: 'builtin',
            },
            // Computed when it runs: a function of the user is never serialised
            { name: 'api::computed', displayName: 'Computed', query: () => true, source: 'code' },
            mine(),
          ],
          rows: [],
        });

        builderRecordsOf(strapi).set('api::mine', { condition: builderCondition(), stale: [] });

        const items = await conditions.listForAdmin();

        expect(items.map(({ name, query }) => [name, query !== undefined])).toEqual([
          ['api::coded', true],
          ['plugin::p.shared', true],
          ['plugin::end-users.is-self', true],
          ['api::computed', false],
          ['api::mine', false],
        ]);
        expect(items.find(({ name }) => name === 'api::coded')?.query).toEqual(objectQuery);
        expect(items.find(({ name }) => name === 'api::mine')?.builder).toEqual(builderCondition());
        // No `query` key at all when there is nothing to serve
        expect(
          items
            .filter(({ name }) => ['api::computed', 'api::mine'].includes(name))
            .every((item) => !('query' in item))
        ).toBe(true);
        expect(JSON.stringify(items)).not.toContain('=>');
      });

      it('lists what a builder condition names that is gone, the roles it names and its params as the role editor needs them', async () => {
        const condition = builderCondition({
          inputs: [
            { name: 'note', kind: 'text', required: false, default: 'x' },
            { name: 'pick', kind: 'field', accepts: 'text', required: true },
            { name: 'owner', kind: 'field', accepts: { relation: USER_UID }, required: true },
            { name: 'stamped', kind: 'text', required: false, default: 'y' },
            { name: 'both', kind: 'text', required: false, default: 'z' },
          ],
          who: {
            match: 'all',
            checks: [
              { kind: 'roles', match: 'any', roles: ['Editor', 'Admin'] },
              { kind: 'roles', match: 'none', roles: ['Editor'] },
            ],
          },
          which: {
            kind: 'group',
            match: 'all',
            items: [
              {
                kind: 'check',
                target: { input: 'pick' },
                operator: '$eq',
                value: { kind: 'input', name: 'both' },
              },
            ],
          },
          onSave: {
            stamp: [
              { field: 'title', value: { kind: 'input', name: 'stamped' } },
              { field: 'title', value: { kind: 'input', name: 'both' } },
            ],
            locked: ['title'],
          },
        });
        const compiledLike = mine({
          params: {
            note: { type: 'string', default: 'x' },
            pick: { type: 'attribute' },
            owner: { type: 'attribute', relationTarget: USER_UID },
            stamped: { type: 'string', default: 'y' },
            both: { type: 'string', default: 'z' },
          },
        });
        const { conditions, strapi } = setupAdmin({ definitions: [compiledLike], rows: [] });

        builderRecordsOf(strapi).set('api::mine', {
          condition,
          stale: ['field "gone" of api::article.article'],
        });

        const [item] = await conditions.listForAdmin();

        expect(item).toMatchObject({
          builder: condition,
          stale: ['field "gone" of api::article.article'],
          rolesNamed: ['Editor', 'Admin'],
          lockedFields: true,
          params: [
            { name: 'note' },
            { name: 'pick', accepts: 'text' },
            { name: 'owner', accepts: { relation: USER_UID } },
            // Read by a stamp rule and nothing else: it only matters when an entry is created
            { name: 'stamped', createOnly: true },
            { name: 'both' },
          ],
        });
        expect(item.params.find(({ name }) => name === 'note')).not.toHaveProperty('createOnly');
        expect(item.params.find(({ name }) => name === 'both')).not.toHaveProperty('createOnly');
        expect(item).not.toHaveProperty('query');
      });

      it('says which fields a condition reads that a signed-in user can write', async () => {
        const condition = builderCondition({
          who: {
            match: 'all',
            checks: [
              {
                kind: 'attribute',
                source: 'profile',
                attribute: 'nickname',
                operator: '$eq',
                value: { kind: 'fixed', value: 'x' },
              },
              {
                kind: 'attribute',
                source: 'user',
                attribute: 'name',
                operator: '$eq',
                value: { kind: 'fixed', value: 'x' },
              },
              {
                kind: 'attribute',
                source: 'user',
                attribute: 'email',
                operator: '$eq',
                value: { kind: 'fixed', value: 'x' },
              },
            ],
          },
          which: {
            kind: 'group',
            match: 'all',
            items: [
              {
                kind: 'check',
                target: { path: ['title'] },
                operator: '$eq',
                value: { kind: 'profile', attribute: 'organization.documentId' },
              },
              {
                kind: 'check',
                target: { path: ['owner', 'documentId'] },
                operator: '$eq',
                value: { kind: 'user', attribute: 'documentId' },
              },
            ],
          },
        });
        const grant = (
          action: string,
          subject: string,
          fields: string[] | undefined,
          role: { name: string; type: string }
        ) => ({ action, subject, properties: fields ? { fields } : {}, role });
        const { conditions, strapi } = setupAdmin({
          definitions: [
            { ...definition('api::mine'), displayName: 'Mine', source: 'builder' as const },
          ],
          rows: [
            // Every field of the profile, to a role of signed-in users
            grant(`${PROFILE_UID}.update`, PROFILE_UID, undefined, {
              name: 'Authenticated',
              type: 'authenticated',
            }),
            // Only some, so not `organization`
            grant(`${PROFILE_UID}.create`, PROFILE_UID, ['nickname'], {
              name: 'Custom',
              type: 'custom',
            }),
            // Nothing is written with an empty field list
            grant(`${PROFILE_UID}.update`, PROFILE_UID, [], { name: 'Nothing', type: 'custom' }),
            // Public has no signed-in user
            grant(`${PROFILE_UID}.update`, PROFILE_UID, undefined, {
              name: 'Public',
              type: 'public',
            }),
            // Reading is not writing
            grant(`${PROFILE_UID}.find`, PROFILE_UID, undefined, {
              name: 'Reader',
              type: 'custom',
            }),
          ],
        });

        builderRecordsOf(strapi).set('api::mine', { condition, stale: [] });
        const [item] = await conditions.listForAdmin();

        expect(item.selfWritable).toEqual([
          { field: 'profile.nickname', roles: ['Authenticated', 'Custom'] },
          // Better Auth's own /update-user
          { field: 'user.name', roles: ['every signed-in user'] },
          { field: 'profile.organization.documentId', roles: ['Authenticated'] },
        ]);
      });

      it('counts the user fields a project writes itself: preferredLocale, which a request can set', async () => {
        const condition = builderCondition({
          who: {
            match: 'all',
            checks: [
              {
                kind: 'attribute',
                source: 'user',
                attribute: 'preferredLocale',
                operator: '$eq',
                value: { kind: 'fixed', value: 'fr' },
              },
            ],
          },
        });
        const { conditions, strapi } = setupAdmin({
          definitions: [
            { ...definition('api::mine'), displayName: 'Mine', source: 'builder' as const },
          ],
        });

        builderRecordsOf(strapi).set('api::mine', { condition, stale: [] });

        const [item] = await conditions.listForAdmin();

        expect(item.selfWritable).toEqual([
          { field: 'user.preferredLocale', roles: ['every signed-in user'] },
        ]);
      });

      it('counts a profile attribute an enabled provider writes on sign-in', async () => {
        const condition = builderCondition({
          who: {
            match: 'all',
            checks: [
              {
                kind: 'attribute',
                source: 'profile',
                attribute: 'company',
                operator: '$eq',
                value: { kind: 'fixed', value: 'Acme' },
              },
              {
                kind: 'attribute',
                source: 'profile',
                attribute: 'plan',
                operator: '$eq',
                value: { kind: 'fixed', value: 'pro' },
              },
            ],
          },
        });
        const { conditions, strapi } = setupAdmin({
          definitions: [
            { ...definition('api::mine'), displayName: 'Mine', source: 'builder' as const },
          ],
          mapped: [
            { id: 'github', name: 'GitHub', attributes: ['company'] },
            { id: 'google', name: 'Google', attributes: ['company'] },
          ],
        });

        builderRecordsOf(strapi).set('api::mine', { condition, stale: [] });

        const [item] = await conditions.listForAdmin();

        expect(item.selfWritable).toEqual([
          {
            field: 'profile.company',
            roles: ['users signing in with GitHub', 'users signing in with Google'],
          },
        ]);
      });

      it('fills reads for builder conditions', async () => {
        const condition = builderCondition({
          who: {
            match: 'all',
            checks: [
              {
                kind: 'attribute',
                source: 'profile',
                attribute: 'plan',
                operator: '$eq',
                value: { kind: 'fixed', value: 'pro' },
              },
              {
                kind: 'attribute',
                source: 'profile',
                attribute: 'plan',
                operator: '$ne',
                value: { kind: 'user', attribute: 'name' },
              },
            ],
          },
          which: {
            kind: 'group',
            match: 'all',
            items: [
              {
                kind: 'check',
                target: { path: ['title'] },
                operator: '$eq',
                value: { kind: 'profile', attribute: 'organization.documentId' },
              },
            ],
          },
        });
        const { conditions, strapi } = setupAdmin({
          definitions: [
            { ...definition('api::mine'), displayName: 'Mine', source: 'builder' as const },
            { ...definition('api::code'), displayName: 'Code', source: 'code' as const },
          ],
          rows: [],
        });

        builderRecordsOf(strapi).set('api::mine', { condition, stale: [] });
        const items = await conditions.listForAdmin();

        // Once each, in the order they are read, whether or not anyone can write them now
        expect(items.find(({ name }) => name === 'api::mine')?.reads).toEqual([
          'profile.plan',
          'user.name',
          'profile.organization.documentId',
        ]);
        expect(items.find(({ name }) => name === 'api::code')).not.toHaveProperty('reads');
      });

      it('lists the params a definition declares as it declares them', async () => {
        const { conditions } = setupAdmin({
          definitions: [
            {
              name: 'api::tiered',
              displayName: 'Tiered',
              params: {
                tier: { type: 'string', required: true },
                limit: { type: 'number', default: 0 },
                featured: { type: 'boolean', default: false },
                owner: { type: 'attribute', required: true, relationTarget: USER_UID },
                // `default` and `relationTarget` that say nothing are left out
                note: { type: 'string', relationTarget: undefined },
              },
              query: () => true,
              source: 'code',
            },
          ],
          rows: [],
        });
        const [item] = await conditions.listForAdmin();

        expect(item.params).toEqual([
          { name: 'tier', type: 'string', required: true },
          { name: 'limit', type: 'number', required: false, default: 0 },
          { name: 'featured', type: 'boolean', required: false, default: false },
          { name: 'owner', type: 'attribute', required: true, relationTarget: USER_UID },
          { name: 'note', type: 'string', required: false },
        ]);
        expect(Object.keys(item.params[3])).toEqual(['name', 'type', 'required', 'relationTarget']);
      });

      it('says a condition stamps or locks fields only when its definition declares it', async () => {
        const { conditions } = setupAdmin({
          definitions: [
            { name: 'api::stamps', displayName: 'Stamps', query: () => true, stamp: () => null },
            {
              name: 'api::locks',
              displayName: 'Locks',
              query: () => true,
              lockedFields: () => ['title'],
            },
            { name: 'api::neither', displayName: 'Neither', query: () => true },
          ],
          rows: [],
        });

        expect(
          (await conditions.listForAdmin()).map(({ name, stamp, lockedFields }) => [
            name,
            stamp,
            lockedFields,
          ])
        ).toEqual([
          ['api::stamps', true, false],
          ['api::locks', false, true],
          ['api::neither', false, false],
        ]);
      });

      it('reads the rows once, only their conditions and role, and the write grants once', async () => {
        const { conditions, findMany, query } = setupAdmin({ definitions, rows });

        await conditions.listForAdmin();

        expect(query).toHaveBeenCalledTimes(2);
        expect(query).toHaveBeenCalledWith(PERMISSION_UID);
        expect(findMany).toHaveBeenCalledTimes(2);
        expect(findMany).toHaveBeenCalledWith({
          select: ['conditions'],
          populate: { role: { select: ['documentId', 'name'] } },
        });
        expect(findMany).toHaveBeenCalledWith({
          where: {
            action: {
              $in: [
                `${USER_UID}.create`,
                `${USER_UID}.update`,
                `${PROFILE_UID}.create`,
                `${PROFILE_UID}.update`,
              ],
            },
          },
          select: ['action', 'subject', 'properties'],
          populate: { role: { select: ['name', 'type'] } },
        });
      });

      it('makes a builder condition editable only when Strapi runs with autoReload', async () => {
        const { conditions } = setupAdmin({ definitions, rows, autoReload: false });
        const items = await conditions.listForAdmin();

        expect(items.map(({ editable }) => editable)).toEqual([false, false, false, false]);
        expect(items.find(({ source }) => source === 'builder')?.usedBy).toBe(2);
      });

      it('lists nothing used when no role holds a row', async () => {
        const { conditions } = setupAdmin({ definitions, rows: [] });

        expect((await conditions.listForAdmin()).map(({ usedBy }) => usedBy)).toEqual([0, 0, 0, 0]);
      });
    });

    describe('preview', () => {
      /**
       * What the controller gives: the admin's read queries, and their permissions manager's
       * `validateQuery` for each type, which rejects with a `ValidationError` naming the first key
       * of a query that the admin may not read, as the real one does (`Invalid key <key>`). Here
       * the admin may read the fields in the lists.
       */
      const scopeOf = (
        readable: { subject?: string[]; user?: string[]; profile?: string[] } = {}
      ) => {
        const permitted =
          (fields: string[] | undefined) => (query: Parameters<ValidateRead>[0]) => {
            const keys = [...Object.keys(query.filters ?? {}), ...(query.fields ?? [])];
            const refused = keys.find((key) => !(fields ?? []).includes(key));

            return refused === undefined
              ? Promise.resolve(true)
              : Promise.reject(new errors.ValidationError(`Invalid key ${refused}`));
          };

        return {
          subjectQuery: { createdBy: { id: 1 } },
          userQuery: { emailVerified: true },
          validateSubject: vi.fn(permitted(readable.subject ?? ['title', 'owner'])),
          validateUser: vi.fn(permitted(readable.user ?? ['email'])),
          validateProfile: vi.fn(permitted(readable.profile ?? ['nickname'])),
          profileQuery: vi.fn((): object => ({ id: { $gt: 0 } })),
        };
      };
      const scope = scopeOf();
      const request = {
        condition: BUILDER_INPUT,
        subject: ARTICLE,
        userDocumentId: 'user-1',
        inputs: {},
      };

      it('checks the condition before counting, and counts within the admin scope', async () => {
        const { conditions, count, documents, conditionUserFor, evaluate } = setupAdmin();

        const refused = conditions.preview(
          { ...request, condition: checking(['internalNotes'], { kind: 'fixed', value: 'x' }) },
          scope
        );

        await expect(refused).rejects.toMatchObject({
          name: 'ValidationError',
          message: expect.stringContaining('internalNotes'),
        });
        expect(count).not.toHaveBeenCalled();
        expect(conditionUserFor).not.toHaveBeenCalled();

        await expect(conditions.preview(request, scope)).resolves.toEqual({
          matching: 12,
          total: 340,
        });

        const filter = { owner: { documentId: { $eq: 'user-1' } } };

        expect(documents).toHaveBeenCalledWith(ARTICLE);
        expect(count).toHaveBeenCalledTimes(2);
        expect(count).toHaveBeenCalledWith({
          filters: { $and: [scope.subjectQuery, filter] },
        });
        expect(count).toHaveBeenCalledWith({ filters: scope.subjectQuery });
        // The user is looked up within what the admin can see of the user type, without the profile
        expect(conditionUserFor).toHaveBeenCalledWith('user-1', scope.userQuery, {
          profile: false,
        });
        // The filter is the condition's own, for that user, on that type
        expect(evaluate).toHaveBeenCalledWith(
          expect.objectContaining({ name: 'api::mine', source: 'builder' }),
          {},
          { user: SAMPLE_USER, uid: ARTICLE }
        );
      });

      it('counts with the values the admin gave the inputs, and checks the field they chose', async () => {
        const admin = setupAdmin();
        const allowed = scopeOf({ subject: ['title'] });
        const condition = builderCondition({
          inputs: [{ name: 'pick', kind: 'field', accepts: 'text', required: true }],
          which: {
            kind: 'group',
            match: 'all',
            items: [
              {
                kind: 'check',
                target: { input: 'pick' },
                operator: '$eq',
                value: { kind: 'fixed', value: 'x' },
              },
            ],
          },
        });

        await expect(
          admin.conditions.preview({ ...request, condition, inputs: { pick: 'title' } }, allowed)
        ).resolves.toEqual({ matching: 12, total: 340 });

        expect(admin.evaluate).toHaveBeenCalledWith(
          expect.objectContaining({ params: expect.objectContaining({ pick: expect.anything() }) }),
          { pick: 'title' },
          { user: SAMPLE_USER, uid: ARTICLE }
        );
        expect(allowed.validateSubject).toHaveBeenCalledWith({
          filters: { title: { $notNull: true } },
        });

        // A field the admin may not read is refused whichever way it is chosen
        await expect(
          admin.conditions.preview(
            { ...request, condition, inputs: { pick: 'owner' } },
            scopeOf({ subject: ['title'] })
          )
        ).rejects.toMatchObject({ name: 'PolicyError', message: expect.stringContaining('owner') });
      });

      it('looks the sample user up with their profile when the condition reads it', async () => {
        const admin = setupAdmin();
        const condition = checking(['title'], { kind: 'profile', attribute: 'nickname' });

        await admin.conditions.preview({ ...request, condition }, scope);

        expect(admin.conditionUserFor).toHaveBeenCalledWith('user-1', scope.userQuery, {
          profile: true,
          // Within what the admin may read of profiles
          profileQuery: { id: { $gt: 0 } },
        });
      });

      it('refuses with a 403 when the admin may not read profiles, or the user`s profile, and asks for neither otherwise', async () => {
        const condition = checking(['title'], { kind: 'profile', attribute: 'nickname' });
        const noAccess = scopeOf();

        noAccess.profileQuery.mockImplementation(() => {
          throw new errors.PolicyError('no access to profiles');
        });

        const first = setupAdmin();

        await expect(
          first.conditions.preview({ ...request, condition }, noAccess)
        ).rejects.toMatchObject({ name: 'PolicyError' });
        expect(first.conditionUserFor).not.toHaveBeenCalled();

        // Not found within what they may read: no profile comes back
        const second = setupAdmin();

        second.conditionUserFor.mockResolvedValueOnce({ ...SAMPLE_USER, profile: null } as never);
        await expect(
          second.conditions.preview({ ...request, condition }, scope)
        ).rejects.toMatchObject({
          name: 'PolicyError',
          message: expect.stringContaining('needs Content Manager read access'),
        });
        expect(second.count).not.toHaveBeenCalled();

        // No profile at all says so, and is still a refusal
        const none = setupAdmin();

        none.profiles.mockResolvedValueOnce(0);
        none.conditionUserFor.mockResolvedValueOnce({ ...SAMPLE_USER, profile: null } as never);
        await expect(
          none.conditions.preview({ ...request, condition }, scope)
        ).rejects.toMatchObject({
          name: 'PolicyError',
          message: expect.stringContaining('has no profile'),
        });
        expect(none.count).not.toHaveBeenCalled();

        // A condition that does not read the profile needs no access to it
        const third = scopeOf();

        await third.profileQuery.mockClear();
        await setupAdmin().conditions.preview(request, third);
        expect(third.profileQuery).not.toHaveBeenCalled();
      });

      describe('a field input', () => {
        const picking = (defaults: { default?: string } = {}) =>
          builderCondition({
            inputs: [{ name: 'pick', kind: 'field', accepts: 'text', required: true, ...defaults }],
            which: {
              kind: 'group',
              match: 'all',
              items: [
                {
                  kind: 'check',
                  target: { input: 'pick' },
                  operator: '$eq',
                  value: { kind: 'fixed', value: 'x' },
                },
              ],
            },
          });

        it('is refused with a 400 naming the input when it resolves to no field name (null and missing count as none, as in core)', async () => {
          for (const inputs of [{}, { pick: null }, { pick: '' }, { pick: 3 }]) {
            // eslint-disable-next-line no-await-in-loop
            await expect(
              setupAdmin().conditions.preview({ ...request, condition: picking(), inputs }, scope)
            ).rejects.toMatchObject({
              name: 'ValidationError',
              message: expect.stringContaining('pick'),
            });
          }
        });
      });

      it('refuses a subject the condition does not apply to', async () => {
        const { conditions, count, conditionUserFor } = setupAdmin();

        await expect(
          conditions.preview({ ...request, subject: CATEGORY }, scope)
        ).rejects.toMatchObject({
          name: 'ValidationError',
          message: expect.stringMatching(/apply/),
        });
        await expect(
          conditions.preview({ ...request, subject: 'api::unknown.unknown' }, scope)
        ).rejects.toMatchObject({ name: 'ValidationError' });
        expect(count).not.toHaveBeenCalled();
        expect(conditionUserFor).not.toHaveBeenCalled();
      });

      describe('limits what the admin can read (a preview is no way to probe a hidden field)', () => {
        /** A condition on a field, and a value that must never come back in an error */
        const filtering = (field: string, value: unknown) => ({
          ...request,
          condition: checking([field], { kind: 'fixed', value: value as string }),
        });

        const nothingRead = ({
          count,
          conditionUserFor,
          evaluate,
        }: ReturnType<typeof setupAdmin>) => {
          expect(count).not.toHaveBeenCalled();
          expect(conditionUserFor).not.toHaveBeenCalled();
          expect(evaluate).not.toHaveBeenCalled();
        };

        it('answers 403, naming the field and no value, for a field the admin may not read on the subject, before counting', async () => {
          const admin = setupAdmin();
          const limited = scopeOf({ subject: ['owner'] });

          const refusal = await admin.conditions
            .preview(filtering('title', 'hunter2'), limited)
            .catch((error: unknown) => error);

          expect(refusal).toMatchObject({
            name: 'PolicyError',
            message: expect.stringContaining('title'),
          });
          expect((refusal as Error).message).not.toContain('hunter2');
          expect(JSON.stringify((refusal as { details?: unknown }).details ?? null)).not.toContain(
            'hunter2'
          );
          nothingRead(admin);
          // The Content Manager's own check ran on the field, for the subject, and not for the user
          expect(limited.validateSubject).toHaveBeenCalledWith({
            filters: { title: { $notNull: true } },
          });
          expect(limited.validateUser).not.toHaveBeenCalled();
        });

        it('names the field the admin may not read among those it may, wherever it is in the groups', async () => {
          const admin = setupAdmin();
          const limited = scopeOf({ subject: ['title'] });
          const check = (...path: string[]) => ({
            kind: 'check' as const,
            target: { path },
            operator: '$eq',
            value: { kind: 'fixed' as const, value: 'x' },
          });

          await expect(
            admin.conditions.preview(
              {
                ...request,
                condition: builderCondition({
                  which: {
                    kind: 'group',
                    match: 'all',
                    items: [
                      check('title'),
                      {
                        kind: 'group',
                        match: 'any',
                        items: [check('title'), check('owner', 'documentId')],
                      },
                    ],
                  },
                }),
              },
              limited
            )
          ).rejects.toMatchObject({
            name: 'PolicyError',
            message: expect.stringContaining('owner'),
          });
          nothingRead(admin);
        });

        it('answers 403 for an attribute of the user the admin may not read, as a value, before looking the user up', async () => {
          const admin = setupAdmin();
          const limited = scopeOf({ subject: ['title'], user: [] });

          const refusal = await admin.conditions
            .preview(
              { ...request, condition: checking(['title'], { kind: 'user', attribute: 'email' }) },
              limited
            )
            .catch((error: unknown) => error);

          expect(refusal).toMatchObject({
            name: 'PolicyError',
            message: expect.stringContaining('email'),
          });
          nothingRead(admin);
          expect(limited.validateUser).toHaveBeenCalledWith({ fields: ['email'] });
        });

        it('answers 403 for a Who check on a user attribute, on the roles and on whether email is verified', async () => {
          const checks = [
            {
              kind: 'attribute' as const,
              source: 'user' as const,
              attribute: 'email',
              operator: '$eq',
              value: { kind: 'fixed' as const, value: 'a@b.c' },
            },
            { kind: 'roles' as const, match: 'any' as const, roles: ['Editor'] },
            { kind: 'email-verified' as const, value: true },
          ];

          for (const [check, attribute] of [
            [checks[0], 'email'],
            [checks[1], 'roles'],
            [checks[2], 'emailVerified'],
          ] as const) {
            const admin = setupAdmin({ rows: [{ name: 'Editor' }] });
            const limited = scopeOf({ subject: ['owner'], user: [] });

            // eslint-disable-next-line no-await-in-loop
            await expect(
              admin.conditions.preview(
                {
                  ...request,
                  condition: builderCondition({ who: { match: 'all', checks: [check] } }),
                },
                limited
              )
            ).rejects.toMatchObject({
              name: 'PolicyError',
              message: expect.stringContaining(attribute),
            });
            nothingRead(admin);
          }
        });

        it('answers 403 for an attribute of the profile the admin may not read, in a Who check or as a value', async () => {
          const whoCheck = builderCondition({
            who: {
              match: 'all',
              checks: [
                {
                  kind: 'attribute',
                  source: 'profile',
                  attribute: 'nickname',
                  operator: '$eq',
                  value: { kind: 'fixed', value: 'x' },
                },
              ],
            },
          });
          const asValue = checking(['title'], { kind: 'profile', attribute: 'nickname' });

          for (const condition of [whoCheck, asValue]) {
            const admin = setupAdmin();
            const limited = scopeOf({ subject: ['title', 'owner'], profile: [] });

            // eslint-disable-next-line no-await-in-loop
            await expect(
              admin.conditions.preview({ ...request, condition }, limited)
            ).rejects.toMatchObject({
              name: 'PolicyError',
              message: expect.stringContaining('nickname'),
            });
            expect(limited.validateProfile).toHaveBeenCalledWith({ fields: ['nickname'] });
            nothingRead(admin);
          }
        });

        it('lets a preview through when the admin may read every field it filters on and every attribute it reads', async () => {
          const admin = setupAdmin();
          const allowed = scopeOf({
            subject: ['title', 'owner'],
            user: ['email'],
            profile: ['nickname'],
          });
          const condition = builderCondition({
            who: {
              match: 'all',
              checks: [
                {
                  kind: 'attribute',
                  source: 'profile',
                  attribute: 'nickname',
                  operator: '$eq',
                  value: { kind: 'fixed', value: 'x' },
                },
              ],
            },
            which: {
              kind: 'group',
              match: 'all',
              items: [
                {
                  kind: 'check',
                  target: { path: ['owner', 'documentId'] },
                  operator: '$eq',
                  value: { kind: 'user', attribute: 'documentId' },
                },
                {
                  kind: 'check',
                  target: { path: ['title'] },
                  operator: '$eq',
                  value: { kind: 'user', attribute: 'email' },
                },
              ],
            },
          });

          await expect(
            admin.conditions.preview({ ...request, condition }, allowed)
          ).resolves.toEqual({ matching: 12, total: 340 });

          // The fields it counts with, one at a time, and the attributes it reads
          expect(allowed.validateSubject).toHaveBeenCalledWith({
            filters: { owner: { documentId: { $notNull: true } } },
          });
          expect(allowed.validateSubject).toHaveBeenCalledWith({
            filters: { title: { $notNull: true } },
          });
          expect(allowed.validateUser).toHaveBeenCalledTimes(1);
          expect(allowed.validateUser).toHaveBeenCalledWith({ fields: ['email'] });
          expect(allowed.validateProfile).toHaveBeenCalledWith({ fields: ['nickname'] });
          expect(admin.count).toHaveBeenCalledTimes(2);
        });

        it('does not ask about the user`s documentId, which the admin chose the user by', async () => {
          const admin = setupAdmin();
          const allowed = scopeOf();

          await admin.conditions.preview(request, allowed);

          expect(allowed.validateSubject).toHaveBeenCalledWith({
            filters: { owner: { documentId: { $notNull: true } } },
          });
          expect(allowed.validateUser).not.toHaveBeenCalled();
          expect(allowed.validateProfile).not.toHaveBeenCalled();
        });

        it('passes on a failure that is not a refusal to read, rather than calling it a 403', async () => {
          const admin = setupAdmin();
          const broken = scopeOf();
          const failure = new TypeError('boom');

          broken.validateSubject.mockRejectedValueOnce(failure as never);

          await expect(admin.conditions.preview(request, broken)).rejects.toBe(failure);
          nothingRead(admin);
        });

        it('checks the condition first: an invalid one is a 400, whatever the admin may read', async () => {
          const admin = setupAdmin();
          const none = scopeOf({ subject: [], user: [] });

          await expect(
            admin.conditions.preview(filtering('internalNotes', 'x'), none)
          ).rejects.toMatchObject({ name: 'ValidationError' });
          expect(none.validateSubject).not.toHaveBeenCalled();
          nothingRead(admin);
        });
      });

      it('matches nothing when the condition denies the sample user, and still counts the total', async () => {
        const { conditions, count } = setupAdmin({ filter: false });

        await expect(conditions.preview(request, scope)).resolves.toEqual({
          matching: 0,
          total: 340,
        });
        expect(count).toHaveBeenCalledTimes(1);
        expect(count).toHaveBeenCalledWith({ filters: scope.subjectQuery });
      });

      it('counts nothing for a user the admin cannot see', async () => {
        const { conditions, count, conditionUserFor } = setupAdmin();

        conditionUserFor.mockRejectedValueOnce(new errors.NotFoundError('User not found'));

        await expect(conditions.preview(request, scope)).rejects.toMatchObject({
          name: 'NotFoundError',
        });
        expect(count).not.toHaveBeenCalled();
      });
    });
  });
});
