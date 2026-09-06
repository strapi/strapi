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

// A component carrying a required relation, used to prove required media/relations
// are enforced when nested inside components and dynamic zones (PR #27028 review, Fix 2:
// the flag used to be dropped when recursing into component/DZ validators).
const metaComponent = {
  displayName: 'rel-meta',
  category: 'default',
  attributes: {
    owner: {
      type: 'relation',
      relation: 'oneToOne',
      target: 'api::rel-author.rel-author',
      required: true,
    },
  },
};

const withComponentCT = {
  displayName: 'rel-with-comp',
  singularName: 'rel-with-comp',
  pluralName: 'rel-with-comps',
  draftAndPublish: true,
  attributes: {
    meta: {
      type: 'component',
      repeatable: false,
      component: 'default.rel-meta',
      required: true,
    },
  },
};

const withDzCT = {
  displayName: 'rel-with-dz',
  singularName: 'rel-with-dz',
  pluralName: 'rel-with-dzs',
  draftAndPublish: true,
  attributes: {
    zone: {
      type: 'dynamiczone',
      components: ['default.rel-meta'],
      required: true,
    },
  },
};

const AUTHOR_UID = 'api::rel-author.rel-author';
const OTO_UID = 'api::rel-oto.rel-oto';
const OTM_UID = 'api::rel-otm.rel-otm';
const WITH_COMP_UID = 'api::rel-with-comp.rel-with-comp';
const WITH_DZ_UID = 'api::rel-with-dz.rel-with-dz';

const createEntry = (uid, body = {}, qs = {}) =>
  rq.post(`/content-manager/collection-types/${uid}`, { body, qs });

const updateEntry = (uid, documentId, body = {}, qs = {}) =>
  rq.put(`/content-manager/collection-types/${uid}/${documentId}`, { body, qs });

const publishEntry = (uid, documentId) =>
  rq.post(`/content-manager/collection-types/${uid}/${documentId}/actions/publish`);

describe('Required relation field validation (issues #15445 / #19433)', () => {
  const builder = createTestBuilder();
  let authorId;

  beforeAll(async () => {
    await builder
      .addContentType(authorCT)
      .addComponent(metaComponent)
      .addContentType(oneToOneCT)
      .addContentType(oneToManyCT)
      .addContentType(withComponentCT)
      .addContentType(withDzCT)
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

    // PR #27028 review, Fix 1: a partial update that OMITS the required relation must not
    // be rejected — an absent key keeps the existing value (mirrors scalar `notNull` on update).
    test('partial update omitting the required relation on a populated entry → 200', async () => {
      const creation = await createEntry(OTO_UID, { author: authorId }, { populate: ['author'] });
      expect(creation.statusCode).toBe(201);
      const { documentId } = creation.body.data;

      // Update another field only — no `author` key in the payload.
      const res = await updateEntry(OTO_UID, documentId, {}, { populate: ['author'] });
      expect(res.statusCode).toBe(200);

      // The relation is preserved, and the entry still publishes.
      const pub = await publishEntry(OTO_UID, documentId);
      expect(pub.statusCode).toBe(200);
    });

    // PR #27028 review, Fix 2: required relations nested in a component / dynamic zone must
    // be enforced (the flag used to be dropped when recursing into nested validators).
    test('publishing a component with an empty required nested relation → 400', async () => {
      const creation = await createEntry(
        WITH_COMP_UID,
        { meta: { owner: null } },
        { populate: ['meta'] }
      );
      expect(creation.statusCode).toBe(201);

      const res = await publishEntry(WITH_COMP_UID, creation.body.data.documentId);
      expect(res.statusCode).toBe(400);
    });

    test('happy path: publishing a component with a populated nested relation → 200', async () => {
      const creation = await createEntry(
        WITH_COMP_UID,
        { meta: { owner: authorId } },
        { populate: ['meta'] }
      );
      expect(creation.statusCode).toBe(201);

      const res = await publishEntry(WITH_COMP_UID, creation.body.data.documentId);
      expect(res.statusCode).toBe(200);
    });

    test('publishing a dynamic zone with an empty required nested relation → 400', async () => {
      const creation = await createEntry(
        WITH_DZ_UID,
        { zone: [{ __component: 'default.rel-meta', owner: null }] },
        { populate: ['zone'] }
      );
      expect(creation.statusCode).toBe(201);

      const res = await publishEntry(WITH_DZ_UID, creation.body.data.documentId);
      expect(res.statusCode).toBe(400);
    });

    test('happy path: publishing a dynamic zone with a populated nested relation → 200', async () => {
      const creation = await createEntry(
        WITH_DZ_UID,
        { zone: [{ __component: 'default.rel-meta', owner: authorId }] },
        { populate: ['zone'] }
      );
      expect(creation.statusCode).toBe(201);

      const res = await publishEntry(WITH_DZ_UID, creation.body.data.documentId);
      expect(res.statusCode).toBe(200);
    });
  });
});
