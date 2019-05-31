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
          id: expect.any(String),
          name: expect.any(String),
          icon: expect.any(String),
          // later
          schema: expect.objectContaining({}),
        });
      });
    });
  });
});
