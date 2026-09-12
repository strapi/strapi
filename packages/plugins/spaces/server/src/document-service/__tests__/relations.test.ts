import { SPACE_ATTRIBUTE, SPACE_UID } from '../../../../shared/constants';
import { assertRelationsWithinSpace } from '../relations';

const FRANCE = 1;
const GERMANY = 2;

/** A stored row, with the space that owns it — `null` meaning shared. */
type Row = { id: number; documentId?: string; space: number | null };

interface Options {
  /** uid -> the rows that exist, whoever owns them. */
  rows?: Record<string, Row[]>;
  /** Attribute definitions, per uid, on top of the defaults. */
  schemas?: Record<string, Record<string, unknown>>;
  /** A uid listed here is not scoped by Spaces. */
  unscoped?: string[];
}

const relation = (target: string) => ({ type: 'relation', relation: 'oneToMany', target });

const DEFAULT_SCHEMAS: Record<string, Record<string, unknown>> = {
  'api::article.article': {
    title: { type: 'string' },
    authors: relation('api::author.author'),
    cover: { type: 'media' },
  },
  'api::author.author': { name: { type: 'string' } },
  'plugin::upload.file': { name: { type: 'string' } },
};

const makeStrapi = ({ rows = {}, schemas = {}, unscoped = [] }: Options = {}) => {
  const all = { ...DEFAULT_SCHEMAS, ...schemas };
  const reads: string[] = [];

  const schemaFor = (uid: string) => {
    const attributes = all[uid];

    if (!attributes) {
      return undefined;
    }

    return {
      uid,
      info: { displayName: uid.split('.').pop() },
      attributes: {
        ...attributes,
        // Components have no documentId and are never scoped themselves.
        ...(uid.startsWith('api::') || uid.startsWith('plugin::')
          ? {
              documentId: { type: 'string' },
              ...(unscoped.includes(uid)
                ? {}
                : { [SPACE_ATTRIBUTE]: { type: 'relation', target: SPACE_UID } }),
            }
          : {}),
      },
    };
  };

  const strapi = {
    requestContext: { get: () => undefined },
    getModel: (uid: string) => schemaFor(uid),
    contentType: (uid: string) => schemaFor(uid),
    db: {
      query: (uid: string) => ({
        async findMany({ where }: { where: Record<string, any> }) {
          reads.push(uid);
          const wanted = new Set(
            (where.$or ?? [where]).flatMap((clause: Record<string, any>) => [
              ...(clause.documentId?.$in ?? []),
              ...(clause.id?.$in ?? []),
            ])
          );

          return (rows[uid] ?? [])
            .filter((row) => wanted.has(row.id) || (row.documentId && wanted.has(row.documentId)))
            .map((row) => ({
              id: row.id,
              documentId: row.documentId,
              [SPACE_ATTRIBUTE]: row.space === null ? null : { id: row.space },
            }));
        },
      }),
    },
  } as never;

  return {
    reads,
    check: (data: Record<string, unknown>, uid = 'api::article.article', space = FRANCE) =>
      assertRelationsWithinSpace(strapi, uid, data, space),
  };
};

const OURS: Row = { id: 10, documentId: 'doc-ours', space: FRANCE };
const THEIRS: Row = { id: 11, documentId: 'doc-theirs', space: GERMANY };
const SHARED: Row = { id: 12, documentId: 'doc-shared', space: null };

