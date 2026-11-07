import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import * as fsPromises from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Core, Modules } from '@strapi/types';

import { USER_UID } from '../../constants';
import { layoutContentTypeUids } from '../../utils/layout-content-types';
import conditionService, { ConditionsUpdatingError } from '../condition';

/**
 * The file functions the builder writes with are spies that do what the real ones do, so a test
 * sees the order of the calls and can make one of them fail, and the folder is a real one.
 */
vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();

  return {
    ...actual,
    access: vi.fn(actual.access),
    mkdir: vi.fn(actual.mkdir),
    rename: vi.fn(actual.rename),
    rm: vi.fn(actual.rm),
    writeFile: vi.fn(actual.writeFile),
  };
});
// The register-time set stays the real one: it reads `strapi.contentTypes`, not the action registries
vi.mock('../../utils/layout-content-types', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../utils/layout-content-types')>()),
  layoutContentTypeUids: vi.fn(),
}));

type Definition = Modules.ContentAPI.ContentApiConditionDefinition;

const ARTICLE = 'api::article.article';
const OWNER = { documentId: { $eq: '$user.documentId' } };

/** What the builder writes: a version 2 file, here "the owner is the signed-in user" */
const INPUT = {
  version: 2,
  slug: 'mine',
  displayName: 'Mine',
  appliesTo: { kind: 'types', types: [ARTICLE] },
  inputs: [] as unknown[],
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
};

/** A version 1 file, as the builder wrote it before version 2 */
const V1_FILE = {
  name: 'mine',
  displayName: 'Mine',
  subjects: [ARTICLE],
  query: { $and: [{ owner: OWNER }] },
};

const SCHEMAS: Record<string, unknown> = {
  [ARTICLE]: {
    uid: ARTICLE,
    attributes: {
      title: { type: 'string' },
      internalNotes: { type: 'text', private: true },
      owner: { type: 'relation', relation: 'oneToOne', target: USER_UID },
    },
  },
  [USER_UID]: {
    uid: USER_UID,
    attributes: { email: { type: 'email' }, name: { type: 'string' } },
  },
};

/** What a file the builder wrote holds, and what the loader reads back */
const FILE_CONTENT = JSON.stringify(INPUT, null, 2);

/**
 * `createReloader` from `@strapi/core` (`packages/core/core/src/services/reloader.ts`), with the
 * skip that the `isWatching` setter queues when it goes from `false` to `true`, which is what a
 * failed write must not cause. `send` stands for `process.send('reload')`.
 */
const createReloader = () => {
  const send = vi.fn();
  const state = { shouldReload: 0, isWatching: true };

  const reload = Object.assign(
    vi.fn(() => {
      if (state.shouldReload > 0) {
        state.shouldReload -= 1;

        return;
      }

      send('reload');
    }),
    {
      resumeWatching: vi.fn(() => {
        state.isWatching = true;
      }),
    }
  );

  Object.defineProperty(reload, 'isWatching', {
    set(value: boolean) {
      if (state.isWatching === false && value === true) {
        state.shouldReload += 1;
      }

      state.isWatching = value;
    },
    get: () => state.isWatching,
  });

  return { reload: reload as typeof reload & { isWatching: boolean }, send };
};

// The restart is scheduled in a `setImmediate` after the write
const flushReload = () =>
  new Promise((resolve) => {
    setImmediate(resolve);
  });

const asError = (code: string) => Object.assign(new Error(code), { code });

