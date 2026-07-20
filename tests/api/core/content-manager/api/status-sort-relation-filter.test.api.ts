import { createTestBuilder } from 'api-tests/builder';
import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';

/**
 * Regression for #26746: CM list view 500 when sorting by Status with a relation
 * filter on a non-id field (JOIN + SELECT DISTINCT + ORDER BY status CASE).
 */
const UID_PRODUCT = 'api::product.product';
const UID_LISTING = 'api::listing.listing';

const productModel = {
  attributes: {
    name: {
      type: 'string',
    },
  },
  displayName: 'Product',
  singularName: 'product',
  pluralName: 'products',
  description: '',
  collectionName: '',
};

const listingModel = {
  attributes: {
    title: {
      type: 'string',
    },
    product: {
      type: 'relation',
      relation: 'manyToOne',
      target: UID_PRODUCT,
    },
  },
  draftAndPublish: true,
  displayName: 'Listing',
  singularName: 'listing',
  pluralName: 'listings',
  description: '',
  collectionName: '',
};

describe('CM API - status sort with relation filter (#26746)', () => {
  const builder = createTestBuilder();
  let strapi: any;
  let rq: any;

  let sharedProductDocumentId: string;
  let otherProductDocumentId: string;
  let draftListingTitle: string;
  let publishedListingTitle: string;
  let excludedListingTitle: string;

  const createProduct = async (name: string) => {
    const res = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${UID_PRODUCT}`,
      body: { name },
    });

    expect(res.statusCode).toBe(201);
    return res.body.data;
  };

  const createListing = async (title: string, productDocumentId: string) => {
    const res = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${UID_LISTING}`,
      body: {
        title,
        product: { documentId: productDocumentId },
      },
    });

    expect(res.statusCode).toBe(201);
    return res.body.data;
  };

  const publishListing = async (documentId: string) => {
    const res = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${UID_LISTING}/${documentId}/actions/publish`,
    });

    expect(res.statusCode).toBe(200);
    return res.body.data;
  };

  const listListings = async (qs: Record<string, unknown>) => {
    return rq({
      method: 'GET',
      url: `/content-manager/collection-types/${UID_LISTING}`,
      qs,
    });
  };

  beforeAll(async () => {
    await builder.addContentTypes([productModel, listingModel]).build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    const sharedProduct = await createProduct('SharedProduct');
    const otherProduct = await createProduct('OtherProduct');

    sharedProductDocumentId = sharedProduct.documentId;
    otherProductDocumentId = otherProduct.documentId;

    draftListingTitle = 'Listing draft';
    publishedListingTitle = 'Listing published';
    excludedListingTitle = 'Listing excluded';

    await createListing(draftListingTitle, sharedProductDocumentId);

    const published = await createListing(publishedListingTitle, sharedProductDocumentId);
    await publishListing(published.documentId);

    await createListing(excludedListingTitle, otherProductDocumentId);
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  test('returns 200 when sorting by status with a relation filter on a non-id field', async () => {
    const res = await listListings({
      sort: 'status:ASC',
      filters: {
        product: {
          name: {
            $eq: 'SharedProduct',
          },
        },
      },
      page: 1,
      pageSize: 10,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.results).toHaveLength(2);

    const titles = res.body.results.map((entry: { title: string }) => entry.title).sort();
    expect(titles).toEqual([draftListingTitle, publishedListingTitle].sort());
  });

  test('returns draft listings first when sorting by status ascending', async () => {
    const res = await listListings({
      sort: 'status:ASC',
      filters: {
        product: {
          name: {
            $eq: 'SharedProduct',
          },
        },
      },
      page: 1,
      pageSize: 10,
    });

    expect(res.statusCode).toBe(200);

    const statuses = res.body.results.map((entry: { status: string }) => entry.status);

    expect(statuses).toEqual(expect.arrayContaining(['draft', 'published']));
    expect(statuses[0]).toBe('draft');
  });

  test('relation filter alone and status sort alone still succeed', async () => {
    const filterOnly = await listListings({
      filters: {
        product: {
          name: {
            $eq: 'SharedProduct',
          },
        },
      },
      page: 1,
      pageSize: 10,
    });

    expect(filterOnly.statusCode).toBe(200);
    expect(filterOnly.body.results).toHaveLength(2);

    const sortOnly = await listListings({
      sort: 'status:ASC',
      page: 1,
      pageSize: 10,
    });

    expect(sortOnly.statusCode).toBe(200);
    expect(sortOnly.body.results.length).toBeGreaterThanOrEqual(3);
  });
});
