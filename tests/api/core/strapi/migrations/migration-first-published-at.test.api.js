'use strict';

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');
const modelsUtils = require('api-tests/models');

const builder = createTestBuilder();
let strapi;
let rq;
const data = {
  dogs: [],
};

const dogModel = {
  attributes: {
    name: {
      type: 'string',
      required: false,
    },
  },
  draftAndPublish: true,
  firstPublishedAtField: false,
  connection: 'default',
  singularName: 'dog',
  pluralName: 'dogs',
  displayName: 'Dog',
  description: '',
  collectionName: '',
};

const dogs = [
  {
    name: 'Atos',
    publishedAt: '2025-04-10T06:27:42.483Z',
  },
];

const restart = async () => {
  await strapi.destroy();
  strapi = await createStrapiInstance();
  rq = await createAuthRequest({ strapi });
};

describe('Migration - first published at', () => {
  beforeAll(async () => {
    await builder.addContentType(dogModel).addFixtures(dogModel.singularName, dogs).build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    data.dogs = await builder.sanitizedFixturesFor(dogModel.singularName, strapi);
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  describe('Enabling first published at', () => {
    test('First published field is added with value same as published at when it is enabled for a content type', async () => {
      const dogBefore = await strapi.db.query('api::dog.dog').findOne();

      expect(dogBefore.firstPublishedAtField).not.toBeDefined();

      const schema = await modelsUtils.getContentTypeSchema(dogModel.singularName, { strapi });

      schema.options = {};
      schema.options.firstPublishedAtField = true;

      await modelsUtils.modifyContentType(schema, { strapi });

      await restart();

      const dogAfter = await strapi.db.query('api::dog.dog').findOne();

      expect(dogAfter.firstPublishedAt).toBeDefined();
      expect(dogAfter.firstPublishedAt).toEqual(dogAfter.publishedAt);
    });
  });
});
