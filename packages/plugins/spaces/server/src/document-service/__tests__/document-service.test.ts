import { SPACE_ATTRIBUTE, SPACE_UID } from '../../../../shared/constants';
import { runGlobal, runInSpace, runUnscoped } from '../../scope/context';
import { registerDocumentServiceMiddleware } from '..';

const FRANCE = { id: 1, slug: 'fr', status: 'active', contentTypes: null };
const GERMANY = { id: 2, slug: 'de', status: 'active', contentTypes: null };

const spaceRelation = { type: 'relation', relation: 'manyToOne', target: SPACE_UID };

const ARTICLE = {
  uid: 'api::article.article',
  info: { displayName: 'Article' },
  attributes: {
    title: { type: 'string' },
    author: { type: 'relation', relation: 'manyToOne', target: 'api::author.author' },
    cover: { type: 'media' },
    [SPACE_ATTRIBUTE]: spaceRelation,
  },
} as any;

const AUTHOR = {
  uid: 'api::author.author',
  info: { displayName: 'Author' },
  attributes: { name: { type: 'string' }, [SPACE_ATTRIBUTE]: spaceRelation },
} as any;

const SETTING = {
  uid: 'plugin::some.setting',
  info: { displayName: 'Setting' },
  attributes: { key: { type: 'string' } },
} as any;

interface Options {
  spaces?: Array<typeof FRANCE>;
  /** Row id -> owning space id (null means shared with every space). */
  rowOwners?: Record<number, number | null>;
  availableIn?: (space: any, uid: string) => boolean;
}

const makeStrapi = ({ spaces = [FRANCE, GERMANY], rowOwners = {}, availableIn }: Options = {}) => {
  let registered: any;

  const models: Record<string, any> = {
    'api::article.article': ARTICLE,
    'api::author.author': AUTHOR,
    'plugin::some.setting': SETTING,
  };

  const strapi = {
    documents: {
      use(middleware: any) {
        registered = middleware;
      },
    },
    contentType: (uid: string) => models[uid],
    getModel: (uid: string) => models[uid],
    components: {},
    service: (uid: string) =>
      ({
        'plugin::spaces.spaces': {
          findById: async (id: number) => spaces.find((space) => space.id === id),
          isContentTypeAvailable: (space: any, contentTypeUid: string) =>
            availableIn ? availableIn(space, contentTypeUid) : true,
        },
      })[uid],
    db: {
      query: () => ({
        async findMany({ where }: any) {
          const ids: number[] = where.$or
            ? [...(where.$or[0].documentId?.$in ?? []), ...(where.$or[1].id?.$in ?? [])]
            : (where.id?.$in ?? []);

          return [...new Set(ids)]
            .filter((id) => id in rowOwners)
            .map((id) => ({
              id,
              [SPACE_ATTRIBUTE]: rowOwners[id] === null ? null : { id: rowOwners[id] },
            }));
        },
      }),
    },
  } as any;

  registerDocumentServiceMiddleware(strapi);

  const run = (context: any) => registered(context, async () => 'ok');

  return { strapi, run };
};

