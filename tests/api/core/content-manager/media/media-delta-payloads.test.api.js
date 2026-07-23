'use strict';

/**
 * Regression coverage for CMS-1428 — single (and multiple) media must honour
 * `{ connect | disconnect }` delta payloads instead of treating them as a full replace.
 *
 * Three pre-existing defects are fixed and exercised here (all in the media morph path of
 * `packages/core/database/src/entity-manager/index.ts`):
 *
 *   A. Empty delta wiped the field. `{ connect: [] }` / `{ disconnect: [] }` (a no-op)
 *      fell through a content-based gate to the unconditional delete-all → the field emptied.
 *      Now gated on payload *shape* (`has('set', …)`), so an empty delta is a no-op.
 *
 *   B. `{ connect: [B] }` on a populated single media appended a hidden stale join row —
 *      A stayed observable (ascending order + `_.first`), B became a phantom row. Now single
 *      media is last-wins: the connect deletes existing rows and inserts exactly one row.
 *
 *   C. Create-with-connect attached nothing (the create branch consumed only `set`). Now a
 *      connect at create is treated as a set (nothing to delta against).
 *
 * The raw join-row count is asserted directly on the file's `related` morph join table so
 * that phantom rows (defect B) are caught — the populated read alone would hide them.
 */

const fs = require('fs');
const path = require('path');

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');

let strapi;
let rq;

const singleMediaCT = {
  displayName: 'delta-single',
  singularName: 'delta-single',
  pluralName: 'delta-singles',
  draftAndPublish: false,
  attributes: {
    cover: { type: 'media', multiple: false, required: false },
    // A second single-media field to prove field-scoped deletes never clobber siblings.
    thumbnail: { type: 'media', multiple: false, required: false },
  },
};

const multipleMediaCT = {
  displayName: 'delta-multiple',
  singularName: 'delta-multiple',
  pluralName: 'delta-multiples',
  draftAndPublish: false,
  attributes: {
    gallery: { type: 'media', multiple: true, required: false },
  },
};

const SINGLE_UID = 'api::delta-single.delta-single';
const MULTIPLE_UID = 'api::delta-multiple.delta-multiple';
const FILE_UID = 'plugin::upload.file';

const createEntry = (uid, body = {}, qs = {}) =>
  rq.post(`/content-manager/collection-types/${uid}`, { body, qs });

const updateEntry = (uid, documentId, body = {}, qs = {}) =>
  rq.put(`/content-manager/collection-types/${uid}/${documentId}`, { body, qs });

const getEntry = (uid, documentId, populate) =>
  rq.get(`/content-manager/collection-types/${uid}/${documentId}`, { qs: { populate } });

const uploadImg = () =>
  rq({
    method: 'POST',
    url: '/upload',
    formData: {
      files: fs.createReadStream(path.join(__dirname, 'rec.jpg')),
    },
  });

// Resolve the file's `related` morph join table (name + columns) from metadata so the raw
// row-count query is dialect-agnostic (physical column names are convention-derived).
const morphJoinInfo = () => {
  const { joinTable } = strapi.db.metadata.get(FILE_UID).attributes.related;
  return {
    tableName: joinTable.name,
    joinColumn: joinTable.joinColumn.name, // file id column
    idColumn: joinTable.morphColumn.idColumn.name, // related entry id
    typeColumn: joinTable.morphColumn.typeColumn.name, // related entry uid
  };
};

// Count physical join rows attaching files to a given entry id / field. This is the ground
// truth that exposes phantom rows a populated read would hide.
const countJoinRows = async (entryId, field) => {
  const { tableName, idColumn, typeColumn } = morphJoinInfo();
  const rows = await strapi.db
    .getConnection(tableName)
    .where({ [idColumn]: entryId, [typeColumn]: SINGLE_UID, field });
  return rows.length;
};

const countGalleryRows = async (entryId) => {
  const { tableName, idColumn, typeColumn } = morphJoinInfo();
  const rows = await strapi.db
    .getConnection(tableName)
    .where({ [idColumn]: entryId, [typeColumn]: MULTIPLE_UID, field: 'gallery' });
  return rows.length;
};

