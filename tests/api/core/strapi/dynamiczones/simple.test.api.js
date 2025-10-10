'use strict';

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createContentAPIRequest } = require('api-tests/request');

let strapi;
let rq;

const defaultBody = {
  field: [
    {
      __component: 'default.simple-compo',
      name: 'someString',
    },
    {
      __component: 'default.compo-with-other-compo',
      compo: {
        name: 'someString',
      },
    },
  ],
};

const models = {
  ct: {
    displayName: 'withdynamiczone',
    singularName: 'withdynamiczone',
    pluralName: 'withdynamiczones',
    attributes: {
      field: {
        type: 'dynamiczone',
        components: ['default.compo-with-other-compo', 'default.simple-compo'],
        required: false,
        min: 2,
        max: 5,
      },
    },
  },
  simpleCompo: {
    displayName: 'simple-compo',
    attributes: {
      name: {
        type: 'string',
      },
    },
  },
  otherCompo: {
    displayName: 'compo-with-other-compo',
    attributes: {
      compo: {
        type: 'component',
        component: 'default.simple-compo',
      },
    },
  },
};

const createEntry = () => {
  return rq({
    method: 'POST',
    url: '/',
    body: {
      data: defaultBody,
    },
  });
};

const createEmpty = () => {
  return rq({
    method: 'POST',
    url: '/',
    body: {
      data: {
        field: [],
      },
    },
  });
};

