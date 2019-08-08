const { registerAndLogin } = require('../../../test/helpers/auth');
const createModelsUtils = require('../../../test/helpers/models');
const { createAuthRequest } = require('../../../test/helpers/request');

let modelsUtils;
let rq;

describe('Test type groups', () => {
  beforeAll(async () => {
    const token = await registerAndLogin();
    rq = createAuthRequest(token);

    modelsUtils = createModelsUtils({ rq });

    await modelsUtils.createGroup({
      name: 'somegroup',
      attributes: {
        name: {
          type: 'string',
        },
      },
    });
  }, 60000);

  afterAll(async () => {
    await modelsUtils.deleteGroup('somegroup');
  });

  describe('Non repeatable and Non required group', () => {
    beforeAll(async () => {
      await modelsUtils.createModelWithType('withgroup', 'group', {
        group: 'somegroup',
        repeatable: false,
        required: false,
      });
    }, 60000);

    afterAll(async () => {
      await modelsUtils.deleteModel('withgroup');
    }, 60000);

    describe('POST new entry', () => {
      test('Creating entry with JSON works', async () => {
        const res = await rq.post('/content-manager/explorer/withgroup', {
          body: {
            field: {
              name: 'someString',
            },
          },
        });

        expect(res.statusCode).toBe(200);
        expect(res.body.field).toEqual(
          expect.objectContaining({
            id: expect.anything(),
            name: 'someString',
          })
        );
      });

      test('Creating entry with formdata works', async () => {
        const res = await rq.post('/content-manager/explorer/withgroup', {
          formData: {
            data: JSON.stringify({
              field: {
                name: 'someValue',
              },
            }),
          },
        });

        expect(res.statusCode).toBe(200);
        expect(res.body.field).toEqual(
          expect.objectContaining({
            id: expect.anything(),
            name: 'someValue',
          })
        );
      });

      test.each([[], 'someString', 128219, false])(
        'Throws if the field is not an object %p',
        async value => {
          const res = await rq.post('/content-manager/explorer/withgroup', {
            body: {
              field: value,
            },
          });

          expect(res.statusCode).toBe(400);
        }
      );

      test('Can send a null value', async () => {
        const res = await rq.post('/content-manager/explorer/withgroup', {
          body: {
            field: null,
          },
        });

        expect(res.statusCode).toBe(200);
        expect(res.body.field).toBe(null);
      });

      test('Can send input without the group field', async () => {
        const res = await rq.post('/content-manager/explorer/withgroup', {
          body: {},
        });

        expect(res.statusCode).toBe(200);
        expect(res.body.field).toBe(null);
      });
    });

    describe('GET entries', () => {
      test('Should return entries with their nested groups', async () => {
        const res = await rq.get('/content-manager/explorer/withgroup');

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        res.body.forEach(entry => {
          if (entry.field === null) return;

          expect(entry.field).toMatchObject({
            name: expect.any(String),
          });
        });
      });
    });

    describe('PUT entry', () => {
      test.todo('Keeps the previous value if group not sent');
      test.todo('Removes previous group if null sent');
      test.todo('Replaces the previous group if sent without id');
      test.todo('Throws on invalid id in sent group');
      test.todo('Updates group if previsous group id is sent');
    });
  });

  describe('Non repeatable required group', () => {});
  describe('Repeatable non required group', () => {});
  describe('Repeatable non required group with min and max', () => {});
  describe('Repeatable required group', () => {});
  describe('Repeatable required group with min and max', () => {});
});
