'use strict';

const _ = require('lodash');

const { registerAndLogin } = require('../../../test/helpers/auth');
const { createAuthRequest } = require('../../../test/helpers/request');
const createModelsUtils = require('../../../test/helpers/models');

let rq;
let modelsUtils;
let data = {
  dogs: [],
};

const dogModel = {
  draftAndPublish: false,
  attributes: {
    name: {
      type: 'string',
    },
  },
  connection: 'default',
  name: 'dog',
  description: '',
  collectionName: '',
};

const dogs = [
  {
    name: 'Nelson',
  },
  {
    name: 'Atos',
  },
];

const sortDogs = dogs => _.sortBy(dogs, 'name');

describe('Migration - draft and publish', () => {
  describe.each([
    ['without table modifications', {}, {}],
    ['with table modifications', { town: { type: 'string' } }, { color: { type: 'string' } }],
  ])('%p', (testName, tableModification1, tableModification2) => {
    beforeAll(async () => {
      data.dogs = [];
      const token = await registerAndLogin();
      rq = createAuthRequest(token);
      modelsUtils = createModelsUtils({ rq });
      await modelsUtils.createContentTypes([dogModel]);
      const createdDogs = [];
      for (const dog of dogs) {
        const res = await rq({
          method: 'POST',
          url: '/content-manager/explorer/application::dog.dog',
          body: dog,
        });
        createdDogs.push(res.body);
      }
      data.dogs = sortDogs(createdDogs);
    }, 60000);

    afterAll(async () => {
      const queryString = data.dogs.map((p, i) => `${i}=${p.id}`).join('&');
      await rq({
        method: 'DELETE',
        url: `/content-manager/explorer/deleteAll/application::dog.dog?${queryString}`,
      });
      await modelsUtils.deleteContentTypes(['dog']);
    }, 60000);

    describe('Enabling D&P on a content-type', () => {
      test('No published_at before enabling the feature', async () => {
        let { body } = await rq({
          url: '/content-manager/explorer/application::dog.dog',
          method: 'GET',
        });
        expect(body.length).toBe(2);
        const sortedBody = sortDogs(body);
        sortedBody.forEach((dog, index) => {
          expect(dog).toMatchObject(data.dogs[index]);
          expect(dog.published_at).toBeUndefined();
        });
      });

      test('Published_at is equal to created_at after enabling the feature', async () => {
        const schema = await modelsUtils.getContentTypeSchema('dog');
        await modelsUtils.modifyContentType({
          ...schema,
          attributes: _.merge(schema.attributes, tableModification1),
          draftAndPublish: true,
        });

        let { body } = await rq({
          url: '/content-manager/explorer/application::dog.dog',
          method: 'GET',
        });

        expect(body.length).toBe(2);
        const sortedBody = sortDogs(body);
        sortedBody.forEach((dog, index) => {
          expect(dog).toMatchObject(data.dogs[index]);
          expect(dog.published_at).toBe(dog.createdAt || dog.created_at);
          expect(!isNaN(new Date(dog.published_at).valueOf())).toBe(true);
        });
        data.dogs = sortedBody;
      });
    });

    describe('Disabling D&P on a content-type', () => {
      test('No published_at after disabling the feature + draft removed', async () => {
        const res = await rq({
          url: `/content-manager/explorer/application::dog.dog/unpublish/${data.dogs[1].id}`,
          method: 'POST',
        });
        data.dogs[1] = res.body;

        const schema = await modelsUtils.getContentTypeSchema('dog');
        await modelsUtils.modifyContentType({
          ...schema,
          draftAndPublish: false,
          attributes: _.merge(schema.attributes, tableModification2),
        });
        // drafts should have been deleted with the migration, so we remove them
        data.dogs = data.dogs.filter(dog => !_.isNil(dog.published_at));

        let { body } = await rq({
          url: '/content-manager/explorer/application::dog.dog',
          method: 'GET',
        });
        expect(body.length).toBe(1);
        expect(body[0]).toMatchObject(_.pick(data.dogs[0], ['name']));
        expect(body[0].published_at).toBeUndefined();
      });
    });
  });
});
