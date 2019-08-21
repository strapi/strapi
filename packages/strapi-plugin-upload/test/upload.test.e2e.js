'use strict';

const fs = require('fs');

// Helpers.
const { registerAndLogin } = require('../../../test/helpers/auth');
// const createModelsUtils = require('../../../test/helpers/models');
// const form = require('../../../test/helpers/generators');
const { createAuthRequest } = require('../../../test/helpers/request');

// const cleanDate = entry => {
//   delete entry.updatedAt;
//   delete entry.createdAt;
//   delete entry.created_at;
//   delete entry.updated_at;
// };

// let data;
// let modelsUtils;
let rq;

const defaultProviderConfig = {
  provider: 'local',
  name: 'Local server',
  enabled: true,
  sizeLimit: 1000000,
};

const resetProviderConfigToDefault = () => {
  return setConfigOptions(defaultProviderConfig);
};

const setConfigOptions = assign => {
  return rq.put('/upload/settings/development', {
    body: {
      ...defaultProviderConfig,
      ...assign,
    },
  });
};

describe('Upload plugin end to end tests', () => {
  beforeAll(async () => {
    const token = await registerAndLogin();
    rq = createAuthRequest(token);

    // modelsUtils = createModelsUtils({ rq });

    // await modelsUtils.createModels([
    //   form.article,
    //   form.tag,
    //   form.category,
    //   form.reference,
    //   form.product,
    //   form.articlewithtag,
    // ]);
  }, 60000);

  afterAll(() => {
    // modelsUtils.deleteModels([
    //   'article',
    //   'tag',
    //   'category',
    //   'reference',
    //   'product',
    //   'articlewithtag',
    // ]),
  }, 60000);

  afterEach(async () => {
    await resetProviderConfigToDefault();
  });

  describe('GET /upload/environments => List available environments', () => {
    test('Returns the list of envrionments and which one is currently active', async () => {
      const res = await rq.get('/upload/environments');

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({
        environments: expect.arrayContaining([
          {
            name: 'development',
            active: true,
          },
          {
            name: 'staging',
            active: false,
          },
          {
            name: 'production',
            active: false,
          },
        ]),
      });
    });
  });

  describe('GET /upload/settings/:environment => Get settings for an environment', () => {
    test('Lists the available providers', async () => {
      const res = await rq.get('/upload/settings/development');

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({
        providers: [
          {
            provider: 'local',
            name: 'Local server',
          },
        ],
      });
    });

    test('Return the default provider config', async () => {
      const res = await rq.get('/upload/settings/development');

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({
        config: {
          provider: 'local',
          name: 'Local server',
          enabled: true,
          sizeLimit: 1000000,
        },
      });
    });
  });

  describe('PUT /upload/settings/:environment', () => {
    test('Updates an envrionment config correctly', async () => {
      const updateRes = await rq.put('/upload/settings/development', {
        body: {
          provider: 'test',
          enabled: false,
          sizeLimit: 1000,
        },
      });

      expect(updateRes.statusCode).toBe(200);
      expect(updateRes.body).toEqual({ ok: true });

      const getRes = await rq.get('/upload/settings/development');

      expect(getRes.statusCode).toBe(200);
      expect(getRes.body.config).toEqual({
        provider: 'test',
        enabled: false,
        sizeLimit: 1000,
      });
    });
  });

  describe('POST /upload => Upload a file', () => {
    test('Simple image upload', async () => {
      const res = await rq.post('/upload', {
        formData: {
          files: fs.createReadStream(__dirname + '/rec.jpg'),
        },
      });

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0]).toEqual(
        expect.objectContaining({
          id: expect.anything(),
          sha256: expect.any(String),
          hash: expect.any(String),
          size: expect.any(String),
          url: expect.any(String),
          provider: 'local',
          name: 'rec.jpg',
          ext: '.jpg',
          mime: 'image/jpeg',
        })
      );
    });

    test('Rejects when provider is not enabled', async () => {
      await setConfigOptions({ enabled: false });

      const res = await rq.post('/upload', {
        formData: {
          files: fs.createReadStream(__dirname + '/rec.jpg'),
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toMatchObject({
        message: [{ messages: [{ message: 'File upload is disabled' }] }],
      });
    });

    test('Rejects when no files are provided', async () => {
      const res = await rq.post('/upload', {
        formData: {},
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toMatchObject({
        message: [{ messages: [{ message: 'Files are empty' }] }],
      });
    });

    test('Rejects when any file if over the configured size limit', async () => {
      await setConfigOptions({
        sizeLimit: 0,
      });

      const res = await rq.post('/upload', {
        formData: {
          files: fs.createReadStream(__dirname + '/rec.jpg'),
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toMatchObject({
        message: [
          {
            messages: [{ message: 'rec.jpg file is bigger than limit size!' }],
          },
        ],
      });
    });
  });

  describe('GET /upload/files => Find files', () => {});
  describe('GET /upload/files/count => Count available files', () => {});
  describe('GET /upload/files/:id => Find one file', () => {});
  describe('GET /upload/search/:id => Search files', () => {});
  describe('DELETE /upload/files/:id => Delete a file ', () => {});
});
