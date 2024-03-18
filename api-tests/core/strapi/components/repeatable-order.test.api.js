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

const createDocument = async (data) => {
  return rq.post('/', {
    body: { data },
    qs: { populate: ['field'] },
  });
};

const updateDocument = async (id, data) => {
  return rq.put(`/${id}`, {
    body: { data },
    qs: { populate: ['field'] },
  });
};

const getDocument = async (id) => {
  return rq.get(`/${id}`, {
    qs: { populate: ['field'] },
  });
};

describe('Given a content type with a repeatable component and two entities created', () => {
  const builder = createTestBuilder();
  let document1;
  let document2;

  beforeAll(async () => {
    await builder.addComponent(component).addContentType(ct).build();

    strapi = await createStrapiInstance();
    rq = await createContentAPIRequest({ strapi });
    rq.setURLPrefix('/api/withcomponents');

    // Create two entities
    const res1 = await createDocument({ field: [{ name: 'field1' }, { name: 'field2' }] });
    document1 = res1.body.data;

    const res2 = await createDocument({ field: [{ name: 'field1' }, { name: 'field2' }] });
    document2 = res2.body.data;
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  // TODO V5: Discuss component id update, updating a draft component
  describe.skip('When I update the order of one of the entities components', () => {
    test('Then the order of both entity components is preserved', async () => {
      const updatedDocument1 = await updateDocument(document1.documentId, {
        field: [document1.field[1], document1.field[0]],
      });

      const res = await getDocument(document2.documentId);

      expect(updatedDocument1.body.data.field).toEqual([
        { documentId: expect.anything(), name: 'field2' },
        { documentId: expect.anything(), name: 'field1' },
      ]);
      expect(res.statusCode).toBe(200);
      expect(res.body.data.field).toEqual([
        { documentId: expect.anything(), name: 'field1' },
        { documentId: expect.anything(), name: 'field2' },
      ]);
    });
  });
});
