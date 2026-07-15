'use strict';

/**
 * Companion to required-media.test.api.js — same `api.documents.strictRelations`
 * flag, exercised against required *relations* (`type: 'relation'`) rather than media.
 *
 * Covers the relation-side reports #15445 / #19433: a required relation left empty
 * was never enforced. Under strictRelations, publishing (or any non-draft write)
 * with an empty required relation must return 400; drafts stay lenient and legacy
 * projects are untouched.
 */

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');

let strapi;
let rq;

const authorCT = {
  displayName: 'rel-author',
  singularName: 'rel-author',
  pluralName: 'rel-authors',
  draftAndPublish: true,
  attributes: {
    name: {
      type: 'string',
    },
  },
};

const oneToOneCT = {
  displayName: 'rel-oto',
  singularName: 'rel-oto',
  pluralName: 'rel-otos',
  draftAndPublish: true,
  attributes: {
    author: {
      type: 'relation',
      relation: 'oneToOne',
      target: 'api::rel-author.rel-author',
      required: true,
    },
  },
};

const oneToManyCT = {
  displayName: 'rel-otm',
  singularName: 'rel-otm',
  pluralName: 'rel-otms',
  draftAndPublish: true,
  attributes: {
    authors: {
      type: 'relation',
      relation: 'oneToMany',
      target: 'api::rel-author.rel-author',
      required: true,
    },
  },
};

const AUTHOR_UID = 'api::rel-author.rel-author';
const OTO_UID = 'api::rel-oto.rel-oto';
const OTM_UID = 'api::rel-otm.rel-otm';

const createEntry = (uid, body = {}, qs = {}) =>
  rq.post(`/content-manager/collection-types/${uid}`, { body, qs });

const publishEntry = (uid, documentId) =>
  rq.post(`/content-manager/collection-types/${uid}/${documentId}/actions/publish`);

describe('Required relation field validation (issues #15445 / #19433)', () => {
  const builder = createTestBuilder();
  let authorId;

  beforeAll(async () => {
    await builder
      .addContentType(authorCT)
      .addContentType(oneToOneCT)
      .addContentType(oneToManyCT)
      .build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    // A persisted (published) author to satisfy the relations-exist check on happy paths.
    const authorRes = await createEntry(AUTHOR_UID, { name: 'Ada' });
    await publishEntry(AUTHOR_UID, authorRes.body.data.documentId);
    authorId = authorRes.body.data.id;
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  describe('Legacy behaviour (strictRelations off / unset)', () => {
    beforeAll(() => {
      strapi.config.set('api.documents.strictRelations', false);
    });

    test('publishing an empty required one-to-one relation → 200 (unchanged)', async () => {
      const creation = await createEntry(OTO_UID, {}, { populate: ['author'] });
      expect(creation.statusCode).toBe(201);

      const res = await publishEntry(OTO_UID, creation.body.data.documentId);
      expect(res.statusCode).toBe(200);
    });
  });

  describe('Strict behaviour (strictRelations on)', () => {
    beforeAll(() => {
      strapi.config.set('api.documents.strictRelations', true);
    });

    afterAll(() => {
      strapi.config.set('api.documents.strictRelations', false);
    });

    test('draft with empty required relation → 201 (drafts still lenient)', async () => {
      const res = await createEntry(OTO_UID, {}, { populate: ['author'] });
      expect(res.statusCode).toBe(201);
    });

    test('publishing an empty required one-to-one relation → 400', async () => {
      const creation = await createEntry(OTO_UID, {}, { populate: ['author'] });
      expect(creation.statusCode).toBe(201);

      const res = await publishEntry(OTO_UID, creation.body.data.documentId);
      expect(res.statusCode).toBe(400);
    });

    test('publishing an empty required one-to-many relation → 400', async () => {
      const creation = await createEntry(OTM_UID, {}, { populate: ['authors'] });
      expect(creation.statusCode).toBe(201);

      const res = await publishEntry(OTM_UID, creation.body.data.documentId);
      expect(res.statusCode).toBe(400);
    });

    test('happy path: publishing with a populated required relation → 200', async () => {
      const creation = await createEntry(OTO_UID, { author: authorId }, { populate: ['author'] });
      expect(creation.statusCode).toBe(201);

      const res = await publishEntry(OTO_UID, creation.body.data.documentId);
      expect(res.statusCode).toBe(200);
    });
  });
});