describe('CMS-1428 — media connect/disconnect delta payloads', () => {
  const builder = createTestBuilder();
  let fileA;
  let fileB;
  let fileC;

  beforeAll(async () => {
    await builder.addContentType(singleMediaCT).addContentType(multipleMediaCT).build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    const [a, b, c] = await Promise.all([uploadImg(), uploadImg(), uploadImg()]);
    fileA = a.body[0].id;
    fileB = b.body[0].id;
    fileC = c.body[0].id;
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  // Create a single-media entry with `cover` = fileA and return its numeric + document ids.
  const createWithCover = async () => {
    const res = await createEntry(SINGLE_UID, { cover: fileA }, { populate: ['cover'] });
    expect(res.statusCode).toBe(201);
    expect(res.body.data.cover.id).toBe(fileA);
    return { id: res.body.data.id, documentId: res.body.data.documentId };
  };

  const readCover = async (documentId) => {
    const res = await getEntry(SINGLE_UID, documentId, ['cover']);
    expect(res.statusCode).toBe(200);
    return res.body.data.cover;
  };

  describe('Single media — defect A (empty delta is a no-op)', () => {
    test('{ connect: [] } preserves the attached file', async () => {
      const { id, documentId } = await createWithCover();

      const update = await updateEntry(
        SINGLE_UID,
        documentId,
        { cover: { connect: [] } },
        { populate: ['cover'] }
      );
      expect(update.statusCode).toBe(200);

      const cover = await readCover(documentId);
      expect(cover).not.toBe(null);
      expect(cover.id).toBe(fileA);
      expect(await countJoinRows(id, 'cover')).toBe(1);
    });

    test('{ disconnect: [] } preserves the attached file', async () => {
      const { id, documentId } = await createWithCover();

      const update = await updateEntry(
        SINGLE_UID,
        documentId,
        { cover: { disconnect: [] } },
        { populate: ['cover'] }
      );
      expect(update.statusCode).toBe(200);

      const cover = await readCover(documentId);
      expect(cover?.id).toBe(fileA);
      expect(await countJoinRows(id, 'cover')).toBe(1);
    });

    test('{ connect: [], disconnect: [] } (CM untouched shape) preserves the attached file', async () => {
      const { id, documentId } = await createWithCover();

      const update = await updateEntry(
        SINGLE_UID,
        documentId,
        { cover: { connect: [], disconnect: [] } },
        { populate: ['cover'] }
      );
      expect(update.statusCode).toBe(200);

      const cover = await readCover(documentId);
      expect(cover?.id).toBe(fileA);
      expect(await countJoinRows(id, 'cover')).toBe(1);
    });
  });

  describe('Single media — defect B (connect is last-wins, exactly one row)', () => {
    test('{ connect: [B] } on a populated cover attaches B, removes A, one row', async () => {
      const { id, documentId } = await createWithCover();

      const update = await updateEntry(
        SINGLE_UID,
        documentId,
        { cover: { connect: [fileB] } },
        { populate: ['cover'] }
      );
      expect(update.statusCode).toBe(200);

      const cover = await readCover(documentId);
      expect(cover.id).toBe(fileB);
      // The observable value is B AND there is no phantom row for A.
      expect(await countJoinRows(id, 'cover')).toBe(1);
    });

    test('{ connect: [B, C] } is last-wins → C attached, one row', async () => {
      const { id, documentId } = await createWithCover();

      const update = await updateEntry(
        SINGLE_UID,
        documentId,
        { cover: { connect: [fileB, fileC] } },
        { populate: ['cover'] }
      );
      expect(update.statusCode).toBe(200);

      const cover = await readCover(documentId);
      expect(cover.id).toBe(fileC);
      expect(await countJoinRows(id, 'cover')).toBe(1);
    });

    test('same id in connect and disconnect → connect wins (file attached)', async () => {
      const { id, documentId } = await createWithCover();

      const update = await updateEntry(
        SINGLE_UID,
        documentId,
        { cover: { connect: [fileB], disconnect: [fileB] } },
        { populate: ['cover'] }
      );
      expect(update.statusCode).toBe(200);

      const cover = await readCover(documentId);
      expect(cover.id).toBe(fileB);
      expect(await countJoinRows(id, 'cover')).toBe(1);
    });
  });

  describe('Single media — true delta disconnect', () => {
    test('{ disconnect: [B] } when B is not attached preserves A', async () => {
      const { id, documentId } = await createWithCover();

      const update = await updateEntry(
        SINGLE_UID,
        documentId,
        { cover: { disconnect: [fileB] } },
        { populate: ['cover'] }
      );
      expect(update.statusCode).toBe(200);

      const cover = await readCover(documentId);
      expect(cover?.id).toBe(fileA);
      expect(await countJoinRows(id, 'cover')).toBe(1);
    });

    test('{ disconnect: [A] } empties the cover', async () => {
      const { id, documentId } = await createWithCover();

      const update = await updateEntry(
        SINGLE_UID,
        documentId,
        { cover: { disconnect: [fileA] } },
        { populate: ['cover'] }
      );
      expect(update.statusCode).toBe(200);

      const cover = await readCover(documentId);
      expect(cover).toBe(null);
      expect(await countJoinRows(id, 'cover')).toBe(0);
    });
  });

  describe('Single media — replace shapes unchanged (admin-panel path)', () => {
    test('{ set: [B] } replaces A with B', async () => {
      const { documentId } = await createWithCover();

      const update = await updateEntry(
        SINGLE_UID,
        documentId,
        { cover: { set: [fileB] } },
        { populate: ['cover'] }
      );
      expect(update.statusCode).toBe(200);
      expect((await readCover(documentId)).id).toBe(fileB);
    });

    test('scalar id B replaces A with B', async () => {
      const { documentId } = await createWithCover();

      const update = await updateEntry(SINGLE_UID, documentId, { cover: fileB }, {});
      expect(update.statusCode).toBe(200);
      expect((await readCover(documentId)).id).toBe(fileB);
    });

    test('array [B] replaces A with B', async () => {
      const { documentId } = await createWithCover();

      const update = await updateEntry(SINGLE_UID, documentId, { cover: [fileB] }, {});
      expect(update.statusCode).toBe(200);
      expect((await readCover(documentId)).id).toBe(fileB);
    });

    test('null empties the cover', async () => {
      const { id, documentId } = await createWithCover();

      const update = await updateEntry(SINGLE_UID, documentId, { cover: null }, {});
      expect(update.statusCode).toBe(200);
      expect(await readCover(documentId)).toBe(null);
      expect(await countJoinRows(id, 'cover')).toBe(0);
    });

    test('{ set: [] } empties the cover', async () => {
      const { id, documentId } = await createWithCover();

      const update = await updateEntry(SINGLE_UID, documentId, { cover: { set: [] } }, {});
      expect(update.statusCode).toBe(200);
      expect(await readCover(documentId)).toBe(null);
      expect(await countJoinRows(id, 'cover')).toBe(0);
    });
  });

  describe('Single media — field scoping', () => {
    test('updating cover never touches thumbnail rows', async () => {
      const creation = await createEntry(
        SINGLE_UID,
        { cover: fileA, thumbnail: fileC },
        { populate: ['cover', 'thumbnail'] }
      );
      expect(creation.statusCode).toBe(201);
      const { id, documentId } = creation.body.data;

      // Replace cover via a connect delta.
      const update = await updateEntry(
        SINGLE_UID,
        documentId,
        { cover: { connect: [fileB] } },
        { populate: ['cover', 'thumbnail'] }
      );
      expect(update.statusCode).toBe(200);

      const res = await getEntry(SINGLE_UID, documentId, ['cover', 'thumbnail']);
      expect(res.body.data.cover.id).toBe(fileB);
      expect(res.body.data.thumbnail.id).toBe(fileC);
      expect(await countJoinRows(id, 'cover')).toBe(1);
      expect(await countJoinRows(id, 'thumbnail')).toBe(1);
    });
  });

  describe('Single media — defect C (create with connect)', () => {
    test('create with { connect: [B] } attaches B', async () => {
      const res = await createEntry(
        SINGLE_UID,
        { cover: { connect: [fileB] } },
        { populate: ['cover'] }
      );
      expect(res.statusCode).toBe(201);
      expect(res.body.data.cover.id).toBe(fileB);
      expect(await countJoinRows(res.body.data.id, 'cover')).toBe(1);
    });

    test('create with { connect: [B, C] } is last-wins → C attached, one row', async () => {
      const res = await createEntry(
        SINGLE_UID,
        { cover: { connect: [fileB, fileC] } },
        { populate: ['cover'] }
      );
      expect(res.statusCode).toBe(201);
      expect(res.body.data.cover.id).toBe(fileC);
      expect(await countJoinRows(res.body.data.id, 'cover')).toBe(1);
    });
  });

  describe('Multiple media', () => {
    const createGallery = async (files) => {
      const res = await createEntry(MULTIPLE_UID, { gallery: files }, { populate: ['gallery'] });
      expect(res.statusCode).toBe(201);
      return { id: res.body.data.id, documentId: res.body.data.documentId };
    };

    const readGalleryIds = async (documentId) => {
      const res = await getEntry(MULTIPLE_UID, documentId, ['gallery']);
      expect(res.statusCode).toBe(200);
      return res.body.data.gallery.map((f) => f.id);
    };

    test('empty delta is a no-op', async () => {
      const { id, documentId } = await createGallery([fileA]);

      const update = await updateEntry(
        MULTIPLE_UID,
        documentId,
        { gallery: { connect: [], disconnect: [] } },
        { populate: ['gallery'] }
      );
      expect(update.statusCode).toBe(200);
      expect(await readGalleryIds(documentId)).toEqual([fileA]);
      expect(await countGalleryRows(id)).toBe(1);
    });

    test('connect appends without wiping', async () => {
      const { id, documentId } = await createGallery([fileA]);

      const update = await updateEntry(
        MULTIPLE_UID,
        documentId,
        { gallery: { connect: [fileB] } },
        { populate: ['gallery'] }
      );
      expect(update.statusCode).toBe(200);
      expect(await readGalleryIds(documentId)).toEqual(expect.arrayContaining([fileA, fileB]));
      expect(await countGalleryRows(id)).toBe(2);
    });

    test('disconnect removes only the listed file', async () => {
      const { id, documentId } = await createGallery([fileA, fileB]);

      const update = await updateEntry(
        MULTIPLE_UID,
        documentId,
        { gallery: { disconnect: [fileA] } },
        { populate: ['gallery'] }
      );
      expect(update.statusCode).toBe(200);
      expect(await readGalleryIds(documentId)).toEqual([fileB]);
      expect(await countGalleryRows(id)).toBe(1);
    });

    test('set replaces the whole gallery', async () => {
      const { id, documentId } = await createGallery([fileA, fileB]);

      const update = await updateEntry(
        MULTIPLE_UID,
        documentId,
        { gallery: { set: [fileC] } },
        { populate: ['gallery'] }
      );
      expect(update.statusCode).toBe(200);
      expect(await readGalleryIds(documentId)).toEqual([fileC]);
      expect(await countGalleryRows(id)).toBe(1);
    });

    test('create with { connect: [A, B] } attaches both', async () => {
      const res = await createEntry(
        MULTIPLE_UID,
        { gallery: { connect: [fileA, fileB] } },
        { populate: ['gallery'] }
      );
      expect(res.statusCode).toBe(201);
      const ids = res.body.data.gallery.map((f) => f.id);
      expect(ids).toEqual(expect.arrayContaining([fileA, fileB]));
      expect(await countGalleryRows(res.body.data.id)).toBe(2);
    });
  });

  // Parity: the same payload shapes on a oneToOne relation behave identically to single media.
  describe('oneToOne relation parity (sanity)', () => {
    test('{ connect: [] } on a populated relation is a no-op (matches single media)', async () => {
      // Covered structurally by the relation tests in strict-relations-publish.test.api.js;
      // this asserts the media path now matches that relation behaviour for the empty delta.
      const { documentId } = await createWithCover();
      const update = await updateEntry(
        SINGLE_UID,
        documentId,
        { cover: { connect: [] } },
        { populate: ['cover'] }
      );
      expect(update.statusCode).toBe(200);
      expect((await readCover(documentId))?.id).toBe(fileA);
    });
  });
});
