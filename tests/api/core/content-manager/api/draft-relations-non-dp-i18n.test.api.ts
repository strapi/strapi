import { createTestBuilder } from 'api-tests/builder';
import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';

const builder = createTestBuilder();
let strapi: any;
let rq: any;

const UID_PAGE = 'api::page.page';
const UID_MENU = 'api::menu.menu';
const UID_HOMEPAGE = 'api::homepage.homepage';

const nonDefaultLocale = 'fr';

// Page: Draft & Publish + i18n (issue #26897)
const pageModel = {
  displayName: 'Page',
  singularName: 'page',
  pluralName: 'pages',
  draftAndPublish: true,
  pluginOptions: {
    i18n: { localized: true },
  },
  attributes: {
    title: {
      type: 'string',
      pluginOptions: { i18n: { localized: true } },
    },
  },
};

// Menu: NO Draft & Publish + i18n, one-way relation to Page (issue #26897)
const menuModel = {
  displayName: 'Menu',
  singularName: 'menu',
  pluralName: 'menus',
  draftAndPublish: false,
  pluginOptions: {
    i18n: { localized: true },
  },
  attributes: {
    page: {
      type: 'relation',
      relation: 'oneToOne',
      target: UID_PAGE,
    },
  },
};

// Homepage: single type, same shape as Menu (issue #26897)
const homepageModel = {
  kind: 'singleType',
  displayName: 'Homepage',
  singularName: 'homepage',
  pluralName: 'homepages',
  draftAndPublish: false,
  pluginOptions: {
    i18n: { localized: true },
  },
  attributes: {
    page: {
      type: 'relation',
      relation: 'oneToOne',
      target: UID_PAGE,
    },
  },
};

describe('CM API - countDraftRelations on a non-D&P i18n content type (issue #26897)', () => {
  beforeAll(async () => {
    await builder.addContentTypes([pageModel, menuModel, homepageModel]).build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    await rq({
      method: 'POST',
      url: '/i18n/locales',
      body: {
        code: nonDefaultLocale,
        name: `French (${nonDefaultLocale})`,
        isDefault: false,
      },
    });
  });

  afterAll(async () => {
    await strapi.db.query('plugin::i18n.locale').deleteMany({ code: { $ne: 'en' } });
    await strapi.destroy();
    await builder.cleanup();
  });

  test('returns 200 with the draft relation count when counting in a non-default locale', async () => {
    // 1. Page in default locale (en)
    const {
      body: { data: pageEn },
    } = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${UID_PAGE}`,
      body: { title: 'Home' },
    });

    // 2. Page localized to fr
    await rq({
      method: 'PUT',
      url: `/content-manager/collection-types/${UID_PAGE}/${pageEn.documentId}`,
      qs: { locale: nonDefaultLocale },
      body: { title: 'Accueil' },
    });

    // 3. Menu in default locale (en) with the page relation
    const {
      body: { data: menuEn },
    } = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${UID_MENU}`,
      body: { page: pageEn.documentId },
    });

    // 4. Localize the menu to fr, also filling the page relation
    const localizeRes = await rq({
      method: 'PUT',
      url: `/content-manager/collection-types/${UID_MENU}/${menuEn.documentId}`,
      qs: { locale: nonDefaultLocale },
      body: { page: pageEn.documentId },
    });
    expect(localizeRes.statusCode).toBe(200);

    // 5. Count draft relations in the non-default locale -> the fr page is still a draft
    const countRes = await rq({
      method: 'GET',
      url: `/content-manager/collection-types/${UID_MENU}/${menuEn.documentId}/actions/countDraftRelations`,
      qs: { locale: nonDefaultLocale },
    });

    expect(countRes.statusCode).toBe(200);
    expect(countRes.body.data).toMatchObject({ unpublishedRelations: 1, draftM2mLinks: 0 });
  });

  test('returns 200 with zero counts when the requested locale does not exist yet', async () => {
    // Menu exists only in the default locale (en)
    const {
      body: { data: menuEn },
    } = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${UID_MENU}`,
      body: {},
    });

    // Switching to a locale that does not exist yet still triggers a count
    const countRes = await rq({
      method: 'GET',
      url: `/content-manager/collection-types/${UID_MENU}/${menuEn.documentId}/actions/countDraftRelations`,
      qs: { locale: nonDefaultLocale },
    });

    expect(countRes.statusCode).toBe(200);
    expect(countRes.body.data).toMatchObject({ unpublishedRelations: 0, draftM2mLinks: 0 });
  });

  test('returns 200 with zero counts for a single type whose requested locale does not exist yet', async () => {
    // Homepage exists only in the default locale (en)
    const createRes = await rq({
      method: 'PUT',
      url: `/content-manager/single-types/${UID_HOMEPAGE}`,
      body: {},
    });
    expect(createRes.statusCode).toBe(200);

    const countRes = await rq({
      method: 'GET',
      url: `/content-manager/single-types/${UID_HOMEPAGE}/actions/countDraftRelations`,
      qs: { locale: nonDefaultLocale },
    });

    expect(countRes.statusCode).toBe(200);
    expect(countRes.body.data).toMatchObject({ unpublishedRelations: 0, draftM2mLinks: 0 });
  });

  test('still returns 404 when the document does not exist in any locale', async () => {
    const countRes = await rq({
      method: 'GET',
      url: `/content-manager/collection-types/${UID_MENU}/does-not-exist/actions/countDraftRelations`,
      qs: { locale: nonDefaultLocale },
    });

    expect(countRes.statusCode).toBe(404);
  });
});
