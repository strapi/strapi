import { createTestBuilder } from 'api-tests/builder';
import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';

/**
 * The Content Manager list-view publication-status filter must be evaluated
 * per-locale. A locale that has never been published must always appear under
 * the "Draft" filter, regardless of the publication state of its sibling
 * locales.
 *
 * Regression test for: applying the Draft filter on a draft-only locale dropped
 * the document when another locale of the same document was published (the
 * filter was wired to the document-scoped `never-published-document` mode
 * instead of the locale-scoped `never-published` mode).
 */
const PRODUCT_UID = 'api::product.product';

const productModel = {
  attributes: {
    name: {
      type: 'string',
    },
  },
  pluginOptions: {
    i18n: {
      localized: true,
    },
  },
  draftAndPublish: true,
  displayName: 'Product',
  singularName: 'product',
  pluralName: 'products',
  description: '',
  collectionName: '',
};

describe('CM API - List view per-locale publication status filter', () => {
  const builder = createTestBuilder();
  let strapi: any;
  let rq: any;

  // en draft (never published) + fr published — the bug scenario
  let splitDocId: string;
  // en draft only (no sibling locales) — baseline draft
  let enDraftOnlyDocId: string;
  // en published (and clean) — must never show under the en Draft filter
  let enPublishedDocId: string;

  const createEnDraft = async (name: string): Promise<string> => {
    const doc = await strapi.documents(PRODUCT_UID).create({
      data: { name },
      locale: 'en',
    });
    return doc.documentId;
  };

  const addLocale = async (documentId: string, locale: string, name: string) => {
    await strapi.documents(PRODUCT_UID).update({
      documentId,
      locale,
      data: { name },
    });
  };

  const publishLocale = async (documentId: string, locale: string) => {
    await strapi.documents(PRODUCT_UID).publish({ documentId, locale });
  };

  const listByStatusFilter = async (locale: string, status: string) => {
    const res = await rq({
      method: 'GET',
      url: `/content-manager/collection-types/${PRODUCT_UID}`,
      qs: {
        locale,
        page: 1,
        pageSize: 100,
        filters: { $and: [{ __status: { $eq: status } }] },
      },
    });

    expect(res.statusCode).toBe(200);
    return res.body.results as Array<{ documentId: string; status: string }>;
  };

  const byDocId = (results: Array<{ documentId: string }>, documentId: string) =>
    results.find((r) => r.documentId === documentId);

  beforeAll(async () => {
    await builder.addContentType(productModel).build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    await rq({
      method: 'POST',
      url: '/i18n/locales',
      body: { code: 'fr', name: 'French (fr)', isDefault: false },
    });

    // splitDoc: en is a draft that has never been published; fr is published.
    splitDocId = await createEnDraft('split-en-draft');
    await addLocale(splitDocId, 'fr', 'split-fr');
    await publishLocale(splitDocId, 'fr');

    // enDraftOnly: a plain draft with no other locale.
    enDraftOnlyDocId = await createEnDraft('en-draft-only');

    // enPublished: published in en, clean.
    enPublishedDocId = await createEnDraft('en-published');
    await publishLocale(enPublishedDocId, 'en');
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  test('Draft filter on en returns a draft-only locale even when a sibling locale is published', async () => {
    const results = await listByStatusFilter('en', 'draft');

    const split = byDocId(results, splitDocId);
    expect(split).toBeDefined();
    expect(split?.status).toBe('draft');
  });

  test('Draft filter on en still returns a plain draft-only document', async () => {
    const results = await listByStatusFilter('en', 'draft');
    expect(byDocId(results, enDraftOnlyDocId)).toBeDefined();
  });

  test('Draft filter on en excludes a document published in en', async () => {
    const results = await listByStatusFilter('en', 'draft');
    expect(byDocId(results, enPublishedDocId)).toBeUndefined();
  });

  test('Draft filter on fr excludes the document whose fr locale is published', async () => {
    const results = await listByStatusFilter('fr', 'draft');
    expect(byDocId(results, splitDocId)).toBeUndefined();
  });

  test('Published filter on en excludes a locale that was never published', async () => {
    const results = await listByStatusFilter('en', 'published');
    expect(byDocId(results, splitDocId)).toBeUndefined();
    // sanity: the en-published document is present
    expect(byDocId(results, enPublishedDocId)).toBeDefined();
  });
});