describe('linking an entry to something', () => {
  describe('inside the same space', () => {
    it('is allowed', async () => {
      const { check } = makeStrapi({ rows: { 'api::author.author': [OURS] } });

      await expect(check({ authors: [10] })).resolves.toBeUndefined();
    });

    it('is allowed by document id, which is how the document service addresses it', async () => {
      const { check } = makeStrapi({ rows: { 'api::author.author': [OURS] } });

      await expect(check({ authors: ['doc-ours'] })).resolves.toBeUndefined();
    });

    it.each([
      ['a bare id', 10],
      ['an object', { id: 10 }],
      ['a connect list', { connect: [10] }],
      ['a set list', { set: [{ id: 10 }] }],
      ['a documentId object', { documentId: 'doc-ours' }],
    ])('is allowed however the payload names it (%s)', async (_shape, authors) => {
      const { check } = makeStrapi({ rows: { 'api::author.author': [OURS] } });

      await expect(check({ authors })).resolves.toBeUndefined();
    });
  });

  describe('in another space', () => {
    it('is refused', async () => {
      // The query scope would hide the far end, so the link would read back as
      // missing. Saying why is better than losing it quietly.
      const { check } = makeStrapi({ rows: { 'api::author.author': [THEIRS] } });

      await expect(check({ authors: [11] })).rejects.toThrow(/not available in this space/);
    });

    it('is refused when it is one of several', async () => {
      const { check } = makeStrapi({ rows: { 'api::author.author': [OURS, THEIRS] } });

      await expect(check({ authors: [10, 11] })).rejects.toThrow(/not available in this space/);
    });

    it('is reported the same way as one that does not exist', async () => {
      // Telling them apart would answer "does row 412 exist somewhere I cannot
      // see?" for anyone willing to ask often enough.
      const { check } = makeStrapi({ rows: { 'api::author.author': [THEIRS] } });

      const theirs = await check({ authors: [11] }).catch((error) => error.message);
      const missing = await check({ authors: [999] }).catch((error) => error.message);

      expect(theirs).toBe(missing);
    });
  });

  describe('that belongs to no space', () => {
    it('is allowed, because shared rows are everyone’s', async () => {
      const { check } = makeStrapi({ rows: { 'api::author.author': [SHARED] } });

      await expect(check({ authors: [12] })).resolves.toBeUndefined();
    });
  });

  describe('nested inside a component', () => {
    it('is checked too', async () => {
      // A relation is no less real for sitting one level down.
      const { check } = makeStrapi({
        schemas: {
          'api::article.article': {
            byline: { type: 'component', component: 'shared.byline' },
          },
          'shared.byline': { author: relation('api::author.author') },
        },
        rows: { 'api::author.author': [THEIRS] },
      });

      await expect(check({ byline: { author: 11 } })).rejects.toThrow(/not available/);
    });

    it('is checked in a repeatable one', async () => {
      const { check } = makeStrapi({
        schemas: {
          'api::article.article': {
            bylines: { type: 'component', component: 'shared.byline', repeatable: true },
          },
          'shared.byline': { author: relation('api::author.author') },
        },
        rows: { 'api::author.author': [OURS, THEIRS] },
      });

      await expect(check({ bylines: [{ author: 10 }, { author: 11 }] })).rejects.toThrow(
        /not available/
      );
    });

    it('is allowed when it points at this space', async () => {
      const { check } = makeStrapi({
        schemas: {
          'api::article.article': {
            byline: { type: 'component', component: 'shared.byline' },
          },
          'shared.byline': { author: relation('api::author.author') },
        },
        rows: { 'api::author.author': [OURS] },
      });

      await expect(check({ byline: { author: 10 } })).resolves.toBeUndefined();
    });
  });

  describe('nested inside a dynamic zone', () => {
    it('is checked too', async () => {
      const { check } = makeStrapi({
        schemas: {
          'api::article.article': { body: { type: 'dynamiczone' } },
          'shared.quote': { said: relation('api::author.author') },
        },
        rows: { 'api::author.author': [THEIRS] },
      });

      await expect(check({ body: [{ __component: 'shared.quote', said: 11 }] })).rejects.toThrow(
        /not available/
      );
    });

    it('ignores a block that names no component', async () => {
      const { check } = makeStrapi({
        schemas: { 'api::article.article': { body: { type: 'dynamiczone' } } },
      });

      await expect(check({ body: [{ said: 11 }] })).resolves.toBeUndefined();
    });
  });

  describe('what is not checked', () => {
    it('letting go of a link needs no claim over the far end', async () => {
      // Otherwise an entry could not be tidied up after its neighbour moved.
      const { check } = makeStrapi({ rows: { 'api::author.author': [THEIRS] } });

      await expect(check({ authors: { disconnect: [11] } })).resolves.toBeUndefined();
    });

    it('a model Spaces does not scope', async () => {
      const { check, reads } = makeStrapi({
        rows: { 'api::author.author': [THEIRS] },
        unscoped: ['api::author.author'],
      });

      await expect(check({ authors: [11] })).resolves.toBeUndefined();
      expect(reads).toEqual([]);
    });

    it('the entry’s own space', async () => {
      const { check, reads } = makeStrapi();

      await expect(check({ [SPACE_ATTRIBUTE]: 2 })).resolves.toBeUndefined();
      expect(reads).toEqual([]);
    });

    it('a polymorphic relation, which names its target per item', async () => {
      // Left to the read side, where the query scope hides what is not visible.
      const { check, reads } = makeStrapi({
        schemas: {
          'api::article.article': { related: { type: 'relation', relation: 'morphToMany' } },
        },
      });

      await expect(check({ related: [{ id: 11 }] })).resolves.toBeUndefined();
      expect(reads).toEqual([]);
    });

    it('a write that names no relation at all', async () => {
      const { check, reads } = makeStrapi();

      await expect(check({ title: 'Bonjour' })).resolves.toBeUndefined();
      expect(reads).toEqual([]);
    });

    it('a model that does not exist', async () => {
      const { check, reads } = makeStrapi();

      await expect(check({ authors: [10] }, 'api::gone.gone')).resolves.toBeUndefined();
      expect(reads).toEqual([]);
    });
  });

  describe('media', () => {
    it('is checked against the upload library', async () => {
      const { check } = makeStrapi({ rows: { 'plugin::upload.file': [THEIRS] } });

      await expect(check({ cover: 11 })).rejects.toThrow(/not available/);
    });

    it('is allowed when the file is shared', async () => {
      const { check } = makeStrapi({ rows: { 'plugin::upload.file': [SHARED] } });

      await expect(check({ cover: 12 })).resolves.toBeUndefined();
    });
  });
});
