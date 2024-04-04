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

const getRelations = async (rq, uid, field, id) => {
  const res = await rq({
    method: 'GET',
    url: `/content-manager/relations/${uid}/${id}/${field}`,
  });

  return res;
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

  const rq = await createAuthRequest({ strapi, userInfo: user });

  return rq;
};

describe('Relations', () => {
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
    ]);
  };

  beforeAll(async () => {
    await builder.addContentTypes([productModel, shopModel]).build();

    strapi = await createStrapiInstance();
    utils = createUtils(strapi);

    rq = await createAuthRequest({ strapi });
    await createFixtures();

    product = await createEntry('api::product.product', { name: 'Skate' });
    shop = await createEntry(
      'api::shop.shop',
      { name: 'Shop', products: [product.id] },
      populateShop
    );
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
      shop.id
    );

    // Main field should be in here
    expect(products.results).toHaveLength(1);
    // Main field should be visible
    expect(products.results[0].name).toBe(product.name);
  });

  test('Restricted user cannot read shop products mainField', async () => {
    const { body: products } = await getRelations(
      rqRestricted,
      'api::shop.shop',
      'products',
      shop.id
    );

    expect(products.results).toHaveLength(1);
    // Main field should not be visible
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
      user.id
    );

    // Main field should be visible
    expect(role.data?.name).toBe('Authenticated');
  });
});
