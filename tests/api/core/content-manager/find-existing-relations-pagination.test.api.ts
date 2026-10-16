import { createTestBuilder } from 'api-tests/builder';
import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';
import { createUtils } from 'api-tests/utils';

/**
 * Regression tests for https://github.com/strapi/strapi/issues/28072
 *
 * findExisting loads the relations twice: once for the ids of the requested page, and once more
 * with the main field (scoped to those ids and to the user's read permissions). The second query
 * must not be re-paginated, otherwise every relation past the 10th is returned without its main field.
 */

const tagUid = 'api::tag.tag';
const postUid = 'api::post.post';

const TOTAL_TAGS = 35;

const tagModel = {
  singularName: 'tag',
  pluralName: 'tags',
  displayName: 'Tag',
  draftAndPublish: false,
  attributes: {
    name: { type: 'string' },
  },
};

const postModel = {
  singularName: 'post',
  pluralName: 'posts',
  displayName: 'Post',
  draftAndPublish: false,
  attributes: {
    title: { type: 'string' },
    tags: {
      type: 'relation',
      relation: 'manyToMany',
      target: tagUid,
    },
  },
};

describe('CM API - Find existing relations with pageSize > 10', () => {
  const builder = createTestBuilder();
  let strapi: any;
  let utils: any;
  let rq: any;
  let restrictedRq: any;
  let role: any;
  let restrictedUser: any;
  let postDocumentId: string;
  // documentIds of the tags created by the restricted user (readable through the is-creator condition)
  const ownTagDocumentIds = new Set<string>();

  const findExisting = (request: any, qs: Record<string, unknown>) =>
    request({
      method: 'GET',
      url: `/content-manager/relations/${postUid}/${postDocumentId}/tags`,
      qs,
    });

  beforeAll(async () => {
    await builder.addContentTypes([tagModel, postModel]).build();

    strapi = await createStrapiInstance();
    utils = createUtils(strapi);
    rq = await createAuthRequest({ strapi });

    role = await utils.createRole({
      name: 'find-existing-tester',
      description: 'Can only read the tags it created',
    });

    await utils.assignPermissionsToRole(role.id, [
      {
        action: 'plugin::content-manager.explorer.read',
        subject: postUid,
        fields: null,
        conditions: [],
      },
      {
        action: 'plugin::content-manager.explorer.create',
        subject: tagUid,
        fields: null,
        conditions: [],
      },
      {
        action: 'plugin::content-manager.explorer.read',
        subject: tagUid,
        fields: null,
        conditions: ['admin::is-creator'],
      },
    ]);

    restrictedUser = await utils.createUser({
      firstname: 'Restricted',
      lastname: 'User',
      email: 'find-existing-restricted@test.com',
      password: 'Restricted123',
      roles: [role.id],
    });

    restrictedRq = await createAuthRequest({ strapi, userInfo: restrictedUser });

    // Every third tag is created by the restricted user, so every page holds a mix of
    // readable and unreadable relations for that user
    const tagDocumentIds: string[] = [];
    for (let i = 0; i < TOTAL_TAGS; i += 1) {
      const isOwnTag = i % 3 === 0;
      const res = await (isOwnTag ? restrictedRq : rq)({
        method: 'POST',
        url: `/content-manager/collection-types/${tagUid}`,
        body: { name: `Tag ${i}` },
      });

      expect(res.statusCode).toBe(201);

      tagDocumentIds.push(res.body.data.documentId);
      if (isOwnTag) {
        ownTagDocumentIds.add(res.body.data.documentId);
      }
    }

    const post = await strapi.documents(postUid).create({
      data: { title: 'Post with many tags', tags: tagDocumentIds },
    });

    postDocumentId = post.documentId;
  });

  afterAll(async () => {
    await utils.deleteUsersById([restrictedUser.id]);
    await utils.deleteRolesById([role.id]);

    await strapi.destroy();
    await builder.cleanup();
  });

  /**
   * The ids of the requested page, in the order returned by a single unrestricted page
   * holding every relation
   */
  const getExpectedPageIds = async (page: number, pageSize: number) => {
    const res = await findExisting(rq, { page: 1, pageSize: 100 });

    expect(res.statusCode).toBe(200);
    expect(res.body.results).toHaveLength(TOTAL_TAGS);

    return res.body.results
      .slice((page - 1) * pageSize, page * pageSize)
      .map((relation: any) => relation.id);
  };

  test('Returns the main field of every relation when all of them fit in one page', async () => {
    const res = await findExisting(rq, { page: 1, pageSize: 100 });

    expect(res.statusCode).toBe(200);
    expect(res.body.pagination).toMatchObject({ page: 1, pageSize: 100, total: TOTAL_TAGS });
    expect(res.body.results).toHaveLength(TOTAL_TAGS);
    res.body.results.forEach((relation: any) => {
      expect(relation.name).toEqual(expect.stringMatching(/^Tag \d+$/));
    });
  });

  test('Returns the main field of every relation of a page past the first one', async () => {
    const expectedIds = await getExpectedPageIds(2, 15);

    const res = await findExisting(rq, { page: 2, pageSize: 15 });

    expect(res.statusCode).toBe(200);
    expect(res.body.pagination).toMatchObject({ page: 2, pageSize: 15, total: TOTAL_TAGS });
    expect(res.body.results.map((relation: any) => relation.id)).toEqual(expectedIds);
    res.body.results.forEach((relation: any) => {
      expect(relation.name).toEqual(expect.stringMatching(/^Tag \d+$/));
    });
  });

  test('Only returns the main field of the relations the user is allowed to read', async () => {
    const expectedIds = await getExpectedPageIds(2, 15);

    const res = await findExisting(restrictedRq, { page: 2, pageSize: 15 });

    expect(res.statusCode).toBe(200);
    // The union lists the readable relations first, so only the set of ids is compared here
    expect(res.body.results.map((relation: any) => relation.id).sort()).toEqual(
      [...expectedIds].sort()
    );

    const readable = res.body.results.filter((relation: any) =>
      ownTagDocumentIds.has(relation.documentId)
    );
    const unreadable = res.body.results.filter(
      (relation: any) => !ownTagDocumentIds.has(relation.documentId)
    );

    expect(readable).toHaveLength(5);
    expect(unreadable).toHaveLength(10);

    readable.forEach((relation: any) => {
      expect(relation.name).toEqual(expect.stringMatching(/^Tag \d+$/));
    });
    unreadable.forEach((relation: any) => {
      expect(relation.name).toBeUndefined();
    });
  });
});
