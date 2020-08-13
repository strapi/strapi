'use strict';

const fs = require('fs');

const { registerAndLogin } = require('../../../test/helpers/auth');
const { createAuthRequest } = require('../../../test/helpers/request');

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
  }, 60000);

  afterEach(async () => {
    await resetProviderConfigToDefault();
  });

  test('Upload a single file', async () => {
    const req = rq.post('/graphql');
    const form = req.form();
    form.append(
      'operations',
      JSON.stringify({
        query: /* GraphQL */ `
          mutation uploadFiles($file: Upload!) {
            upload(file: $file) {
              id
              name
              mime
              url
            }
          }
        `,
        variables: {
          file: null,
        },
      })
    );

    form.append(
      'map',
      JSON.stringify({
        0: ['variables.file'],
      })
    );

    form.append('0', fs.createReadStream(__dirname + '/rec.jpg'));

    const res = await req;

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      data: {
        upload: {
          id: expect.anything(),
          name: 'rec.jpg',
        },
      },
    });
  });

  test('Upload multiple files', async () => {
    const req = rq.post('/graphql');
    const form = req.form();
    form.append(
      'operations',
      JSON.stringify({
        query: /* GraphQL */ `
          mutation uploadFiles($files: [Upload]!) {
            multipleUpload(files: $files) {
              id
              name
              mime
              url
            }
          }
        `,
        variables: {
          files: [null, null],
        },
      })
    );

    form.append(
      'map',
      JSON.stringify({
        0: ['variables.files.0'],
        1: ['variables.files.1'],
      })
    );

    form.append('0', fs.createReadStream(__dirname + '/rec.jpg'));
    form.append('1', fs.createReadStream(__dirname + '/rec.jpg'));

    const res = await req;

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      data: {
        multipleUpload: expect.arrayContaining([
          expect.objectContaining({
            id: expect.anything(),
            name: 'rec.jpg',
          }),
        ]),
      },
    });
  });
});
