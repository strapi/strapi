'use strict';

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createContentAPIRequest } = require('api-tests/request');

let strapi;
let rq;

const component = {
  displayName: 'requiredinner',
  attributes: {
    title: {
      type: 'string',
      required: true,
    },
  },
};

const ct = {
  displayName: 'withnewcomponent',
  singularName: 'withnewcomponent',
  pluralName: 'withnewcomponents',
  options: {
    draftAndPublish: false,
  },
  attributes: {
    single: {
      type: 'component',
      component: 'default.requiredinner',
      repeatable: false,
    },
    repeatable: {
      type: 'component',
      component: 'default.requiredinner',
      repeatable: true,
    },
  },
};

/**
 * On update, a component sent without an id is created, not updated. Its required fields must
 * be enforced as on creation, or the new component is stored with them set to null.
 */
describe('New component in an update (draft and publish disabled)', () => {
  const builder = createTestBuilder();

  beforeAll(async () => {
    await builder.addComponent(component).addContentType(ct).build();

    strapi = await createStrapiInstance();
    rq = await createContentAPIRequest({ strapi });
    rq.setURLPrefix('/api/withnewcomponents');
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  test('Rejects the creation of a component without its required field', async () => {
    const res = await rq.post('/', {
      body: { data: { single: {} } },
    });

    expect(res.statusCode).toBe(400);
  });

  test('Rejects a new single component without its required field on update', async () => {
    const createRes = await rq.post('/', {
      body: { data: { single: { title: 'first' } } },
    });
    expect(createRes.statusCode).toBe(201);

    const updateRes = await rq.put(`/${createRes.body.data.documentId}`, {
      body: { data: { single: {} } },
      qs: { populate: ['single'] },
    });

    expect(updateRes.statusCode).toBe(400);

    const getRes = await rq.get(`/${createRes.body.data.documentId}`, {
      qs: { populate: ['single'] },
    });
    expect(getRes.body.data.single.title).toBe('first');
  });

  test('Rejects a new repeatable component item without its required field on update', async () => {
    const createRes = await rq.post('/', {
      body: { data: { repeatable: [{ title: 'first' }] } },
      qs: { populate: ['repeatable'] },
    });
    expect(createRes.statusCode).toBe(201);

    const existingItem = createRes.body.data.repeatable[0];

    const updateRes = await rq.put(`/${createRes.body.data.documentId}`, {
      body: { data: { repeatable: [{ id: existingItem.id }, {}] } },
      qs: { populate: ['repeatable'] },
    });

    expect(updateRes.statusCode).toBe(400);

    const getRes = await rq.get(`/${createRes.body.data.documentId}`, {
      qs: { populate: ['repeatable'] },
    });
    expect(getRes.body.data.repeatable).toHaveLength(1);
    expect(getRes.body.data.repeatable[0].title).toBe('first');
  });
});
