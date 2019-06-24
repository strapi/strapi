const { registerAndLogin } = require('../../../test/helpers/auth');
const { createAuthRequest } = require('../../../test/helpers/request');

let rq;

describe.only('Content Type Builder - Groups', () => {
  beforeAll(async () => {
    const token = await registerAndLogin();
    rq = createAuthRequest(token);
  }, 60000);

  describe('Get /groups', () => {
    test('Returns valid enveloppe', async () => {
      const res = await rq({
        method: 'GET',
        url: '/content-type-builder/groups',
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({
        data: expect.any(Array),
      });

      res.body.data.forEach(el => {
        expect(el).toMatchObject({
          uid: expect.any(String),
          name: expect.any(String),
          schema: expect.objectContaining({}),
        });
      });
    });
  });

  describe('GET /group/:uid', () => {
    test('Returns 404 on not found', async () => {
      const res = await rq({
        method: 'GET',
        url: '/content-type-build/groups/nonexistent-group',
      });

      expect(res.statusCode).toBe(404);
    });

    test('Returns correct format', async () => {
      const res = await rq({
        method: 'GET',
        url: '/content-type-build/groups/existing-group',
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({
        data: {
          uid: 'existing-group',
          name: 'EXISTING-GROUP',
          schema: {
            connection: 'default',
            collectionName: 'existing_groups',
            attributes: {
              //...
            },
          },
        },
      });
    });
  });
});
