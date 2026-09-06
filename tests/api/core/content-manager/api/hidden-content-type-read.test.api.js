'use strict';

const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');
const { createUtils } = require('api-tests/utils');

let strapi;
let rq;
let rqEditor;
let utils;
let editorUserId;

describe('CM API - hidden content type read (#23622)', () => {
  beforeAll(async () => {
    strapi = await createStrapiInstance();
    utils = createUtils(strapi);
    rq = await createAuthRequest({ strapi });

    const editorRole = await strapi.db.query('admin::role').findOne({
      where: { code: 'strapi-editor' },
    });

    const editorUser = await utils.createUser({
      email: 'editor-hidden-ct@test.com',
      firstname: 'Editor',
      lastname: 'HiddenCT',
      roles: [editorRole.id],
    });
    editorUserId = editorUser.id;

    rqEditor = await createAuthRequest({
      strapi,
      userInfo: { email: 'editor-hidden-ct@test.com' },
    });
  });

  afterAll(async () => {
    if (editorUserId) {
      await utils.deleteUserById(editorUserId);
    }
    await strapi.destroy();
  });

  test('super admin can read plugin::users-permissions.role via content manager', async () => {
    const role = await strapi.db.query('plugin::users-permissions.role').findOne({
      where: { type: 'public' },
    });

    const res = await rq({
      method: 'GET',
      url: `/content-manager/collection-types/plugin::users-permissions.role/${role.documentId}`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toEqual(
      expect.objectContaining({
        documentId: role.documentId,
        name: role.name,
      })
    );
  });

  test('default editor cannot read plugin::users-permissions.role via content manager', async () => {
    const role = await strapi.db.query('plugin::users-permissions.role').findOne({
      where: { type: 'public' },
    });

    const res = await rqEditor({
      method: 'GET',
      url: `/content-manager/collection-types/plugin::users-permissions.role/${role.documentId}`,
    });

    expect(res.statusCode).toBe(403);
  });
});
