import { createTestBuilder } from 'api-tests/builder';
import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';

/**
 *
 * When opening a relation-field dropdown in the Content Manager, the same
 * target document must not appear twice (once as "Modified" and once as
 * "Published").
 */
const UID_PRODUCT = 'api::product.product';
const UID_SHOP = 'api::shop.shop';

const productModel = {
  attributes: {
    name: {
      type: 'string',
    },
  },
  draftAndPublish: true,
  displayName: 'Product',
  singularName: 'product',
  pluralName: 'products',
  description: '',
  collectionName: '',
};

const shopModel = {
  attributes: {
    name: {
      type: 'string',
    },
    products_mw: {
      type: 'relation',
      relation: 'oneToMany',
      target: UID_PRODUCT,
    },
  },
  draftAndPublish: true,
  displayName: 'Shop',
  singularName: 'shop',
  pluralName: 'shops',
  description: '',
  collectionName: '',
};

describe('CM API - Relations findAvailable status labels', () => {
  const builder = createTestBuilder();
  let strapi: any;
  let rq: any;

  // Product documentIds for each seeded state
  let draftOnlyDocId: string;
  let publishedCleanDocId: string;
  let modifiedDocId: string;

  let shopDocId: string;

  const createProduct = async (name: string) => {
    const res = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${UID_PRODUCT}`,
      body: { name },
    });

    expect(res.statusCode).toBe(201);
    return res.body.data;
  };

  const publishProduct = async (documentId: string) => {
    const res = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${UID_PRODUCT}/${documentId}/actions/publish`,
    });

    expect(res.statusCode).toBe(200);
    return res.body.data;
  };

  const updateProduct = async (documentId: string, name: string) => {
    const res = await rq({
      method: 'PUT',
      url: `/content-manager/collection-types/${UID_PRODUCT}/${documentId}`,
      body: { name },
    });

    expect(res.statusCode).toBe(200);
    return res.body.data;
  };

  const findAvailable = async (id: string, query: Record<string, any> = {}) => {
    const res = await rq({
      method: 'GET',
      url: `/content-manager/relations/${UID_SHOP}/products_mw`,
      qs: { id, pageSize: 50, ...query },
    });

    expect(res.statusCode).toBe(200);
    return res.body;
  };

  const expectNoDuplicatesAndCorrectBadges = (body: any) => {
    const documentIds = body.results.map((r: any) => r.documentId);
    const uniqueDocumentIds = Array.from(new Set(documentIds));

    expect(documentIds).toHaveLength(uniqueDocumentIds.length);
    expect(body.pagination.total).toBe(uniqueDocumentIds.length);

    const byDocId = new Map<string, any>(body.results.map((r: any) => [r.documentId, r]));
    expect(byDocId.get(draftOnlyDocId)?.status).toBe('draft');
    expect(byDocId.get(publishedCleanDocId)?.status).toBe('published');
    expect(byDocId.get(modifiedDocId)?.status).toBe('modified');
  };

  beforeAll(async () => {
    await builder.addContentTypes([productModel, shopModel]).build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    // draftOnly — never published → effective status "draft"
    const draftOnly = await createProduct('draftOnly');
    draftOnlyDocId = draftOnly.documentId;

    // publishedClean — created and published, never touched again → "published"
    const publishedClean = await createProduct('publishedClean');
    publishedCleanDocId = publishedClean.documentId;
    await publishProduct(publishedCleanDocId);

    // modified — created, published, then updated so the draft row is newer
    // than the published row → effective status "modified"
    const modified = await createProduct('modified-v1');
    modifiedDocId = modified.documentId;
    await publishProduct(modifiedDocId);
    // Ensure the draft row's updatedAt strictly exceeds the published row's
    await new Promise((resolve) => setTimeout(resolve, 50));
    await updateProduct(modifiedDocId, 'modified-v2');

    const res = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${UID_SHOP}`,
      body: { name: 'MainShop' },
    });

    expect(res.statusCode).toBe(201);
    shopDocId = res.body.data.documentId;
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  test('default (no status param) — no duplicates, correct status badges', async () => {
    const body = await findAvailable(shopDocId);
    expectNoDuplicatesAndCorrectBadges(body);
  });

  test('status=draft — no duplicates, correct status badges', async () => {
    const body = await findAvailable(shopDocId, { status: 'draft' });
    expectNoDuplicatesAndCorrectBadges(body);
  });
});
