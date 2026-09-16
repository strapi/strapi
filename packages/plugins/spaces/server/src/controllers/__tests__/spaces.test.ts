import type { Context } from 'koa';

import type { SpaceScope } from '../../../../shared/constants';
import createSpacesController from '../spaces';

const FRANCE = { id: 1, name: 'France', slug: 'fr', status: 'active' };
const GERMANY = { id: 2, name: 'Germany', slug: 'de', status: 'active' };
const RETIRED = { id: 3, name: 'Old', slug: 'old', status: 'archived' };

interface Options {
  all?: Array<Record<string, unknown>>;
  memberOf?: Array<Record<string, unknown>>;
  canAccessAll?: boolean;
  scope?: SpaceScope;
  /** uid -> rows belonging to the space being previewed. */
  entries?: Record<string, number>;
  members?: number;
}

const makeStrapi = ({
  all = [FRANCE, GERMANY, RETIRED],
  memberOf = [FRANCE],
  canAccessAll = false,
  scope = { mode: 'space', id: 1, slug: 'fr' } as SpaceScope,
  entries = {},
  members = 0,
}: Options = {}) => {
  const calls: Array<[string, unknown]> = [];

  const strapi = {
    requestContext: { get: () => undefined },
    contentType: (uid: string) => ({
      info: { displayName: uid === 'api::article.article' ? 'Article' : undefined },
    }),
    db: {
      metadata: {
        has: () => true,
        get: (uid: string) => ({
          uid,
          attributes: {
            space: {
              type: 'relation',
              target: 'plugin::spaces.space',
              joinColumn: { name: 'space_id' },
            },
          },
        }),
      },
      query: (uid: string) => ({ count: async () => entries[uid] ?? 0 }),
    },
    service: (uid: string) =>
      ({
        'plugin::spaces.spaces': {
          list: async () => all,
          findById: async (id: number) => all.find((space) => space.id === id),
          async create(input: unknown) {
            calls.push(['create', input]);

            return { id: 9, ...(input as object) };
          },
          async update(id: number, input: unknown) {
            calls.push(['update', { id, ...(input as object) }]);

            return { id, ...(input as object) };
          },
          setDefault: async (id: number) => ({ id, isDefault: true }),
          delete: async (id: number) => ({ deleted: { id } }),
        },
        'plugin::spaces.access': {
          canAccessAllSpaces: async () => canAccessAll,
          resolve: async () => ({ scope }),
        },
        'plugin::spaces.membership': {
          listForUser: async () => memberOf.map((space) => ({ space })),
          listForSpace: async () => Array.from({ length: members }, (_, index) => ({ id: index })),
        },
        'plugin::spaces.content-types': {
          listScopedUids: () => Object.keys(entries),
          listSelectableUids: () => ['api::article.article', 'api::page.page'],
        },
        'plugin::spaces.limits': { getMaximum: () => 5 },
        'plugin::spaces.migration': { countSharedRows: async () => ({ 'api::page.page': 4 }) },
      })[uid],
  } as never;

  return { strapi, calls, controller: createSpacesController({ strapi }) };
};

/** Just enough of a Koa context for a controller, and the parts tests read back. */
type TestContext = Context & { body: any; notFound: jest.Mock };

const makeCtx = (overrides: Record<string, unknown> = {}) =>
  ({
    state: { user: { id: 7 } },
    params: {},
    query: {},
    request: { body: {} },
    notFound: jest.fn(() => 'not-found'),
    ...overrides,
  }) as unknown as TestContext;

