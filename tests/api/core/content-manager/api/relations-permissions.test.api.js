'use strict';

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');
const { createUtils } = require('api-tests/utils');

let strapi;
let utils;
// Requests
let rq;
let rqRestricted;
let rqPermissive;
// Entries
let product;
let shop;
let user;

const populateShop = ['products'];

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

const shopModel = {
  attributes: {
    name: {
      type: 'string',
    },
    products: {
      type: 'relation',
      relation: 'manyToMany',
      target: 'api::product.product',
      targetAttribute: 'shops',
    },
  },
  displayName: 'Shop',
  singularName: 'shop',
  pluralName: 'shops',
};

const createEntry = async (model, data, populate) => {
  const { body } = await rq({
    method: 'POST',
    url: `/content-manager/collection-types/${model}`,
    body: data,
    qs: { populate },
  });

  return body;
};

const getRelations = async (rq, uid, field, id, params = {}) => {
  return rq({
    method: 'GET',
    url: `/content-manager/relations/${uid}/${id}/${field}`,
    qs: params,
  });
};

const createUserAndReq = async (userName, permissions) => {
  const role = await utils.createRole({
    name: `role-${userName}`,
    description: `Role with restricted permissions for ${userName}`,
  });

  const rolePermissions = await utils.assignPermissionsToRole(role.id, permissions);
  Object.assign(role, { permissions: rolePermissions });

  const user = await utils.createUser({
    firstname: userName,
    lastname: 'User',
    email: `${userName}.user@strapi.io`,
    roles: [role.id],
  });

  return createAuthRequest({ strapi, userInfo: user });
};

describe('Relation permissions', () => {
  const builder = createTestBuilder();

  const createFixtures = async () => {
    rqRestricted = await createUserAndReq('restricted', [
      // Can read shops but not products
      {
        action: 'plugin::content-manager.explorer.read',
        subject: 'api::shop.shop',
      },
      {
        action: 'plugin::content-manager.explorer.read',
        subject: 'plugin::users-permissions.user',
      },
      {
        action: 'plugin::users-permissions.roles.read',
      },
    ]);
    rqPermissive = await createUserAndReq('permissive', [
      // Can read shops and products
      {
        action: 'plugin::content-manager.explorer.read',
        subject: 'api::shop.shop',
      },
      {
        action: 'plugin::content-manager.explorer.read',
        subject: 'api::product.product',
      },
      {
        action: 'plugin::content-manager.explorer.read',
        subject: 'plugin::users-permissions.user',
      },
      {
        action: 'plugin::users-permissions.roles.read',
      },
    ]);
  };

  beforeAll(async () => {
    await builder.addContentTypes([productModel, shopModel]).build();

    strapi = await createStrapiInstance();
    utils = createUtils(strapi);

    rq = await createAuthRequest({ strapi });
    await createFixtures();

    const productEntry = await createEntry('api::product.product', { name: 'Skate' });
    product = productEntry.data;

    const shopEntry = await createEntry(
      'api::shop.shop',
      { name: 'Shop', products: [product.id] },
      populateShop
    );
    shop = shopEntry.data;

    user = await createEntry('plugin::users-permissions.user', {
      username: 'Alice',
      email: 'test-relations@strapi.io',
      password: '1234-never-gonna-hack-you-up',
      role: 1,
    });
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  test('Permissive user can read shop products mainField', async () => {
    const { body: products } = await getRelations(
      rqPermissive,
      'api::shop.shop',
      'products',
      shop.documentId
    );

    // The main field should be in here
    expect(products.results).toHaveLength(1);
    // The main field should be visible
    expect(products.results[0].name).toBe(product.name);
  });

  /**
   * Prevent relations being loaded without the main field if user has appropriate permissions.
   * Ref: https://github.com/strapi/strapi/issues/19625
   */
  test('Permissive user can read multiple pages of shop products', async () => {
    // Add more products
    const products = [];

    for (let i = 0; i < 10; i += 1) {
      const productEntry = await createEntry('api::product.product', { name: `Product ${i}` });
      products.push(productEntry.data.id);
    }

    const shop = await createEntry('api::shop.shop', { name: 'Shop', products }, populateShop);

    const { body: firstPage } = await getRelations(
      rqPermissive,
      'api::shop.shop',
      'products',
      shop.data.documentId,
      { page: 1, pageSize: 5 }
    );

    expect(firstPage.results).toHaveLength(5);
    // Expect results to have the name field (main field)
    expect(firstPage.results[0].name).toBeDefined();

    const { body: secondPage } = await getRelations(
      rqPermissive,
      'api::shop.shop',
      'products',
      shop.data.documentId,
      { page: 2, pageSize: 5 }
    );

    expect(secondPage.results).toHaveLength(5);
    // Expect results to have the name field (main field)
    expect(secondPage.results[0].name).toBeDefined();
  });

  test('Restricted user cannot read shop products mainField', async () => {
    const { body: products } = await getRelations(
      rqRestricted,
      'api::shop.shop',
      'products',
      shop.documentId
    );

    expect(products.results).toHaveLength(1);
    // The main field should not be visible
    expect(products.results[0].name).toBeUndefined();
    expect(products.results[0].id).toBe(product.id);
  });

  /**
   * Test hardcoded condition to populate the user role names
   * if the user has the permission to read users
   */
  test('Restricted user can read user role names', async () => {
    const { body: role } = await getRelations(
      rqRestricted,
      'plugin::users-permissions.user',
      'role',
      user.documentId
    );

    // The main field should be visible
    expect(role.results?.[0].name).toBe('Authenticated');
  });
});
