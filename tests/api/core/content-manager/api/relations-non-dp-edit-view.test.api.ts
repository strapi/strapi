/**
 * Re-saving a parent entry that has a "relates to one" field pointing at
 * a Draft & Publish content type must not drop the related entry from
 * the Edit View. The List View and the REST API used to keep showing it
 * while the Edit View went blank, so we exercise that endpoint directly.
 */
import { createTestBuilder } from 'api-tests/builder';
import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';

const productUid = 'api::product.product';
const shopUid = 'api::shop.shop';

const productModel = {
  displayName: 'Product',
  singularName: 'product',
  pluralName: 'products',
  draftAndPublish: true,
  attributes: {
    name: {
      type: 'string',
    },
  },
};

const shopModel = {
  displayName: 'Shop',
  singularName: 'shop',
  pluralName: 'shops',
  draftAndPublish: false,
  attributes: {
    name: {
      type: 'string',
    },
    products_ow: {
      type: 'relation',
      relation: 'oneToOne',
      target: productUid,
    },
    products_oo: {
      type: 'relation',
      relation: 'oneToOne',
      target: productUid,
      targetAttribute: 'shop',
    },
    products_mo: {
      type: 'relation',
      relation: 'manyToOne',
      target: productUid,
      targetAttribute: 'shops_mo',
    },
  },
};

const populateShop = ['products_ow', 'products_oo', 'products_mo'];

describe('non-DP source with xToOne relation to DP target', () => {
  const builder = createTestBuilder();
  let strapi: any;
  let rq: any;
  let productDocumentId: string;

  const getShopFromEditView = async (documentId: string) =>
    rq({
      method: 'GET',
      url: `/content-manager/collection-types/${shopUid}/${documentId}`,
      qs: { populate: populateShop, status: 'draft' },
    });

  const updateShop = async (documentId: string, data: Record<string, unknown>) =>
    rq({
      method: 'PUT',
      url: `/content-manager/collection-types/${shopUid}/${documentId}`,
      body: data,
    });

  const createShop = async (data: Record<string, unknown>) =>
    rq({
      method: 'POST',
      url: `/content-manager/collection-types/${shopUid}`,
      body: data,
    });

  const createProduct = async (data: Record<string, unknown>) =>
    rq({
      method: 'POST',
      url: `/content-manager/collection-types/${productUid}`,
      body: data,
    });

  const publishProduct = async (documentId: string) =>
    rq({
      method: 'POST',
      url: `/content-manager/collection-types/${productUid}/${documentId}/actions/publish`,
    });

  beforeAll(async () => {
    await builder.addContentTypes([productModel, shopModel]).build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    const { body: product } = await createProduct({ name: 'Vehicle' });
    productDocumentId = product.data.documentId;
    await publishProduct(productDocumentId);
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  test.each([['products_ow'], ['products_oo'], ['products_mo']])(
    '%s remains visible in the Edit View after a PUT that re-sets the same relation',
    async (relationField) => {
      const { body: created } = await createShop({
        name: `Shop-${relationField}`,
        [relationField]: { documentId: productDocumentId },
      });

      const createdShopDocId = created.data.documentId;

      const { body: afterCreate } = await getShopFromEditView(createdShopDocId);
      // Edit View shows a count for "relates to one" fields. Stays at 1
      // after create; previously dropped to 0 after the update below.
      expect(afterCreate.data[relationField]).toMatchObject({ count: 1 });

      await updateShop(createdShopDocId, {
        name: `Shop-${relationField}-updated`,
        [relationField]: { documentId: productDocumentId },
      });

      const { body: afterUpdate } = await getShopFromEditView(createdShopDocId);
      expect(afterUpdate.data[relationField]).toMatchObject({ count: 1 });
    }
  );
});
