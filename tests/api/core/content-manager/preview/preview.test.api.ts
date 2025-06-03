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
        handler: (uid, { documentId, locale, status }) => {
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
});