describe('condition files', () => {
  let src: string;
  let dir: string;
  let real: typeof fsPromises;

  beforeEach(async () => {
    src = mkdtempSync(join(tmpdir(), 'end-users-condition-files-'));
    dir = join(src, 'end-users', 'conditions');
    real = await vi.importActual<typeof fsPromises>('node:fs/promises');

    vi.mocked(fsPromises.access).mockImplementation(real.access);
    vi.mocked(fsPromises.mkdir).mockImplementation(real.mkdir);
    vi.mocked(fsPromises.rename).mockImplementation(real.rename);
    vi.mocked(fsPromises.rm).mockImplementation(real.rm);
    vi.mocked(fsPromises.writeFile).mockImplementation(real.writeFile);
    vi.mocked(fsPromises.access).mockClear();
    vi.mocked(fsPromises.mkdir).mockClear();
    vi.mocked(fsPromises.rename).mockClear();
    vi.mocked(fsPromises.rm).mockClear();
    vi.mocked(fsPromises.writeFile).mockClear();

    // What `contentTypes.isPrivateAttribute` reads for the project-wide private attributes
    vi.stubGlobal('strapi', { config: { get: (_key: string, fallback?: unknown) => fallback } });
    vi.mocked(layoutContentTypeUids).mockReturnValue([ARTICLE, USER_UID]);
  });

  afterEach(() => {
    rmSync(src, { recursive: true, force: true });
    vi.unstubAllGlobals();
    vi.mocked(layoutContentTypeUids).mockReset();
  });

  /** A condition file as the loader finds it, written before `setup` loads the folder */
  const put = (file: string, content: string) => {
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, file), content);
  };

  const builderFile = (name: string) => JSON.stringify({ ...INPUT, slug: name, displayName: name });

  /**
   * The service over a real `src`: core's registry (it registers what the loader reads and what the
   * test registers, and lists them), the permission table, the schemas and the reloader. The loader
   * runs first, so the builder's files are the ones `builderFileOf` knows.
   */
  const setup = async ({
    autoReload = true,
    registered = [] as Definition[],
    rows = [] as unknown[],
  } = {}) => {
    const definitions = new Map<string, Definition>(registered.map((entry) => [entry.name, entry]));
    const register = vi.fn(async (registering: Definition) => {
      definitions.set(registering.name, registering);
    });
    const findMany = vi.fn(async () => rows);
    const update = vi.fn(async () => ({}));
    const findOne = vi.fn(async () => ({ revision: 4 }));
    const { reload, send } = createReloader();

    const strapi = {
      dirs: { app: { src }, dist: { src } },
      config: {
        get: vi.fn((key: string, fallback?: unknown) =>
          key === 'autoReload' ? autoReload : fallback
        ),
      },
      reload,
      db: {
        query: vi.fn(() => ({ findMany, update, findOne })),
        transaction: vi.fn(async (callback: () => Promise<unknown>) => callback()),
      },
      log: { warn: vi.fn() },
      contentTypes: SCHEMAS,
      contentType: vi.fn((uid: string) => SCHEMAS[uid]),
      // The provider service: no provider maps anything onto the profile
      plugin: vi.fn(() => ({ service: vi.fn(() => ({ mappedAttributes: async () => [] })) })),
      contentAPI: {
        permissions: {
          providers: { condition: { register, values: () => [...definitions.values()] } },
          conditions: { validate: vi.fn() },
        },
      },
    } as unknown as Core.Strapi;

    const conditions = conditionService({ strapi });

    await conditions.loadProjectConditions();

    return { conditions, reload, send, findMany, update, findOne };
  };

  /** Every call that changes or looks at the disk to write, move or remove a file */
  const touchedDisk = () =>
    [
      fsPromises.access,
      fsPromises.mkdir,
      fsPromises.rename,
      fsPromises.rm,
      fsPromises.writeFile,
    ].some((spy) => vi.mocked(spy).mock.calls.length > 0);

  const order = (spy: unknown) => vi.mocked(spy as () => unknown).mock.invocationCallOrder[0];

  describe('writeFile', () => {
    it('creates the folder, writes a temporary file, renames it, then restarts', async () => {
      const { conditions, reload, send } = await setup();
      let watchingWhileWriting: boolean | undefined;

      vi.mocked(fsPromises.writeFile).mockImplementationOnce((...args) => {
        watchingWhileWriting = reload.isWatching;

        return real.writeFile(...args);
      });

      expect(existsSync(dir)).toBe(false);

      const written = await conditions.writeFile(INPUT, { slug: 'mine', create: true });

      expect(fsPromises.mkdir).toHaveBeenCalledWith(dir, { recursive: true });
      expect(fsPromises.writeFile).toHaveBeenCalledWith(
        join(dir, 'mine.json.tmp'),
        FILE_CONTENT,
        'utf8'
      );
      expect(fsPromises.rename).toHaveBeenCalledWith(
        join(dir, 'mine.json.tmp'),
        join(dir, 'mine.json')
      );
      expect(order(fsPromises.mkdir)).toBeLessThan(order(fsPromises.writeFile));
      expect(order(fsPromises.writeFile)).toBeLessThan(order(fsPromises.rename));
      // The file watcher is off before the first byte is written
      expect(watchingWhileWriting).toBe(false);

      expect(readFileSync(join(dir, 'mine.json'), 'utf8')).toBe(FILE_CONTENT);
      expect(readdirSync(dir)).toEqual(['mine.json']);

      // The server restarts after the write, not before it, and not while the caller still waits
      expect(reload).not.toHaveBeenCalled();
      await flushReload();
      expect(send).toHaveBeenCalledTimes(1);
      expect(send).toHaveBeenCalledWith('reload');

      // What the list will show once the server is back, and that a write now waits for it
      expect(written).toEqual({
        data: {
          name: 'api::mine',
          displayName: 'Mine',
          subjects: [ARTICLE],
          source: 'builder',
          params: [],
          stamp: false,
          lockedFields: false,
          usedBy: 0,
          usedByRoles: [],
          editable: true,
          // The same as the list will serve for it: the file, as version 2
          builder: INPUT,
          rolesNamed: [],
        },
      });
      expect(conditions.status()).toEqual({ isUpdating: true });
      expect(reload.isWatching).toBe(false);
      expect(reload.resumeWatching).not.toHaveBeenCalled();
    });

    it('writes the checked condition as a version 2 file, and only its parts', async () => {
      const { conditions } = await setup();

      await conditions.writeFile(INPUT, { slug: 'mine', create: true });

      expect(readFileSync(join(dir, 'mine.json'), 'utf8')).toBe(FILE_CONTENT);
      expect(Object.keys(JSON.parse(readFileSync(join(dir, 'mine.json'), 'utf8')))).toEqual([
        'version',
        'slug',
        'displayName',
        'appliesTo',
        'inputs',
        'who',
        'which',
        'onSave',
      ]);
    });

    it('refuses a version 1 body: a write is always version 2', async () => {
      const { conditions } = await setup();

      await expect(
        conditions.writeFile({ ...V1_FILE, slug: 'mine' }, { slug: 'mine', create: true })
      ).rejects.toMatchObject({ name: 'ValidationError' });
      expect(touchedDisk()).toBe(false);
    });

    it('refuses a write naming a type the action registries do not offer, though the project holds it', async () => {
      const { conditions } = await setup();

      // The article is in `strapi.contentTypes`, but no role can be granted on it
      vi.mocked(layoutContentTypeUids).mockReturnValue([USER_UID]);

      await expect(
        conditions.writeFile(INPUT, { slug: 'mine', create: true })
      ).rejects.toMatchObject({
        name: 'ValidationError',
        message: `${ARTICLE} is not a content type a role can be granted on`,
      });
      expect(touchedDisk()).toBe(false);
    });

    it('updates the file the loader found, never a file named by the slug, and says how many roles use it', async () => {
      // A version 1 file, named by its content, not by its file: an update writes it as version 2
      put('legacy.json', JSON.stringify(V1_FILE));

      const { conditions, send } = await setup({
        rows: [
          { conditions: [{ name: 'api::mine' }], role: { documentId: 'role-a', name: 'Role A' } },
          { conditions: ['api::mine'], role: { documentId: 'role-b', name: 'Role B' } },
          { conditions: ['api::other'], role: { documentId: 'role-c', name: 'Role C' } },
        ],
      });

      const written = await conditions.writeFile(
        { ...INPUT, displayName: 'Mine, renamed' },
        { slug: 'mine', create: false }
      );

      expect(written.data).toMatchObject({
        name: 'api::mine',
        displayName: 'Mine, renamed',
        usedBy: 2,
        usedByRoles: [
          { documentId: 'role-a', name: 'Role A' },
          { documentId: 'role-b', name: 'Role B' },
        ],
      });
      expect(written.warnings).toBeUndefined();
      expect(fsPromises.rename).toHaveBeenCalledWith(
        join(dir, 'legacy.json.tmp'),
        join(dir, 'legacy.json')
      );
      expect(readdirSync(dir)).toEqual(['legacy.json']);
      expect(JSON.parse(readFileSync(join(dir, 'legacy.json'), 'utf8'))).toMatchObject({
        version: 2,
        slug: 'mine',
        displayName: 'Mine, renamed',
      });
      // An update does not look for a file to refuse: the file is there
      expect(fsPromises.access).not.toHaveBeenCalled();

      await flushReload();
      expect(send).toHaveBeenCalledWith('reload');
    });

    describe('what an update may do to a condition roles use', () => {
      const TEXT = { name: 'tag', kind: 'text', required: false, default: 'x' };
      const usedBy = (params?: Record<string, unknown>) => [
        {
          conditions: [{ name: 'api::mine', ...(params && { params }) }],
          role: { documentId: 'role-a', name: 'Role A' },
        },
      ];

      it('refuses a new input without a default while a role uses the condition', async () => {
        put('mine.json', builderFile('mine'));

        const { conditions } = await setup({ rows: usedBy() });

        await expect(
          conditions.writeFile(
            { ...INPUT, inputs: [{ name: 'tag', kind: 'text', required: false }] },
            { slug: 'mine', create: false }
          )
        ).rejects.toMatchObject({
          name: 'ValidationError',
          message: 'A new input needs a default while roles use this condition',
          details: { errors: [expect.objectContaining({ path: ['inputs', 0, 'default'] })] },
        });
        expect(touchedDisk()).toBe(false);
        expect(conditions.status()).toEqual({ isUpdating: false });
      });

      it('allows a new input that has a default while a role uses the condition', async () => {
        put('mine.json', builderFile('mine'));

        const used = await setup({ rows: usedBy() });

        await expect(
          used.conditions.writeFile({ ...INPUT, inputs: [TEXT] }, { slug: 'mine', create: false })
        ).resolves.toMatchObject({ data: { params: [{ name: 'tag', default: 'x' }] } });
      });

      it('allows a new input without a default when no role uses the condition', async () => {
        put('mine.json', builderFile('mine'));

        const { conditions } = await setup();

        await expect(
          conditions.writeFile(
            { ...INPUT, inputs: [{ name: 'tag', kind: 'text', required: false }] },
            { slug: 'mine', create: false }
          )
        ).resolves.toMatchObject({ data: { name: 'api::mine' } });
      });

      it('answers with the roles whose rows bound a value to an input that is removed, and takes the value out of them', async () => {
        put('mine.json', JSON.stringify({ ...INPUT, inputs: [TEXT] }));

        const { conditions, update } = await setup({
          rows: [
            {
              id: 1,
              ...usedBy({ tag: 'y' })[0],
              role: { id: 11, documentId: 'role-a', name: 'Role A' },
            },
            {
              id: 2,
              conditions: [{ name: 'api::mine', params: { tag: 'z', other: 1 } }, 'api::keep'],
              role: { documentId: 'role-b', name: 'A Role' },
            },
            // Binds nothing, so it has nothing to lose
            {
              id: 3,
              conditions: [{ name: 'api::mine' }],
              role: { documentId: 'role-c', name: 'Role C' },
            },
            {
              id: 4,
              conditions: [{ name: 'api::other', params: { tag: 'z' } }],
              role: { name: 'Other' },
            },
          ],
        });

        const written = await conditions.writeFile(INPUT, { slug: 'mine', create: false });

        expect(written.warnings).toEqual({
          removedInputs: [{ name: 'tag', roles: ['A Role', 'Role A'] }],
        });
        expect(readFileSync(join(dir, 'mine.json'), 'utf8')).toBe(FILE_CONTENT);
        // The role of each row that changed moves to its next revision, as a role save does
        expect(update).toHaveBeenCalledWith({ where: { id: 11 }, data: { revision: 5 } });
        // Gone from every row that used it, so a input added again under the name finds nothing
        expect(update).toHaveBeenCalledTimes(3);
        expect(update).toHaveBeenCalledWith({
          where: { id: 1 },
          data: { conditions: [{ name: 'api::mine', params: {} }] },
        });
        expect(update).toHaveBeenCalledWith({
          where: { id: 2 },
          data: { conditions: [{ name: 'api::mine', params: { other: 1 } }, 'api::keep'] },
        });
      });

      it('changes no role row when the file write fails', async () => {
        put('mine.json', JSON.stringify({ ...INPUT, inputs: [TEXT] }));

        const { conditions, update } = await setup({
          rows: [
            { id: 1, ...usedBy({ tag: 'y' })[0], role: { id: 11, documentId: 'a', name: 'A' } },
          ],
        });

        vi.mocked(fsPromises.rename).mockRejectedValueOnce(asError('EACCES') as never);

        await expect(
          conditions.writeFile(INPUT, { slug: 'mine', create: false })
        ).rejects.toThrow();
        expect(update).not.toHaveBeenCalled();
        expect(conditions.status()).toEqual({ isUpdating: false });
      });

      describe('reshaping inputs', () => {
        const FIELD = { name: 'pick', kind: 'field', accepts: 'text', required: true };

        const refused = async (
          before: unknown[],
          after: unknown[],
          expected: { message: RegExp; path: unknown[] }
        ) => {
          put('mine.json', JSON.stringify({ ...INPUT, inputs: before }));

          const { conditions, update } = await setup({ rows: usedBy() });

          await expect(
            conditions.writeFile({ ...INPUT, inputs: after }, { slug: 'mine', create: false })
          ).rejects.toMatchObject({
            name: 'ValidationError',
            message: expect.stringMatching(expected.message),
            details: { errors: [expect.objectContaining({ path: expected.path })] },
          });
          expect(touchedDisk()).toBe(false);
          expect(update).not.toHaveBeenCalled();
        };

        it('refuses a changed kind', () =>
          refused([TEXT], [{ ...TEXT, kind: 'number', default: 1 }], {
            message: /can't change from text to number/,
            path: ['inputs', 0, 'kind'],
          }));

        it('refuses a changed accepts', () =>
          refused([FIELD], [{ ...FIELD, accepts: 'date' }], {
            message: /can't change what field it accepts/,
            path: ['inputs', 0, 'accepts'],
          }));

        it('refuses a removed default', () =>
          refused([TEXT], [{ name: 'tag', kind: 'text', required: false }], {
            message: /can't lose its default/,
            path: ['inputs', 0, 'default'],
          }));

        it('refuses an input that becomes required without a default, with a message of its own', () =>
          refused(
            [{ name: 'tag', kind: 'text', required: false }],
            [{ name: 'tag', kind: 'text', required: true }],
            { message: /can't become required/, path: ['inputs', 0, 'required'] }
          ));

        it('allows an input that becomes required when it has a default', async () => {
          put('mine.json', JSON.stringify({ ...INPUT, inputs: [{ ...TEXT, required: false }] }));

          const { conditions } = await setup({ rows: usedBy() });

          await expect(
            conditions.writeFile(
              { ...INPUT, inputs: [{ ...TEXT, required: true }] },
              { slug: 'mine', create: false }
            )
          ).resolves.toMatchObject({ data: { name: 'api::mine' } });
        });

        it('refuses a field input that is added, with a message of its own', () =>
          refused([], [FIELD], {
            message: /field input pick can't be added while roles use this condition/,
            path: ['inputs', 0, 'kind'],
          }));

        it('allows a changed default, and every change when no role uses the condition', async () => {
          put('mine.json', JSON.stringify({ ...INPUT, inputs: [TEXT, FIELD] }));

          const used = await setup({ rows: usedBy() });

          await expect(
            used.conditions.writeFile(
              { ...INPUT, inputs: [{ ...TEXT, default: 'other' }, FIELD] },
              { slug: 'mine', create: false }
            )
          ).resolves.toMatchObject({ data: { name: 'api::mine' } });

          const unused = await setup();

          await expect(
            unused.conditions.writeFile(
              { ...INPUT, inputs: [{ name: 'tag', kind: 'number', required: false }] },
              { slug: 'mine', create: false }
            )
          ).resolves.toMatchObject({ data: { name: 'api::mine' } });
        });

        it('refuses a field input that is not required, on any write', async () => {
          const { conditions } = await setup();

          await expect(
            conditions.writeFile(
              { ...INPUT, inputs: [{ ...FIELD, required: false }] },
              { slug: 'mine', create: true }
            )
          ).rejects.toMatchObject({
            message: 'pick is a field input: it is always required',
            details: { errors: [expect.objectContaining({ path: ['inputs', 0, 'required'] })] },
          });
          expect(touchedDisk()).toBe(false);
        });
      });

      it('warns, in the answer of a write, of a field the condition reads that a signed-in user can write', async () => {
        const { conditions } = await setup();
        const readsOf = (attribute: string) => ({
          ...INPUT,
          who: {
            match: 'all',
            checks: [
              {
                kind: 'attribute',
                source: 'user',
                attribute,
                operator: '$eq',
                value: { kind: 'fixed', value: 'x' },
              },
            ],
          },
        });

        // Better Auth's /update-user writes the name for every signed-in user
        await expect(
          conditions.writeFile(readsOf('name'), { slug: 'mine', create: true })
        ).resolves.toMatchObject({
          data: { selfWritable: [{ field: 'user.name', roles: ['every signed-in user'] }] },
          warnings: { selfWritable: [{ field: 'user.name', roles: ['every signed-in user'] }] },
        });
      });

      it('does not warn of a field no signed-in user writes', async () => {
        const { conditions } = await setup();

        // The email changes only through the verified flow
        const written = await conditions.writeFile(
          {
            ...INPUT,
            who: {
              match: 'all',
              checks: [
                {
                  kind: 'attribute',
                  source: 'user',
                  attribute: 'email',
                  operator: '$eq',
                  value: { kind: 'fixed', value: 'a@x.io' },
                },
              ],
            },
          },
          { slug: 'mine', create: true }
        );

        expect(written).not.toHaveProperty('warnings');
        expect(written.data).not.toHaveProperty('selfWritable');
      });
    });

    it.each([
      ['no condition', undefined],
      ['a version 1 body', { ...INPUT, version: 1 }],
      [
        'a private field',
        {
          ...INPUT,
          which: {
            ...INPUT.which,
            items: [
              {
                kind: 'check',
                target: { path: ['internalNotes'] },
                operator: '$eq',
                value: { kind: 'fixed', value: 'x' },
              },
            ],
          },
        },
      ],
      ['a slug a path could use', { ...INPUT, slug: '../x' }],
      ['a slug with a folder in it', { ...INPUT, slug: 'a/b' }],
      ['a namespaced slug', { ...INPUT, slug: 'api::x' }],
    ])('validates before touching the disk: %s', async (_, input) => {
      const { conditions, reload, send } = await setup();
      const slug = typeof input === 'object' ? input.slug : 'mine';

      await expect(conditions.writeFile(input, { slug, create: true })).rejects.toMatchObject({
        name: 'ValidationError',
      });

      expect(touchedDisk()).toBe(false);
      expect(existsSync(dir)).toBe(false);
      await flushReload();
      expect(send).not.toHaveBeenCalled();
      expect(reload).not.toHaveBeenCalled();
      expect(reload.isWatching).toBe(true);
      expect(conditions.status()).toEqual({ isUpdating: false });
    });

    it('refuses an update whose body slug differs from the URL, before any fs call', async () => {
      put('mine.json', builderFile('mine'));
      put('other.json', builderFile('other'));
      vi.mocked(fsPromises.access).mockClear();

      const { conditions, send } = await setup();

      await expect(
        conditions.writeFile(INPUT, { slug: 'other', create: false })
      ).rejects.toMatchObject({
        name: 'ValidationError',
        message: expect.stringMatching(/slug/),
      });

      expect(touchedDisk()).toBe(false);
      // Neither file changed
      expect(readFileSync(join(dir, 'other.json'), 'utf8')).toBe(builderFile('other'));
      expect(readFileSync(join(dir, 'mine.json'), 'utf8')).toBe(builderFile('mine'));
      await flushReload();
      expect(send).not.toHaveBeenCalled();
    });

    it('refuses without autoReload when called directly, with nothing touched', async () => {
      put('mine.json', builderFile('mine'));
      vi.mocked(fsPromises.access).mockClear();

      const { conditions, reload, send } = await setup({ autoReload: false });

      await expect(conditions.writeFile(INPUT, { slug: 'mine', create: false })).rejects.toThrow(
        expect.objectContaining({ name: 'PolicyError', details: { code: 'DEVELOPMENT_ONLY' } })
      );

      expect(touchedDisk()).toBe(false);
      expect(reload.isWatching).toBe(true);
      expect(conditions.status()).toEqual({ isUpdating: false });
      await flushReload();
      expect(send).not.toHaveBeenCalled();
    });

    it('refuses to create a slug a condition already has, and a file that exists', async () => {
      const { conditions, reload, send } = await setup({
        registered: [{ name: 'api::taken', displayName: 'Taken', query: () => true }],
      });

      // A file the server has not loaded: it came after the start
      put('fresh.json', 'not loaded yet');

      await expect(
        conditions.writeFile({ ...INPUT, slug: 'taken' }, { slug: 'taken', create: true })
      ).rejects.toMatchObject({ name: 'ValidationError', message: expect.stringMatching(/taken/) });
      expect(touchedDisk()).toBe(false);

      await expect(
        conditions.writeFile({ ...INPUT, slug: 'fresh' }, { slug: 'fresh', create: true })
      ).rejects.toMatchObject({ name: 'ValidationError', message: expect.stringMatching(/fresh/) });

      // It looked, found the file, and wrote nothing
      expect(fsPromises.access).toHaveBeenCalledWith(join(dir, 'fresh.json'));
      expect(fsPromises.mkdir).not.toHaveBeenCalled();
      expect(fsPromises.writeFile).not.toHaveBeenCalled();
      expect(fsPromises.rename).not.toHaveBeenCalled();
      expect(readFileSync(join(dir, 'fresh.json'), 'utf8')).toBe('not loaded yet');
      expect(reload.isWatching).toBe(true);
      await flushReload();
      expect(send).not.toHaveBeenCalled();
    });

    it.each([
      ['a code condition', 'editors', /read-only/],
      ['a condition a plugin registered', 'plugin-made', /read-only/],
      ['a name that is no condition', 'nobody', /no builder condition/i],
      ['the slug of a built-in, which is not namespaced', 'is-owner', /no builder condition/i],
      // The condition is checked first, and a slug like that is not one
      ['a path', '../x', /slug/],
    ])(
      'refuses to change %s: only a builder condition is the builder`s',
      async (_, slug, message) => {
        put(
          'editors.js',
          `module.exports = { name: 'editors', displayName: 'Editors', query: () => true };`
        );

        const { conditions, send } = await setup({
          registered: [
            {
              name: 'plugin::end-users.is-owner',
              displayName: 'Is owner',
              query: () => true,
              source: 'builtin',
            },
            { name: 'api::plugin-made', displayName: 'Made', query: () => true, source: 'plugin' },
          ],
        });
        vi.mocked(fsPromises.access).mockClear();

        await expect(
          conditions.writeFile({ ...INPUT, slug }, { slug, create: false })
        ).rejects.toMatchObject({
          name: 'ValidationError',
          message: expect.stringMatching(message),
        });

        expect(touchedDisk()).toBe(false);
        expect(readdirSync(dir)).toEqual(['editors.js']);
        await flushReload();
        expect(send).not.toHaveBeenCalled();
      }
    );

    it('answers 409 to a write while one waits for its restart, and touches nothing', async () => {
      const { conditions, send } = await setup();

      await conditions.writeFile(INPUT, { slug: 'mine', create: true });
      vi.mocked(fsPromises.mkdir).mockClear();
      vi.mocked(fsPromises.writeFile).mockClear();
      vi.mocked(fsPromises.rename).mockClear();
      vi.mocked(fsPromises.access).mockClear();

      const refused = [
        await conditions
          .writeFile({ ...INPUT, slug: 'other' }, { slug: 'other', create: true })
          .catch((error: unknown) => error),
        await conditions
          .writeFile(INPUT, { slug: 'mine', create: false })
          .catch((error: unknown) => error),
        await conditions.removeFile('mine').catch((error: unknown) => error),
      ];

      for (const error of refused) {
        expect(error).toBeInstanceOf(ConditionsUpdatingError);
        expect(error).toMatchObject({ details: { code: 'CONDITIONS_UPDATING' } });
      }

      expect(touchedDisk()).toBe(false);
      expect(readdirSync(dir)).toEqual(['mine.json']);
      await flushReload();
      expect(send).toHaveBeenCalledTimes(1);
    });

    it('lets one of two writes that start together through, and answers 409 to the other', async () => {
      const { conditions, send } = await setup();

      const answers = await Promise.allSettled([
        conditions.writeFile(INPUT, { slug: 'mine', create: true }),
        conditions.writeFile({ ...INPUT, slug: 'other' }, { slug: 'other', create: true }),
      ]);

      expect(answers.map(({ status }) => status).sort()).toEqual(['fulfilled', 'rejected']);

      const rejected = answers.find(({ status }) => status === 'rejected') as PromiseRejectedResult;

      expect(rejected.reason).toBeInstanceOf(ConditionsUpdatingError);
      expect(readdirSync(dir)).toHaveLength(1);
      await flushReload();
      expect(send).toHaveBeenCalledTimes(1);
    });

    it.each([
      ['creating the folder', fsPromises.mkdir],
      ['writing the temporary file', fsPromises.writeFile],
      ['renaming it', fsPromises.rename],
    ])(
      'hands the file watcher back when %s fails, and the next write restarts the server',
      async (_, step) => {
        const { conditions, reload, send } = await setup();

        vi.mocked(step as typeof fsPromises.mkdir).mockRejectedValueOnce(
          asError('EACCES') as never
        );

        await expect(
          conditions.writeFile(INPUT, { slug: 'mine', create: true })
        ).rejects.toMatchObject({ code: 'EACCES' });

        expect(reload.isWatching).toBe(true);
        expect(reload.resumeWatching).toHaveBeenCalledTimes(1);
        expect(conditions.status()).toEqual({ isUpdating: false });
        // No temporary file is left behind, and the final file was never made
        expect(existsSync(join(dir, 'mine.json'))).toBe(false);
        expect(existsSync(dir) ? readdirSync(dir) : []).toEqual([]);
        await flushReload();
        expect(send).not.toHaveBeenCalled();

        // The `isWatching` setter would have queued a skipped reload had it been set back to true
        await conditions.writeFile(INPUT, { slug: 'mine', create: true });
        await flushReload();

        expect(send).toHaveBeenCalledTimes(1);
        expect(send).toHaveBeenCalledWith('reload');
      }
    );

    it('leaves the file watcher as it was when a write is refused before it starts', async () => {
      const { conditions, reload } = await setup();

      // Something else turned it off (the GraphQL plugin does)
      reload.isWatching = false;

      await expect(
        conditions.writeFile({ ...INPUT, version: 1 }, { slug: 'mine', create: true })
      ).rejects.toMatchObject({ name: 'ValidationError' });

      expect(reload.isWatching).toBe(false);
      expect(reload.resumeWatching).not.toHaveBeenCalled();
    });
  });

  describe('removeFile', () => {
    it('removes the builder`s file, then restarts', async () => {
      put('mine.json', builderFile('mine'));
      put('keep.json', builderFile('keep'));

      const { conditions, reload, send } = await setup();
      let watchingWhileRemoving: boolean | undefined;

      vi.mocked(fsPromises.rm).mockImplementationOnce((...args) => {
        watchingWhileRemoving = reload.isWatching;

        return real.rm(...args);
      });

      await expect(conditions.removeFile('mine')).resolves.toBeUndefined();

      expect(fsPromises.rm).toHaveBeenCalledWith(join(dir, 'mine.json'), { force: true });
      expect(watchingWhileRemoving).toBe(false);
      expect(readdirSync(dir)).toEqual(['keep.json']);
      expect(conditions.status()).toEqual({ isUpdating: true });
      expect(reload).not.toHaveBeenCalled();
      await flushReload();
      expect(send).toHaveBeenCalledWith('reload');
    });

    it('refuses without autoReload when called directly, with nothing touched', async () => {
      put('mine.json', builderFile('mine'));

      const { conditions, reload, send } = await setup({ autoReload: false });

      await expect(conditions.removeFile('mine')).rejects.toThrow(
        expect.objectContaining({ name: 'PolicyError', details: { code: 'DEVELOPMENT_ONLY' } })
      );

      expect(touchedDisk()).toBe(false);
      expect(readdirSync(dir)).toEqual(['mine.json']);
      expect(reload.isWatching).toBe(true);
      await flushReload();
      expect(send).not.toHaveBeenCalled();
    });

    it('refuses to delete a condition roles use, naming how many', async () => {
      put('mine.json', builderFile('mine'));

      const { conditions, reload, send } = await setup({
        rows: [
          { conditions: [{ name: 'api::mine' }], role: { documentId: 'role-a' } },
          { conditions: ['api::mine'], role: { documentId: 'role-a' } },
          { conditions: [{ name: 'api::mine', params: {} }], role: { documentId: 'role-b' } },
        ],
      });

      await expect(conditions.removeFile('mine')).rejects.toMatchObject({
        name: 'ValidationError',
        message: expect.stringMatching(/2 roles/),
      });

      expect(touchedDisk()).toBe(false);
      expect(readdirSync(dir)).toEqual(['mine.json']);
      expect(reload.isWatching).toBe(true);
      await flushReload();
      expect(send).not.toHaveBeenCalled();
    });

    it.each([
      ['a code condition', 'editors', /read-only/],
      ['a name that is no condition', 'nobody', /no builder condition/i],
      ['a path', '../x', /no builder condition/i],
    ])('refuses to delete %s', async (_, slug, message) => {
      put(
        'editors.js',
        `module.exports = { name: 'editors', displayName: 'Editors', query: () => true };`
      );

      const { conditions } = await setup();

      await expect(conditions.removeFile(slug)).rejects.toMatchObject({
        name: 'ValidationError',
        message: expect.stringMatching(message),
      });
      expect(touchedDisk()).toBe(false);
      expect(readdirSync(dir)).toEqual(['editors.js']);
    });

    it('answers 409 while a write waits for its restart', async () => {
      put('mine.json', builderFile('mine'));
      put('other.json', builderFile('other'));

      const { conditions, send } = await setup();

      await conditions.removeFile('mine');
      await expect(conditions.removeFile('other')).rejects.toBeInstanceOf(ConditionsUpdatingError);

      expect(readdirSync(dir)).toEqual(['other.json']);
      await flushReload();
      expect(send).toHaveBeenCalledTimes(1);
    });

    it('hands the file watcher back when the removal fails, and the next one restarts the server', async () => {
      put('mine.json', builderFile('mine'));

      const { conditions, reload, send } = await setup();

      vi.mocked(fsPromises.rm).mockRejectedValueOnce(asError('EPERM') as never);

      await expect(conditions.removeFile('mine')).rejects.toMatchObject({ code: 'EPERM' });

      expect(reload.isWatching).toBe(true);
      expect(reload.resumeWatching).toHaveBeenCalledTimes(1);
      expect(conditions.status()).toEqual({ isUpdating: false });
      await flushReload();
      expect(send).not.toHaveBeenCalled();

      await conditions.removeFile('mine');
      await flushReload();

      expect(send).toHaveBeenCalledTimes(1);
    });
  });

  describe('without autoReload (strapi start)', () => {
    // The API test app runs with autoReload on, as `strapi develop` does; a server that was started
    // with `strapi start` has it off, and all three builder writes are refused before any file is made
    it.each([
      [
        'a create',
        (conditions: ReturnType<typeof conditionService>) =>
          conditions.writeFile(INPUT, { slug: 'mine', create: true }),
      ],
      [
        'an update',
        (conditions: ReturnType<typeof conditionService>) =>
          conditions.writeFile(INPUT, { slug: 'mine', create: false }),
      ],
      [
        'a delete',
        (conditions: ReturnType<typeof conditionService>) => conditions.removeFile('mine'),
      ],
    ])('refuses %s with DEVELOPMENT_ONLY and writes nothing', async (_, write) => {
      put('mine.json', builderFile('mine'));
      vi.mocked(fsPromises.access).mockClear();

      const { conditions, reload, send } = await setup({ autoReload: false });

      await expect(write(conditions)).rejects.toThrow(
        expect.objectContaining({ name: 'PolicyError', details: { code: 'DEVELOPMENT_ONLY' } })
      );

      expect(touchedDisk()).toBe(false);
      // The folder is as it was: no new file, no temporary file, the one that was there untouched
      expect(readdirSync(dir)).toEqual(['mine.json']);
      expect(readFileSync(join(dir, 'mine.json'), 'utf8')).toBe(builderFile('mine'));
      expect(reload.isWatching).toBe(true);
      expect(conditions.status()).toEqual({ isUpdating: false });
      await flushReload();
      expect(send).not.toHaveBeenCalled();
    });

    it('creates no folder when there is none', async () => {
      const { conditions } = await setup({ autoReload: false });

      await expect(
        conditions.writeFile(INPUT, { slug: 'mine', create: true })
      ).rejects.toMatchObject({ name: 'PolicyError' });

      expect(existsSync(dir)).toBe(false);
      expect(touchedDisk()).toBe(false);
    });
  });

  describe('status', () => {
    it('says no write waits for a restart until one does', async () => {
      const { conditions } = await setup();

      expect(conditions.status()).toEqual({ isUpdating: false });

      await conditions.writeFile(INPUT, { slug: 'mine', create: true });

      // Never reset by the process that asked for the restart: the next process starts at false
      expect(conditions.status()).toEqual({ isUpdating: true });
    });
  });
});
