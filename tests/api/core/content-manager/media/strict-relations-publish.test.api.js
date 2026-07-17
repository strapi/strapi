'use strict';

/**
 * Publish-time enforcement of required relations under `api.documents.strictRelations`
 * (PR #27028 review follow-up).
 *
 * The entity validator runs at WRITE time and only sees the request payload, so two
 * update shapes cannot be resolved there without a DB read:
 *
 *   - `{ connect: [] }` — a no-op (adds/removes nothing) → deliberately PASSES at write time.
 *   - `{ disconnect: [id] }` — the final state depends on the current relations in the DB,
 *     so it also passes at write time (documented limitation).
 *
 * The authoritative check is the PUBLISH action: `publish()` reloads the draft with a deep
 * populate and re-runs `validateEntityCreation` with `isDraft: false` against the
 * MATERIALISED DB state (repository.ts `publish` → entries.ts `publishEntry` → `createEntry`).
 * These tests prove the downstream publish action catches the case that write-time
 * validation intentionally lets through:
 *
 *   - disconnecting the last required relation on the draft → publish returns 400.
 *   - a no-op `{ connect: [] }` on an already-populated draft → publish still returns 200.
 */

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');

let strapi;
let rq;

const authorCT = {
  displayName: 'pub-author',
  singularName: 'pub-author',
  pluralName: 'pub-authors',
  draftAndPublish: true,
  attributes: {
    name: {
      type: 'string',
    },
  },
};

const oneToOneCT = {
  displayName: 'pub-oto',
  singularName: 'pub-oto',
  pluralName: 'pub-otos',
  draftAndPublish: true,
  attributes: {
    author: {
      type: 'relation',
      relation: 'oneToOne',
      target: 'api::pub-author.pub-author',
      required: true,
    },
  },
};

const AUTHOR_UID = 'api::pub-author.pub-author';
const OTO_UID = 'api::pub-oto.pub-oto';

const createEntry = (uid, body = {}, qs = {}) =>
  rq.post(`/content-manager/collection-types/${uid}`, { body, qs });

const updateEntry = (uid, documentId, body = {}, qs = {}) =>
  rq.put(`/content-manager/collection-types/${uid}/${documentId}`, { body, qs });

const publishEntry = (uid, documentId) =>
  rq.post(`/content-manager/collection-types/${uid}/${documentId}/actions/publish`);

// The CM read/update responses carry relation *metadata* (`{ count }`), not the populated
// value, so read the draft back and assert on that count to check the relation state.
const getDraft = (uid, documentId) =>
  rq.get(`/content-manager/collection-types/${uid}/${documentId}`, {
    qs: { populate: ['author'], status: 'draft' },
  });

// The relation is considered empty when its metadata count is 0 (or it is null/absent).
const authorCount = (res) => res.body.data.author?.count ?? 0;

describe('strictRelations — publish-time enforcement of connect/disconnect edge cases', () => {
  const builder = createTestBuilder();
  let authorId;
  let authorDocumentId;

  beforeAll(async () => {
    await builder.addContentType(authorCT).addContentType(oneToOneCT).build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    const authorRes = await createEntry(AUTHOR_UID, { name: 'Ada' });
    await publishEntry(AUTHOR_UID, authorRes.body.data.documentId);
    authorId = authorRes.body.data.id;
    authorDocumentId = authorRes.body.data.documentId;
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  describe('Strict behaviour (strictRelations on)', () => {
    beforeAll(() => {
      strapi.config.set('api.documents.strictRelations', true);
    });

    afterAll(() => {
      strapi.config.set('api.documents.strictRelations', false);
    });

    // Behaviour 2: write-time validation cannot know a disconnect empties the field
    // (it needs the current DB state), so the draft update succeeds — but the publish
    // action re-validates the populated draft and rejects the now-empty required relation.
    test('disconnecting the last required relation then publishing → update 200, publish 400', async () => {
      // Draft with a valid required relation.
      const creation = await createEntry(OTO_UID, { author: authorId }, { populate: ['author'] });
      expect(creation.statusCode).toBe(201);
      const { documentId } = creation.body.data;

      // Disconnect the only related author. Write-time validation lets this through.
      const update = await updateEntry(
        OTO_UID,
        documentId,
        { author: { disconnect: [authorDocumentId] } },
        { populate: ['author'] }
      );
      expect(update.statusCode).toBe(200);

      // The draft is now empty (relation metadata count is 0)…
      const draft = await getDraft(OTO_UID, documentId);
      expect(authorCount(draft)).toBe(0);

      // …and publishing it is rejected by the downstream publish-time re-validation.
      const publish = await publishEntry(OTO_UID, documentId);
      expect(publish.statusCode).toBe(400);
    });

    // Behaviour 1: a no-op `{ connect: [] }` on an already-populated draft must not be
    // treated as emptying the field — the draft keeps its relation and publish succeeds.
    test('no-op { connect: [] } on a populated draft then publishing → 200', async () => {
      const creation = await createEntry(OTO_UID, { author: authorId }, { populate: ['author'] });
      expect(creation.statusCode).toBe(201);
      const { documentId } = creation.body.data;

      const update = await updateEntry(
        OTO_UID,
        documentId,
        { author: { connect: [] } },
        { populate: ['author'] }
      );
      expect(update.statusCode).toBe(200);

      // The existing relation is untouched by the no-op connect.
      const draft = await getDraft(OTO_UID, documentId);
      expect(authorCount(draft)).toBe(1);

      const publish = await publishEntry(OTO_UID, documentId);
      expect(publish.statusCode).toBe(200);
    });

    // The publish check validates the *resulting* state: disconnecting then reconnecting
    // leaves the relation populated, so publish succeeds — it's not "a disconnect happened".
    test('disconnect then reconnect the required relation then publishing → 200', async () => {
      const creation = await createEntry(OTO_UID, { author: authorId }, { populate: ['author'] });
      expect(creation.statusCode).toBe(201);
      const { documentId } = creation.body.data;

      await updateEntry(
        OTO_UID,
        documentId,
        { author: { disconnect: [authorDocumentId] } },
        { populate: ['author'] }
      );
      const update = await updateEntry(
        OTO_UID,
        documentId,
        { author: { connect: [authorDocumentId] } },
        { populate: ['author'] }
      );
      expect(update.statusCode).toBe(200);

      const draft = await getDraft(OTO_UID, documentId);
      expect(authorCount(draft)).toBe(1);

      const publish = await publishEntry(OTO_UID, documentId);
      expect(publish.statusCode).toBe(200);
    });
  });
});
