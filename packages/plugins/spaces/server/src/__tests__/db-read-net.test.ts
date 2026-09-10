import { applySpaceFilter, registerDbReadNet } from '../db-read-net';
import { runScoped, runUnscoped } from '../utils/space-scope';

const ARTICLE = { uid: 'api::article.article', pluginOptions: {} };
const GLOSSARY = {
  uid: 'api::glossary.glossary',
  pluginOptions: { spaces: { sharedEntries: true } },
};
const PLATFORM = { uid: 'plugin::spaces.space', pluginOptions: {} };

/** Stands in for the knex builder the exclusion subquery is built from. */
const makeSubquery = () => {
  const calls: Array<[string, unknown]> = [];
  const builder: any = {
    __subquery: true,
    calls,
    select: jest.fn(() => builder),
    where: jest.fn((column: string, value: unknown) => {
      calls.push([column, value]);
      return builder;
    }),
    whereNotNull: jest.fn(() => builder),
  };
  return builder;
};

const makeStrapi = (space?: { id: number; slug: string }) => {
  const subscribe = jest.fn();
  const subquery = makeSubquery();
  const strapi = {
    requestContext: {
      get: () => (space ? { state: { spaceId: space.id, spaceSlug: space.slug } } : undefined),
    },
    contentTypes: { [ARTICLE.uid]: ARTICLE, [GLOSSARY.uid]: GLOSSARY, [PLATFORM.uid]: PLATFORM },
    plugins: {
      spaces: {
        services: {
          'content-types': {
            getSpaceScopedContentTypes: (s: any) =>
              Object.values(s.contentTypes).filter((ct: any) => ct.uid.startsWith('api::')),
          },
        },
      },
    },
    db: {
      lifecycles: { subscribe },
      connection: jest.fn(() => subquery),
      metadata: {
        get: () => ({
          attributes: {
            space: { joinColumn: { name: 'space_id' } },
            spaceOverride: { columnName: 'space_override' },
            documentId: { type: 'string' },
          },
        }),
      },
    },
  } as any;
  (global as any).strapi = strapi;
  return { strapi, subscribe, subquery };
};

const ACME = { id: 2, slug: 'acme' };
const DEFAULT = { id: 1, slug: 'default' };

/** An event as the DB lifecycles emit it. */
const makeEvent = (where?: unknown) => ({
  model: { uid: ARTICLE.uid, tableName: 'articles' },
  params: where === undefined ? {} : ({ where } as any),
});

const NOT_A_COPY = { $or: [{ space_override: false }, { space_override: { $null: true } }] };

