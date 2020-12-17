'use strict';

const fs = require('fs');
const path = require('path');

const { registerAndLogin } = require('../../../test/helpers/auth');
const { createAuthRequest } = require('../../../test/helpers/request');

let rq;

const data = {};

describe('Upload plugin end to end tests', () => {
  beforeAll(async () => {
    const token = await registerAndLogin();
    rq = createAuthRequest(token);
  }, 60000);

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

    form.append('0', fs.createReadStream(path.join(__dirname, 'rec.jpg')));

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

    data.file = res.body.data.upload;
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

    form.append('0', fs.createReadStream(path.join(__dirname, 'rec.jpg')));
    form.append('1', fs.createReadStream(path.join(__dirname, 'rec.jpg')));

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

  test('Update file information', async () => {
    const res = await rq({
      url: '/graphql',
      method: 'POST',
      body: {
        query: /* GraphQL */ `
          mutation updateFileInfo($id: ID!, $info: FileInfoInput!) {
            updateFileInfo(id: $id, info: $info) {
              id
              name
              alternativeText
              caption
            }
          }
        `,
        variables: {
          id: data.file.id,
          info: {
            name: 'test name',
            alternativeText: 'alternative text test',
            caption: 'caption test',
          },
        },
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      data: {
        updateFileInfo: {
          id: data.file.id,
          name: 'test name',
          alternativeText: 'alternative text test',
          caption: 'caption test',
        },
      },
    });
  });

  test('Delete a file', async () => {
    const res = await rq({
      url: '/graphql',
      method: 'POST',
      body: {
        query: /* GraphQL */ `
          mutation removeFile($id: ID!) {
            deleteFile(input: { where: { id: $id } }) {
              file {
                id
              }
            }
          }
        `,
        variables: {
          id: data.file.id,
        },
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      data: {
        deleteFile: {
          file: {
            id: data.file.id,
          },
        },
      },
    });
  });

  test('Delete a file that dont exist', async () => {
    const res = await rq({
      url: '/graphql',
      method: 'POST',
      body: {
        query: /* GraphQL */ `
          mutation removeFile($id: ID!) {
            deleteFile(input: { where: { id: $id } }) {
              file {
                id
              }
            }
          }
        `,
        variables: {
          id: '404',
        },
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      data: {
        deleteFile: null,
      },
    });
  });
});
