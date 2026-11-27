/**
 * An RBAC condition using `$exists` must give the same answer for the list (SQL, where
 * `$exists` maps to `$notNull`) and for a single document (in-memory ability check).
 * A null field counts as absent on both sides.
 */
import { createTestBuilder } from 'api-tests/builder';
import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';
import { createUtils } from 'api-tests/utils';

import type { Core, Data, UID } from '@strapi/types';

const uid: UID.ContentType = 'api::product.product';
const baseUrl = `/content-manager/collection-types/${uid}`;

const productModel = {
  singularName: 'product',
  pluralName: 'products',
  displayName: 'Product',
  draftAndPublish: false,
  attributes: {
    name: { type: 'string' },
    price: { type: 'integer' },
  },
};

const customConditions = [
  {
    displayName: 'Has price',
    name: 'has-price',
    plugin: 'test',
    handler: () => ({ price: { $exists: true } }),
  },
  {
    displayName: 'Has no price',
    name: 'has-no-price',
    plugin: 'test',
    handler: () => ({ price: { $exists: false } }),
  },
];

const readPermission = (condition: string) => ({
  action: 'plugin::content-manager.explorer.read',
  subject: uid,
  fields: null,
  conditions: [condition],
});

describe('Admin Permissions - $exists conditions', () => {
  let strapi: Core.Strapi;
  let utils: ReturnType<typeof createUtils>;
  const builder = createTestBuilder();

  let adminRq: Awaited<ReturnType<typeof createAuthRequest>>;
  let hasPriceRq: Awaited<ReturnType<typeof createAuthRequest>>;
  let hasNoPriceRq: Awaited<ReturnType<typeof createAuthRequest>>;

  const roleIds: Data.ID[] = [];
  const userIds: Data.ID[] = [];

  const products: Record<'priced' | 'unpriced', { name: string; documentId?: Data.DocumentID }> = {
    priced: { name: 'Priced' },
    unpriced: { name: 'Unpriced' },
  };

  const createUserWithCondition = async (email: string, condition: string) => {
    const role = await utils.createRole({ name: email, description: condition });
    await utils.assignPermissionsToRole(role.id, [readPermission(condition)]);
    roleIds.push(role.id);

    const user = await utils.createUser({
      firstname: 'Test',
      lastname: 'User',
      email,
      password: 'fooBar42',
      roles: [role.id],
    });
    userIds.push(user.id);

    return createAuthRequest({ strapi, userInfo: user });
  };

  const listDocumentIds = async (rq: typeof adminRq) => {
    const res = await rq({ method: 'GET', url: baseUrl });
    expect(res.statusCode).toBe(200);
    return res.body.results.map((entry: { documentId: Data.DocumentID }) => entry.documentId);
  };

  beforeAll(async () => {
    await builder.addContentType(productModel).build();

    strapi = await createStrapiInstance({
      bootstrap({ strapi }: { strapi: Core.Strapi }) {
        return strapi.service('admin::permission').conditionProvider.registerMany(customConditions);
      },
    });
    utils = createUtils(strapi);
    adminRq = await createAuthRequest({ strapi });

    const priced = await adminRq({
      method: 'POST',
      url: baseUrl,
      body: { name: products.priced.name, price: 10 },
    });
    expect(priced.statusCode).toBe(201);
    products.priced.documentId = priced.body.data.documentId;

    const unpriced = await adminRq({
      method: 'POST',
      url: baseUrl,
      body: { name: products.unpriced.name, price: null },
    });
    expect(unpriced.statusCode).toBe(201);
    expect(unpriced.body.data.price).toBeNull();
    products.unpriced.documentId = unpriced.body.data.documentId;

    hasPriceRq = await createUserWithCondition('has-price@test.com', 'plugin::test.has-price');
    hasNoPriceRq = await createUserWithCondition(
      'has-no-price@test.com',
      'plugin::test.has-no-price'
    );
  });

  afterAll(async () => {
    await utils.deleteUsersById(userIds);
    await utils.deleteRolesById(roleIds);

    await strapi.destroy();
    await builder.cleanup();
  });

  describe('$exists: true', () => {
    test('the list shows only the product with a price', async () => {
      expect(await listDocumentIds(hasPriceRq)).toEqual([products.priced.documentId]);
    });

    test('the product with a price can be opened', async () => {
      const res = await hasPriceRq({
        method: 'GET',
        url: `${baseUrl}/${products.priced.documentId}`,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toMatchObject({ name: products.priced.name, price: 10 });
    });

    test('the product with a null price cannot be opened', async () => {
      const res = await hasPriceRq({
        method: 'GET',
        url: `${baseUrl}/${products.unpriced.documentId}`,
      });

      expect(res.statusCode).toBe(403);
    });
  });

  describe('$exists: false', () => {
    test('the list shows only the product with a null price, with its fields', async () => {
      const res = await hasNoPriceRq({ method: 'GET', url: baseUrl });

      expect(res.statusCode).toBe(200);
      expect(res.body.results).toHaveLength(1);
      expect(res.body.results[0]).toMatchObject({
        documentId: products.unpriced.documentId,
        name: products.unpriced.name,
      });
    });

    test('the product with a null price can be opened', async () => {
      const res = await hasNoPriceRq({
        method: 'GET',
        url: `${baseUrl}/${products.unpriced.documentId}`,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toMatchObject({ name: products.unpriced.name, price: null });
    });

    test('the product with a price cannot be opened', async () => {
      const res = await hasNoPriceRq({
        method: 'GET',
        url: `${baseUrl}/${products.priced.documentId}`,
      });

      expect(res.statusCode).toBe(403);
    });
  });
});
