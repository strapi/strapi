'use strict';

/**
 * Regression + fix coverage for issue #24927 — "Media field can be null if required".
 *
 * The `api.documents.strictRelations` flag controls enforcement of required media
 * (and required relations) on non-draft writes:
 *
 *   - Flag OFF / unset (legacy): required media is NOT enforced on publish.
 *   - Flag ON (strict): publishing an entry with an empty required media returns 400.
 *
 * Empty `multiple` media always reads back as `[]` (aligned with other to-many
 * relations), regardless of the flag — see the gallery read-back assertion below.
 *
 * Drafts stay lenient under both modes (mirrors scalar `required`), which also
 * side-steps the 2023 form-data-upload regression (#14670 → #16002): a create
 * writes a draft and is therefore never subject to the required check.
 *
 * The flag is toggled at runtime via `strapi.config.set` because the document
 * service reads it fresh on every write.
 */

const fs = require('fs');
const path = require('path');

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');

let strapi;
let rq;

const singleMediaCT = {
  displayName: 'req-single-media',
  singularName: 'req-single-media',
  pluralName: 'req-single-medias',
  draftAndPublish: true,
  attributes: {
    cover: {
      type: 'media',
      multiple: false,
      required: true,
    },
  },
};

const multipleMediaCT = {
  displayName: 'req-multiple-media',
  singularName: 'req-multiple-media',
  pluralName: 'req-multiple-medias',
  draftAndPublish: true,
  attributes: {
    gallery: {
      type: 'media',
      multiple: true,
      required: true,
    },
  },
};

const SINGLE_UID = 'api::req-single-media.req-single-media';
const MULTIPLE_UID = 'api::req-multiple-media.req-multiple-media';

const createEntry = (uid, body = {}, qs = {}) =>
  rq.post(`/content-manager/collection-types/${uid}`, { body, qs });

const publishEntry = (uid, documentId) =>
  rq.post(`/content-manager/collection-types/${uid}/${documentId}/actions/publish`);

const uploadImg = () =>
  rq({
    method: 'POST',
    url: '/upload',
    formData: {
      files: fs.createReadStream(path.join(__dirname, 'rec.jpg')),
    },
  });

describe('Required media field validation (issue #24927)', () => {
  const builder = createTestBuilder();

  beforeAll(async () => {
    await builder.addContentType(singleMediaCT).addContentType(multipleMediaCT).build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  describe('Legacy behaviour (strictRelations off / unset)', () => {
    beforeAll(() => {
      strapi.config.set('api.documents.strictRelations', false);
    });

    test('draft with empty required media → 201', async () => {
      const res = await createEntry(SINGLE_UID, {}, { populate: ['cover'] });
      expect(res.statusCode).toBe(201);
      expect(res.body.data.cover).toBe(null);
    });

    test('publishing an empty required single media → 200 (unchanged)', async () => {
      const creation = await createEntry(SINGLE_UID, {}, { populate: ['cover'] });
      expect(creation.statusCode).toBe(201);

      const res = await publishEntry(SINGLE_UID, creation.body.data.documentId);
      expect(res.statusCode).toBe(200);
    });

    test('empty required multiple media reads back as []', async () => {
      const creation = await createEntry(MULTIPLE_UID, {}, { populate: ['gallery'] });
      expect(creation.statusCode).toBe(201);

      const getRes = await rq.get(
        `/content-manager/collection-types/${MULTIPLE_UID}/${creation.body.data.documentId}`,
        { qs: { populate: ['gallery'] } }
      );
      expect(getRes.statusCode).toBe(200);
      expect(getRes.body.data.gallery).toEqual([]);
    });
  });

  describe('Strict behaviour (strictRelations on)', () => {
    beforeAll(() => {
      strapi.config.set('api.documents.strictRelations', true);
    });

    afterAll(() => {
      strapi.config.set('api.documents.strictRelations', false);
    });

    // Regression guard for the 2023 revert (#14670 → #16002): a `create` writes a draft,
    // and drafts are never subject to the required check under strictRelations. This is the
    // mechanism that keeps upload-at-creation (multipart, file in `ctx.request.files`) safe —
    // the file attaches after validation and validation never rejects the empty `data`.
    test('draft with empty required media → 201 (drafts still lenient)', async () => {
      const res = await createEntry(SINGLE_UID, {}, { populate: ['cover'] });
      expect(res.statusCode).toBe(201);
    });

    test('publishing an empty required single media → 400', async () => {
      const creation = await createEntry(SINGLE_UID, {}, { populate: ['cover'] });
      expect(creation.statusCode).toBe(201);

      const res = await publishEntry(SINGLE_UID, creation.body.data.documentId);
      expect(res.statusCode).toBe(400);
    });

    test('publishing with cover explicitly null → 400', async () => {
      const creation = await createEntry(SINGLE_UID, { cover: null }, { populate: ['cover'] });
      expect(creation.statusCode).toBe(201);

      const res = await publishEntry(SINGLE_UID, creation.body.data.documentId);
      expect(res.statusCode).toBe(400);
    });

    test('publishing an empty required multiple media → 400', async () => {
      const creation = await createEntry(MULTIPLE_UID, {}, { populate: ['gallery'] });
      expect(creation.statusCode).toBe(201);

      const res = await publishEntry(MULTIPLE_UID, creation.body.data.documentId);
      expect(res.statusCode).toBe(400);
    });

    test('happy path: publishing with a real uploaded file → 200', async () => {
      // Upload a file, attach it, then publish — proves we do not over-reject.
      const uploadRes = await uploadImg();
      expect(uploadRes.statusCode).toBe(201);
      const fileId = uploadRes.body[0].id;

      const creation = await createEntry(SINGLE_UID, { cover: fileId }, { populate: ['cover'] });
      expect(creation.statusCode).toBe(201);

      const res = await publishEntry(SINGLE_UID, creation.body.data.documentId);
      expect(res.statusCode).toBe(200);
    });
  });
});
