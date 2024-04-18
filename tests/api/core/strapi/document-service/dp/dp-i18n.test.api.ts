import type { Core, UID } from '@strapi/types';
import { testInTransaction } from '../../../../utils';

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');

let strapi: Core.Strapi;
let shopDocuments;
let shopsDB;
let rq;
const builder = createTestBuilder();

const SHOP_UID = 'api::shop.shop' as UID.ContentType;
const CITY_UID = 'api::city.city' as UID.ContentType;

const cityModel = {
  displayName: 'city',
  singularName: 'city',
  pluralName: 'cities',
  draftAndPublish: true,
  attributes: {
    name: {
      type: 'string',
    },
  },
};

const compoModel = {
  displayName: 'compo',
  category: 'default',
  attributes: {
    name: {
      type: 'string',
    },
    city: {
      type: 'relation',
      relation: 'oneToOne',
      target: CITY_UID,
    },
    cities: {
      type: 'relation',
      relation: 'oneToMany',
      target: CITY_UID,
    },
  },
};

const shopModel = {
  displayName: 'Shop',
  singularName: 'shop',
  pluralName: 'shops',
  draftAndPublish: true,
  attributes: {
    name: {
      type: 'string',
    },
    unique: {
      type: 'string',
      unique: true,
    },
    minMaxLength: {
      type: 'string',
      minLength: 2,
      maxLength: 4,
    },
    component: {
      type: 'component',
      repeatable: false,
      component: 'default.compo',
    },
    components: {
      type: 'component',
      repeatable: true,
      component: 'default.compo',
    },
    city: {
      type: 'relation',
      relation: 'oneToOne',
      target: CITY_UID,
    },
    cities: {
      type: 'relation',
      relation: 'manyToMany',
      target: CITY_UID,
    },
  },
};

describe('Draft and publish', () => {
  beforeAll(async () => {
    await builder
      .addContentTypes([cityModel])
      .addComponent(compoModel)
      .addContentTypes([shopModel])
      .build();

    strapi = await createStrapiInstance();
    shopDocuments = strapi.documents(SHOP_UID);
    shopsDB = strapi.db.query(SHOP_UID);
    rq = await createAuthRequest({ strapi });
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  describe('Drafts', () => {
    testInTransaction('Can create a draft', async () => {});
    testInTransaction.todo('Can update a draft');
    testInTransaction.todo('Can delete a draft');
  });

  describe('Publish', () => {
    // When publishing, updatedAt data should be the same as the draft
    testInTransaction.todo('Can publish');
    testInTransaction.todo('Can update and publish');
    testInTransaction.todo('Can create and publish');

    testInTransaction.todo('Can publish multiple locales');
    testInTransaction.todo('Can publish all locales');

    describe('Relations', () => {
      testInTransaction.todo('Relations are published');
      testInTransaction.todo('Relations are not published if target is not published');
    });
  });

  describe('Unpublish', () => {
    testInTransaction.todo('Can unpublish');
    testInTransaction.todo('Can unpublish multiple locales');
    testInTransaction.todo('Can unpublish all locales');
  });

  describe('Discard Draft', () => {
    testInTransaction.todo('Can discard draft');
    testInTransaction.todo('Can discard draft of multiple locales');
    testInTransaction.todo('Can discard draft of all locales');

    describe('Relations', () => {
      testInTransaction.todo('Relations are discarded');
    });
  });

  describe('Clone', () => {
    testInTransaction.todo('Cloning only creates a draft');
  });

  describe('Validations', () => {
    describe('Uniqueness', () => {
      testInTransaction.todo('Unique - Can not create two drafts with the same unique value');
      testInTransaction.todo(
        'Unique - Can have a draft and a published document with the same unique value'
      );
      testInTransaction.todo(
        'Unique - Can not publish a document if another document with the same unique value is already published'
      );
      testInTransaction.todo('Unique - Can not create two drafts with the same unique value');
    });

    describe('Required', () => {
      testInTransaction.todo('Required - Can draft a document with a required field missing');
      testInTransaction.todo('Required - Can not publish a document with a required field missing');
    });

    describe('Min Max length', () => {
      testInTransaction.todo(
        'Min Max length - Can draft a document with a field with a length outside the min max range'
      );
      testInTransaction.todo(
        'Min Max length - Can not publish a document with a field with a length outside the min max range'
      );
    });
  });
});
