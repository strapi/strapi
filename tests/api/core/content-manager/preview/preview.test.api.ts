import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';
import { createTestBuilder } from 'api-tests/builder';

const collectionTypeUid = 'api::product.product';
const collectionTypeModel = {
  singularName: 'product',
  pluralName: 'products',
  displayName: 'Product',
  kind: 'collectionType',
  draftAndPublish: true,
  pluginOptions: {
    i18n: {
      localized: true,
    },
  },
  attributes: {
    name: {
      type: 'string',
    },
  },
};

const singleTypeUid = 'api::homepage.homepage';
const singleTypeModel = {
  singularName: 'homepage',
  pluralName: 'homepages',
  displayName: 'Homepage',
  kind: 'singleType',
  draftAndPublish: true,
  pluginOptions: {
    i18n: {
      localized: true,
    },
  },
  attributes: {
    title: {
      type: 'string',
    },
  },
};

describe('Preview', () => {
  const builder = createTestBuilder();
  let strapi;
  let rq;
  let singleTypeEntry;
  const handlerCalls: Array<Record<string, unknown>> = [];

  const updateEntry = async ({ uid, documentId, data, locale }) => {
    const type = documentId ? 'collection-types' : 'single-types';
    const params = documentId ? `${type}/${uid}/${documentId}` : `${type}/${uid}`;

    const { body } = await rq({
      method: 'PUT',
      url: `/content-manager/${params}`,
      body: data,
      qs: { locale },
    });

    return body.data;
  };

  const getPreviewUrl = async ({ uid, documentId, locale, status }) => {
    return rq({
      method: 'GET',
      url: `/content-manager/preview/url/${uid}`,
      qs: { documentId, locale, status },
    });
  };

  beforeAll(async () => {
    await builder.addContentTypes([collectionTypeModel, singleTypeModel]).build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    // Update the single type to create an initial history version
    singleTypeEntry = await updateEntry({
      uid: singleTypeUid,
      documentId: undefined,
      locale: 'en',
      data: {
        title: 'Welcome',
      },
    });

    // Configure the preview URL handler
    strapi.config.set('admin.preview', {
      enabled: true,
      config: {
        handler: (uid, params) => {
          handlerCalls.push(params);
          const { documentId, locale, status } = params;
          return `/preview/${uid}/${documentId}?locale=${locale}&status=${status}`;
        },
      },
    });
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  test('Get preview URL for collection type', async () => {
    const { body, statusCode } = await getPreviewUrl({
      uid: collectionTypeUid,
      documentId: '1',
      locale: 'en',
      status: 'draft',
    });

    expect(statusCode).toBe(200);
    expect(body.data.url).toEqual(`/preview/${collectionTypeUid}/1?locale=en&status=draft`);
  });

  test('Get preview URL for single type', async () => {
    const { body, statusCode } = await getPreviewUrl({
      uid: singleTypeUid,
      documentId: undefined,
      locale: 'en',
      status: 'draft',
    });

    expect(statusCode).toBe(200);
    expect(body.data.url).toEqual(
      `/preview/${singleTypeUid}/${singleTypeEntry.documentId}?locale=en&status=draft`
    );
  });

  test('Reject an unknown status', async () => {
    const { body, statusCode } = await getPreviewUrl({
      uid: collectionTypeUid,
      documentId: '1',
      locale: 'en',
      status: 'foo',
    });

    expect(statusCode).toBe(400);
    expect(body.error.name).toBe('ValidationError');
  });

  describe('Locale passed to the handler', () => {
    const getPreviewUrlWithQueryString = async (queryString: string) => {
      handlerCalls.length = 0;

      const { statusCode } = await rq({
        method: 'GET',
        url: `/content-manager/preview/url/${collectionTypeUid}?${queryString}`,
      });

      expect(statusCode).toBe(200);
      expect(handlerCalls).toHaveLength(1);

      return handlerCalls[0];
    };

    test('Omits the locale when the query has none', async () => {
      const params = await getPreviewUrlWithQueryString('documentId=1&status=draft');

      expect(params).not.toHaveProperty('locale');
    });

    test('Omits the locale when the query has a bare locale parameter', async () => {
      // A bare `locale` is parsed as null, which the handler params type does not admit
      const params = await getPreviewUrlWithQueryString('documentId=1&status=draft&locale');

      expect(params).not.toHaveProperty('locale');
    });

    test('Keeps an empty locale as an empty string', async () => {
      const params = await getPreviewUrlWithQueryString('documentId=1&status=draft&locale=');

      expect(params).toHaveProperty('locale', '');
    });

    test('Passes the locale when the query has one', async () => {
      const params = await getPreviewUrlWithQueryString('documentId=1&status=draft&locale=en');

      expect(params).toEqual({ documentId: '1', locale: 'en', status: 'draft' });
    });
  });
});
