'use strict';

/**
 * API tests for GitHub issue #25198:
 * Create and publish entries with many relations (100 and 550).
 * Ensures create + publish succeed on all databases. On SQLite, batching keeps
 * join-table inserts ≤500 rows to avoid "too many terms in compound SELECT".
 *
 * @see https://github.com/strapi/strapi/issues/25198
 */

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');

let strapi;
let rq;
const data = {
  members: [],
  owners: [],
};

const UID_OWNER = 'api::owner.owner';
const UID_MEMBER = 'api::member.member';

const expectRelationCount = (value, expected) => {
  // Content Manager can return toMany relations either as:
  // - an array (fully populated) or
  // - an object like { count: number } (count-only populate)
  if (Array.isArray(value)) {
    expect(value).toHaveLength(expected);
    return;
  }

  expect(value).toBeDefined();
  expect(value.count).toBe(expected);
};

// Member created first (no relation). Owner's targetAttribute: 'owners' will add the inverse on Member.
const memberModel = {
  displayName: 'Member',
  singularName: 'member',
  pluralName: 'members',
  description: '',
  collectionName: '',
  attributes: {
    name: { type: 'string' },
  },
};

const ownerModel = {
  displayName: 'Owner',
  singularName: 'owner',
  pluralName: 'owners',
  description: '',
  collectionName: '',
  draftAndPublish: true,
  attributes: {
    name: { type: 'string' },
    members: {
      type: 'relation',
      relation: 'manyToMany',
      target: UID_MEMBER,
      targetAttribute: 'owners',
    },
  },
};

const createOwnerWithMembers = async (name, memberDocumentIds) => {
  return rq({
    method: 'POST',
    url: `/content-manager/collection-types/${UID_OWNER}`,
    body: {
      name,
      members: { set: memberDocumentIds.map((documentId) => ({ documentId })) },
    },
  });
};

const createMembers = async (count, namePrefix = 'member') => {
  const documentIds = [];
  for (let i = 0; i < count; i += 1) {
    const res = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${UID_MEMBER}`,
      body: { name: `${namePrefix}-${i}` },
    });
    expect(res.statusCode).toBe(201);
    expect(res.body.data).toBeDefined();
    const member = res.body.data;
    documentIds.push(member.documentId);
    data.members.push(member);
  }
  return documentIds;
};

describe('CM API - Many relations update (GH#25198)', () => {
  const builder = createTestBuilder();

  beforeAll(async () => {
    // Order matters: Member first (target), then Owner (relation targets Member; inverse 'owners' is auto-added on Member)
    await builder.addContentTypes([memberModel, ownerModel]).build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
  });

  afterAll(async () => {
    if (strapi) {
      await strapi.destroy();
    }
    await builder.cleanup();
  });

  /**
   * Same flow for each relation count: create N members, create owner with those members, publish.
   * Both must succeed on all databases (GH#25198: on SQLite, batching keeps each batch ≤500).
   */
  test.each([
    { relationCount: 100, label: '100 relations' },
    { relationCount: 550, label: '550 relations' },
  ])(
    'Publish entry with $relationCount relations ($label)',
    async ({ relationCount }) => {
      const memberDocumentIds = await createMembers(relationCount, `member-${relationCount}`);

      const createRes = await createOwnerWithMembers(
        `Owner with ${relationCount} members`,
        memberDocumentIds
      );
      expect(createRes.statusCode).toBe(201);
      expect(createRes.body.data).toBeDefined();
      expect(createRes.body.data.documentId).toBeDefined();
      data.owners.push(createRes.body.data);

      const publishRes = await rq({
        method: 'POST',
        url: `/content-manager/collection-types/${UID_OWNER}/${createRes.body.data.documentId}/actions/publish`,
      });
      expect(publishRes.statusCode).toBe(200);
      expect(publishRes.body.data).toBeDefined();
      expect(publishRes.body.data.publishedAt).toBeDefined();
    },
    120000
  );

  /**
   * Update (PUT) an entry with 550 relations exercises updateRelations + batched join-table insert.
   * On SQLite, batching keeps each batch ≤500 (GH#25198).
   */
  test('Update entry with 550 relations', async () => {
    const relationCount = 550;
    const memberDocumentIds = await createMembers(relationCount, 'member-update');

    const createRes = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${UID_OWNER}`,
      body: { name: 'Owner to update' },
    });
    expect(createRes.statusCode).toBe(201);
    const documentId = createRes.body.data.documentId;

    const updateRes = await rq({
      method: 'PUT',
      url: `/content-manager/collection-types/${UID_OWNER}/${documentId}`,
      body: {
        members: { set: memberDocumentIds.map((id) => ({ documentId: id })) },
      },
    });
    expect(updateRes.statusCode).toBe(200);
    expect(updateRes.body.data).toBeDefined();
    expect(updateRes.body.data.members).toBeDefined();
    expectRelationCount(updateRes.body.data.members, relationCount);
  }, 120000);

  /**
   * repository.attachRelations(id, data) with 550 relations exercises the transaction-wrapped
   * path and batched join-table insert (GH#25198).
   */
  test('Repository.attachRelations with 550 relations succeeds', async () => {
    const relationCount = 550;
    const memberDocumentIds = await createMembers(relationCount, 'member-repo');

    const memberEntities = await strapi.db
      .query(UID_MEMBER)
      .findMany({ where: { documentId: { $in: memberDocumentIds } } });
    const memberIds = memberEntities.map((m) => m.id);
    expect(memberIds).toHaveLength(relationCount);

    const createRes = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${UID_OWNER}`,
      body: { name: 'Owner for repo attach' },
    });
    expect(createRes.statusCode).toBe(201);
    const ownerDocumentId = createRes.body.data.documentId;

    const ownerEntities = await strapi.db
      .query(UID_OWNER)
      .findMany({ where: { documentId: ownerDocumentId } });
    expect(ownerEntities.length).toBeGreaterThanOrEqual(1);
    const ownerId = ownerEntities[0].id;

    // `strapi.db.query(uid)` returns the entity repository for that model
    await strapi.db.query(UID_OWNER).attachRelations(ownerId, {
      members: { set: memberIds },
    });

    const getRes = await rq({
      method: 'GET',
      url: `/content-manager/collection-types/${UID_OWNER}/${ownerDocumentId}`,
      qs: { populate: ['members'] },
    });
    expect(getRes.statusCode).toBe(200);
    expectRelationCount(getRes.body.data.members, relationCount);
  }, 120000);
});
