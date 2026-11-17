import { createTestBuilder } from 'api-tests/builder';
import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';

/**
 * The content manager checks that a document exists before it writes it, but the write is a
 * separate step. When the document is deleted between the check and the write (for example by a
 * concurrent request), the write matches no document. The response must then be a 404, not a
 * 200 with an empty `data`.
 *
 * A document service middleware deletes the document right before the write, to simulate the
 * concurrent delete in a deterministic way.
 */
const COLLECTION_UID = 'api::missing-doc-article.missing-doc-article';
const SINGLE_UID = 'api::missing-doc-homepage.missing-doc-homepage';

const collectionModel = {
  kind: 'collectionType',
  displayName: 'Missing doc article',
  singularName: 'missing-doc-article',
  pluralName: 'missing-doc-articles',
  draftAndPublish: true,
  attributes: {
    title: { type: 'string' },
  },
};

const singleModel = {
  kind: 'singleType',
  displayName: 'Missing doc homepage',
  singularName: 'missing-doc-homepage',
  pluralName: 'missing-doc-homepages',
  draftAndPublish: true,
  attributes: {
    title: { type: 'string' },
  },
};

type Trap = { uid: string; action: string };

describe('CM API - write on a document deleted after the existence check', () => {
  const builder = createTestBuilder();
  let strapi: any;
  let rq: any;
  let trap: Trap | null = null;

  const deleteDocumentBefore = (uid: string, action: string) => {
    trap = { uid, action };
  };

  beforeAll(async () => {
    await builder.addContentTypes([collectionModel, singleModel]).build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    strapi.documents.use(async (ctx: any, next: () => Promise<unknown>) => {
      if (trap !== null && ctx.uid === trap.uid && ctx.action === trap.action) {
        trap = null;
        await strapi.db.query(ctx.uid).deleteMany({ where: { documentId: ctx.params.documentId } });
      }

      return next();
    });
  });

  afterEach(async () => {
    trap = null;
    await strapi.db.query(COLLECTION_UID).deleteMany({});
    await strapi.db.query(SINGLE_UID).deleteMany({});
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  describe('Collection types', () => {
    test('update returns 404', async () => {
      const article = await strapi.documents(COLLECTION_UID).create({ data: { title: 'Draft' } });
      deleteDocumentBefore(COLLECTION_UID, 'update');

      const res = await rq({
        method: 'PUT',
        url: `/content-manager/collection-types/${COLLECTION_UID}/${article.documentId}`,
        body: { title: 'Updated' },
      });

      expect(res.statusCode).toBe(404);
      expect(res.body.error).toMatchObject({ name: 'NotFoundError' });
    });

    test('clone returns 404', async () => {
      const article = await strapi.documents(COLLECTION_UID).create({ data: { title: 'Draft' } });
      deleteDocumentBefore(COLLECTION_UID, 'clone');

      const res = await rq({
        method: 'POST',
        url: `/content-manager/collection-types/${COLLECTION_UID}/clone/${article.documentId}`,
        body: { title: 'Clone' },
      });

      expect(res.statusCode).toBe(404);
      expect(res.body.error).toMatchObject({ name: 'NotFoundError' });
    });
  });

  describe('Single types', () => {
    test('update returns 404', async () => {
      await strapi.documents(SINGLE_UID).create({ data: { title: 'Draft' } });
      deleteDocumentBefore(SINGLE_UID, 'update');

      const res = await rq({
        method: 'PUT',
        url: `/content-manager/single-types/${SINGLE_UID}`,
        body: { title: 'Updated' },
      });

      expect(res.statusCode).toBe(404);
      expect(res.body.error).toMatchObject({ name: 'NotFoundError' });
    });

    test('publish returns 404', async () => {
      await strapi.documents(SINGLE_UID).create({ data: { title: 'Draft' } });
      deleteDocumentBefore(SINGLE_UID, 'publish');

      const res = await rq({
        method: 'POST',
        url: `/content-manager/single-types/${SINGLE_UID}/actions/publish`,
        body: { title: 'Published' },
      });

      expect(res.statusCode).toBe(404);
      expect(res.body.error).toMatchObject({ name: 'NotFoundError' });
    });
  });
});