describe('db read net', () => {
  /**
   * Content types whose entries are all shared need no workspace filter, but
   * they are in the net all the same: a workspace that overrides one of their
   * entries has to stop seeing the original, and that exclusion lives here.
   */
  it('subscribes to find/count on every scoped model, shared ones included', () => {
    const { strapi, subscribe } = makeStrapi(ACME);

    registerDbReadNet(strapi);

    expect(subscribe).toHaveBeenCalledTimes(1);
    const subscriber = subscribe.mock.calls[0][0];
    expect(subscriber.models).toEqual([ARTICLE.uid, GLOSSARY.uid]);
    expect(Object.keys(subscriber)).toEqual(
      expect.arrayContaining(['beforeFindOne', 'beforeFindMany', 'beforeCount'])
    );
  });

  describe('a sub-workspace', () => {
    it('reads its own rows, plus the inherited ones it has not overridden', () => {
      const { strapi, subquery } = makeStrapi(ACME);
      const event = makeEvent();

      applySpaceFilter(strapi, event);

      expect(event.params.where).toEqual({
        $or: [
          { space_id: 2 },
          { $and: [{ space_id: { $null: true } }, { documentId: { $notIn: subquery } }] },
        ],
      });
    });

    /**
     * Filtering on the join column, not the `space` relation: the relation form
     * makes the query builder join the spaces table once per `$or` branch.
     */
    it('filters on the space_id column and never joins', () => {
      const { strapi } = makeStrapi(ACME);
      const event = makeEvent();

      applySpaceFilter(strapi, event);

      expect(JSON.stringify(event.params.where)).not.toContain('"space"');
    });

    it('asks for the documents this workspace has overridden, and nothing else', () => {
      const { strapi, subquery } = makeStrapi(ACME);

      applySpaceFilter(strapi, makeEvent());

      expect(subquery.calls).toEqual([
        ['space_id', 2],
        ['space_override', true],
      ]);
    });

    it('ANDs the caller’s own filters underneath, never replacing them', () => {
      const { strapi } = makeStrapi(ACME);
      const event = makeEvent({ title: 'x' });

      applySpaceFilter(strapi, event);

      expect((event.params.where as any).$and[0]).toEqual({ title: 'x' });
    });
  });

  describe('the default workspace', () => {
    /**
     * It sees every workspace's entries, but a workspace's copy of an inherited
     * one is the same document seen from elsewhere — listing it would show one
     * document once per workspace that overrode it.
     */
    it('sees everything except the copies', () => {
      const { strapi } = makeStrapi(DEFAULT);
      const event = makeEvent();

      applySpaceFilter(strapi, event);

      expect(event.params.where).toEqual(NOT_A_COPY);
    });

    it('applies the same rule with no request at all', () => {
      const { strapi } = makeStrapi();
      const event = makeEvent();

      applySpaceFilter(strapi, event);

      expect(event.params.where).toEqual(NOT_A_COPY);
    });
  });

  describe('scopes', () => {
    it('leaves an unscoped read alone — the only view of the whole table', async () => {
      const { strapi } = makeStrapi(ACME);
      const event = makeEvent();

      await runUnscoped(() => applySpaceFilter(strapi, event));

      expect(event.params.where).toBeUndefined();
    });

    it('treats the global write scope like the default workspace', async () => {
      const { strapi } = makeStrapi(ACME);
      const event = makeEvent();

      await runScoped(null, () => applySpaceFilter(strapi, event));

      expect(event.params.where).toEqual(NOT_A_COPY);
    });

    it('lets a scope override the request’s workspace', async () => {
      const { strapi, subquery } = makeStrapi(ACME);
      const event = makeEvent();

      await runScoped(7, () => applySpaceFilter(strapi, event));

      expect((event.params.where as any).$or[0]).toEqual({ space_id: 7 });
      expect(subquery.calls[0]).toEqual(['space_id', 7]);
    });
  });

  /**
   * While a workspace takes its copy of an inherited entry, the original has to
   * be out of sight: the copy reuses its unique field values, and the entity
   * validator would refuse it otherwise. The copy's own source read names the
   * document, and still sees it.
   */
  describe('a document being copied', () => {
    it('is hidden from a read that does not name it', async () => {
      const { strapi } = makeStrapi(ACME);
      const event = makeEvent({ slug: 'pricing' });

      await runScoped(2, () => applySpaceFilter(strapi, event), { shadowDocumentId: 'abc' });

      expect(JSON.stringify(event.params.where)).toContain('"$ne":"abc"');
    });

    it('is still visible to a read that names it', async () => {
      const { strapi } = makeStrapi(ACME);
      const event = makeEvent({ documentId: 'abc', publishedAt: null });

      await runScoped(2, () => applySpaceFilter(strapi, event), { shadowDocumentId: 'abc' });

      expect(JSON.stringify(event.params.where)).not.toContain('"$ne":"abc"');
    });

    it('is found however deeply the read names it', async () => {
      const { strapi } = makeStrapi(ACME);
      const event = makeEvent({ $and: [{ locale: 'en' }, { documentId: 'abc' }] });

      await runScoped(2, () => applySpaceFilter(strapi, event), { shadowDocumentId: 'abc' });

      expect(JSON.stringify(event.params.where)).not.toContain('"$ne":"abc"');
    });
  });

  it('skips a model that carries no workspace column', () => {
    const { strapi } = makeStrapi(ACME);
    strapi.db.metadata.get = () => ({ attributes: {} });
    const event = makeEvent();

    applySpaceFilter(strapi, event);

    expect(event.params.where).toBeUndefined();
  });
});
