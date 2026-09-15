import { SPACE_ATTRIBUTE, SPACE_UID } from '../../../../shared/constants';
import createMigrationService from '../migration';

const MAIN = { id: 1, name: 'Main', slug: 'main', status: 'active', isDefault: true };

interface Options {
  /** uid -> how many of its rows have no space yet. */
  orphans?: Record<string, number>;
  /** The models Spaces scopes, in registration order. */
  scoped?: string[];
  /** A model listed here has no space column, so it cannot be assigned. */
  withoutColumn?: string[];
  defaultSpace?: typeof MAIN | null;
  state?: unknown;
  displayName?: string;
}

const makeStrapi = ({
  orphans = { 'api::article.article': 3 },
  scoped = Object.keys(orphans),
  withoutColumn = [],
  defaultSpace = MAIN,
  state = null,
  displayName,
}: Options = {}) => {
  const pending = { ...orphans };
  const updates: Array<{ uid: string; where: unknown; data: unknown }> = [];
  const created: unknown[] = [];
  let stored = state;

  const strapi = {
    requestContext: { get: () => undefined },
    log: { info: jest.fn() },
    config: { get: (key: string) => (key === 'info.displayName' ? displayName : undefined) },
    store: () => ({
      get: async () => stored,
      async set({ value }: { value: unknown }) {
        stored = value;
      },
    }),
    service: (uid: string) =>
      ({
        'plugin::spaces.spaces': {
          getDefault: async () => defaultSpace,
          async create(input: unknown) {
            created.push(input);

            return { ...MAIN, ...(input as object) };
          },
        },
        'plugin::spaces.content-types': { listScopedUids: () => scoped },
      })[uid],
    db: {
      metadata: {
        has: (uid: string) => scoped.includes(uid),
        get: (uid: string) => ({
          uid,
          attributes: {
            [SPACE_ATTRIBUTE]: withoutColumn.includes(uid)
              ? { type: 'string' }
              : { type: 'relation', target: SPACE_UID, joinColumn: { name: 'space_id' } },
          },
        }),
      },
      query: (uid: string) => ({
        count: async () => pending[uid] ?? 0,
        async updateMany({ where, data }: { where: unknown; data: unknown }) {
          updates.push({ uid, where, data });
          const count = pending[uid] ?? 0;
          pending[uid] = 0;

          return { count };
        },
      }),
    },
  } as never;

  return {
    strapi,
    updates,
    created,
    readState: () => stored,
    service: createMigrationService({ strapi }),
  };
};

describe('turning Spaces on for an existing project', () => {
  describe('the run', () => {
    it('assigns existing rows to the default space', async () => {
      // Anything left without a space is shared with every tenant, so the
      // project's own content must not stay that way.
      const { service, updates } = makeStrapi();

      await service.run();

      expect(updates).toEqual([
        {
          uid: 'api::article.article',
          where: { space_id: null },
          data: { [SPACE_ATTRIBUTE]: 1 },
        },
      ]);
    });

    it('reports what it assigned, per model', async () => {
      const { service } = makeStrapi({
        orphans: { 'api::article.article': 3, 'api::page.page': 0, 'api::tag.tag': 12 },
      });

      const state = await service.run();

      expect(state.assigned).toEqual({ 'api::article.article': 3, 'api::tag.tag': 12 });
    });

    it('leaves audit logs unassigned, because they are the platform’s own', async () => {
      const { service, updates } = makeStrapi({
        orphans: { 'admin::audit-log': 40, 'api::article.article': 1 },
      });

      await service.run();

      expect(updates.map((update) => update.uid)).toEqual(['api::article.article']);
    });

    it('skips a model with no space column to write to', async () => {
      const { service, updates } = makeStrapi({
        orphans: { 'api::article.article': 3 },
        withoutColumn: ['api::article.article'],
      });

      await service.run();

      expect(updates).toEqual([]);
    });

    it('does not touch a model that has nothing to assign', async () => {
      const { service, updates } = makeStrapi({ orphans: { 'api::article.article': 0 } });

      await service.run();

      expect(updates).toEqual([]);
    });

    it('records that it finished, naming the space it assigned to', async () => {
      const { service, readState } = makeStrapi();

      await service.run();

      expect(readState()).toMatchObject({ defaultSpaceSlug: 'main' });
    });
  });

  describe('running again', () => {
    it('does nothing, so a restart does not re-assign moved content', async () => {
      const previous = { defaultSpaceSlug: 'main', completedAt: 'yesterday', assigned: {} };
      const { service, updates } = makeStrapi({ state: previous });

      await expect(service.run()).resolves.toEqual(previous);
      expect(updates).toEqual([]);
    });
  });

  describe('the first space', () => {
    it('is created when the project has none', async () => {
      const { service, created } = makeStrapi({ defaultSpace: null });

      await service.run();

      expect(created).toEqual([{ name: 'Main', slug: 'main' }]);
    });

    it('takes the project’s own name', async () => {
      const { service, created } = makeStrapi({ defaultSpace: null, displayName: 'Acme' });

      await service.run();

      expect(created).toEqual([{ name: 'Acme', slug: 'main' }]);
    });

    it('is not created when one is already the default', async () => {
      const { service, created } = makeStrapi();

      await service.run();

      expect(created).toEqual([]);
    });
  });

  describe('rows that stayed shared', () => {
    it('are counted, so an administrator can see them', async () => {
      // Content seeded by the CLI lands here, and "visible to every space" is a
      // state worth discovering in Settings rather than through a tenant.
      const { service } = makeStrapi({
        orphans: { 'api::article.article': 2, 'api::page.page': 0 },
      });

      await expect(service.countSharedRows()).resolves.toEqual({ 'api::article.article': 2 });
    });

    it('include audit logs, which the run deliberately left alone', async () => {
      const { service } = makeStrapi({ orphans: { 'admin::audit-log': 40 } });

      await service.run();

      await expect(service.countSharedRows()).resolves.toEqual({ 'admin::audit-log': 40 });
    });

    it('are none once everything has been assigned', async () => {
      const { service } = makeStrapi();

      await service.run();

      await expect(service.countSharedRows()).resolves.toEqual({});
    });
  });
});