describe('Not required dynamiczone', () => {
  const builder = createTestBuilder();

  beforeAll(async () => {
    await builder
      .addComponent(models.simpleCompo)
      .addComponent(models.otherCompo)
      .addContentType(models.ct)
      .build();

    strapi = await createStrapiInstance();
    rq = await createContentAPIRequest({ strapi });
    rq.setURLPrefix('/api/withdynamiczones');
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  describe('Creation', () => {
    test('Can create an entry with a dynamic zone and a nested compo', async () => {
      const res = await rq({
        method: 'POST',
        url: '/',
        body: {
          data: {
            field: [
              {
                __component: 'default.simple-compo',
                name: 'someString',
              },
              {
                __component: 'default.compo-with-other-compo',
                compo: { name: 'someString' },
              },
            ],
          },
        },
        qs: {
          populate: ['field.compo'],
        },
      });

      expect(res.statusCode).toBe(201);
      expect(Array.isArray(res.body.data.field)).toBe(true);
      expect(res.body.data).toMatchObject({
        field: [
          {
            id: expect.anything(),
            __component: 'default.simple-compo',
            name: 'someString',
          },
          {
            id: expect.anything(),
            __component: 'default.compo-with-other-compo',
            compo: {
              id: expect.anything(),
              name: 'someString',
            },
          },
        ],
      });
    });

    test('Can create entry with empty dynamiczone if it is not required', async () => {
      const res = await rq({
        method: 'POST',
        url: '/',
        body: {
          data: {
            field: [],
          },
        },
        qs: {
          populate: ['field'],
        },
      });

      expect(res.statusCode).toBe(201);
      expect(Array.isArray(res.body.data.field)).toBe(true);
      expect(res.body.data.field.length).toBe(0);
    });

    test('Throw if min items is not respected', async () => {
      const res = await rq({
        method: 'POST',
        url: '/',
        body: {
          data: {
            field: [
              {
                __component: 'default.simple-compo',
                name: 'someString',
              },
            ],
          },
        },
      });

      expect(res.statusCode).toBe(400);
    });

    test('Throws if max items is not respected', async () => {
      const res = await rq({
        method: 'POST',
        url: '/',
        body: {
          data: {
            field: Array(10).fill({
              __component: 'default.simple-compo',
              name: 'someString',
            }),
          },
        },
      });

      expect(res.statusCode).toBe(400);
    });
  });

  describe('Getting one entry', () => {
    test('The entry has its dynamic zone populated', async () => {
      const createRes = await createEntry();
      const documentId = createRes.body.data.documentId;

      const res = await rq({
        method: 'GET',
        url: `/${documentId}`,
        qs: {
          populate: ['field.compo'],
        },
      });

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data.field)).toBe(true);
      expect(res.body.data).toMatchObject({
        field: [
          {
            id: expect.anything(),
            __component: 'default.simple-compo',
            name: 'someString',
          },
          {
            id: expect.anything(),
            __component: 'default.compo-with-other-compo',
            compo: {
              id: expect.anything(),
              name: 'someString',
            },
          },
        ],
      });
    });
  });

  describe('Listing entries', () => {
    test('The entries have their dynamic zones populated', async () => {
      const res = await rq({
        method: 'GET',
        url: '/',
        qs: {
          populate: ['field'],
        },
      });

      expect(res.statusCode).toBe(200);

      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: expect.arrayContaining([
              expect.objectContaining({
                id: expect.anything(),
                __component: expect.any(String),
              }),
            ]),
          }),
        ])
      );
    });
  });

  describe('Edition', () => {
    test('Can empty non required dynamic zone', async () => {
      const createRes = await createEntry();

      expect(createRes.statusCode).toBe(201);
      const documentId = createRes.body.data.documentId;

      const res = await rq({
        method: 'PUT',
        url: `/${documentId}`,
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
      expect(Array.isArray(res.body.data.field)).toBe(true);
      expect(res.body.data.field).toEqual([]);
    });

    test('Can add items to empty dynamic zone', async () => {
      const createRes = await createEmpty();

      expect(createRes.statusCode).toBe(201);
      const documentId = createRes.body.data.documentId;

      const res = await rq({
        method: 'PUT',
        url: `/${documentId}`,
        body: {
          data: defaultBody,
        },
        qs: {
          populate: ['field.compo'],
        },
      });

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data.field)).toBe(true);
      expect(res.body.data).toMatchObject({
        field: [
          {
            id: expect.anything(),
            __component: 'default.simple-compo',
            name: 'someString',
          },
          {
            id: expect.anything(),
            __component: 'default.compo-with-other-compo',
            compo: {
              id: expect.anything(),
              name: 'someString',
            },
          },
        ],
      });
    });

    test('Can remove items from dynamic zone', async () => {
      const createRes = await createEntry();

      expect(createRes.statusCode).toBe(201);
      const documentId = createRes.body.data.documentId;

      const res = await rq({
        method: 'PUT',
        url: `/${documentId}`,
        body: {
          data: {
            field: [
              {
                __component: 'default.simple-compo',
                name: 'otherString',
              },
              {
                __component: 'default.simple-compo',
                name: 'secondString',
              },
            ],
          },
        },
        qs: {
          populate: ['field'],
        },
      });

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data.field)).toBe(true);
      expect(res.body.data).toMatchObject({
        field: [
          {
            id: expect.anything(),
            __component: 'default.simple-compo',
            name: 'otherString',
          },
          {
            id: expect.anything(),
            __component: 'default.simple-compo',
            name: 'secondString',
          },
        ],
      });
    });

    test('Respects min items', async () => {
      const createRes = await createEntry();

      expect(createRes.statusCode).toBe(201);
      const documentId = createRes.body.data.documentId;

      const res = await rq({
        method: 'PUT',
        url: `/${documentId}`,
        body: {
          data: {
            field: [
              {
                __component: 'default.simple-compo',
                name: 'otherString',
              },
            ],
          },
        },
      });

      expect(res.statusCode).toBe(400);
    });

    test('Respects max items', async () => {
      const createRes = await createEntry();

      expect(createRes.statusCode).toBe(201);
      const documentId = createRes.body.data.documentId;

      const res = await rq({
        method: 'PUT',
        url: `/${documentId}`,
        body: {
          data: {
            field: Array(10).fill({
              __component: 'default.simple-compo',
              name: 'otherString',
            }),
          },
        },
      });

      expect(res.statusCode).toBe(400);
    });
  });

  // TODO V5: Decide response of delete
  describe.skip('Deletion', () => {
    test('Returns the entry with its paths populated', async () => {
      const createRes = await createEntry();

      expect(createRes.statusCode).toBe(200);
      const entryId = createRes.body.data.documentId;

      const res = await rq({
        method: 'DELETE',
        url: `/${entryId}`,
        qs: {
          populate: ['field'],
        },
      });

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data.field)).toBe(true);
      expect(res.body.data).toEqual(
        expect.objectContaining({
          field: expect.arrayContaining([
            expect.objectContaining({
              id: expect.anything(),
              __component: expect.any(String),
            }),
          ]),
        })
      );
    });
  });
});
