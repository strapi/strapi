'use strict';

const _ = require('lodash');

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');
const modelsUtils = require('api-tests/models');

let builder;
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
    },
    code: {
      type: 'string',
      unique: true,
    },
  },
  singularName: 'dog',
  pluralName: 'dogs',
  displayName: 'Dog',
  description: '',
  collectionName: '',
};

const dogs = [
  {
    name: 'Nelson',
    code: '1',
  },
  {
    name: 'Atos',
    code: '2',
  },
];

const restart = async () => {
  await strapi.destroy();
  strapi = await createStrapiInstance();
  rq = await createAuthRequest({ strapi });
};

const sortDogs = (dogs) => _.sortBy(dogs, 'name');

describe('Migration - draft and publish', () => {
  describe.each([
    ['without table modifications', {}, {}],
    ['with table modifications', { town: { type: 'string' } }, { color: { type: 'string' } }],
  ])('%p', (testName, tableModification1, tableModification2) => {
    beforeAll(async () => {
      builder = createTestBuilder();

      await builder.addContentType(dogModel).addFixtures(dogModel.singularName, dogs).build();

      strapi = await createStrapiInstance();
      rq = await createAuthRequest({ strapi });

      data.dogs = sortDogs(await builder.sanitizedFixturesFor(dogModel.singularName, strapi));
    });

    afterAll(async () => {
      await strapi.destroy();
      await builder.cleanup();
    });

    describe('Enabling D&P on a content-type', () => {
      // Disabled D&P always have publishedAt attribute set to a date
      test('Published at set before enabling the feature', async () => {
        const { body } = await rq({
          url: '/content-manager/collection-types/api::dog.dog',
          method: 'GET',
        });

        expect(body.results.length).toBe(2);

        const sortedBody = sortDogs(body.results);

        sortedBody.forEach((dog, index) => {
          expect(dog).toMatchObject(data.dogs[index]);
          expect(dog.publishedAt).toBeISODate();
        });
      });

      test('Draft versions are created after enabling the feature', async () => {
        const schema = await modelsUtils.getContentTypeSchema(dogModel.singularName, { strapi });

        await modelsUtils.modifyContentType(
          {
            ...schema,
            attributes: _.merge(schema.attributes, tableModification1),
            draftAndPublish: true,
          },
          { strapi }
        );

        await restart();

        const dogs = await strapi.db.query('api::dog.dog').findMany();

        // 2 published + 2 drafts
        expect(dogs.length).toBe(4);

        // Compare published and draft versions
        const dogsByDocumentId = _.groupBy(dogs, 'documentId');
        Object.values(dogsByDocumentId).forEach((versions) => {
          expect(versions.length).toBe(2);

          const publishedDog = versions.find((dog) => dog.publishedAt);
          const draftDog = versions.find((dog) => !dog.publishedAt);

          // Published dog should have a publishedAt value
          expect(draftDog.publishedAt).toBe(null);
          // Updated at value should be the same
          expect(draftDog.updatedAt).toBe(publishedDog.updatedAt);
        });

        data.dogs = sortDogs(dogs.filter((dog) => dog.publishedAt));
      });
    });

    describe('Disabling D&P on a content-type', () => {
      test('publishedAt after disabling the feature + draft removed', async () => {
        const res = await rq({
          method: 'POST',
          url: `/content-manager/collection-types/api::dog.dog/${data.dogs[1].documentId}/actions/unpublish`,
        });

        data.dogs[1] = res.body;

        const schema = await modelsUtils.getContentTypeSchema(dogModel.singularName, { strapi });

        await modelsUtils.modifyContentType(
          {
            ...schema,
            draftAndPublish: false,
            attributes: _.merge(schema.attributes, tableModification2),
          },
          { strapi }
        );

        await restart();

        // drafts should have been deleted with the migration, so we remove them
        data.dogs = data.dogs.filter((dog) => !_.isNil(dog.publishedAt));

        const { body } = await rq({
          url: '/content-manager/collection-types/api::dog.dog',
          method: 'GET',
        });

        expect(body.results.length).toBe(1);
        expect(body.results[0]).toMatchObject(_.pick(data.dogs[0], ['name']));
        expect(body.results[0].publishedAt).toBeISODate();
      });

      test('Unique constraint is kept after disabling the feature', async () => {
        const dogToCreate = { code: 'sameCode' };

        let res = await rq({
          method: 'POST',
          url: `/content-manager/collection-types/api::dog.dog/`,
          body: dogToCreate,
        });

        expect(res.statusCode).toBe(201);
        expect(res.body.data).toMatchObject(dogToCreate);

        data.dogs.push(res.body);

        res = await rq({
          method: 'POST',
          url: `/content-manager/collection-types/api::dog.dog/`,
          body: dogToCreate,
        });

        expect(res.statusCode).toBe(400);
      });
    });
  });
});
