import { createTestBuilder } from 'api-tests/builder';
import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';

/**
 * The admin clone route passes the sanitized request body to the document manager's `clone`,
 * which reads `body.locale` as the locale of the clone. These tests record that body. The route
 * validates `locale` as a string or null and sets the body locale to the request locale
 * (`getDocumentLocaleAndStatus`). For a localized type, `locale` is a string: the one sent, or the
 * default locale. For a non-localized type, it is the string sent, or `undefined` when the request
 * sent none or null.
 */
const LOCALIZED_UID = 'api::clone-localized.clone-localized';
const PLAIN_UID = 'api::clone-plain.clone-plain';

const localizedModel = {
  attributes: { title: { type: 'string', pluginOptions: { i18n: { localized: true } } } },
  pluginOptions: { i18n: { localized: true } },
  draftAndPublish: true,
  displayName: 'Clone localized',
  singularName: 'clone-localized',
  pluralName: 'clone-localizeds',
  description: '',
  collectionName: '',
};

const plainModel = {
  attributes: { title: { type: 'string' } },
  draftAndPublish: true,
  displayName: 'Clone plain',
  singularName: 'clone-plain',
  pluralName: 'clone-plains',
  description: '',
  collectionName: '',
};

describe('CM API - clone passes the body locale to the document manager', () => {
  const builder = createTestBuilder();
  let strapi: any;
  let rq: any;
  let cloneSpy: jest.SpyInstance;

  beforeAll(async () => {
    await builder.addContentTypes([localizedModel, plainModel]).build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    await rq({
      method: 'POST',
      url: '/i18n/locales',
      body: { code: 'fr', name: 'French (fr)', isDefault: false },
    });

    cloneSpy = jest.spyOn(strapi.plugin('content-manager').service('document-manager'), 'clone');
  });

  afterEach(() => {
    cloneSpy.mockClear();
  });

  afterAll(async () => {
    cloneSpy.mockRestore();
    await strapi.db.query('plugin::i18n.locale').deleteMany({ where: { code: { $ne: 'en' } } });
    await strapi.destroy();
    await builder.cleanup();
  });

  test('localized type: body.locale is the locale string the request sent', async () => {
    const source = await strapi
      .documents(LOCALIZED_UID)
      .create({ data: { title: 'Source fr' }, locale: 'fr' });

    const res = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${LOCALIZED_UID}/clone/${source.documentId}`,
      body: { title: 'Clone fr', locale: 'fr' },
    });

    expect(res.statusCode).toBe(200);
    expect(cloneSpy).toHaveBeenCalledTimes(1);
    const body = cloneSpy.mock.calls[0][1];
    expect(body.locale).toBe('fr');
    expect(res.body.data.locale).toBe('fr');
  });

  test('localized type without a body locale: body.locale is the default locale', async () => {
    const source = await strapi.documents(LOCALIZED_UID).create({ data: { title: 'Source en' } });

    const res = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${LOCALIZED_UID}/clone/${source.documentId}`,
      body: { title: 'Clone default' },
    });

    expect(res.statusCode).toBe(200);
    const body = cloneSpy.mock.calls[0][1];
    expect(body.locale).toBe('en');
  });

  test('localized type: a non-string body locale is rejected before clone runs', async () => {
    const source = await strapi.documents(LOCALIZED_UID).create({ data: { title: 'Source en' } });

    const res = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${LOCALIZED_UID}/clone/${source.documentId}`,
      body: { title: 'Clone invalid', locale: 42 },
    });

    expect(res.statusCode).toBe(400);
    expect(cloneSpy).not.toHaveBeenCalled();
  });

  test('localized type: a null body locale becomes the default locale', async () => {
    const source = await strapi.documents(LOCALIZED_UID).create({ data: { title: 'Source en' } });

    const res = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${LOCALIZED_UID}/clone/${source.documentId}`,
      body: { title: 'Clone null', locale: null },
    });

    expect(res.statusCode).toBe(200);
    const body = cloneSpy.mock.calls[0][1];
    expect(body.locale).toBe('en');
  });

  test('non-localized type without a body locale: body.locale is undefined', async () => {
    const source = await strapi.documents(PLAIN_UID).create({ data: { title: 'Source plain' } });

    const res = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${PLAIN_UID}/clone/${source.documentId}`,
      body: { title: 'Clone plain' },
    });

    expect(res.statusCode).toBe(200);
    const body = cloneSpy.mock.calls[0][1];
    expect(body.locale).toBeUndefined();
  });

  test('non-localized type: a body locale string reaches clone as sent', async () => {
    const source = await strapi.documents(PLAIN_UID).create({ data: { title: 'Source plain' } });

    const res = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${PLAIN_UID}/clone/${source.documentId}`,
      body: { title: 'Clone plain locale', locale: 'fr' },
    });

    expect(res.statusCode).toBe(200);
    const body = cloneSpy.mock.calls[0][1];
    expect(body.locale).toBe('fr');
  });

  test('non-localized type: a null body locale reaches clone as undefined', async () => {
    const source = await strapi.documents(PLAIN_UID).create({ data: { title: 'Source plain' } });

    const res = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${PLAIN_UID}/clone/${source.documentId}`,
      body: { title: 'Clone plain null', locale: null },
    });

    expect(res.statusCode).toBe(200);
    const body = cloneSpy.mock.calls[0][1];
    expect(body.locale).toBeUndefined();
  });
});
