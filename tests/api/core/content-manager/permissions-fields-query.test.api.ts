import { createTestBuilder } from 'api-tests/builder';
import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';
import { createUtils } from 'api-tests/utils';

const articleUid = 'api::fields-query-article.fields-query-article';
const articleModel = {
  kind: 'collectionType',
  singularName: 'fields-query-article',
  pluralName: 'fields-query-articles',
  displayName: 'Fields query article',
  draftAndPublish: false,
  attributes: {
    title: { type: 'string' },
    secret: { type: 'string' },
  },
};

const homepageUid = 'api::fields-query-homepage.fields-query-homepage';
const homepageModel = {
  kind: 'singleType',
  singularName: 'fields-query-homepage',
  pluralName: 'fields-query-homepages',
  displayName: 'Fields query homepage',
  draftAndPublish: false,
  attributes: {
    headline: { type: 'string' },
    subtitle: { type: 'string' },
  },
};

/**
 * The `fields` query parameter of a content manager request is sanitized with the rules of the
 * request's action. A field the role can't use for that action is dropped from `fields`, and
 * the request still succeeds with the remaining fields.
 */
describe('Admin Permissions - fields query parameter', () => {
  const builder = createTestBuilder();
  let strapi;
  let utils;
  let adminRq;
  let restrictedRq;
  let restrictedRole;
  let restrictedUser;

  beforeAll(async () => {
    await builder.addContentTypes([articleModel, homepageModel]).build();

    strapi = await createStrapiInstance();
    utils = createUtils(strapi);
    adminRq = await createAuthRequest({ strapi });

    const created = await adminRq({
      method: 'POST',
      url: `/content-manager/collection-types/${articleUid}`,
      body: { title: 'Title', secret: 'Secret' },
    });
    expect(created.statusCode).toBe(201);

    restrictedRole = await utils.createRole({
      name: 'role-fields-query',
      description: 'Restricted fields per action',
    });
    await utils.assignPermissionsToRole(restrictedRole.id, [
      {
        action: 'plugin::content-manager.explorer.read',
        subject: articleUid,
        properties: { fields: ['title'] },
      },
      {
        action: 'plugin::content-manager.explorer.read',
        subject: homepageUid,
        properties: { fields: ['headline', 'subtitle'] },
      },
      {
        action: 'plugin::content-manager.explorer.create',
        subject: homepageUid,
        properties: { fields: ['headline', 'subtitle'] },
      },
      {
        action: 'plugin::content-manager.explorer.update',
        subject: homepageUid,
        properties: { fields: ['headline'] },
      },
    ]);
    restrictedUser = await utils.createUser({
      firstname: 'restricted',
      lastname: 'User',
      email: 'fields-query.restricted@strapi.io',
      roles: [restrictedRole.id],
    });
    restrictedRq = await createAuthRequest({ strapi, userInfo: restrictedUser });
  });

  afterAll(async () => {
    await utils.deleteUsersById([restrictedUser.id]);
    await utils.deleteRolesById([restrictedRole.id]);

    await strapi.destroy();
    await builder.cleanup();
  });

  test('a list read drops a field the role cannot read from fields', async () => {
    const res = await restrictedRq({
      method: 'GET',
      url: `/content-manager/collection-types/${articleUid}`,
      qs: { fields: ['title', 'secret'] },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.results).toHaveLength(1);
    expect(res.body.results[0].title).toBe('Title');
    expect(res.body.results[0].secret).toBeUndefined();
  });

  test('a single type write drops a field the role can read but not update from fields', async () => {
    const res = await restrictedRq({
      method: 'PUT',
      url: `/content-manager/single-types/${homepageUid}`,
      qs: { fields: ['headline', 'subtitle'] },
      body: { headline: 'Headline', subtitle: 'Subtitle' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.headline).toBe('Headline');

    const stored = await strapi.documents(homepageUid).findFirst();

    expect(stored.headline).toBe('Headline');
  });
});
