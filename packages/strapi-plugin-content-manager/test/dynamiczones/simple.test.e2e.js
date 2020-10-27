'use strict';

const { registerAndLogin } = require('../../../../test/helpers/auth');
const createModelsUtils = require('../../../../test/helpers/models');
const { createAuthRequest } = require('../../../../test/helpers/request');

let modelsUtils;
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

const createEntry = () => {
  return rq.post('/', {
    body: defaultBody,
  });
};

const createEmpty = () => {
  return rq.post('/', {
    body: {
      field: [],
    },
  });
};

describe.each([
  ['CONTENT MANAGER', '/content-manager/explorer/application::withdynamiczone.withdynamiczone'],
  ['GENERATED API', '/withdynamiczones'],
])('[%s] => Not required dynamiczone', (_, path) => {
  beforeAll(async () => {
    const token = await registerAndLogin();
    const authRq = createAuthRequest(token);

    modelsUtils = createModelsUtils({ rq: authRq });

    await modelsUtils.createComponent({
      name: 'simple-compo',
      attributes: {
        name: {
          type: 'string',
        },
      },
    });

    await modelsUtils.createComponent({
      name: 'compo-with-other-compo',
      attributes: {
        compo: {
          type: 'component',
          component: 'default.simple-compo',
        },
      },
    });

    await modelsUtils.createContentTypeWithType('withdynamiczone', 'dynamiczone', {
      components: ['default.compo-with-other-compo', 'default.simple-compo'],
      required: false,
      min: 2,
      max: 5,
    });

    rq = authRq.defaults({
      baseUrl: `http://localhost:1337${path}`,
    });
  }, 60000);

  afterAll(async () => {
    await modelsUtils.deleteComponent('default.simple-compo');
    await modelsUtils.deleteComponent('default.compo-with-other-compo');
    await modelsUtils.deleteContentType('withdynamiczone');
  }, 60000);

  describe('Creation', () => {
    test('Can create an entry with a dynamic zone and a nested compo', async () => {
      const res = await rq.post('/', {
        body: {
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
        },
      });

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.field)).toBe(true);
      expect(res.body).toMatchObject({
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
      const res = await rq.post('/', {
        body: {
          field: [],
        },
      });

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.field)).toBe(true);
      expect(res.body.field.length).toBe(0);
    });

    test('Throw if min items is not respected', async () => {
      const res = await rq.post('/', {
        body: {
          field: [
            {
              __component: 'default.simple-compo',
              name: 'someString',
            },
          ],
        },
      });

      expect(res.statusCode).toBe(400);
    });

    test('Throws if max items is not respected', async () => {
      const res = await rq.post('/', {
        body: {
          field: Array(10).fill({
            __component: 'default.simple-compo',
            name: 'someString',
          }),
        },
      });

      expect(res.statusCode).toBe(400);
    });
  });

  describe('Getting one entry', () => {
    test('The entry has its dynamic zone populated', async () => {
      const createRes = await createEntry();
      const entryId = createRes.body.id;

      const res = await rq.get(`/${entryId}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.field)).toBe(true);
      expect(res.body).toMatchObject({
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
      const res = await rq.get('/');

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toEqual(
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

      expect(createRes.statusCode).toBe(200);
      const entryId = createRes.body.id;

      const res = await rq.put(`/${entryId}`, {
        body: {
          field: [],
        },
      });

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.field)).toBe(true);
      expect(res.body.field).toEqual([]);
    });

    test('Can add items to empty dynamic zone', async () => {
      const createRes = await createEmpty();

      expect(createRes.statusCode).toBe(200);
      const entryId = createRes.body.id;

      const res = await rq.put(`/${entryId}`, {
        body: defaultBody,
      });

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.field)).toBe(true);
      expect(res.body).toMatchObject({
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

      expect(createRes.statusCode).toBe(200);
      const entryId = createRes.body.id;

      const res = await rq.put(`/${entryId}`, {
        body: {
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
      });

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.field)).toBe(true);
      expect(res.body).toMatchObject({
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

      expect(createRes.statusCode).toBe(200);
      const entryId = createRes.body.id;

      const res = await rq.put(`/${entryId}`, {
        body: {
          field: [
            {
              __component: 'default.simple-compo',
              name: 'otherString',
            },
          ],
        },
      });

      expect(res.statusCode).toBe(400);
    });

    test('Respects max items', async () => {
      const createRes = await createEntry();

      expect(createRes.statusCode).toBe(200);
      const entryId = createRes.body.id;

      const res = await rq.put(`/${entryId}`, {
        body: {
          field: Array(10).fill({
            __component: 'default.simple-compo',
            name: 'otherString',
          }),
        },
      });

      expect(res.statusCode).toBe(400);
    });
  });

  describe('Deletion', () => {
    test('Returns the entry with its paths populated', async () => {
      const createRes = await createEntry();

      expect(createRes.statusCode).toBe(200);
      const entryId = createRes.body.id;

      const res = await rq.delete(`/${entryId}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.field)).toBe(true);
      expect(res.body).toEqual(
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
