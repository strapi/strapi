'use strict';

const { createStrapiInstance } = require('api-tests/strapi');
const { createTestBuilder } = require('api-tests/builder');

const client = process.env.DATABASE_CLIENT ?? 'sqlite';
const describeMysql = client === 'mysql' || client === 'mysql2' ? describe : describe.skip;

const NOTE_UID = 'api::lock-note.lock-note';
const LOCK_TABLE = 'strapi_document_locks';

const noteModel = {
  attributes: {
    title: {
      type: 'string',
      pluginOptions: { i18n: { localized: true } },
    },
  },
  draftAndPublish: true,
  displayName: 'Lock note',
  singularName: 'lock-note',
  pluralName: 'lock-notes',
  pluginOptions: { i18n: { localized: true } },
};

const builder = createTestBuilder();

describeMysql('MySQL document lock rows', () => {
  let strapi;

  const lockRows = (documentId) =>
    strapi.db.connection(LOCK_TABLE).where({ document_id: documentId }).select('document_id');

  beforeAll(async () => {
    await builder.addContentType(noteModel).build();
    strapi = await createStrapiInstance();
    await strapi.plugin('i18n').service('locales').create({ code: 'fr', name: 'French' });
  }, 120000);

  afterAll(async () => {
    if (strapi) {
      await strapi.db.query('plugin::i18n.locale').deleteMany({ where: { code: { $ne: 'en' } } });
      await strapi.destroy();
    }
    await builder.cleanup();
  });

  test('an update of a made-up document id leaves no lock row', async () => {
    const madeUpId = 'madeupdocumentid0000000001';

    // The REST content API calls this directly and answers 404 on null.
    const result = await strapi.documents(NOTE_UID).update({
      documentId: madeUpId,
      locale: 'fr',
      data: { title: 'still nothing' },
    });
    expect(result).toBeNull();

    expect(await lockRows(madeUpId)).toEqual([]);
  });

  test('deleting one locale keeps the lock row, deleting the last one removes it', async () => {
    const note = await strapi.documents(NOTE_UID).create({
      locale: 'en',
      data: { title: 'English note' },
    });
    await strapi.documents(NOTE_UID).update({
      documentId: note.documentId,
      locale: 'fr',
      data: { title: 'French note' },
    });
    expect(await lockRows(note.documentId)).toHaveLength(1);

    await strapi.documents(NOTE_UID).delete({ documentId: note.documentId, locale: 'fr' });
    expect(await lockRows(note.documentId)).toHaveLength(1);

    await strapi.documents(NOTE_UID).delete({ documentId: note.documentId, locale: 'en' });
    expect(await strapi.db.query(NOTE_UID).count({ where: { documentId: note.documentId } })).toBe(
      0
    );
    expect(await lockRows(note.documentId)).toEqual([]);
  });
});
