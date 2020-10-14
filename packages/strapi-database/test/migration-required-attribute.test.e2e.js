'use strict';

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
      required: false,
    },
  },
  connection: 'default',
  name: 'dog',
  description: '',
  collectionName: '',
};

const dogs = [
  {
    name: null,
  },
  {
    name: 'Atos',
  },
];

describe('Migration - required attribute', () => {
  beforeAll(async () => {
    const token = await registerAndLogin();
    rq = createAuthRequest(token);
    modelsUtils = createModelsUtils({ rq });
    await modelsUtils.createContentTypes([dogModel]);
    for (const dog of dogs) {
      const res = await rq({
        method: 'POST',
        url: '/content-manager/explorer/application::dog.dog',
        body: dog,
      });
      data.dogs.push(res.body);
    }
  }, 60000);

  afterAll(async () => {
    const queryString = data.dogs.map((p, i) => `${i}=${p.id}`).join('&');
    await rq({
      method: 'DELETE',
      url: `/content-manager/explorer/deleteAll/application::dog.dog?${queryString}`,
    });
    await modelsUtils.deleteContentTypes(['dog']);
  }, 60000);

  describe('Required: false -> true', () => {
    test('Can be null before migration', async () => {
      let { body } = await rq({
        url: '/content-manager/explorer/application::dog.dog',
        method: 'GET',
      });
      expect(body.length).toBe(2);
      const dogWithNameNull = body.find(dog => dog.name === null);
      expect(dogWithNameNull).toBeTruthy();
    });

    test('Cannot create an entry with null after migration', async () => {
      // remove null values otherwise the migration would fail
      await rq({
        url: `/content-manager/explorer/application::dog.dog/${data.dogs[0].id}`,
        method: 'PUT',
        body: { name: 'Nelson' },
      });

      // migration
      const schema = await modelsUtils.getContentTypeSchema('dog');
      schema.attributes.name.required = true;
      await modelsUtils.modifyContentType(schema);

      // Try to create an entry with null
      const res = await rq({
        method: 'POST',
        url: '/content-manager/explorer/application::dog.dog',
        body: { name: null },
      });
      expect(res.body.message).toBe('ValidationError');
    });
  });

  describe('Required: true -> false', () => {
    test('Can create an entry with null after migration', async () => {
      // migration
      const schema = await modelsUtils.getContentTypeSchema('dog');
      schema.attributes.name.required = false;
      await modelsUtils.modifyContentType(schema);

      // Try to create an entry with null
      const res = await rq({
        url: `/content-manager/explorer/application::dog.dog`,
        method: 'POST',
        body: { name: null },
      });

      expect(res.body).toMatchObject({ name: null });
    });
  });
});
