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
  draftAndPublish: false,
  attributes: {
    name: {
      type: 'string',
      unique: false,
    },
  },
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
  },
  {
    name: 'Atos',
  },
];

const restart = async () => {
  await strapi.destroy();
  strapi = await createStrapiInstance();
  rq = await createAuthRequest({ strapi });
};

describe('Migration - unique attribute', () => {
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

  describe('Unique: false -> true', () => {
    test('Can have duplicates before migration', async () => {
      const { body } = await rq({
        url: '/content-manager/collection-types/api::dog.dog',
        method: 'GET',
      });
      expect(body.results.length).toBe(2);
      expect(body.results[0].name).toEqual(body.results[1].name);
    });

    test('Cannot create a duplicated entry after migration', async () => {
      // remove duplicated values otherwise the migration would fail
      const { body } = await rq({
        url: `/content-manager/collection-types/api::dog.dog/${data.dogs[0].id}`,
        method: 'PUT',
        body: { name: 'Nelson' },
      });
      data.dogs[0] = body;

      // migration
      const schema = await modelsUtils.getContentTypeSchema(dogModel.singularName, { strapi });
      schema.attributes.name.unique = true;
      await modelsUtils.modifyContentType(schema, { strapi });

      await restart();

      // Try to create a duplicated entry
      const res = await rq({
        method: 'POST',
        url: '/content-manager/collection-types/api::dog.dog',
        body: { name: data.dogs[0].name },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('Unique: true -> false', () => {
    test('Can create a duplicated entry after migration', async () => {
      // migration
      const schema = await modelsUtils.getContentTypeSchema(dogModel.singularName, { strapi });
      schema.attributes.name.unique = false;
      await modelsUtils.modifyContentType(schema, { strapi });

      await restart();

      // Try to create a duplicated entry
      const res = await rq({
        url: `/content-manager/collection-types/api::dog.dog`,
        method: 'POST',
        body: { name: data.dogs[0].name },
      });

      expect(res.body).toMatchObject({ name: data.dogs[0].name });
      data.dogs.push(res.body);
    });
  });
});
