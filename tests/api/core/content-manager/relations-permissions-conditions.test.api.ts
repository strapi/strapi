import { createTestBuilder } from 'api-tests/builder';
import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';
import { createUtils } from 'api-tests/utils';

const tagUid = 'api::conditions-tag.conditions-tag';
const tagModel = {
  kind: 'collectionType',
  singularName: 'conditions-tag',
  pluralName: 'conditions-tags',
  displayName: 'Conditions tag',
  draftAndPublish: false,
  attributes: {
    name: { type: 'string' },
  },
};

const shopUid = 'api::conditions-shop.conditions-shop';
const shopModel = {
  kind: 'collectionType',
  singularName: 'conditions-shop',
  pluralName: 'conditions-shops',
  displayName: 'Conditions shop',
  draftAndPublish: false,
  attributes: {
    name: { type: 'string' },
    tags: { type: 'relation', relation: 'oneToMany', target: tagUid },
  },
};

// More than the default page size of 10, so a load without page params would miss some
const OWN_TAGS_COUNT = 12;
const OTHER_TAGS_COUNT = 3;
const TOTAL_TAGS_COUNT = OWN_TAGS_COUNT + OTHER_TAGS_COUNT;

/**
 * When the read permission on the relation target has conditions, the relations of an entry are
 * loaded in two steps: the ids of the page, then the main field of the relations the user can
 * read. Each relation the user can read must come back with its main field, whatever the page.
 */
describe('Admin Permissions - relations of an entry under a conditioned read permission', () => {
  const builder = createTestBuilder();
  let strapi;
  let utils;
  let adminRq;
  let restrictedRq;
  let restrictedRole;
  let restrictedUser;
  let shopDocumentId: string;
  const ownTagIds = new Set<string>();
  const otherTagIds = new Set<string>();

  const createTag = async (rq, name: string): Promise<string> => {
    const res = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${tagUid}`,
      body: { name },
    });
    expect(res.statusCode).toBe(201);

    return res.body.data.documentId;
  };

  const expectMainFieldOnReadableTagsOnly = (results: Array<Record<string, unknown>>) => {
    results.forEach((tag) => {
      if (ownTagIds.has(tag.documentId as string) === true) {
        expect(tag.name).toEqual(expect.any(String));
      } else {
        expect(otherTagIds.has(tag.documentId as string)).toBe(true);
        expect(tag.name).toBeUndefined();
      }
    });
  };

  beforeAll(async () => {
    await builder.addContentTypes([tagModel, shopModel]).build();

    strapi = await createStrapiInstance();
    utils = createUtils(strapi);
    adminRq = await createAuthRequest({ strapi });

    restrictedRole = await utils.createRole({
      name: 'role-relations-conditions',
      description: 'Reads only the tags it created',
    });
    await utils.assignPermissionsToRole(restrictedRole.id, [
      {
        action: 'plugin::content-manager.explorer.read',
        subject: shopUid,
        properties: { fields: ['name', 'tags'] },
      },
      {
        action: 'plugin::content-manager.explorer.create',
        subject: tagUid,
        properties: { fields: ['name'] },
      },
      {
        action: 'plugin::content-manager.explorer.read',
        subject: tagUid,
        properties: { fields: ['name'] },
        conditions: ['admin::is-creator'],
      },
    ]);
    restrictedUser = await utils.createUser({
      firstname: 'restricted',
      lastname: 'User',
      email: 'relations-conditions.restricted@strapi.io',
      roles: [restrictedRole.id],
    });
    restrictedRq = await createAuthRequest({ strapi, userInfo: restrictedUser });

    for (let i = 0; i < OWN_TAGS_COUNT; i += 1) {
      ownTagIds.add(await createTag(restrictedRq, `Own tag ${i + 1}`));
    }
    for (let i = 0; i < OTHER_TAGS_COUNT; i += 1) {
      otherTagIds.add(await createTag(adminRq, `Other tag ${i + 1}`));
    }

    const shop = await adminRq({
      method: 'POST',
      url: `/content-manager/collection-types/${shopUid}`,
      body: { name: 'Shop', tags: { connect: [...ownTagIds, ...otherTagIds] } },
    });
    expect(shop.statusCode).toBe(201);
    shopDocumentId = shop.body.data.documentId;
  });

  afterAll(async () => {
    await utils.deleteUsersById([restrictedUser.id]);
    await utils.deleteRolesById([restrictedRole.id]);

    await strapi.destroy();
    await builder.cleanup();
  });

  test('a page larger than 10 returns the main field of every relation the user can read', async () => {
    const res = await restrictedRq({
      method: 'GET',
      url: `/content-manager/relations/${shopUid}/${shopDocumentId}/tags`,
      qs: { page: 1, pageSize: 20 },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.pagination).toMatchObject({
      page: 1,
      pageSize: 20,
      total: TOTAL_TAGS_COUNT,
    });
    expect(res.body.results).toHaveLength(TOTAL_TAGS_COUNT);
    expect(res.body.results.filter((tag) => tag.name !== undefined)).toHaveLength(OWN_TAGS_COUNT);
    expectMainFieldOnReadableTagsOnly(res.body.results);
  });

  test('a page after the first returns the main field of every relation the user can read', async () => {
    const res = await restrictedRq({
      method: 'GET',
      url: `/content-manager/relations/${shopUid}/${shopDocumentId}/tags`,
      qs: { page: 2, pageSize: 5 },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.pagination).toMatchObject({ page: 2, pageSize: 5, total: TOTAL_TAGS_COUNT });
    expect(res.body.results).toHaveLength(5);
    expectMainFieldOnReadableTagsOnly(res.body.results);
  });
});
