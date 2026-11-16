'use strict';

const fs = require('fs');
const path = require('path');

const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');

let strapi;
let rq;

const data = {};

describe('Upload plugin end to end tests', () => {
  beforeAll(async () => {
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({
      strapi,
    });

    const res = await rq({
      method: 'POST',
      url: '/upload',
      formData: {
        files: fs.createReadStream(path.join(__dirname, '../utils/rec.jpg')),
      },
    });

    data.file = res.body[0];
    data.file.id = `${data.file.id}`;
  });

  afterAll(async () => {
    await strapi.destroy();
  });

  test('Update file information', async () => {
    const res = await rq({
      url: '/graphql',
      method: 'POST',
      body: {
        query: /* GraphQL */ `
          mutation updateFileInfo($id: ID!, $info: FileInfoInput!) {
            updateUploadFile(id: $id, info: $info) {
              data {
                id
                attributes {
                  name
                  alternativeText
                  caption
                }
              }
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
        updateUploadFile: {
          data: {
            id: data.file.id,
            attributes: {
              name: 'test name',
              alternativeText: 'alternative text test',
              caption: 'caption test',
            },
          },
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
            deleteUploadFile(id: $id) {
              data {
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
        deleteUploadFile: {
          data: {
            id: data.file.id,
          },
        },
      },
    });
  });

  test('Delete a file that does not exist', async () => {
    const res = await rq({
      url: '/graphql',
      method: 'POST',
      body: {
        query: /* GraphQL */ `
          mutation removeFile($id: ID!) {
            deleteUploadFile(id: $id) {
              data {
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
        deleteUploadFile: null,
      },
    });
  });

  describe('By documentId', () => {
    let file;

    beforeAll(async () => {
      const res = await rq({
        method: 'POST',
        url: '/upload',
        formData: {
          files: fs.createReadStream(path.join(__dirname, '../utils/rec.jpg')),
        },
      });

      file = res.body[0];
    });

    const updateFileInfo = (id) =>
      rq({
        url: '/graphql',
        method: 'POST',
        body: {
          query: /* GraphQL */ `
            mutation updateFileInfo($id: ID!, $info: FileInfoInput!) {
              updateUploadFile(id: $id, info: $info) {
                data {
                  id
                  attributes {
                    name
                  }
                }
              }
            }
          `,
          variables: { id, info: { name: 'renamed by documentId' } },
        },
      });

    const removeFile = (id) =>
      rq({
        url: '/graphql',
        method: 'POST',
        body: {
          query: /* GraphQL */ `
            mutation removeFile($id: ID!) {
              deleteUploadFile(id: $id) {
                data {
                  id
                }
              }
            }
          `,
          variables: { id },
        },
      });

    test('Update file information by documentId', async () => {
      const res = await updateFileInfo(file.documentId);

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({
        data: {
          updateUploadFile: {
            data: {
              id: `${file.id}`,
              attributes: { name: 'renamed by documentId' },
            },
          },
        },
      });
    });

    test('Update file information with an unknown documentId returns a not found error', async () => {
      const res = await updateFileInfo('unknowndocumentid0000000');

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toBeNull();
      expect(res.body.errors[0]).toMatchObject({
        extensions: {
          code: 'STRAPI_NOT_FOUND_ERROR',
          error: { name: 'NotFoundError' },
        },
      });
    });

    test('Delete a file with an unknown documentId returns null', async () => {
      const res = await removeFile('unknowndocumentid0000000');

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({ data: { deleteUploadFile: null } });
    });

    test('Delete a file by documentId', async () => {
      const res = await removeFile(file.documentId);

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({
        data: { deleteUploadFile: { data: { id: `${file.id}` } } },
      });

      const getRes = await rq({ method: 'GET', url: `/upload/files/${file.id}` });

      expect(getRes.statusCode).toBe(404);
    });
  });
});
