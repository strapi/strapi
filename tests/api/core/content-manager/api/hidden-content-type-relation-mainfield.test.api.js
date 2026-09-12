'use strict';

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');
const { createUtils } = require('api-tests/utils');

let strapi;
let utils;
let rq;
let rqRestricted;
let restrictedUserId;
let restrictedRoleId;
let article;
let globalComponent;

const articleModel = {
  attributes: {
    title: {
      type: 'string',
    },
  },
  displayName: 'Article',
  singularName: 'article',
  pluralName: 'articles',
  description: '',
  collectionName: '',
  pluginOptions: {
    'content-manager': {
      visible: false,
    },
  },
};

const globalComponentModel = {
  attributes: {
    name: {
      type: 'string',
    },
    related_article: {
      type: 'relation',
      relation: 'oneToOne',
      target: 'api::article.article',
    },
  },
  displayName: 'GlobalComponent',
  singularName: 'global-component',
  pluralName: 'global-components',
};

describe('CM API - relation mainField for hidden content type (#27560)', () => {
  const builder = createTestBuilder();

  beforeAll(async () => {
    await builder.addContentTypes([articleModel, globalComponentModel]).build();

    strapi = await createStrapiInstance();
    utils = createUtils(strapi);
    rq = await createAuthRequest({ strapi });

    const restrictedRole = await utils.createRole({
      name: 'restricted-hidden-relation',
      description: 'Can read the global-component but not the hidden article content type',
    });
    restrictedRoleId = restrictedRole.id;

    await utils.assignPermissionsToRole(restrictedRole.id, [
      {
        action: 'plugin::content-manager.explorer.read',
        subject: 'api::global-component.global-component',
      },
    ]);

    const restrictedUser = await utils.createUser({
      email: 'restricted-hidden-relation@test.com',
      firstname: 'Restricted',
      lastname: 'HiddenRelation',
      roles: [restrictedRole.id],
    });
    restrictedUserId = restrictedUser.id;

    rqRestricted = await createAuthRequest({
      strapi,
      userInfo: { email: 'restricted-hidden-relation@test.com' },
    });

    article = await strapi.documents('api::article.article').create({
      data: { title: 'Human Readable Article Title' },
      status: 'published',
    });

    globalComponent = await strapi.documents('api::global-component.global-component').create({
      data: { name: 'GC', related_article: article.documentId },
      status: 'published',
    });
  });

  afterAll(async () => {
    if (restrictedUserId) {
      await utils.deleteUserById(restrictedUserId);
    }
    if (restrictedRoleId) {
      await utils.deleteRolesById([restrictedRoleId]);
    }
    await strapi.destroy();
    await builder.cleanup();
  });

  test('super admin sees the mainField for a relation targeting a hidden content type', async () => {
    const res = await rq({
      method: 'GET',
      url: `/content-manager/relations/api::global-component.global-component/${globalComponent.documentId}/related_article`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.results).toHaveLength(1);
    expect(res.body.results[0]).toEqual(
      expect.objectContaining({
        documentId: article.documentId,
        title: 'Human Readable Article Title',
      })
    );
  });

  test('super admin has explorer.read permission registered for the hidden content type', async () => {
    const { body } = await rq({
      method: 'GET',
      url: '/admin/roles/1/permissions',
    });

    const hasReadPermission = body.data.some(
      (p) =>
        p.action === 'plugin::content-manager.explorer.read' && p.subject === 'api::article.article'
    );

    expect(hasReadPermission).toBe(true);
  });

  test('restricted user without explicit read on the hidden content type does not see its mainField', async () => {
    const res = await rqRestricted({
      method: 'GET',
      url: `/content-manager/relations/api::global-component.global-component/${globalComponent.documentId}/related_article`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.results).toHaveLength(1);
    expect(res.body.results[0].documentId).toBe(article.documentId);
    expect(res.body.results[0].title).toBeUndefined();
  });
});