describe('document service middleware', () => {
  describe('models it applies to', () => {
    it('leaves unscoped models alone', async () => {
      const { run } = makeStrapi();

      const params: any = { data: { key: 'x' } };
      await runInSpace(FRANCE, () =>
        run({ uid: 'plugin::some.setting', action: 'create', params })
      );

      expect(params.data[SPACE_ATTRIBUTE]).toBeUndefined();
    });

    it('leaves trusted unscoped code alone', async () => {
      const { run } = makeStrapi();

      const params: any = { data: { title: 'x' } };
      await runUnscoped(() => run({ uid: 'api::article.article', action: 'create', params }));

      expect(params.data[SPACE_ATTRIBUTE]).toBeUndefined();
    });
  });

  describe('creating inside a space', () => {
    it('puts the entry in the space the caller is working in', async () => {
      const { run } = makeStrapi();

      const params: any = { data: { title: 'Bonjour' } };
      await runInSpace(FRANCE, () =>
        run({ uid: 'api::article.article', action: 'create', params })
      );

      expect(params.data[SPACE_ATTRIBUTE]).toBe(1);
    });

    it('does the same for a clone', async () => {
      const { run } = makeStrapi();

      const params: any = { data: { title: 'Copy' } };
      await runInSpace(GERMANY, () =>
        run({ uid: 'api::article.article', action: 'clone', params })
      );

      expect(params.data[SPACE_ATTRIBUTE]).toBe(2);
    });

    it('refuses to assign the entry to another space', async () => {
      const { run } = makeStrapi();

      const params: any = { data: { title: 'x', [SPACE_ATTRIBUTE]: 2 } };

      await expect(
        runInSpace(FRANCE, () => run({ uid: 'api::article.article', action: 'create', params }))
      ).rejects.toThrow(/cannot be assigned to another space/i);
    });

    it('accepts a space that matches where the caller already is', async () => {
      const { run } = makeStrapi();

      const params: any = { data: { title: 'x', [SPACE_ATTRIBUTE]: 1 } };

      await expect(
        runInSpace(FRANCE, () => run({ uid: 'api::article.article', action: 'create', params }))
      ).resolves.toBe('ok');
    });
  });

  describe('updating inside a space', () => {
    it('does not restate ownership: the row already has one', async () => {
      const { run } = makeStrapi();

      const params: any = { data: { title: 'new title' } };
      await runInSpace(FRANCE, () =>
        run({ uid: 'api::article.article', action: 'update', params })
      );

      expect(params.data).toEqual({ title: 'new title' });
    });

    it('drops a space smuggled into update data', async () => {
      const { run } = makeStrapi();

      const params: any = { data: { title: 'x', [SPACE_ATTRIBUTE]: 1 } };
      await runInSpace(FRANCE, () =>
        run({ uid: 'api::article.article', action: 'update', params })
      );

      expect(params.data[SPACE_ATTRIBUTE]).toBeUndefined();
    });

    it('refuses an update that tries to move the entry elsewhere', async () => {
      const { run } = makeStrapi();

      const params: any = { data: { [SPACE_ATTRIBUTE]: 2 } };

      await expect(
        runInSpace(FRANCE, () => run({ uid: 'api::article.article', action: 'update', params }))
      ).rejects.toThrow(/cannot be assigned to another space/i);
    });
  });

  describe('creating from the all-spaces view', () => {
    it('refuses without a target space, rather than leaving the entry shared', async () => {
      const { run } = makeStrapi();

      const params: any = { data: { title: 'x' } };

      await expect(
        runGlobal(() => run({ uid: 'api::article.article', action: 'create', params }))
      ).rejects.toThrow(/requires naming the space/i);
    });

    it('accepts a named target space', async () => {
      const { run } = makeStrapi();

      const params: any = { data: { title: 'x', [SPACE_ATTRIBUTE]: 2 } };
      await runGlobal(() => run({ uid: 'api::article.article', action: 'create', params }));

      expect(params.data[SPACE_ATTRIBUTE]).toBe(2);
    });

    it('refuses an update that names a space, rather than ignoring it', async () => {
      // Moving content between spaces is its own action, and is not part of
      // this version. The database lifecycle would strip the field, so without
      // this the write would look like it moved the entry and would not have.
      const { run } = makeStrapi();

      const params: any = { data: { title: 'x', [SPACE_ATTRIBUTE]: 2 } };

      await expect(
        runGlobal(() => run({ uid: 'api::article.article', action: 'update', params }))
      ).rejects.toThrow(/cannot be moved to another space/i);
    });

    it('refuses a target space that does not exist', async () => {
      const { run } = makeStrapi();

      const params: any = { data: { title: 'x', [SPACE_ATTRIBUTE]: 99 } };

      await expect(
        runGlobal(() => run({ uid: 'api::article.article', action: 'create', params }))
      ).rejects.toThrow(/does not exist, or has been archived/i);
    });

    it('refuses an archived target space', async () => {
      const { run } = makeStrapi({
        spaces: [FRANCE, { ...GERMANY, status: 'archived' }],
      });

      const params: any = { data: { title: 'x', [SPACE_ATTRIBUTE]: 2 } };

      await expect(
        runGlobal(() => run({ uid: 'api::article.article', action: 'create', params }))
      ).rejects.toThrow(/archived/i);
    });
  });

  describe('content types a space does not have', () => {
    it('says so rather than answering with an empty list', async () => {
      const { run } = makeStrapi({
        availableIn: (_space, uid) => uid !== 'api::article.article',
      });

      await expect(
        runInSpace(FRANCE, () =>
          run({ uid: 'api::article.article', action: 'findMany', params: {} })
        )
      ).rejects.toThrow(/not available in the "fr" space/i);
    });

    it('never withholds plugin data a space needs to function', async () => {
      const { run } = makeStrapi({ availableIn: () => false });

      await expect(
        runInSpace(FRANCE, () =>
          run({ uid: 'plugin::upload.file', action: 'findMany', params: {} })
        )
      ).resolves.toBe('ok');
    });
  });

  describe('relations', () => {
    it('refuses a link to an entry in another space', async () => {
      const { run } = makeStrapi({ rowOwners: { 50: 2 } });

      const params: any = { data: { title: 'x', author: 50 } };

      await expect(
        runInSpace(FRANCE, () => run({ uid: 'api::article.article', action: 'create', params }))
      ).rejects.toThrow(/not available in this space/i);
    });

    it('reports a target that does not exist the same way as one in another space', async () => {
      // Telling them apart would answer "does row 999 exist somewhere I cannot
      // see?" for anyone willing to ask often enough.
      const { run } = makeStrapi({ rowOwners: { 50: 2 } });

      const foreign: any = { data: { title: 'x', author: 50 } };
      const missing: any = { data: { title: 'x', author: 999 } };

      const errors = await Promise.all(
        [foreign, missing].map((params) =>
          runInSpace(FRANCE, () =>
            run({ uid: 'api::article.article', action: 'create', params })
          ).catch((error: Error) => error.message)
        )
      );

      expect(errors[0]).toEqual(errors[1]);
    });

    it('allows a link within the same space', async () => {
      const { run } = makeStrapi({ rowOwners: { 50: 1 } });

      const params: any = { data: { title: 'x', author: 50 } };

      await expect(
        runInSpace(FRANCE, () => run({ uid: 'api::article.article', action: 'create', params }))
      ).resolves.toBe('ok');
    });

    it('allows a link to content shared with every space', async () => {
      const { run } = makeStrapi({ rowOwners: { 50: null } });

      const params: any = { data: { title: 'x', author: 50 } };

      await expect(
        runInSpace(FRANCE, () => run({ uid: 'api::article.article', action: 'create', params }))
      ).resolves.toBe('ok');
    });

    it('checks the ids inside a connect payload', async () => {
      const { run } = makeStrapi({ rowOwners: { 50: 2 } });

      const params: any = { data: { title: 'x', author: { connect: [{ id: 50 }] } } };

      await expect(
        runInSpace(FRANCE, () => run({ uid: 'api::article.article', action: 'create', params }))
      ).rejects.toThrow(/not available in this space/i);
    });

    it('ignores disconnect: letting go of a link needs no claim over it', async () => {
      const { run } = makeStrapi({ rowOwners: { 50: 2 } });

      const params: any = { data: { title: 'x', author: { disconnect: [{ id: 50 }] } } };

      await expect(
        runInSpace(FRANCE, () => run({ uid: 'api::article.article', action: 'create', params }))
      ).resolves.toBe('ok');
    });
  });
});
