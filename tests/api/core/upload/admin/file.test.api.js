'use strict';

const fs = require('fs');
const path = require('path');

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');
const { createUtils } = require('api-tests/utils');

const builder = createTestBuilder();
let strapi;
let rq;
let utils;

const dogModel = {
  displayName: 'Dog',
  singularName: 'dog',
  pluralName: 'dogs',
  kind: 'collectionType',
  attributes: {
    profilePicture: {
      type: 'media',
    },
  },
};

describe('Upload', () => {
  beforeAll(async () => {
    await builder.addContentType(dogModel).build();
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
    utils = createUtils(strapi);
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  describe('Create', () => {
    test('Rejects when no files are provided', async () => {
      const res = await rq({ method: 'POST', url: '/upload', formData: {} });
      expect(res.statusCode).toBe(400);
    });

    test('Can upload a file', async () => {
      const res = await rq({
        method: 'POST',
        url: '/upload',
        formData: { files: fs.createReadStream(path.join(__dirname, '../utils/rec.jpg')) },
      });

      expect(res.statusCode).toBe(201);
    });
  });

  describe('Read', () => {
    let uploadReaderRole;

    let u1Req;
    let u2Req;

    const users = { u1: null, u2: null };

    beforeAll(async () => {
      uploadReaderRole = await utils.createRole({
        name: 'UploadReader',
        description: 'Can only see files created by same role as creator',
      });

      // Add permissions to the role with conditions
      // This is important in order to dynamically add filters with sensitive fields to the final query
      await utils.assignPermissionsToRole(uploadReaderRole.id, [
        {
          action: 'plugin::upload.read',
          subject: null,
          conditions: ['admin::has-same-role-as-creator'],
          properties: {},
        },
        {
          action: 'plugin::upload.assets.create',
          subject: null,
          conditions: ['admin::has-same-role-as-creator'],
          properties: {},
        },
        {
          action: 'plugin::upload.assets.update',
          subject: null,
          conditions: ['admin::has-same-role-as-creator'],
          properties: {},
        },
      ]);

      // TODO: We create 2 users in order to be able to test the condition itself (same role as creator)

      users.u1 = await utils.createUser({
        firstname: 'reader1',
        lastname: 'reader1',
        email: 'reader1@strapi.io',
        password: 'Reader1',
        isActive: true,
        roles: [uploadReaderRole.id],
      });

      users.u2 = await utils.createUser({
        firstname: 'reader2',
        lastname: 'reader2',
        email: 'reader2@strapi.io',
        password: 'Reader2',
        isActive: true,
        roles: [uploadReaderRole.id],
      });

      // Users' requests

      u1Req = await createAuthRequest({
        strapi,
        userInfo: { email: 'reader1@strapi.io', password: 'Reader1' },
      });

      u2Req = await createAuthRequest({
        strapi,
        userInfo: { email: 'reader2@strapi.io', password: 'Reader2' },
      });
    });

    // Cleanup test fixtures
    afterAll(async () => {
      await utils.deleteUsersById([users.u1.id, users.u2.id]);
      await utils.deleteRolesById([uploadReaderRole.id]);
    });

    test('GET /upload/files => Find files', async () => {
      const res = await rq({ method: 'GET', url: '/upload/files' });

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({
        results: expect.arrayContaining([
          expect.objectContaining({
            id: expect.anything(),
            url: expect.any(String),
          }),
        ]),
        pagination: {
          page: expect.any(Number),
          pageSize: expect.any(Number),
          pageCount: expect.any(Number),
          total: expect.any(Number),
        },
      });
      res.body.results.forEach((file) => expect(file.folder).toBeDefined());
    });

    test(`Using custom conditions don't trigger validation errors for dynamically added fields`, async () => {
      const res = await u1Req({ method: 'GET', url: '/upload/files' });

      // The request succeed, no validation error
      expect(res.statusCode).toBe(200);

      // No data is returned, the condition is successfully applied (u1 did not upload any file)
      expect(res.body).toEqual({
        results: [],
        pagination: {
          page: expect.any(Number),
          pageSize: expect.any(Number),
          pageCount: expect.any(Number),
          total: expect.any(Number),
        },
      });
    });
  });
});
