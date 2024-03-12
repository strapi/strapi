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
});
