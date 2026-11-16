'use strict';

const fs = require('fs');
const path = require('path');

const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');

let strapi;
let rq;

const UNKNOWN_DOCUMENT_ID = 'unknowndocumentid0000000';

describe('Upload plugin GraphQL with v4CompatibilityMode disabled', () => {
  beforeAll(async () => {
    strapi = await createStrapiInstance({
      async bootstrap({ strapi: instance }) {
        // The API runner defaults this legacy mode to true; these tests cover the v5 schema.
        instance.config.set('plugin::graphql.v4CompatibilityMode', false);
      },
    });
    rq = await createAuthRequest({ strapi });

    expect(strapi.plugin('graphql').config('v4CompatibilityMode')).toBe(false);
  });

  afterAll(async () => {
    await strapi.destroy();
  });

  const uploadFile = async () => {
    const res = await rq({
      method: 'POST',
      url: '/upload',
      formData: {
        files: fs.createReadStream(path.join(__dirname, '../utils/rec.jpg')),
      },
    });

    expect(res.statusCode).toBe(201);

    return res.body[0];
  };

  const updateFileInfo = (id, name) =>
    rq({
      url: '/graphql',
      method: 'POST',
      body: {
        query: /* GraphQL */ `
          mutation updateFileInfo($id: ID!, $info: FileInfoInput!) {
            updateUploadFile(id: $id, info: $info) {
              documentId
              name
            }
          }
        `,
        variables: { id, info: { name } },
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
              documentId
            }
          }
        `,
        variables: { id },
      },
    });

  const deleteFileByRest = (file) => rq({ method: 'DELETE', url: `/upload/files/${file.id}` });

  describe('updateUploadFile', () => {
    test('Updates a file by documentId', async () => {
      const file = await uploadFile();

      const res = await updateFileInfo(file.documentId, 'renamed by documentId');

      expect(res.statusCode).toBe(200);
      expect(res.body.errors).toBeUndefined();
      expect(res.body).toMatchObject({
        data: {
          updateUploadFile: { documentId: file.documentId, name: 'renamed by documentId' },
        },
      });

      await deleteFileByRest(file);
    });

    test('Updates a file by numeric id', async () => {
      const file = await uploadFile();

      const res = await updateFileInfo(`${file.id}`, 'renamed by id');

      expect(res.statusCode).toBe(200);
      expect(res.body.errors).toBeUndefined();
      expect(res.body).toMatchObject({
        data: {
          updateUploadFile: { documentId: file.documentId, name: 'renamed by id' },
        },
      });

      await deleteFileByRest(file);
    });

    test('Returns a not found error for an unknown documentId', async () => {
      const res = await updateFileInfo(UNKNOWN_DOCUMENT_ID, 'never applied');

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toBeNull();
      expect(res.body.errors[0]).toMatchObject({
        extensions: {
          code: 'STRAPI_NOT_FOUND_ERROR',
          error: { name: 'NotFoundError' },
        },
      });
    });
  });

  describe('deleteUploadFile', () => {
    test('Deletes a file by documentId', async () => {
      const file = await uploadFile();

      const res = await removeFile(file.documentId);

      expect(res.statusCode).toBe(200);
      expect(res.body.errors).toBeUndefined();
      expect(res.body).toMatchObject({
        data: { deleteUploadFile: { documentId: file.documentId } },
      });

      const getRes = await rq({ method: 'GET', url: `/upload/files/${file.id}` });

      expect(getRes.statusCode).toBe(404);
    });

    test('Deletes a file by numeric id', async () => {
      const file = await uploadFile();

      const res = await removeFile(`${file.id}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.errors).toBeUndefined();
      expect(res.body).toMatchObject({
        data: { deleteUploadFile: { documentId: file.documentId } },
      });

      const getRes = await rq({ method: 'GET', url: `/upload/files/${file.id}` });

      expect(getRes.statusCode).toBe(404);
    });

    test('Returns null for an unknown documentId', async () => {
      const res = await removeFile(UNKNOWN_DOCUMENT_ID);

      expect(res.statusCode).toBe(200);
      expect(res.body.errors).toBeUndefined();
      expect(res.body).toMatchObject({ data: { deleteUploadFile: null } });
    });
  });
});
