/**
 * REST `DELETE` with `status=draft` on draft and publish content types.
 *
 * Delete removes every version of a document (draft and published), so deleting only the draft
 * is rejected with a 400. Without a status, or with `status=published`, delete works as usual.
 */
import { createTestBuilder } from 'api-tests/builder';
import { createStrapiInstance } from 'api-tests/strapi';
import { createContentAPIRequest } from 'api-tests/request';

const DRAFT_DELETE_ERROR_MESSAGE =
  'Cannot delete only the draft of a document. delete() removes every version: use unpublish() to remove the published version or discardDraft() to reset the draft.';

const collectionTypeModel = {
  kind: 'collectionType',
  singularName: 'dp-delete-article',
  pluralName: 'dp-delete-articles',
  displayName: 'DP delete article',
  draftAndPublish: true,
  attributes: {
    title: { type: 'string' },
  },
};

const singleTypeModel = {
  kind: 'singleType',
  singularName: 'dp-delete-homepage',
  pluralName: 'dp-delete-homepages',
  displayName: 'DP delete homepage',
  draftAndPublish: true,
  attributes: {
    title: { type: 'string' },
  },
};

const builder = createTestBuilder();
let strapi;
let rq;

const createArticle = async (title: string) => {
  const res = await rq({
    method: 'POST',
    url: `/${collectionTypeModel.pluralName}`,
    body: { data: { title } },
  });

  expect(res.statusCode).toBe(201);

  return res.body.data.documentId;
};

const putHomepage = async (title: string) => {
  const res = await rq({
    method: 'PUT',
    url: `/${singleTypeModel.singularName}`,
    body: { data: { title } },
  });

  expect(res.statusCode).toBe(200);
};

const countVersions = async (uid: string) => {
  return strapi.db.query(uid).count();
};

describe('REST delete with status=draft on draft and publish content types', () => {
  const articleUid = `api::${collectionTypeModel.singularName}.${collectionTypeModel.singularName}`;
  const homepageUid = `api::${singleTypeModel.singularName}.${singleTypeModel.singularName}`;

  beforeAll(async () => {
    await builder.addContentTypes([collectionTypeModel, singleTypeModel]).build();

    strapi = await createStrapiInstance();
    rq = await createContentAPIRequest({ strapi });
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  describe('Collection type', () => {
    test('Returns 400 and deletes nothing', async () => {
      const documentId = await createArticle('Article to keep');
      const versionsBefore = await countVersions(articleUid);
      // Draft and published versions exist, so a partial delete would be visible
      expect(versionsBefore).toBe(2);

      const res = await rq({
        method: 'DELETE',
        url: `/${collectionTypeModel.pluralName}/${documentId}`,
        qs: { status: 'draft' },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatchObject({
        name: 'ValidationError',
        message: DRAFT_DELETE_ERROR_MESSAGE,
      });
      expect(await countVersions(articleUid)).toBe(versionsBefore);

      const cleanup = await rq({
        method: 'DELETE',
        url: `/${collectionTypeModel.pluralName}/${documentId}`,
      });

      expect(cleanup.statusCode).toBe(204);
    });

    test.each([
      ['status=published', { status: 'published' }],
      ['no status', {}],
    ])('Returns 204 and deletes every version with %s', async (_label, qs) => {
      const documentId = await createArticle('Article to delete');

      const res = await rq({
        method: 'DELETE',
        url: `/${collectionTypeModel.pluralName}/${documentId}`,
        qs,
      });

      expect(res.statusCode).toBe(204);
      expect(await strapi.db.query(articleUid).count({ where: { documentId } })).toBe(0);
    });
  });

  describe('Single type', () => {
    test('Returns 400 and deletes nothing', async () => {
      await putHomepage('Homepage to keep');
      expect(await countVersions(homepageUid)).toBe(2);

      const res = await rq({
        method: 'DELETE',
        url: `/${singleTypeModel.singularName}`,
        qs: { status: 'draft' },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatchObject({
        name: 'ValidationError',
        message: DRAFT_DELETE_ERROR_MESSAGE,
      });
      expect(await countVersions(homepageUid)).toBe(2);
    });

    test.each([
      ['status=published', { status: 'published' }],
      ['no status', {}],
    ])('Returns 204 and deletes every version with %s', async (_label, qs) => {
      await putHomepage('Homepage to delete');

      const res = await rq({
        method: 'DELETE',
        url: `/${singleTypeModel.singularName}`,
        qs,
      });

      expect(res.statusCode).toBe(204);
      expect(await countVersions(homepageUid)).toBe(0);
    });
  });
});
