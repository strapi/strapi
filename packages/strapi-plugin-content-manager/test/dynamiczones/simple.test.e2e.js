const { registerAndLogin } = require('../../../../test/helpers/auth');
const createModelsUtils = require('../../../../test/helpers/models');
const { createAuthRequest } = require('../../../../test/helpers/request');

let modelsUtils;
let rq;

describe.each([
  [
    'CONTENT MANAGER',
    '/content-manager/explorer/application::withdynamiczone.withdynamiczone',
  ],
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

    await modelsUtils.createContentTypeWithType(
      'withdynamiczone',
      'dynamiczone',
      {
        components: ['default.compo-with-other-compo', 'default.simple-compo'],
        required: false,
        min: 2,
        max: 5,
      }
    );

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
      const create = await rq.post('/', {
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

      expect(create.statusCode).toBe(200);
      const entryId = create.body.id;

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
    test.todo('Can empty non required dynamic zone');
    test.todo('Can add items to empty dynamic zone');
    test.todo('Can remove items from dynamic zone');
    test.todo('Respects min items');
    test.todo('Respects max items');
    test.todo('Updates order of elements');
    test.todo(
      'Updates elements sent with ids, remove old ones and add new ones'
    );
  });

  describe('Deletion', () => {
    test.todo('Returns the entry with its paths populated');
    test.todo('Cannot get the entry once deleted');
  });
});
