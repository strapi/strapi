import { errors } from '@strapi/utils';

import { createMultitenancyMiddleware, lookupEntrySpace } from '../multitenancy';
import { getScopeOverride, isUnscopedContext, runScoped } from '../../utils/space-scope';

const ARTICLE = { uid: 'api::article.article', pluginOptions: {} };
const GLOSSARY = {
  uid: 'api::glossary.glossary',
  pluginOptions: { spaces: { sharedEntries: true } },
};
const TAG = {
  uid: 'api::tag.tag',
  pluginOptions: { spaces: { sharedEntries: true, sharedEditable: true } },
};
const RESTRICTED = {
  uid: 'api::secret.secret',
  pluginOptions: { spaces: { visibleIn: ['default'] } },
};
const PLATFORM = { uid: 'plugin::spaces.space', pluginOptions: {} };

const SPACES: Record<string, { id: number; slug: string }> = {
  default: { id: 1, slug: 'default' },
  acme: { id: 2, slug: 'acme' },
  globex: { id: 3, slug: 'globex' },
};

interface Options {
  /** The request's workspace; `undefined` = no header. */
  space?: 'default' | 'acme' | 'globex';
  /**
   * documentId → the workspaces the document exists in. A plain id (or `null`
   * for an inherited entry) is the ordinary case; a list is a document that a
   * workspace has overridden, and so lives in two places at once.
   */
  rows?: Record<string, number | null | Array<{ spaceId: number | null; isOverride?: boolean }>>;
}

const placementsFor = (
  entry: number | null | Array<{ spaceId: number | null; isOverride?: boolean }>
) =>
  (Array.isArray(entry) ? entry : [{ spaceId: entry, isOverride: false }]).map((row) => ({
    id: 10,
    space: row.spaceId === null ? null : { id: row.spaceId },
    spaceOverride: row.isOverride === true,
  }));

const makeStrapi = ({ space, rows = {} }: Options = {}) => {
  const findOne = jest.fn(async ({ where }: any) => {
    const match = Object.values(SPACES).find(
      (candidate) => candidate.id === where.id || candidate.slug === where.slug
    );
    return match ?? null;
  });
  const findMany = jest.fn(async ({ where }: any) => {
    const entry = rows[where.documentId];
    return entry === undefined ? [] : placementsFor(entry);
  });
  const unscopedDuringLookup: boolean[] = [];
  const strapi = {
    requestContext: {
      get: () =>
        space ? { state: { spaceId: SPACES[space].id, spaceSlug: SPACES[space].slug } } : undefined,
    },
    db: {
      query: jest.fn(() => ({
        findOne: (params: any) => findOne(params),
        findMany: (params: any) => {
          unscopedDuringLookup.push(isUnscopedContext());
          return findMany(params);
        },
      })),
    },
  } as any;
  return { strapi, findOne, findMany, unscopedDuringLookup };
};

/** A `next` that records the scope override it observed. */
const makeNext = () => {
  const seen: Array<{ target: number | null } | undefined> = [];
  const next = jest.fn(async () => {
    seen.push(getScopeOverride());
    return 'result';
  });
  return { next, seen };
};

