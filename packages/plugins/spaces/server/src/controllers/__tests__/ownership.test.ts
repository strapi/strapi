import type { Context } from 'koa';

import { SPACE_ATTRIBUTE } from '../../../../shared/constants';
import { getScope, runInSpace } from '../../scope/context';
import createOwnershipController from '../ownership';

const FRANCE = { id: 1, name: 'France', slug: 'fr' };
const GERMANY = { id: 2, name: 'Germany', slug: 'de' };

interface Options {
  /** Rows as stored: several per document, one per locale and status. */
  rows?: Array<Record<string, unknown>>;
  /** A content type listed here is not scoped by Spaces. */
  unscoped?: string[];
  known?: string[];
}

const makeStrapi = ({
  rows = [],
  unscoped = [],
  known = ['api::article.article'],
}: Options = {}) => {
  const reads: Array<{ where: unknown; scope: string }> = [];

  const strapi = {
    requestContext: { get: () => undefined },
    contentType: (uid: string) =>
      known.includes(uid)
        ? { uid, attributes: unscoped.includes(uid) ? { title: {} } : { [SPACE_ATTRIBUTE]: {} } }
        : undefined,
    db: {
      query: () => ({
        async findMany({ where }: { where: { documentId: { $in: string[] } } }) {
          reads.push({ where, scope: currentScope() });

          return rows.filter((row) => where.documentId.$in.includes(row.documentId as string));
        },
      }),
    },
  } as never;

  const currentScope = () => getScope(strapi).mode;

  return { strapi, reads, controller: createOwnershipController({ strapi }) };
};

type TestContext = Context & { body: any };

const makeCtx = (query: Record<string, unknown>) =>
  ({ query, state: {} }) as unknown as TestContext;

const row = (documentId: string, space: unknown, extra: Record<string, unknown> = {}) => ({
  documentId,
  [SPACE_ATTRIBUTE]: space,
  ...extra,
});

describe('which space a document belongs to', () => {
  describe('the answer', () => {
    it('names the space, for the all-spaces list', async () => {
      const { controller } = makeStrapi({ rows: [row('doc-1', FRANCE)] });
      const ctx = makeCtx({ uid: 'api::article.article', documentIds: 'doc-1' });

      await controller.find(ctx);

      expect(ctx.body.data).toEqual({ 'doc-1': FRANCE });
    });

    it('is one per document, whatever its locales and drafts say', async () => {
      // A document has one owner across every row that makes it up.
      const { controller } = makeStrapi({
        rows: [
          row('doc-1', FRANCE, { locale: 'en' }),
          row('doc-1', FRANCE, { locale: 'fr' }),
          row('doc-1', FRANCE, { publishedAt: null }),
        ],
      });
      const ctx = makeCtx({ uid: 'api::article.article', documentIds: 'doc-1' });

      await controller.find(ctx);

      expect(ctx.body.data).toEqual({ 'doc-1': FRANCE });
    });

    it('is null for a document no space owns', async () => {
      const { controller } = makeStrapi({ rows: [row('doc-1', null)] });
      const ctx = makeCtx({ uid: 'api::article.article', documentIds: 'doc-1' });

      await controller.find(ctx);

      expect(ctx.body.data).toEqual({ 'doc-1': null });
    });

    it('covers several documents at once, so a list page costs one request', async () => {
      const { controller } = makeStrapi({
        rows: [row('doc-1', FRANCE), row('doc-2', GERMANY)],
      });
      const ctx = makeCtx({ uid: 'api::article.article', documentIds: 'doc-1,doc-2' });

      await controller.find(ctx);

      expect(ctx.body.data).toEqual({ 'doc-1': FRANCE, 'doc-2': GERMANY });
    });

    it('accepts the ids as repeated query parameters too', async () => {
      const { controller } = makeStrapi({ rows: [row('doc-1', FRANCE)] });
      const ctx = makeCtx({ uid: 'api::article.article', documentIds: ['doc-1'] });

      await controller.find(ctx);

      expect(ctx.body.data).toEqual({ 'doc-1': FRANCE });
    });

    it('ignores blank ids rather than asking about them', async () => {
      const { controller, reads } = makeStrapi({ rows: [row('doc-1', FRANCE)] });
      const ctx = makeCtx({ uid: 'api::article.article', documentIds: 'doc-1, ,' });

      await controller.find(ctx);

      expect(reads[0].where).toEqual({ documentId: { $in: ['doc-1'] } });
    });
  });

  describe('the lookup', () => {
    it('reads past the caller’s own space, because that is the whole point', async () => {
      // The route is reachable only by someone allowed to see across spaces.
      const { controller, reads } = makeStrapi({ rows: [row('doc-1', GERMANY)] });
      const ctx = makeCtx({ uid: 'api::article.article', documentIds: 'doc-1' });

      await runInSpace({ id: 1, slug: 'fr' }, () => controller.find(ctx));

      expect(reads[0].scope).toBe('unscoped');
      expect(ctx.body.data).toEqual({ 'doc-1': GERMANY });
    });

    it('does not happen for a content type Spaces does not scope', async () => {
      const { controller, reads } = makeStrapi({ unscoped: ['api::article.article'] });
      const ctx = makeCtx({ uid: 'api::article.article', documentIds: 'doc-1' });

      await controller.find(ctx);

      expect(ctx.body).toEqual({ data: {} });
      expect(reads).toEqual([]);
    });

    it('does not happen when nothing was asked about', async () => {
      const { controller, reads } = makeStrapi();
      const ctx = makeCtx({ uid: 'api::article.article' });

      await controller.find(ctx);

      expect(ctx.body).toEqual({ data: {} });
      expect(reads).toEqual([]);
    });
  });

  describe('what it refuses', () => {
    it('refuses a missing content type', async () => {
      const { controller } = makeStrapi();

      await expect(controller.find(makeCtx({ documentIds: 'doc-1' }))).rejects.toThrow(
        '"uid" must name a content type.'
      );
    });

    it('refuses one that does not exist', async () => {
      const { controller } = makeStrapi();

      await expect(
        controller.find(makeCtx({ uid: 'api::nope.nope', documentIds: 'doc-1' }))
      ).rejects.toThrow('"uid" must name a content type.');
    });

    it('refuses more documents than a page could hold', async () => {
      // Otherwise one request could ask about the entire dataset.
      const { controller } = makeStrapi();
      const documentIds = Array.from({ length: 201 }, (_, index) => `doc-${index}`).join(',');

      await expect(
        controller.find(makeCtx({ uid: 'api::article.article', documentIds }))
      ).rejects.toThrow(/At most 200 documents/);
    });

    it('accepts exactly as many as it allows', async () => {
      const { controller } = makeStrapi();
      const documentIds = Array.from({ length: 200 }, (_, index) => `doc-${index}`).join(',');

      await expect(
        controller.find(makeCtx({ uid: 'api::article.article', documentIds }))
      ).resolves.toBeUndefined();
    });
  });
});