describe('the spaces endpoints', () => {
  describe('the spaces a caller can work in', () => {
    it('are the ones they belong to', async () => {
      const { controller } = makeStrapi();
      const ctx = makeCtx();

      await controller.mine(ctx);

      expect(ctx.body.data).toEqual([FRANCE]);
    });

    it('are all of them for someone who can reach every space', async () => {
      const { controller } = makeStrapi({ canAccessAll: true });
      const ctx = makeCtx();

      await controller.mine(ctx);

      expect(ctx.body.data.map((space: { slug: string }) => space.slug)).toEqual(['fr', 'de']);
    });

    it('never include an archived one', async () => {
      // Listing it would offer the switcher a space nothing can be done in.
      const { controller } = makeStrapi({ memberOf: [FRANCE, RETIRED] });
      const ctx = makeCtx();

      await controller.mine(ctx);

      expect(ctx.body.data).toEqual([FRANCE]);
    });

    it('are none at all for a caller with no session', async () => {
      const { controller } = makeStrapi();
      const ctx = makeCtx({ state: {} });

      await controller.mine(ctx);

      expect(ctx.body).toEqual({ data: [], current: null, canAccessAll: false });
    });
  });

  describe('where the caller is right now', () => {
    it('is the slug of the space they are in', async () => {
      const { controller } = makeStrapi();
      const ctx = makeCtx();

      await controller.mine(ctx);

      expect(ctx.body.current).toBe('fr');
    });

    it('is `*` in the all-spaces view', async () => {
      const { controller } = makeStrapi({ scope: { mode: 'global' } as SpaceScope });
      const ctx = makeCtx();

      await controller.mine(ctx);

      expect(ctx.body.current).toBe('*');
    });

    it('is nothing when no space applies', async () => {
      const { controller } = makeStrapi({ scope: { mode: 'unscoped' } as SpaceScope });
      const ctx = makeCtx();

      await controller.mine(ctx);

      expect(ctx.body.current).toBeNull();
    });

    it('says why, when the caller has nowhere to work', async () => {
      // The admin can then explain itself instead of showing an empty list.
      const { controller } = makeStrapi({
        memberOf: [],
        scope: { mode: 'unresolved', reason: 'You do not belong to any space.' } as SpaceScope,
      });
      const ctx = makeCtx();

      await controller.mine(ctx);

      expect(ctx.body).toMatchObject({
        data: [],
        unavailableReason: 'You do not belong to any space.',
      });
    });
  });

  describe('creating one', () => {
    it('needs a name', async () => {
      const { controller } = makeStrapi();

      await expect(controller.create(makeCtx({ request: { body: {} } }))).rejects.toThrow(
        '"name" is required.'
      );
    });

    it('refuses a blank name', async () => {
      const { controller } = makeStrapi();

      await expect(
        controller.create(makeCtx({ request: { body: { name: '   ' } } }))
      ).rejects.toThrow('"name" is required.');
    });

    it('refuses content types that are not a list of uids', async () => {
      const { controller } = makeStrapi();

      await expect(
        controller.create(makeCtx({ request: { body: { name: 'X', contentTypes: [42] } } }))
      ).rejects.toThrow(/array of content type uids/);
    });

    it('passes a trimmed name and the rest through', async () => {
      const { controller, calls } = makeStrapi();

      await controller.create(
        makeCtx({ request: { body: { name: '  France  ', slug: 'fr', description: 'hi' } } })
      );

      expect(calls).toEqual([
        ['create', { name: 'France', slug: 'fr', description: 'hi', contentTypes: null }],
      ]);
    });
  });

  describe('updating one', () => {
    it('passes a slug through rather than dropping it', async () => {
      // The service refuses a rename; swallowing it here would let the caller
      // believe the rename happened.
      const { controller, calls } = makeStrapi();

      await controller.update(makeCtx({ params: { id: '1' }, request: { body: { slug: 'de' } } }));

      expect(calls[0][1]).toMatchObject({ id: 1, slug: 'de' });
    });

    it('leaves out what the caller did not send', async () => {
      const { controller, calls } = makeStrapi();

      await controller.update(
        makeCtx({ params: { id: '1' }, request: { body: { name: 'La France' } } })
      );

      expect(calls[0][1]).toEqual({
        id: 1,
        name: 'La France',
        slug: undefined,
        description: undefined,
        status: undefined,
        contentTypes: undefined,
      });
    });

    it('accepts clearing the content types', async () => {
      const { controller, calls } = makeStrapi();

      await controller.update(
        makeCtx({ params: { id: '1' }, request: { body: { contentTypes: null } } })
      );

      expect(calls[0][1]).toMatchObject({ contentTypes: null });
    });
  });

  describe('what deleting one would destroy', () => {
    it('counts the entries and the members', async () => {
      const { controller } = makeStrapi({
        entries: { 'api::article.article': 12, 'api::page.page': 0 },
        members: 3,
      });
      const ctx = makeCtx({ params: { id: '1' } });

      await controller.deletionPreview(ctx);

      expect(ctx.body.data).toMatchObject({
        entries: { 'api::article.article': 12 },
        members: 3,
      });
    });

    it('is reported as missing for a space that does not exist', async () => {
      const { controller } = makeStrapi();
      const ctx = makeCtx({ params: { id: '99' } });

      await controller.deletionPreview(ctx);

      expect(ctx.notFound).toHaveBeenCalled();
    });
  });

  describe('the settings screen', () => {
    it('names the content types a space can be restricted to', async () => {
      const { controller } = makeStrapi();
      const ctx = makeCtx();

      await controller.settings(ctx);

      expect(ctx.body.data.contentTypes).toEqual([
        { uid: 'api::article.article', displayName: 'Article' },
        { uid: 'api::page.page', displayName: 'api::page.page' },
      ]);
    });

    it('reports the limit and the rows no space owns', async () => {
      const { controller } = makeStrapi();
      const ctx = makeCtx();

      await controller.settings(ctx);

      expect(ctx.body.data).toMatchObject({
        maxSpaces: 5,
        sharedRows: { 'api::page.page': 4 },
      });
    });
  });
});