describe('multitenancy document-service middleware', () => {
  describe('reads', () => {
    it.each(['findMany', 'findFirst', 'findOne', 'findPage', 'count'])(
      'leaves %s untouched (the DB read net is the single read filter)',
      async (action) => {
        const { strapi } = makeStrapi({ space: 'acme' });
        const middleware = createMultitenancyMiddleware(strapi);
        const ctx: any = { contentType: ARTICLE, action, params: { filters: { title: 'x' } } };
        const { next, seen } = makeNext();

        await expect(middleware(ctx, next)).resolves.toBe('result');

        expect(ctx.params).toEqual({ filters: { title: 'x' } });
        expect(seen).toEqual([undefined]);
      }
    );

    it('is a no-op for content types without a workspace', async () => {
      const { strapi } = makeStrapi({ space: 'acme' });
      const middleware = createMultitenancyMiddleware(strapi);
      const ctx: any = { contentType: PLATFORM, action: 'create', params: { data: { name: 'x' } } };
      const { next } = makeNext();

      await middleware(ctx, next);

      expect(ctx.params.data).toEqual({ name: 'x' });
      expect(next).toHaveBeenCalled();
    });
  });

  describe('create / clone', () => {
    it('forces the workspace of a sub-workspace caller, ignoring the body', async () => {
      const { strapi } = makeStrapi({ space: 'acme' });
      const middleware = createMultitenancyMiddleware(strapi);
      const ctx: any = {
        contentType: ARTICLE,
        action: 'create',
        params: { data: { title: 'Hello', space: 3 } },
      };
      const { next, seen } = makeNext();

      await middleware(ctx, next);

      expect(ctx.params.data).toEqual({ title: 'Hello', space: 2 });
      expect(seen).toEqual([{ target: 2 }]);
    });

    it('stamps the default workspace when default sends no target', async () => {
      const { strapi } = makeStrapi({ space: 'default' });
      const middleware = createMultitenancyMiddleware(strapi);
      const ctx: any = { contentType: ARTICLE, action: 'create', params: { data: { title: 'x' } } };
      const { next, seen } = makeNext();

      await middleware(ctx, next);

      expect(ctx.params.data.space).toBe(1);
      expect(seen).toEqual([{ target: 1 }]);
    });

    it.each([
      ['an id', 2],
      ['a slug', 'acme'],
      ['an { id } object', { id: 2 }],
      ['a { slug } object', { slug: 'acme' }],
    ])('lets default target another workspace with %s', async (_label, input) => {
      const { strapi } = makeStrapi({ space: 'default' });
      const middleware = createMultitenancyMiddleware(strapi);
      const ctx: any = {
        contentType: ARTICLE,
        action: 'create',
        params: { data: { title: 'x', space: input } },
      };
      const { next, seen } = makeNext();

      await middleware(ctx, next);

      expect(ctx.params.data.space).toBe(2);
      expect(seen).toEqual([{ target: 2 }]);
    });

    it('lets default create a shared entry with `space: null`, in the global scope', async () => {
      const { strapi } = makeStrapi({ space: 'default' });
      const middleware = createMultitenancyMiddleware(strapi);
      const ctx: any = {
        contentType: ARTICLE,
        action: 'create',
        params: { data: { title: 'x', space: null } },
      };
      const { next, seen } = makeNext();

      await middleware(ctx, next);

      expect(ctx.params.data.space).toBeNull();
      expect(seen).toEqual([{ target: null }]);
    });

    it('rejects an unknown target workspace from default', async () => {
      const { strapi } = makeStrapi({ space: 'default' });
      const middleware = createMultitenancyMiddleware(strapi);
      const ctx: any = {
        contentType: ARTICLE,
        action: 'create',
        params: { data: { title: 'x', space: 'nope' } },
      };

      await expect(middleware(ctx, makeNext().next)).rejects.toThrow(errors.ValidationError);
    });

    it('rejects a target workspace the content type is not visible in', async () => {
      const { strapi } = makeStrapi({ space: 'default' });
      const middleware = createMultitenancyMiddleware(strapi);
      const ctx: any = {
        contentType: RESTRICTED,
        action: 'create',
        params: { data: { title: 'x', space: 'acme' } },
      };

      await expect(middleware(ctx, makeNext().next)).rejects.toThrow(
        'not available in workspace "acme"'
      );
    });

    it('leaves headerless creates alone (bootstrap, CLI)', async () => {
      const { strapi } = makeStrapi();
      const middleware = createMultitenancyMiddleware(strapi);
      const ctx: any = { contentType: ARTICLE, action: 'create', params: { data: { title: 'x' } } };
      const { next, seen } = makeNext();

      await middleware(ctx, next);

      expect(ctx.params.data.space).toBeUndefined();
      expect(seen).toEqual([undefined]);
    });

    it('honours an outer runScoped() over the request workspace', async () => {
      const { strapi } = makeStrapi({ space: 'acme' });
      const middleware = createMultitenancyMiddleware(strapi);
      const ctx: any = { contentType: ARTICLE, action: 'create', params: { data: { title: 'x' } } };
      const { next, seen } = makeNext();

      await runScoped(3, () => middleware(ctx, next));

      expect(ctx.params.data.space).toBe(3);
      expect(seen).toEqual([{ target: 3 }]);
    });

    it('creates shared-type entries as NULL from default', async () => {
      const { strapi } = makeStrapi({ space: 'default' });
      const middleware = createMultitenancyMiddleware(strapi);
      const ctx: any = {
        contentType: GLOSSARY,
        action: 'create',
        params: { data: { term: 'x', space: 2 } },
      };
      const { next, seen } = makeNext();

      await middleware(ctx, next);

      expect(ctx.params.data.space).toBeNull();
      expect(seen).toEqual([{ target: null }]);
    });

    it('refuses shared-type creates from a sub-workspace', async () => {
      const { strapi } = makeStrapi({ space: 'acme' });
      const middleware = createMultitenancyMiddleware(strapi);
      const ctx: any = { contentType: GLOSSARY, action: 'create', params: { data: { term: 'x' } } };

      await expect(middleware(ctx, makeNext().next)).rejects.toThrow(
        'Entries of this content type are managed from the default workspace'
      );
    });

    it('lets a sub-workspace create shared-editable entries (NULL)', async () => {
      const { strapi } = makeStrapi({ space: 'acme' });
      const middleware = createMultitenancyMiddleware(strapi);
      const ctx: any = { contentType: TAG, action: 'create', params: { data: { name: 'x' } } };
      const { next, seen } = makeNext();

      await middleware(ctx, next);

      expect(ctx.params.data.space).toBeNull();
      expect(seen).toEqual([{ target: null }]);
    });

    it('applies the same rules to clone', async () => {
      const { strapi } = makeStrapi({ space: 'acme' });
      const middleware = createMultitenancyMiddleware(strapi);
      const ctx: any = { contentType: ARTICLE, action: 'clone', params: { documentId: 'a' } };
      const { next, seen } = makeNext();

      await middleware(ctx, next);

      expect(ctx.params.data).toEqual({ space: 2 });
      expect(seen).toEqual([{ target: 2 }]);
    });
  });

  describe('update / delete / publish / unpublish / discardDraft', () => {
    const rows = { own: 2, shared: null, other: 3 };

    it.each(['update', 'delete', 'publish', 'unpublish', 'discardDraft'])(
      '%s on an own row runs inside that workspace',
      async (action) => {
        const { strapi } = makeStrapi({ space: 'acme', rows });
        const middleware = createMultitenancyMiddleware(strapi);
        const ctx: any = { contentType: ARTICLE, action, params: { documentId: 'own' } };
        const { next, seen } = makeNext();

        await expect(middleware(ctx, next)).resolves.toBe('result');

        expect(seen).toEqual([{ target: 2 }]);
      }
    );

    it('forces data.space to the document workspace on update (new locale rows follow)', async () => {
      const { strapi } = makeStrapi({ space: 'default', rows });
      const middleware = createMultitenancyMiddleware(strapi);
      const ctx: any = {
        contentType: ARTICLE,
        action: 'update',
        params: { documentId: 'own', locale: 'fr', data: { title: 'Bonjour', space: 3 } },
      };
      const { next, seen } = makeNext();

      await middleware(ctx, next);

      expect(ctx.params.data).toEqual({ title: 'Bonjour', space: 2 });
      expect(seen).toEqual([{ target: 2 }]);
    });

    it('refuses a shared row from a sub-workspace with 403', async () => {
      const { strapi } = makeStrapi({ space: 'acme', rows });
      const middleware = createMultitenancyMiddleware(strapi);
      const ctx: any = { contentType: ARTICLE, action: 'update', params: { documentId: 'shared' } };
      const { next } = makeNext();

      await expect(middleware(ctx, next)).rejects.toMatchObject({
        name: 'WorkspaceAccessError',
        message: expect.stringContaining('shared across workspaces'),
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("hides another workspace's row behind a 404", async () => {
      const { strapi } = makeStrapi({ space: 'acme', rows });
      const middleware = createMultitenancyMiddleware(strapi);
      const ctx: any = { contentType: ARTICLE, action: 'delete', params: { documentId: 'other' } };
      const { next } = makeNext();

      await expect(middleware(ctx, next)).rejects.toBeInstanceOf(errors.NotFoundError);
      expect(next).not.toHaveBeenCalled();
    });

    it('lets default edit any row, in the global scope for shared rows', async () => {
      const { strapi } = makeStrapi({ space: 'default', rows });
      const middleware = createMultitenancyMiddleware(strapi);
      const { next, seen } = makeNext();

      await middleware(
        { contentType: ARTICLE, action: 'update', params: { documentId: 'other', data: {} } },
        next
      );
      await middleware(
        { contentType: ARTICLE, action: 'publish', params: { documentId: 'shared' } },
        next
      );

      expect(seen).toEqual([{ target: 3 }, { target: null }]);
    });

    it('lets the document service answer for unknown documents', async () => {
      const { strapi } = makeStrapi({ space: 'acme', rows });
      const middleware = createMultitenancyMiddleware(strapi);
      const ctx: any = { contentType: ARTICLE, action: 'update', params: { documentId: 'nope' } };
      const { next } = makeNext();

      await middleware(ctx, next);

      expect(next).toHaveBeenCalled();
    });

    it('refuses shared-type writes from a sub-workspace unless shared-editable', async () => {
      const { strapi } = makeStrapi({ space: 'acme', rows: { g: null, t: null } });
      const middleware = createMultitenancyMiddleware(strapi);
      const { next, seen } = makeNext();

      await expect(
        middleware({ contentType: GLOSSARY, action: 'update', params: { documentId: 'g' } }, next)
      ).rejects.toThrow('managed from the default workspace');
      await middleware({ contentType: TAG, action: 'update', params: { documentId: 't' } }, next);

      expect(seen).toEqual([{ target: null }]);
    });

    it('looks the entry up across every workspace', async () => {
      const { strapi, unscopedDuringLookup } = makeStrapi({ space: 'acme', rows });
      const middleware = createMultitenancyMiddleware(strapi);

      await middleware(
        { contentType: ARTICLE, action: 'update', params: { documentId: 'own' } },
        makeNext().next
      );

      expect(unscopedDuringLookup).toEqual([true]);
    });
  });

  describe('lookupEntrySpace', () => {
    it('reports missing rows and shared rows distinctly', async () => {
      const { strapi } = makeStrapi({ rows: { shared: null } });

      await expect(lookupEntrySpace(strapi, ARTICLE.uid, 'shared')).resolves.toMatchObject({
        found: true,
        spaceId: null,
      });
      await expect(lookupEntrySpace(strapi, ARTICLE.uid, 'nope')).resolves.toMatchObject({
        found: false,
        spaceId: null,
      });
    });
  });
});
