import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';
import { createUtils, describeOnCondition } from 'api-tests/utils';
import { createTestBuilder } from 'api-tests/builder';
import fs from 'fs';
import path from 'path';

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

const edition = process.env.STRAPI_DISABLE_EE === 'true' ? 'CE' : 'EE';

describeOnCondition(edition === 'EE')('Preview', () => {
  const builder = createTestBuilder();
  let strapi;
  let rq;

  const updateEntry = async ({ uid, documentId, data, locale }) => {
    const type = documentId ? 'collection-types' : 'single-types';
    const params = documentId ? `${type}/${uid}/${documentId}` : `${type}/${uid}`;

    const { body } = await rq({
      method: 'PUT',
      url: `/content-manager/${params}`,
      body: data,
      qs: { locale },
    });

    return body;
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
    const singleTypeEntry = await updateEntry({
      uid: singleTypeUid,
      documentId: undefined,
      locale: 'en',
      data: {
        title: 'Welcome',
      },
    });
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  test('Get preview URL for collection type', async () => {
    strapi.config.set('admin.preview', {
      enabled: true,
      handler: (uid, { documentId, locale, status }) => {
        return `/preview/${uid}/${documentId}?locale=${locale}&status=${status}`;
      },
    });

    const { body, statusCode } = await getPreviewUrl({
      uid: collectionTypeUid,
      documentId: '1',
      locale: 'en',
      status: 'draft',
    });

    expect(statusCode).toBe(200);
    expect(body.data.url).toEqual(`/preview/${collectionTypeUid}/1?locale=en&status=draft`);
  });
});
