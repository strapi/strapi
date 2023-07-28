'use strict';

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createContentAPIRequest } = require('api-tests/request');

let strapi;
let rq;

const component = {
  displayName: 'somecomponent',
  attributes: {
    name: {
      type: 'string',
    },
  },
};

const ct = {
  displayName: 'withcomponent',
  singularName: 'withcomponent',
  pluralName: 'withcomponents',
  attributes: {
    field: {
      type: 'component',
      component: 'default.somecomponent',
      repeatable: true,
      required: false,
    },
  },
};

const createEntity = async (data) => {
  return rq.post('/', {
    body: { data },
    qs: { populate: ['field'] },
  });
};

const updateEntity = async (id, data) => {
  return rq.put(`/${id}`, {
    body: { data },
    qs: { populate: ['field'] },
  });
};

const getEntity = async (id) => {
  return rq.get(`/${id}`, {
    qs: { populate: ['field'] },
  });
};

describe('Given a content type with a repeatable component and two entities created', () => {
  const builder = createTestBuilder();
  let entity1;
  let entity2;

  beforeAll(async () => {
    await builder.addComponent(component).addContentType(ct).build();

    strapi = await createStrapiInstance();
    rq = await createContentAPIRequest({ strapi });
    rq.setURLPrefix('/api/withcomponents');

    // Create two entities
    const res1 = await createEntity({ field: [{ name: 'field1' }, { name: 'field2' }] });
    entity1 = res1.body.data;

    const res2 = await createEntity({ field: [{ name: 'field1' }, { name: 'field2' }] });
    entity2 = res2.body.data;
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  describe('When I update the order of one of the entities components', () => {
    test('Then the order of both entity components is preserved', async () => {
      const updatedEntity1 = await updateEntity(entity1.id, {
        field: [entity1.attributes.field[1], entity1.attributes.field[0]],
      });

      const res = await getEntity(entity2.id);

      expect(updatedEntity1.body.data.attributes.field).toEqual([
        { id: expect.anything(), name: 'field2' },
        { id: expect.anything(), name: 'field1' },
      ]);
      expect(res.statusCode).toBe(200);
      expect(res.body.data.attributes.field).toEqual([
        { id: expect.anything(), name: 'field1' },
        { id: expect.anything(), name: 'field2' },
      ]);
    });
  });
});
