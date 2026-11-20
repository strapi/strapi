import { createTestBuilder } from 'api-tests/builder';
import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';

/**
 * Records the runtime shape of the rows of `meta.availableStatus`, the other publication status of
 * a document, as the collection-types `findOne` admin route returns them. A localized content type
 * reads them through the full metadata path, a non-localized one through the status-only path.
 */
const UID_LOCALIZED = 'api::localized-article.localized-article';
const UID_PLAIN = 'api::plain-article.plain-article';

const localizedModel = {
  attributes: {
    title: { type: 'string' },
  },
  pluginOptions: { i18n: { localized: true } },
  draftAndPublish: true,
  displayName: 'Localized article',
  singularName: 'localized-article',
  pluralName: 'localized-articles',
  description: '',
  collectionName: '',
};

const plainModel = {
  attributes: {
    title: { type: 'string' },
  },
  draftAndPublish: true,
  displayName: 'Plain article',
  singularName: 'plain-article',
  pluralName: 'plain-articles',
  description: '',
  collectionName: '',
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

describe('CM API - availableStatus rows', () => {
  const builder = createTestBuilder();
  let strapi: any;
  let rq: any;

  const createAndPublish = async (uid: string, query: Record<string, string> = {}) => {
    const created = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${uid}`,
      qs: query,
      body: { title: 'created through the admin' },
    });
    expect(created.statusCode).toBe(201);

    const { documentId } = created.body.data;
    const published = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${uid}/${documentId}/actions/publish`,
      qs: query,
    });
    expect(published.statusCode).toBe(200);

    return documentId as string;
  };

  const findOne = async (uid: string, documentId: string, query: Record<string, string>) => {
    const res = await rq({
      method: 'GET',
      url: `/content-manager/collection-types/${uid}/${documentId}`,
      qs: query,
    });
    expect(res.statusCode).toBe(200);
    return res.body;
  };

  // The status-only path (non-localized) and the full path (localized) return different author keys.
  const STATUS_ONLY_USER_KEYS = ['email', 'firstname', 'id', 'lastname'];
  const FULL_PATH_USER_KEYS = ['email', 'firstname', 'id', 'isActive', 'lastname', 'username'];

  const expectAdminUser = (user: Record<string, unknown>, keys: string[]) => {
    expect(Object.keys(user).sort()).toEqual(keys);
    expect(user).toMatchObject({
      id: expect.any(Number),
      firstname: expect.any(String),
      lastname: expect.any(String),
      email: expect.any(String),
    });
  };

  beforeAll(async () => {
    await builder.addContentTypes([localizedModel, plainModel]).build();
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  describe('localized content type', () => {
    let documentId: string;

    beforeAll(async () => {
      documentId = await createAndPublish(UID_LOCALIZED, { locale: 'en' });
    });

    test('the draft lists its published version', async () => {
      const { meta } = await findOne(UID_LOCALIZED, documentId, { locale: 'en' });

      expect(meta.availableStatus).toHaveLength(1);
      const [row] = meta.availableStatus;

      expect(Object.keys(row).sort()).toEqual(
        [
          'createdAt',
          'createdBy',
          'documentId',
          'id',
          'locale',
          'publishedAt',
          'updatedAt',
          'updatedBy',
        ].sort()
      );
      expect(row.id).toEqual(expect.any(Number));
      expect(row.documentId).toBe(documentId);
      expect(row.locale).toBe('en');
      expect(row.createdAt).toMatch(ISO_DATE);
      expect(row.updatedAt).toMatch(ISO_DATE);
      expect(row.publishedAt).toMatch(ISO_DATE);
      expectAdminUser(row.createdBy, FULL_PATH_USER_KEYS);
      expectAdminUser(row.updatedBy, FULL_PATH_USER_KEYS);
    });

    test('the published version lists its draft, whose publishedAt is null', async () => {
      const { meta } = await findOne(UID_LOCALIZED, documentId, {
        locale: 'en',
        status: 'published',
      });

      expect(meta.availableStatus).toHaveLength(1);
      const [row] = meta.availableStatus;

      expect(row.locale).toBe('en');
      expect(row.publishedAt).toBeNull();
      expect(row.createdAt).toMatch(ISO_DATE);
      expect(row.updatedAt).toMatch(ISO_DATE);
    });
  });

  describe('non-localized content type', () => {
    let documentId: string;

    beforeAll(async () => {
      documentId = await createAndPublish(UID_PLAIN);
    });

    test('the draft lists its published version, whose locale is null', async () => {
      const { meta } = await findOne(UID_PLAIN, documentId, {});

      expect(meta.availableStatus).toHaveLength(1);
      const [row] = meta.availableStatus;

      expect(Object.keys(row).sort()).toEqual(
        [
          'createdAt',
          'createdBy',
          'documentId',
          'id',
          'locale',
          'publishedAt',
          'updatedAt',
          'updatedBy',
        ].sort()
      );
      expect(row.id).toEqual(expect.any(Number));
      expect(row.documentId).toBe(documentId);
      expect(row.locale).toBeNull();
      expect(row.createdAt).toMatch(ISO_DATE);
      expect(row.updatedAt).toMatch(ISO_DATE);
      expect(row.publishedAt).toMatch(ISO_DATE);
      expectAdminUser(row.createdBy, STATUS_ONLY_USER_KEYS);
      expectAdminUser(row.updatedBy, STATUS_ONLY_USER_KEYS);
    });

    test('the published version lists its draft, whose publishedAt is null', async () => {
      const { meta } = await findOne(UID_PLAIN, documentId, { status: 'published' });

      expect(meta.availableStatus).toHaveLength(1);
      const [row] = meta.availableStatus;

      expect(row.locale).toBeNull();
      expect(row.publishedAt).toBeNull();
    });

    test('a version created without an admin user has null createdBy and updatedBy', async () => {
      const draft = await strapi.documents(UID_PLAIN).create({ data: { title: 'no author' } });
      await strapi.documents(UID_PLAIN).publish({ documentId: draft.documentId });

      const { meta } = await findOne(UID_PLAIN, draft.documentId, {});

      expect(meta.availableStatus).toHaveLength(1);
      const [row] = meta.availableStatus;

      expect(row.createdBy).toBeNull();
      expect(row.updatedBy).toBeNull();
    });
  });
});
