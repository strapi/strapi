'use strict';

const { createStrapiInstance } = require('api-tests/strapi');
const { createTestBuilder } = require('api-tests/builder');
const { createAuthRequest } = require('api-tests/request');

const builder = createTestBuilder();
let strapi;
let rq;

const product = {
  attributes: {
    name: {
      type: 'string',
      required: true,
    },
  },
  config: {
    attributes: {
      hiddenAttribute: {
        hidden: true,
      },
    },
  },
  draftAndPublish: true,
  displayName: 'Product',
  singularName: 'product',
  pluralName: 'products',
  description: '',
  collectionName: '',
};

/** Isolated type for GH #26030 (many rows, identical created_at); keeps product tests on 5 rows. */
const paginationTieUid = 'api::paginationtie.paginationtie';
const paginationTie = {
  attributes: {
    name: {
      type: 'string',
      required: true,
    },
  },
  displayName: 'PaginationTie',
  singularName: 'paginationtie',
  pluralName: 'paginationties',
  description: '',
  collectionName: '',
};

const createProduct = async (product) => {
  const res = await rq({
    method: 'POST',
    url: '/content-manager/collection-types/api::product.product',
    body: product,
  });

  return { data: res.body.data, status: res.statusCode };
};

const getProducts = async ({ page, pageSize }) => {
  const res = await rq({
    method: 'GET',
    url: `/content-manager/collection-types/api::product.product`,
    qs: {
      page,
      pageSize,
    },
  });

  return { products: res.body.results, pagination: res.body.pagination, status: res.statusCode };
};

describe('CM API - Pagination', () => {
  beforeAll(async () => {
    await builder.addContentType(product).addContentType(paginationTie).build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    await Promise.all([
      createProduct({ name: 'Product 1' }),
      createProduct({ name: 'Product 2' }),
      createProduct({ name: 'Product 3' }),
      createProduct({ name: 'Product 4' }),
      createProduct({ name: 'Product 5' }),
    ]);

    const tieCount = 100;
    await strapi.db
      .query(paginationTieUid)
      .createMany({ data: Array.from({ length: tieCount }, (_, i) => ({ name: `row-${i}` })) });
    const { tableName } = strapi.db.metadata.get(paginationTieUid);
    await strapi.db.connection(tableName).update({ created_at: '2020-01-01 00:00:00.000' });
  }, 120000);

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  test('Default pagination', async () => {
    const { products, pagination, status } = await getProducts({});

    expect(status).toBe(200);
    expect(pagination.page).toBe(1);
    expect(pagination.pageSize).toBe(10);
    expect(pagination.total).toBe(5);
    expect(products).toHaveLength(5);
  });

  test('Custom pagination', async () => {
    // Get first page
    const { products, pagination, status } = await getProducts({ page: 1, pageSize: 3 });

    expect(status).toBe(200);
    expect(pagination.page).toBe(1);
    expect(pagination.pageSize).toBe(3);
    expect(pagination.total).toBe(5);
    expect(products).toHaveLength(3);
    // Products should be Product 1, Product 2, Product 3
    expect(products).toMatchObject([
      { name: 'Product 1' },
      { name: 'Product 2' },
      { name: 'Product 3' },
    ]);
  });

  test('Custom pagination - second page', async () => {
    // Get second page
    const { products, pagination, status } = await getProducts({ page: 2, pageSize: 3 });

    expect(status).toBe(200);
    expect(pagination.page).toBe(2);
    expect(pagination.pageSize).toBe(3);
    expect(pagination.total).toBe(5);
    expect(products).toHaveLength(2);
    // Products should be Product 4, Product 5
    expect(products).toMatchObject([{ name: 'Product 4' }, { name: 'Product 5' }]);
  });

  // GH #26030: without a deterministic ORDER BY (e.g. MySQL), pages could repeat rows; SQL fix is covered in @strapi/database unit tests.
  test('pagination across many documents does not repeat documentIds (no sort)', async () => {
    const pageSize = 10;
    const seen = new Set();
    let page = 1;
    let totalFromMeta = null;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const res = await rq({
        method: 'GET',
        url: `/content-manager/collection-types/${paginationTieUid}`,
        qs: { page, pageSize },
      });

      expect(res.statusCode).toBe(200);
      const { results, pagination } = res.body;

      if (totalFromMeta === null) {
        totalFromMeta = pagination.total;
      }

      for (const doc of results) {
        expect(seen.has(doc.documentId)).toBe(false);
        seen.add(doc.documentId);
      }

      if (page >= pagination.pageCount) {
        break;
      }
      page += 1;
    }

    expect(seen.size).toBe(totalFromMeta);
  });
});
