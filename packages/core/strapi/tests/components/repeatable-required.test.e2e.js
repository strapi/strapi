'use strict';

const { createTestBuilder } = require('../../../../../test/helpers/builder');
const { createStrapiInstance } = require('../../../../../test/helpers/strapi');
const { createContentAPIRequest } = require('../../../../../test/helpers/request');

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
      required: true,
    },
  },
};

describe('Non repeatable and Not required component', () => {
  const builder = createTestBuilder();

  beforeAll(async () => {
    await builder
      .addComponent(component)
      .addContentType(ct)
      .build();

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
            ],
          },
        },
        qs: {
          populate: ['field'],
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.attributes.field).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: expect.anything(),
            name: 'someString',
          }),
        ])
      );
    });

    test('Creating second entry', async () => {
      const res = await rq.post('/', {
        body: {
          data: {
            field: [
              {
                name: 'someValue',
              },
            ],
          },
        },
        qs: {
          populate: ['field'],
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.attributes.field).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: expect.anything(),
            name: 'someValue',
          }),
        ])
      );
    });

    test.each(['someString', 128219, false, {}, null])(
      'Throws if the field is not an object %p',
      async value => {
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

    test('Can send an empty array', async () => {
      const res = await rq.post('/', {
        body: {
          data: {
            field: [],
          },
        },
        qs: {
          populate: ['field'],
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.attributes.field).toEqual([]);
    });

    test('Throws when component is not provided', async () => {
      const res = await rq.post('/', {
        body: {
          data: {},
        },
        qs: {
          populate: ['field'],
        },
      });

      expect(res.statusCode).toBe(400);
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

      const getRes = await rq.get(`/${res.body.data.id}`, {
        qs: {
          populate: ['field'],
        },
      });

      expect(getRes.statusCode).toBe(200);
      expect(Array.isArray(getRes.body.data.attributes.field)).toBe(true);

      expect(getRes.body.data.attributes.field[0]).toMatchObject({
        name: 'firstString',
      });
      expect(getRes.body.data.attributes.field[1]).toMatchObject({
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
      res.body.data.forEach(entry => {
        expect(Array.isArray(entry.attributes.field)).toBe(true);

        if (entry.attributes.field.length === 0) return;

        expect(entry.attributes.field).toEqual(
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
      async value => {
        const res = await rq.post('/', {
          body: {
            data: {
              field: [
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

        const updateRes = await rq.put(`/${res.body.data.id}`, {
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
        const getRes = await rq.get(`/${res.body.data.id}`, {
          qs: {
            populate: ['field'],
          },
        });

        expect(getRes.statusCode).toBe(200);
        expect(getRes.body.data).toMatchObject({
          id: res.body.data.id,
          attributes: { field: res.body.data.attributes.field },
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

      expect(res.body.data.attributes.field[0]).toMatchObject({
        name: 'someString',
      });
      expect(res.body.data.attributes.field[1]).toMatchObject({
        name: 'otherString',
      });

      const updateRes = await rq.put(`/${res.body.data.id}`, {
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
      expect(Array.isArray(updateRes.body.data.attributes.field)).toBe(true);

      expect(updateRes.body.data.attributes.field[0]).toMatchObject({
        name: 'otherString',
      });
      expect(updateRes.body.data.attributes.field[1]).toMatchObject({
        name: 'someString',
      });

      const getRes = await rq.get(`/${res.body.data.id}`, {
        qs: {
          populate: ['field'],
        },
      });

      expect(getRes.statusCode).toBe(200);
      expect(Array.isArray(getRes.body.data.attributes.field)).toBe(true);

      expect(getRes.body.data.attributes.field[0]).toMatchObject({
        name: 'otherString',
      });
      expect(getRes.body.data.attributes.field[1]).toMatchObject({
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

      const updateRes = await rq.put(`/${res.body.data.id}`, {
        body: {
          data: {},
        },
        qs: {
          populate: ['field'],
        },
      });

      expect(updateRes.statusCode).toBe(200);
      expect(updateRes.body.data).toMatchObject({
        id: res.body.data.id,
        attributes: {
          field: res.body.data.attributes.field,
        },
      });

      const getRes = await rq.get(`/${res.body.data.id}`, {
        qs: {
          populate: ['field'],
        },
      });

      expect(getRes.statusCode).toBe(200);
      expect(getRes.body.data).toMatchObject({
        id: res.body.data.id,
        attributes: {
          field: res.body.data.attributes.field,
        },
      });
    });

    test('Removes previous components if empty array sent', async () => {
      const res = await rq.post('/', {
        body: {
          data: {
            field: [
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

      const updateRes = await rq.put(`/${res.body.data.id}`, {
        body: {
          data: {
            field: [],
          },
        },
        qs: {
          populate: ['field'],
        },
      });

      const expectResult = {
        id: res.body.data.id,
        attributes: { field: [] },
      };

      expect(updateRes.statusCode).toBe(200);
      expect(updateRes.body.data).toMatchObject(expectResult);

      const getRes = await rq.get(`/${res.body.data.id}`, {
        qs: {
          populate: ['field'],
        },
      });

      expect(getRes.statusCode).toBe(200);
      expect(getRes.body.data).toMatchObject(expectResult);
    });

    test('Replaces the previous components if sent without id', async () => {
      const res = await rq.post('/', {
        body: {
          data: {
            field: [
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

      const updateRes = await rq.put(`/${res.body.data.id}`, {
        body: {
          data: {
            field: [
              {
                name: 'new String',
              },
            ],
          },
        },
        qs: {
          populate: ['field'],
        },
      });

      expect(updateRes.statusCode).toBe(200);

      const oldIds = res.body.data.attributes.field.map(val => val.id);
      updateRes.body.data.attributes.field.forEach(val => {
        expect(oldIds.includes(val.id)).toBe(false);
      });

      expect(updateRes.body.data).toMatchObject({
        id: res.body.data.id,
        attributes: {
          field: [
            {
              name: 'new String',
            },
          ],
        },
      });

      const getRes = await rq.get(`/${res.body.data.id}`, {
        qs: {
          populate: ['field'],
        },
      });

      expect(getRes.statusCode).toBe(200);
      expect(getRes.body.data).toMatchObject({
        id: res.body.data.id,
        attributes: {
          field: [
            {
              name: 'new String',
            },
          ],
        },
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
            ],
          },
        },
        qs: {
          populate: ['field'],
        },
      });

      const updateRes = await rq.put(`/${res.body.data.id}`, {
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

    test('Updates component with ids, create new ones and removes old ones', async () => {
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

      const updateRes = await rq.put(`/${res.body.data.id}`, {
        body: {
          data: {
            field: [
              {
                id: res.body.data.attributes.field[0].id, // send old id to update the previous component
                name: 'newOne',
              },
              {
                name: 'newTwo',
              },
              {
                id: res.body.data.attributes.field[2].id,
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
        attributes: {
          field: [
            {
              id: res.body.data.attributes.field[0].id,
              name: 'newOne',
            },
            {
              name: 'newTwo',
            },
            {
              id: res.body.data.attributes.field[2].id,
              name: 'three',
            },
            {
              name: 'four',
            },
          ],
        },
      };

      expect(updateRes.statusCode).toBe(200);
      expect(updateRes.body.data).toMatchObject(expectedResult);

      const getRes = await rq.get(`/${res.body.data.id}`, {
        qs: {
          populate: ['field'],
        },
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
              {
                name: 'someString',
              },
              {
                name: 'someOtherString',
              },
              {
                name: 'otherSomeString',
              },
            ],
          },
        },
        qs: {
          populate: ['field'],
        },
      });

      const deleteRes = await rq.delete(`/${res.body.data.id}`, {
        qs: {
          populate: ['field'],
        },
      });

      expect(deleteRes.statusCode).toBe(200);
      expect(deleteRes.body.data).toMatchObject(res.body.data);

      const getRes = await rq.get(`/${res.body.data.id}`, {
        qs: {
          populate: ['field'],
        },
      });

      expect(getRes.statusCode).toBe(404);
    });
  });
});
