'use strict';

const { omit } = require('lodash/fp');
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
  singularName: 'withcomponent',
  pluralName: 'withcomponents',
  displayName: 'With Component',
  attributes: {
    field: {
      type: 'component',
      component: 'default.somecomponent',
      repeatable: true,
      required: false,
      min: 2,
      max: 5,
    },
  },
};

describe('Non repeatable and Not required component', () => {
  const builder = createTestBuilder();

  beforeAll(async () => {
    await builder.addComponent(component).addContentType(ct).build();

    strapi = await createStrapiInstance();
    rq = await createContentAPIRequest({ strapi });
    rq.setURLPrefix('/api/withcomponents');
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  describe('POST new entry', () => {
    test('Creating entry with JSON works', async () => {
      const res = await rq.post('/', {
        body: {
          data: {
            field: [
              {
                name: 'someString',
              },
              {
                name: 'someString',
              },
            ],
          },
        },
        qs: {
          populate: ['field'],
        },
      });

      expect(res.statusCode).toBe(201);
      expect(Array.isArray(res.body.data.field)).toBe(true);
      expect(res.body.data.field).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: expect.anything(),
            name: 'someString',
          }),
        ])
      );
    });

    test.each(['someString', 128219, false, {}, null])(
      'Throws if the field is not an array %p',
      async (value) => {
        const res = await rq.post('/', {
          body: {
            data: {
              field: value,
            },
          },
        });

        expect(res.statusCode).toBe(400);
      }
    );

    test('Throws when sending a non empty array with less then the min', async () => {
      const res = await rq.post('/', {
        body: {
          data: {
            field: [
              {
                name: 'test',
              },
            ],
          },
        },
      });

      expect(res.statusCode).toBe(400);
    });

    test('Success when sending an empty array', async () => {
      const res = await rq.post('/', {
        body: {
          data: {
            field: [],
          },
        },
      });

      expect(res.statusCode).toBe(201);
    });

    test('Throws when sending too many items', async () => {
      const res = await rq.post('/', {
        body: {
          data: {
            field: [
              {
                name: 'one',
              },
              {
                name: 'one',
              },
              {
                name: 'one',
              },
              {
                name: 'one',
              },
              {
                name: 'one',
              },
              {
                name: 'one',
              },
            ],
          },
        },
      });

      expect(res.statusCode).toBe(400);
    });

    test('Can send input without the component field', async () => {
      const res = await rq.post('/', {
        body: {
          data: {},
        },
        qs: {
          populate: ['field'],
        },
      });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.field).toEqual([]);
    });
  });

  describe('GET entries', () => {
    test('Data is ordered in the order sent', async () => {
      const res = await rq.post('/', {
        body: {
          data: {
            field: [
              {
                name: 'firstString',
              },
              {
                name: 'someString',
              },
            ],
          },
        },
        qs: {
          populate: ['field'],
        },
      });

      const getRes = await rq.get(`/${res.body.data.documentId}`, {
        qs: {
          populate: ['field'],
        },
      });

      expect(getRes.statusCode).toBe(200);
      expect(Array.isArray(getRes.body.data.field)).toBe(true);

      expect(getRes.body.data.field[0]).toMatchObject({
        name: 'firstString',
      });
      expect(getRes.body.data.field[1]).toMatchObject({
        name: 'someString',
      });
    });

    test('Should return entries with their nested components', async () => {
      const res = await rq.get('/', {
        qs: {
          populate: ['field'],
        },
      });

      expect(res.statusCode).toBe(200);

      expect(Array.isArray(res.body.data)).toBe(true);
      res.body.data.forEach((entry) => {
        expect(Array.isArray(entry.field)).toBe(true);

        if (entry.field.length === 0) return;

        expect(entry.field).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              name: expect.any(String),
            }),
          ])
        );
      });
    });
  });

  describe('PUT entry', () => {
    test.each(['someString', 128219, false, {}, null])(
      'Throws when sending invalid updated field %p',
      async (value) => {
        const res = await rq.post('/', {
          body: {
            data: {
              field: [
                {
                  name: 'someString',
                },
                {
                  name: 'someString',
                },
              ],
            },
          },
          qs: {
            populate: ['field'],
          },
        });

        const updateRes = await rq.put(`/${res.body.data.documentId}`, {
          body: {
            data: {
              field: value,
            },
          },
          qs: {
            populate: ['field'],
          },
        });

        expect(updateRes.statusCode).toBe(400);

        // shouldn't have been updated
        const getRes = await rq.get(`/${res.body.data.documentId}`, {
          qs: {
            populate: ['field'],
          },
        });

        expect(getRes.statusCode).toBe(200);
        expect(getRes.body.data).toMatchObject({
          documentId: res.body.data.documentId,
          field: res.body.data.field,
        });
      }
    );

    test('Updates order at each request', async () => {
      const res = await rq.post('/', {
        body: {
          data: {
            field: [
              {
                name: 'someString',
              },
              {
                name: 'otherString',
              },
            ],
          },
        },
        qs: {
          populate: ['field'],
        },
      });

      expect(res.body.data.field[0]).toMatchObject({
        name: 'someString',
      });
      expect(res.body.data.field[1]).toMatchObject({
        name: 'otherString',
      });

      const updateRes = await rq.put(`/${res.body.data.documentId}`, {
        body: {
          data: {
            field: [
              {
                name: 'otherString',
              },
              {
                name: 'someString',
              },
            ],
          },
        },
        qs: {
          populate: ['field'],
        },
      });

      expect(updateRes.statusCode).toBe(200);
      expect(Array.isArray(updateRes.body.data.field)).toBe(true);

      expect(updateRes.body.data.field[0]).toMatchObject({
        name: 'otherString',
      });
      expect(updateRes.body.data.field[1]).toMatchObject({
        name: 'someString',
      });

      const getRes = await rq.get(`/${res.body.data.documentId}`, {
        qs: {
          populate: ['field'],
        },
      });

      expect(getRes.statusCode).toBe(200);
      expect(Array.isArray(getRes.body.data.field)).toBe(true);

      expect(getRes.body.data.field[0]).toMatchObject({
        name: 'otherString',
      });
      expect(getRes.body.data.field[1]).toMatchObject({
        name: 'someString',
      });
    });

    test('Keeps the previous value if component not sent', async () => {
      const res = await rq.post('/', {
        body: {
          data: {
            field: [
              {
                name: 'someString',
              },
              {
                name: 'otherString',
              },
            ],
          },
        },
        qs: {
          populate: ['field'],
        },
      });

      const updateRes = await rq.put(`/${res.body.data.documentId}`, {
        body: {
          data: {},
        },
        qs: {
          populate: ['field'],
        },
      });

      expect(updateRes.statusCode).toBe(200);
      expect(updateRes.body.data).toMatchObject({
        documentId: res.body.data.documentId,
        field: res.body.data.field.map((val) => omit('id', val)),
      });

      const getRes = await rq.get(`/${res.body.data.documentId}`, {
        qs: {
          populate: ['field'],
        },
      });

      expect(getRes.statusCode).toBe(200);
      expect(getRes.body.data).toMatchObject({
        documentId: res.body.data.documentId,
        field: res.body.data.field.map((val) => omit('id', val)),
      });
    });

    test('Throws when not enough items', async () => {
      const res = await rq.post('/', {
        body: {
          data: {
            field: [{ name: 'someString' }, { name: 'new String' }],
          },
        },
        qs: {
          populate: ['field'],
        },
      });

      const updateRes = await rq.put(`/${res.body.data.documentId}`, {
        body: {
          data: {
            field: [{ name: 'lala' }],
          },
        },
        qs: {
          populate: ['field'],
        },
      });

      expect(updateRes.statusCode).toBe(400);

      const getRes = await rq.get(`/${res.body.data.documentId}`, {
        qs: {
          populate: ['field'],
        },
      });

      expect(getRes.statusCode).toBe(200);
      expect(getRes.body.data).toMatchObject(res.body.data);
    });

    test('Throws when too many items', async () => {
      const res = await rq.post('/', {
        body: {
          data: {
            field: [{ name: 'someString' }, { name: 'test' }],
          },
        },
        qs: {
          populate: ['field'],
        },
      });

      const updateRes = await rq.put(`/${res.body.data.documentId}`, {
        body: {
          data: {
            field: [
              { name: 'someString' },
              { name: 'someString' },
              { name: 'someString' },
              { name: 'someString' },
              { name: 'someString' },
              { name: 'someString' },
            ],
          },
        },
        qs: {
          populate: ['field'],
        },
      });

      expect(updateRes.statusCode).toBe(400);

      const getRes = await rq.get(`/${res.body.data.documentId}`, {
        qs: {
          populate: ['field'],
        },
      });

      expect(getRes.statusCode).toBe(200);
      expect(getRes.body.data).toMatchObject(res.body.data);
    });

    test('Replaces the previous components if sent without id', async () => {
      const res = await rq.post('/', {
        body: {
          data: {
            field: [{ name: 'someString' }, { name: 'test' }],
          },
        },
        qs: {
          populate: ['field'],
        },
      });

      const updateRes = await rq.put(`/${res.body.data.documentId}`, {
        body: {
          data: {
            field: [{ name: 'new String' }, { name: 'test' }],
          },
        },
        qs: {
          populate: ['field'],
        },
      });

      expect(updateRes.statusCode).toBe(200);

      const oldIds = res.body.data.field.map((val) => val.id);
      updateRes.body.data.field.forEach((val) => {
        expect(oldIds.includes(val.id)).toBe(false);
      });

      expect(updateRes.body.data).toMatchObject({
        documentId: res.body.data.documentId,
        field: [{ name: 'new String' }, { name: 'test' }],
      });

      const getRes = await rq.get(`/${res.body.data.documentId}`, {
        qs: {
          populate: ['field'],
        },
      });

      expect(getRes.statusCode).toBe(200);
      expect(getRes.body.data).toMatchObject({
        documentId: res.body.data.documentId,
        field: [{ name: 'new String' }, { name: 'test' }],
      });
    });

    test('Throws on invalid id in component', async () => {
      const res = await rq.post('/', {
        body: {
          data: {
            field: [
              {
                name: 'someString',
              },
              {
                name: 'test',
              },
            ],
          },
        },
        qs: {
          populate: ['field'],
        },
      });

      const updateRes = await rq.put(`/${res.body.data.documentId}`, {
        body: {
          data: {
            field: [
              {
                id: 'invalid_id',
                name: 'new String',
              },
            ],
          },
        },
        qs: {
          populate: ['field'],
        },
      });

      expect(updateRes.statusCode).toBe(400);
    });

    // TODO V5: Discuss component id update, updating a draft component
    test.skip('Updates component with ids, create new ones and removes old ones', async () => {
      const res = await rq.post('/', {
        body: {
          data: {
            field: [
              {
                name: 'one',
              },
              {
                name: 'two',
              },
              {
                name: 'three',
              },
            ],
          },
        },
        qs: {
          populate: ['field'],
        },
      });

      const updateRes = await rq.put(`/${res.body.data.documentId}`, {
        body: {
          data: {
            field: [
              {
                id: res.body.data.field[0].id, // send old id to update the previous component
                name: 'newOne',
              },
              {
                name: 'newTwo',
              },
              {
                id: res.body.data.field[2].id,
                name: 'three',
              },
              {
                name: 'four',
              },
            ],
          },
        },
        qs: {
          populate: ['field'],
        },
      });

      const expectedResult = {
        id: res.body.data.id,
        field: [
          {
            id: res.body.data.field[0].id,
            name: 'newOne',
          },
          {
            name: 'newTwo',
          },
          {
            id: res.body.data.field[2].id,
            name: 'three',
          },
          {
            name: 'four',
          },
        ],
      };

      expect(updateRes.statusCode).toBe(200);

      expect(updateRes.body.data).toMatchObject(expectedResult);

      const getRes = await rq.get(`/${res.body.data.documentId}`, {
        qs: { populate: ['field'] },
      });

      expect(getRes.statusCode).toBe(200);
      expect(getRes.body.data).toMatchObject(expectedResult);
    });
  });

  describe('DELETE entry', () => {
    test('Returns entry with components', async () => {
      const res = await rq.post('/', {
        body: {
          data: {
            field: [
              { name: 'someString' },
              { name: 'someOtherString' },
              { name: 'otherSomeString' },
            ],
          },
        },
        qs: {
          populate: ['field'],
        },
      });

      const deleteRes = await rq.delete(`/${res.body.data.documentId}`, {
        qs: {
          populate: ['field'],
        },
      });

      // TODO V5: Decide response of delete
      // expect(deleteRes.statusCode).toBe(200);
      // expect(deleteRes.body.data).toMatchObject(res.body.data);

      const getRes = await rq.get(`/${res.body.data.documentId}`, {
        qs: {
          populate: ['field'],
        },
      });

      expect(getRes.statusCode).toBe(404);
    });
  });
});
