const { registerAndLogin } = require('../../../../test/helpers/auth');
const createModelsUtils = require('../../../../test/helpers/models');
const {
  createAuthRequest,
  waitRestart,
} = require('../../../../test/helpers/request');

let modelsUtils;
let rq;

describe('Test type UID', () => {
  beforeAll(async () => {
    const token = await registerAndLogin();
    rq = createAuthRequest(token);

    modelsUtils = createModelsUtils({ rq });
  });

  describe('No targetField, required=false, not length limits', () => {
    beforeAll(async () => {
      await modelsUtils.createContentType({
        name: 'withuid',
        attributes: {
          slug: {
            type: 'uid',
          },
        },
      });
    }, 60000);

    afterAll(async () => {
      await modelsUtils.deleteContentType('withuid');
      await waitRestart();
    }, 60000);

    test('Creates an entry successfully', async () => {
      const res = await rq.post(
        '/content-manager/explorer/application::withuid.withuid',
        {
          body: {
            slug: 'valid-uid',
          },
        }
      );

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({
        slug: 'valid-uid',
      });
    });

    test('Throws error on duplicate value', async () => {
      const res = await rq.post(
        '/content-manager/explorer/application::withuid.withuid',
        {
          body: {
            slug: 'duplicate-uid',
          },
        }
      );

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({
        slug: 'duplicate-uid',
      });

      const conflicting = await rq.post(
        '/content-manager/explorer/application::withuid.withuid',
        {
          body: {
            slug: 'duplicate-uid',
          },
        }
      );

      expect(conflicting.statusCode).toBe(400);
    });

    test('Can set value to be null', async () => {
      const res = await rq.post(
        '/content-manager/explorer/application::withuid.withuid',
        {
          body: {},
        }
      );

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({
        slug: null,
      });
    });
  });

  describe('No targetField, required, no length limits', () => {
    beforeAll(async () => {
      await modelsUtils.createContentType({
        name: 'withrequireduid',
        attributes: {
          slug: {
            type: 'uid',
            required: true,
          },
        },
      });
    }, 60000);

    afterAll(async () => {
      await modelsUtils.deleteContentType('withrequireduid');
      await waitRestart();
    }, 60000);

    test('Creates an entry successfully', async () => {
      const res = await rq.post(
        '/content-manager/explorer/application::withrequireduid.withrequireduid',
        {
          body: {
            slug: 'valid-uid',
          },
        }
      );

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({
        slug: 'valid-uid',
      });
    });

    test('Throws error on duplicate value', async () => {
      const res = await rq.post(
        '/content-manager/explorer/application::withrequireduid.withrequireduid',
        {
          body: {
            slug: 'duplicate-uid',
          },
        }
      );

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({
        slug: 'duplicate-uid',
      });

      const conflicting = await rq.post(
        '/content-manager/explorer/application::withrequireduid.withrequireduid',
        {
          body: {
            slug: 'duplicate-uid',
          },
        }
      );

      expect(conflicting.statusCode).toBe(400);
    });

    test('Cannot set value to be null', async () => {
      const res = await rq.post(
        '/content-manager/explorer/application::withrequireduid.withrequireduid',
        {
          body: {},
        }
      );

      expect(res.statusCode).toBe(400);
    });
  });

  test.todo(
    'Should auto generate the uid if the targetField is set and the uid field is not set (must be required=false)'
  );
});
