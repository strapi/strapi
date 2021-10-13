'use strict';

const fs = require('fs');
const path = require('path');

const { createStrapiInstance } = require('../../../test/helpers/strapi');
const { createAuthRequest } = require('../../../test/helpers/request');

let strapi;
let rq;

const data = {};

describe('Upload plugin end to end tests', () => {
  beforeAll(async () => {
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
  });

  afterAll(async () => {
    await strapi.destroy();
  });

  test('Upload a single file', async () => {
    const formData = {
      operations: JSON.stringify({
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
      }),
      map: JSON.stringify({
        nFile1: ['variables.file'],
      }),
      nFile1: fs.createReadStream(path.join(__dirname, '/rec.jpg')),
    };

    const res = await rq({ method: 'POST', url: '/graphql', formData });

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
    const formData = {
      operations: JSON.stringify({
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
      }),
      map: JSON.stringify({
        nFile0: ['variables.files.0'],
        nFile1: ['variables.files.1'],
      }),
      nFile0: fs.createReadStream(path.join(__dirname, '/rec.jpg')),
      nFile1: fs.createReadStream(path.join(__dirname, '/rec.jpg')),
    };

    const res = await rq({ method: 'POST', url: '/graphql', formData });

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

  test('Upload a single file with info', async () => {
    const formData = {
      operations: JSON.stringify({
        query: /* GraphQL */ `
          mutation uploadFilesWithInfo($file: Upload!, $info: FileInfoInput) {
            upload(file: $file, info: $info) {
              id
              name
              alternativeText
              caption
            }
          }
        `,
        variables: {
          file: null,
          info: {
            alternativeText: 'alternative text test',
            caption: 'caption test',
          },
        },
      }),
      map: JSON.stringify({
        nFile1: ['variables.file'],
      }),
      nFile1: fs.createReadStream(path.join(__dirname, '/rec.jpg')),
    };

    const res = await rq({ method: 'POST', url: '/graphql', formData });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      data: {
        upload: {
          id: expect.anything(),
          name: 'rec.jpg',
          alternativeText: 'alternative text test',
          caption: 'caption test',
        },
      },
    });
  });
});
