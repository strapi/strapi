import type { Core } from '@strapi/types';

import { createContentAPIRequest } from 'api-tests/request';

import { createTestSetup, destroyTestSetup } from '../../../../utils/builder-helper';

const NOTE_UID = 'api::morph-note.morph-note' as const;
const REMARK_UID = 'api::morph-remark.morph-remark' as const;
const CARD_UID = 'api::morph-card.morph-card' as const;
const PIN_UID = 'api::morph-pin.morph-pin' as const;
const BOARD_UID = 'api::morph-board.morph-board' as const;
const LOCALIZED_NOTE_UID = 'api::morph-localized-note.morph-localized-note' as const;

/**
 * Inverse `morphMany` of a `morphToOne`: the link is stored in the morph columns of the
 * target (remark) table, not in a join table.
 */
const noteContentType = {
  kind: 'collectionType' as const,
  collectionName: 'morph_notes',
  singularName: 'morph-note',
  pluralName: 'morph-notes',
  displayName: 'Morph note',
  description: '',
  draftAndPublish: true,
  attributes: {
    title: { type: 'string' },
    remarks: {
      type: 'relation',
      relation: 'morphMany',
      target: REMARK_UID,
      morphBy: 'subject',
    },
  },
};

const remarkContentType = {
  kind: 'collectionType' as const,
  collectionName: 'morph_remarks',
  singularName: 'morph-remark',
  pluralName: 'morph-remarks',
  displayName: 'Morph remark',
  description: '',
  draftAndPublish: false,
  attributes: {
    text: { type: 'string' },
    subject: { type: 'relation', relation: 'morphToOne' },
  },
};

/** Inverse `morphOne` of the same `morphToOne`: a single remark can be pinned to a card. */
const cardContentType = {
  kind: 'collectionType' as const,
  collectionName: 'morph_cards',
  singularName: 'morph-card',
  pluralName: 'morph-cards',
  displayName: 'Morph card',
  description: '',
  draftAndPublish: false,
  attributes: {
    title: { type: 'string' },
    pinnedRemark: {
      type: 'relation',
      relation: 'morphOne',
      target: REMARK_UID,
      morphBy: 'subject',
    },
  },
};

/** Target of a second `morphToOne`, so a board can own a `morphOne` link apart from its remarks */
const pinContentType = {
  kind: 'collectionType' as const,
  collectionName: 'morph_pins',
  singularName: 'morph-pin',
  pluralName: 'morph-pins',
  displayName: 'Morph pin',
  description: '',
  draftAndPublish: false,
  attributes: {
    label: { type: 'string' },
    holder: { type: 'relation', relation: 'morphToOne' },
  },
};

/** Draft & publish type with both an inverse `morphOne` and an inverse `morphMany` */
const boardContentType = {
  kind: 'collectionType' as const,
  collectionName: 'morph_boards',
  singularName: 'morph-board',
  pluralName: 'morph-boards',
  displayName: 'Morph board',
  description: '',
  draftAndPublish: true,
  attributes: {
    title: { type: 'string' },
    pin: { type: 'relation', relation: 'morphOne', target: PIN_UID, morphBy: 'holder' },
    remarks: { type: 'relation', relation: 'morphMany', target: REMARK_UID, morphBy: 'subject' },
  },
};

/** Localized draft & publish type with an inverse `morphMany`: one published version per locale */
const localizedNoteContentType = {
  kind: 'collectionType' as const,
  collectionName: 'morph_localized_notes',
  singularName: 'morph-localized-note',
  pluralName: 'morph-localized-notes',
  displayName: 'Morph localized note',
  description: '',
  draftAndPublish: true,
  pluginOptions: { i18n: { localized: true } },
  attributes: {
    title: { type: 'string', pluginOptions: { i18n: { localized: true } } },
    remarks: { type: 'relation', relation: 'morphMany', target: REMARK_UID, morphBy: 'subject' },
  },
};

const resources = {
  locales: [{ name: 'Fr', code: 'fr' }],
  schemas: {
    components: {},
    // The morphMany target must exist before the type that declares it
    'content-types': {
      [REMARK_UID]: remarkContentType,
      [NOTE_UID]: noteContentType,
      [CARD_UID]: cardContentType,
      [PIN_UID]: pinContentType,
      [BOARD_UID]: boardContentType,
      [LOCALIZED_NOTE_UID]: localizedNoteContentType,
    },
  },
  fixtures: {
    'content-types': {
      [NOTE_UID]: [],
      [REMARK_UID]: [],
      [CARD_UID]: [],
      [PIN_UID]: [],
      [BOARD_UID]: [],
      [LOCALIZED_NOTE_UID]: [],
    },
  },
};

describe('Document Service inverse morphMany of a morphToOne', () => {
  let testUtils;
  let strapi: Core.Strapi;

  beforeAll(async () => {
    testUtils = await createTestSetup(resources);
    strapi = testUtils.strapi;
  });

  afterAll(async () => {
    await destroyTestSetup(testUtils);
  });

  afterEach(async () => {
    await strapi.db.query(NOTE_UID).deleteMany({});
    await strapi.db.query(REMARK_UID).deleteMany({});
    await strapi.db.query(CARD_UID).deleteMany({});
    await strapi.db.query(PIN_UID).deleteMany({});
    await strapi.db.query(BOARD_UID).deleteMany({});
    await strapi.db.query(LOCALIZED_NOTE_UID).deleteMany({});
  });

  /** Morph columns are not mapped back on query results, so read the raw remark rows. */
  const getRemarkSubjects = async () => {
    const { attributes, tableName } = strapi.db.metadata.get(REMARK_UID);
    const { idColumn, typeColumn } = (attributes.subject as any).morphColumn;
    const rows = await strapi.db.getConnection(tableName).select('*').orderBy('id');
    return rows.map((row: Record<string, unknown>) => ({
      id: row.id,
      subjectId: row[idColumn.name],
      subjectType: row[typeColumn.name],
    }));
  };

  const getNoteRow = async (documentId: string, status: 'draft' | 'published') => {
    return strapi.db.query(NOTE_UID).findOne({
      where: { documentId, publishedAt: status === 'draft' ? null : { $notNull: true } },
    });
  };

  it('publishes a draft that has no related entries', async () => {
    const note = await strapi.documents(NOTE_UID).create({ data: { title: 'empty' } as any });

    const result = await strapi.documents(NOTE_UID).publish({ documentId: note.documentId });

    expect(result.entries).toHaveLength(1);
    expect(await getNoteRow(note.documentId, 'published')).toMatchObject({ title: 'empty' });
  });

  it('links every related entry when an entry is created', async () => {
    const r1 = await strapi.db.query(REMARK_UID).create({ data: { text: 'r1' } });
    const r2 = await strapi.db.query(REMARK_UID).create({ data: { text: 'r2' } });

    const note = await strapi.db.query(NOTE_UID).create({
      data: { title: 'linked', remarks: [r1.id, r2.id] },
    });

    expect(await getRemarkSubjects()).toEqual([
      { id: r1.id, subjectId: note.id, subjectType: NOTE_UID },
      { id: r2.id, subjectId: note.id, subjectType: NOTE_UID },
    ]);
  });

  it('publishes a draft that has related entries', async () => {
    const r1 = await strapi.db.query(REMARK_UID).create({ data: { text: 'r1' } });
    const r2 = await strapi.db.query(REMARK_UID).create({ data: { text: 'r2' } });
    const note = await strapi.documents(NOTE_UID).create({
      data: { title: 'with remarks', remarks: [r1.id, r2.id] } as any,
    });

    const result = await strapi.documents(NOTE_UID).publish({ documentId: note.documentId });

    expect(result.entries).toHaveLength(1);
    expect(await getNoteRow(note.documentId, 'published')).toMatchObject({
      title: 'with remarks',
    });

    // A remark can point to a single row, so publish must not take it away from the draft
    const draft = await getNoteRow(note.documentId, 'draft');
    expect(await getRemarkSubjects()).toEqual([
      { id: r1.id, subjectId: draft?.id, subjectType: NOTE_UID },
      { id: r2.id, subjectId: draft?.id, subjectType: NOTE_UID },
    ]);
  });

  it('republishes a draft whose links are all on the draft', async () => {
    const r1 = await strapi.db.query(REMARK_UID).create({ data: { text: 'r1' } });
    const note = await strapi.documents(NOTE_UID).create({
      data: { title: 'with remarks', remarks: [r1.id] } as any,
    });
    await strapi.documents(NOTE_UID).publish({ documentId: note.documentId });

    const result = await strapi.documents(NOTE_UID).publish({ documentId: note.documentId });

    expect(result.entries).toHaveLength(1);
    const draft = await getNoteRow(note.documentId, 'draft');
    expect(await getRemarkSubjects()).toEqual([
      { id: r1.id, subjectId: draft?.id, subjectType: NOTE_UID },
    ]);
  });

  // A remark can point to the published row: a subject set to the published id. Publish deletes
  // the old published row, which clears these links, so it re-points them to the new one.
  it('keeps the links the published version owns on republish', async () => {
    const r1 = await strapi.db.query(REMARK_UID).create({ data: { text: 'r1' } });
    const r2 = await strapi.db.query(REMARK_UID).create({ data: { text: 'r2' } });
    const note = await strapi.documents(NOTE_UID).create({
      data: { title: 'with remarks', remarks: [r1.id] } as any,
    });
    await strapi.documents(NOTE_UID).publish({ documentId: note.documentId });
    const draft = await getNoteRow(note.documentId, 'draft');
    const published = await getNoteRow(note.documentId, 'published');

    await strapi.db.query(REMARK_UID).update({
      where: { id: r2.id },
      data: { subject: { id: published?.id, __type: NOTE_UID } },
    });

    const result = await strapi.documents(NOTE_UID).publish({ documentId: note.documentId });

    const republished = await getNoteRow(note.documentId, 'published');
    expect(republished?.id).not.toBe(published?.id);
    expect(result.entries).toMatchObject([{ id: republished?.id }]);
    expect(await getRemarkSubjects()).toEqual([
      { id: r1.id, subjectId: draft?.id, subjectType: NOTE_UID },
      { id: r2.id, subjectId: republished?.id, subjectType: NOTE_UID },
    ]);
  });

  // Data migrated from v4: the existing rows became the published versions and own the links,
  // and the draft copies own none.
  it('keeps every link of data migrated from v4 on republish', async () => {
    const r1 = await strapi.db.query(REMARK_UID).create({ data: { text: 'r1' } });
    const r2 = await strapi.db.query(REMARK_UID).create({ data: { text: 'r2' } });
    const documentId = 'morphinversepublishfromv4';
    const published = await strapi.db.query(NOTE_UID).create({
      data: { documentId, title: 'from v4', publishedAt: new Date(), remarks: [r1.id, r2.id] },
    });
    await strapi.db.query(NOTE_UID).create({
      data: { documentId, title: 'from v4 edited', publishedAt: null },
    });

    await strapi.documents(NOTE_UID).publish({ documentId });

    // Publish replaced the published row with a copy of the draft
    const republished = await getNoteRow(documentId, 'published');
    expect(republished?.id).not.toBe(published.id);
    expect(republished).toMatchObject({ title: 'from v4 edited' });
    expect(await getRemarkSubjects()).toEqual([
      { id: r1.id, subjectId: republished?.id, subjectType: NOTE_UID },
      { id: r2.id, subjectId: republished?.id, subjectType: NOTE_UID },
    ]);

    // The published version still exposes them
    const found = await strapi.documents(NOTE_UID).findOne({
      documentId,
      status: 'published',
      populate: { remarks: true },
    } as any);
    expect((found as any)?.remarks.map((remark: { id: number }) => remark.id).sort()).toEqual(
      [r1.id, r2.id].sort()
    );
  });

  // Publishing a document without a draft deletes its published row and creates nothing: there is
  // no new version to re-point the links to, so it throws and rolls back.
  it('throws on publish without a draft and keeps the links on the published row', async () => {
    const r1 = await strapi.db.query(REMARK_UID).create({ data: { text: 'r1' } });
    const published = await strapi.db.query(NOTE_UID).create({
      data: {
        documentId: 'morphinversepublishonly',
        title: 'published only',
        publishedAt: new Date(),
        remarks: [r1.id],
      },
    });

    // The document service turns the InvalidRelationError into a ValidationError, so a request
    // that hits it gets a 400 instead of a 500
    await expect(
      strapi.documents(NOTE_UID).publish({ documentId: published.documentId })
    ).rejects.toMatchObject({
      name: 'ValidationError',
      message: expect.stringContaining('it has no new version'),
    });

    expect(await getNoteRow(published.documentId, 'published')).toMatchObject({
      id: published.id,
    });
    expect(await getRemarkSubjects()).toEqual([
      { id: r1.id, subjectId: published.id, subjectType: NOTE_UID },
    ]);
  });

  it('answers a blocked discard draft from the admin with a 400 and the reason', async () => {
    const r1 = await strapi.db.query(REMARK_UID).create({ data: { text: 'r1' } });
    const note = await strapi.documents(NOTE_UID).create({
      data: { title: 'with remarks', remarks: [r1.id] } as any,
    });
    await strapi.documents(NOTE_UID).publish({ documentId: note.documentId });
    const draft = await getNoteRow(note.documentId, 'draft');

    const res = await testUtils.rq.admin({
      method: 'POST',
      url: `/content-manager/collection-types/${NOTE_UID}/${note.documentId}/actions/discard`,
      body: {},
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatchObject({
      name: 'ValidationError',
      message: `Invalid ${NOTE_UID}.remarks value, expected at least one entry to link`,
    });
    expect(await getNoteRow(note.documentId, 'draft')).toMatchObject({ id: draft?.id });
  });

  it('keeps a morphOne link the published version owns on republish', async () => {
    const pin = await strapi.db.query(PIN_UID).create({ data: { label: 'p1' } });
    const board = await strapi.documents(BOARD_UID).create({ data: { title: 'board' } as any });
    await strapi.documents(BOARD_UID).publish({ documentId: board.documentId });
    const findPublished = () =>
      strapi.db.query(BOARD_UID).findOne({
        where: { documentId: board.documentId, publishedAt: { $notNull: true } },
      });
    const published = await findPublished();

    await strapi.db.query(PIN_UID).update({
      where: { id: pin.id },
      data: { holder: { id: published?.id, __type: BOARD_UID } },
    });

    await strapi.documents(BOARD_UID).publish({ documentId: board.documentId });

    const republished = await findPublished();
    const { attributes, tableName } = strapi.db.metadata.get(PIN_UID);
    const { idColumn } = (attributes.holder as any).morphColumn;
    const [row] = await strapi.db.getConnection(tableName).select('*').where({ id: pin.id });
    expect(republished?.id).not.toBe(published?.id);
    expect(row[idColumn.name]).toBe(republished?.id);
  });

  /** Points a remark to the given row, as an API client setting its subject would */
  const setRemarkSubject = async (remarkId: number, subjectId: number, subjectType: string) => {
    await strapi.db.query(REMARK_UID).update({
      where: { id: remarkId },
      data: { subject: { id: subjectId, __type: subjectType } },
    });
  };

  // `fields` narrows what publish reads back, so the published entries it returns have no
  // locale (REST `PUT /api/morph-notes/:id?status=published&fields[0]=title`)
  describe('republish with a fields selection', () => {
    it('keeps the morphMany links the published version owns', async () => {
      const r1 = await strapi.db.query(REMARK_UID).create({ data: { text: 'r1' } });
      const note = await strapi.documents(NOTE_UID).create({ data: { title: 'note' } as any });
      await strapi.documents(NOTE_UID).publish({ documentId: note.documentId });
      const published = await getNoteRow(note.documentId, 'published');
      await setRemarkSubject(r1.id, published?.id, NOTE_UID);

      await strapi.documents(NOTE_UID).publish({
        documentId: note.documentId,
        fields: ['title'],
      } as any);

      const republished = await getNoteRow(note.documentId, 'published');
      expect(republished?.id).not.toBe(published?.id);
      expect(await getRemarkSubjects()).toEqual([
        { id: r1.id, subjectId: republished?.id, subjectType: NOTE_UID },
      ]);
    });

    it('keeps the morphOne link the published version owns', async () => {
      const pin = await strapi.db.query(PIN_UID).create({ data: { label: 'p1' } });
      const board = await strapi.documents(BOARD_UID).create({ data: { title: 'board' } as any });
      await strapi.documents(BOARD_UID).publish({ documentId: board.documentId });
      const findPublished = () =>
        strapi.db.query(BOARD_UID).findOne({
          where: { documentId: board.documentId, publishedAt: { $notNull: true } },
        });
      const published = await findPublished();
      await strapi.db.query(PIN_UID).update({
        where: { id: pin.id },
        data: { holder: { id: published?.id, __type: BOARD_UID } },
      });

      await strapi.documents(BOARD_UID).publish({
        documentId: board.documentId,
        fields: ['title'],
      } as any);

      const republished = await findPublished();
      const { attributes, tableName } = strapi.db.metadata.get(PIN_UID);
      const { idColumn } = (attributes.holder as any).morphColumn;
      const [row] = await strapi.db.getConnection(tableName).select('*').where({ id: pin.id });
      expect(republished?.id).not.toBe(published?.id);
      expect(row[idColumn.name]).toBe(republished?.id);
    });

    it('keeps the links the published version of a non-default locale owns', async () => {
      const r1 = await strapi.db.query(REMARK_UID).create({ data: { text: 'r1' } });
      const note = await strapi.documents(LOCALIZED_NOTE_UID).create({
        locale: 'fr',
        data: { title: 'note fr' } as any,
      });
      await strapi.documents(LOCALIZED_NOTE_UID).publish({
        documentId: note.documentId,
        locale: 'fr',
      });
      const findPublished = () =>
        strapi.db.query(LOCALIZED_NOTE_UID).findOne({
          where: { documentId: note.documentId, locale: 'fr', publishedAt: { $notNull: true } },
        });
      const published = await findPublished();
      await setRemarkSubject(r1.id, published?.id, LOCALIZED_NOTE_UID);

      await strapi.documents(LOCALIZED_NOTE_UID).publish({
        documentId: note.documentId,
        locale: 'fr',
        fields: ['title'],
      } as any);

      const republished = await findPublished();
      expect(republished?.id).not.toBe(published?.id);
      expect(await getRemarkSubjects()).toEqual([
        { id: r1.id, subjectId: republished?.id, subjectType: LOCALIZED_NOTE_UID },
      ]);
    });
  });

  it('keeps the links of every locale on a multi-locale republish', async () => {
    const rEn = await strapi.db.query(REMARK_UID).create({ data: { text: 'en' } });
    const rFr = await strapi.db.query(REMARK_UID).create({ data: { text: 'fr' } });
    const note = await strapi.documents(LOCALIZED_NOTE_UID).create({
      locale: 'en',
      data: { title: 'note en' } as any,
    });
    await strapi.documents(LOCALIZED_NOTE_UID).update({
      documentId: note.documentId,
      locale: 'fr',
      data: { title: 'note fr' } as any,
    });
    await strapi.documents(LOCALIZED_NOTE_UID).publish({
      documentId: note.documentId,
      locale: '*',
    });
    const findPublished = (locale: string) =>
      strapi.db.query(LOCALIZED_NOTE_UID).findOne({
        where: { documentId: note.documentId, locale, publishedAt: { $notNull: true } },
      });
    const publishedEn = await findPublished('en');
    const publishedFr = await findPublished('fr');
    await setRemarkSubject(rEn.id, publishedEn?.id, LOCALIZED_NOTE_UID);
    await setRemarkSubject(rFr.id, publishedFr?.id, LOCALIZED_NOTE_UID);

    const result = await strapi.documents(LOCALIZED_NOTE_UID).publish({
      documentId: note.documentId,
      locale: '*',
    });

    const republishedEn = await findPublished('en');
    const republishedFr = await findPublished('fr');
    expect(result.entries).toHaveLength(2);
    expect(republishedEn?.id).not.toBe(publishedEn?.id);
    expect(republishedFr?.id).not.toBe(publishedFr?.id);
    // Each link moves to the new version of its own locale
    expect(await getRemarkSubjects()).toEqual([
      { id: rEn.id, subjectId: republishedEn?.id, subjectType: LOCALIZED_NOTE_UID },
      { id: rFr.id, subjectId: republishedFr?.id, subjectType: LOCALIZED_NOTE_UID },
    ]);
  });

  it('returns the re-pointed links in the publish response', async () => {
    const r1 = await strapi.db.query(REMARK_UID).create({ data: { text: 'r1' } });
    const r2 = await strapi.db.query(REMARK_UID).create({ data: { text: 'r2' } });
    const note = await strapi.documents(NOTE_UID).create({
      data: { title: 'note', remarks: [r1.id] } as any,
    });
    await strapi.documents(NOTE_UID).publish({ documentId: note.documentId });
    const published = await getNoteRow(note.documentId, 'published');
    await setRemarkSubject(r2.id, published?.id, NOTE_UID);

    const result = await strapi.documents(NOTE_UID).publish({
      documentId: note.documentId,
      populate: { remarks: true },
    } as any);

    // The published version owns r2 only: r1 stays on the draft
    expect((result.entries[0] as any).remarks.map((remark: { id: number }) => remark.id)).toEqual([
      r2.id,
    ]);
  });

  // Another write can re-own a target row between the load and the re-point (a concurrent
  // request on another connection). The re-point must not take it back.
  it('leaves a link that another write re-owned during publish', async () => {
    const r1 = await strapi.db.query(REMARK_UID).create({ data: { text: 'r1' } });
    const card = await strapi.db.query(CARD_UID).create({ data: { title: 'card' } });
    const note = await strapi.documents(NOTE_UID).create({ data: { title: 'note' } as any });
    await strapi.documents(NOTE_UID).publish({ documentId: note.documentId });
    const published = await getNoteRow(note.documentId, 'published');
    await setRemarkSubject(r1.id, published?.id, NOTE_UID);

    // Runs after publish deleted the old published version and created the new one, before the
    // re-point
    const unsubscribe = strapi.db.lifecycles.subscribe({
      models: [NOTE_UID],
      async afterCreate(event: any) {
        if (event.result?.publishedAt !== null && event.result?.publishedAt !== undefined) {
          await setRemarkSubject(r1.id, card.id, CARD_UID);
        }
      },
    });

    try {
      await strapi.documents(NOTE_UID).publish({ documentId: note.documentId });
    } finally {
      unsubscribe();
    }

    expect(await getRemarkSubjects()).toEqual([
      { id: r1.id, subjectId: card.id, subjectType: CARD_UID },
    ]);
  });

  it('clones a morphOne without its link and keeps the link on the source', async () => {
    const r1 = await strapi.db.query(REMARK_UID).create({ data: { text: 'r1' } });
    const card = await strapi.documents(CARD_UID).create({
      data: { title: 'pinned', pinnedRemark: [r1.id] } as any,
    });
    const source = await strapi.db.query(CARD_UID).findOne({
      where: { documentId: card.documentId },
    });

    const result = await strapi.documents(CARD_UID).clone({ documentId: card.documentId } as any);

    expect(result.entries).toHaveLength(1);
    expect(await getRemarkSubjects()).toEqual([
      { id: r1.id, subjectId: source?.id, subjectType: CARD_UID },
    ]);
  });

  it('links every related entry passed with connect when an entry is created', async () => {
    const r1 = await strapi.db.query(REMARK_UID).create({ data: { text: 'r1' } });
    const r2 = await strapi.db.query(REMARK_UID).create({ data: { text: 'r2' } });

    const note = await strapi.db.query(NOTE_UID).create({
      data: { title: 'connected', remarks: { connect: [r1.id, r2.id] } },
    });

    expect(await getRemarkSubjects()).toEqual([
      { id: r1.id, subjectId: note.id, subjectType: NOTE_UID },
      { id: r2.id, subjectId: note.id, subjectType: NOTE_UID },
    ]);
  });

  it('links only the first entry of a morphOne when an entry is created', async () => {
    const r1 = await strapi.db.query(REMARK_UID).create({ data: { text: 'r1' } });
    const r2 = await strapi.db.query(REMARK_UID).create({ data: { text: 'r2' } });

    const card = await strapi.db.query(CARD_UID).create({
      data: { title: 'pinned', pinnedRemark: [r1.id, r2.id] },
    });

    expect(await getRemarkSubjects()).toEqual([
      { id: r1.id, subjectId: card.id, subjectType: CARD_UID },
      { id: r2.id, subjectId: null, subjectType: null },
    ]);
  });

  it('rejects an empty value outside of publish', async () => {
    await expect(
      strapi.db.query(NOTE_UID).create({ data: { title: 'empty', remarks: [] } })
    ).rejects.toThrow('expected at least one entry to link');
  });

  // Discard draft would delete the draft (clearing the links) and recreate it from the
  // published version, which owns no links: it must throw and roll back until the copy
  // semantics are decided.
  it('throws on discard draft and keeps the links on the draft', async () => {
    const r1 = await strapi.db.query(REMARK_UID).create({ data: { text: 'r1' } });
    const note = await strapi.documents(NOTE_UID).create({
      data: { title: 'with remarks', remarks: [r1.id] } as any,
    });
    await strapi.documents(NOTE_UID).publish({ documentId: note.documentId });
    const draft = await getNoteRow(note.documentId, 'draft');

    await expect(
      strapi.documents(NOTE_UID).discardDraft({ documentId: note.documentId })
    ).rejects.toThrow('expected at least one entry to link');

    expect(await getNoteRow(note.documentId, 'draft')).toMatchObject({ id: draft?.id });
    expect(await getRemarkSubjects()).toEqual([
      { id: r1.id, subjectId: draft?.id, subjectType: NOTE_UID },
    ]);
  });

  it('throws on clone and keeps the links on the draft', async () => {
    const r1 = await strapi.db.query(REMARK_UID).create({ data: { text: 'r1' } });
    const note = await strapi.documents(NOTE_UID).create({
      data: { title: 'with remarks', remarks: [r1.id] } as any,
    });
    const draft = await getNoteRow(note.documentId, 'draft');

    await expect(
      strapi.documents(NOTE_UID).clone({ documentId: note.documentId } as any)
    ).rejects.toThrow('expected at least one entry to link');

    expect(await getRemarkSubjects()).toEqual([
      { id: r1.id, subjectId: draft?.id, subjectType: NOTE_UID },
    ]);
  });

  // Enabling draft & publish runs a migration that calls discardDraft on every published row
  // without a draft (core/src/migrations/draft-publish.ts). Reproduce that state and call: it
  // throws, so enabling draft & publish on such a type fails at boot on every start.
  it('throws when enabling draft & publish and keeps the links on the published row', async () => {
    const r1 = await strapi.db.query(REMARK_UID).create({ data: { text: 'r1' } });
    const published = await strapi.db.query(NOTE_UID).create({
      data: {
        documentId: 'morphinversepublishnodraft',
        title: 'published only',
        publishedAt: new Date(),
        remarks: [r1.id],
      },
    });

    await expect(
      strapi.documents(NOTE_UID).discardDraft({ documentId: published.documentId })
    ).rejects.toThrow('expected at least one entry to link');

    expect(await getNoteRow(published.documentId, 'draft')).toBeNull();
    expect(await getRemarkSubjects()).toEqual([
      { id: r1.id, subjectId: published.id, subjectType: NOTE_UID },
    ]);
  });
  describe('update', () => {
    const createRemarks = async (count: number) => {
      const remarks = [];
      for (let i = 1; i <= count; i += 1) {
        remarks.push(await strapi.db.query(REMARK_UID).create({ data: { text: `r${i}` } }));
      }
      return remarks;
    };

    it('links every entry of an array and unlinks the entries left out', async () => {
      const [r1, r2, r3, r4] = await createRemarks(4);
      const note = await strapi.db.query(NOTE_UID).create({
        data: { title: 'linked', remarks: [r1.id, r4.id] },
      });

      await strapi.db.query(NOTE_UID).update({
        where: { id: note.id },
        data: { remarks: [r1.id, r2.id, r3.id] },
      });

      expect(await getRemarkSubjects()).toEqual([
        { id: r1.id, subjectId: note.id, subjectType: NOTE_UID },
        { id: r2.id, subjectId: note.id, subjectType: NOTE_UID },
        { id: r3.id, subjectId: note.id, subjectType: NOTE_UID },
        { id: r4.id, subjectId: null, subjectType: null },
      ]);
    });

    it('links every entry of a set', async () => {
      const [r1, r2] = await createRemarks(2);
      const note = await strapi.db.query(NOTE_UID).create({
        data: { title: 'linked', remarks: [r1.id] },
      });

      await strapi.db.query(NOTE_UID).update({
        where: { id: note.id },
        data: { remarks: { set: [r2.id, r1.id] } },
      });

      expect(await getRemarkSubjects()).toEqual([
        { id: r1.id, subjectId: note.id, subjectType: NOTE_UID },
        { id: r2.id, subjectId: note.id, subjectType: NOTE_UID },
      ]);
    });

    it('keeps the existing links on connect', async () => {
      const [r1, r2, r3] = await createRemarks(3);
      const note = await strapi.db.query(NOTE_UID).create({
        data: { title: 'linked', remarks: [r1.id] },
      });

      await strapi.db.query(NOTE_UID).update({
        where: { id: note.id },
        data: { remarks: { connect: [r2.id, r3.id] } },
      });

      expect(await getRemarkSubjects()).toEqual([
        { id: r1.id, subjectId: note.id, subjectType: NOTE_UID },
        { id: r2.id, subjectId: note.id, subjectType: NOTE_UID },
        { id: r3.id, subjectId: note.id, subjectType: NOTE_UID },
      ]);
    });

    it('unlinks only the entries given to disconnect', async () => {
      const [r1, r2, r3] = await createRemarks(3);
      const note = await strapi.db.query(NOTE_UID).create({
        data: { title: 'linked', remarks: [r1.id, r2.id] },
      });
      const otherNote = await strapi.db.query(NOTE_UID).create({
        data: { title: 'other', remarks: [r3.id] },
      });

      // r3 belongs to another note, so disconnecting it from this note is a no-op
      await strapi.db.query(NOTE_UID).update({
        where: { id: note.id },
        data: { remarks: { disconnect: [r1.id, r3.id] } },
      });

      expect(await getRemarkSubjects()).toEqual([
        { id: r1.id, subjectId: null, subjectType: null },
        { id: r2.id, subjectId: note.id, subjectType: NOTE_UID },
        { id: r3.id, subjectId: otherNote.id, subjectType: NOTE_UID },
      ]);
    });

    it('applies connect and disconnect together', async () => {
      const [r1, r2, r3] = await createRemarks(3);
      const note = await strapi.db.query(NOTE_UID).create({
        data: { title: 'linked', remarks: [r1.id, r2.id] },
      });

      await strapi.db.query(NOTE_UID).update({
        where: { id: note.id },
        data: { remarks: { connect: [r3.id], disconnect: [r1.id] } },
      });

      expect(await getRemarkSubjects()).toEqual([
        { id: r1.id, subjectId: null, subjectType: null },
        { id: r2.id, subjectId: note.id, subjectType: NOTE_UID },
        { id: r3.id, subjectId: note.id, subjectType: NOTE_UID },
      ]);
    });

    // The admin sends an empty delta for every relation field on save
    // toAssocs drops a null set, so `{ set: null }` reaches this branch as an empty delta, like
    // regular relations (a bare `null` still clears). What `{ set: null }` should mean for every
    // relation kind is still open.
    it('keeps every link on { set: null }', async () => {
      const [r1, r2] = await createRemarks(2);
      const note = await strapi.db.query(NOTE_UID).create({
        data: { title: 'linked', remarks: [r1.id, r2.id] },
      });

      await strapi.db.query(NOTE_UID).update({
        where: { id: note.id },
        data: { remarks: { set: null } },
      });

      expect(await getRemarkSubjects()).toEqual([
        { id: r1.id, subjectId: note.id, subjectType: NOTE_UID },
        { id: r2.id, subjectId: note.id, subjectType: NOTE_UID },
      ]);
    });

    // A remark stores a single owner, so connecting it to another note takes it away from the
    // note it belonged to
    it('moves a connected entry away from its current owner', async () => {
      const [r1, r2] = await createRemarks(2);
      await strapi.db.query(NOTE_UID).create({ data: { title: 'other', remarks: [r1.id] } });
      const note = await strapi.db.query(NOTE_UID).create({
        data: { title: 'linked', remarks: [r2.id] },
      });

      await strapi.db.query(NOTE_UID).update({
        where: { id: note.id },
        data: { remarks: { connect: [r1.id] } },
      });

      expect(await getRemarkSubjects()).toEqual([
        { id: r1.id, subjectId: note.id, subjectType: NOTE_UID },
        { id: r2.id, subjectId: note.id, subjectType: NOTE_UID },
      ]);
    });

    it('keeps every link on an empty connect and disconnect', async () => {
      const [r1, r2] = await createRemarks(2);
      const note = await strapi.db.query(NOTE_UID).create({
        data: { title: 'linked', remarks: [r1.id, r2.id] },
      });

      await strapi.db.query(NOTE_UID).update({
        where: { id: note.id },
        data: { remarks: { connect: [], disconnect: [] } },
      });

      expect(await getRemarkSubjects()).toEqual([
        { id: r1.id, subjectId: note.id, subjectType: NOTE_UID },
        { id: r2.id, subjectId: note.id, subjectType: NOTE_UID },
      ]);
    });

    it.each([
      ['an empty array', []],
      ['an empty set', { set: [] }],
      ['null', null],
    ])('unlinks every entry on %s', async (_label, value) => {
      const [r1, r2] = await createRemarks(2);
      const note = await strapi.db.query(NOTE_UID).create({
        data: { title: 'linked', remarks: [r1.id, r2.id] },
      });

      await strapi.db.query(NOTE_UID).update({
        where: { id: note.id },
        data: { remarks: value },
      });

      expect(await getRemarkSubjects()).toEqual([
        { id: r1.id, subjectId: null, subjectType: null },
        { id: r2.id, subjectId: null, subjectType: null },
      ]);
    });

    it('links every entry of an array through the document service', async () => {
      const [r1, r2, r3] = await createRemarks(3);
      const note = await strapi.documents(NOTE_UID).create({
        data: { title: 'linked', remarks: [r1.id] } as any,
      });

      await strapi.documents(NOTE_UID).update({
        documentId: note.documentId,
        data: { remarks: [r1.id, r2.id, r3.id] } as any,
      });

      const draft = await getNoteRow(note.documentId, 'draft');
      expect(await getRemarkSubjects()).toEqual([
        { id: r1.id, subjectId: draft?.id, subjectType: NOTE_UID },
        { id: r2.id, subjectId: draft?.id, subjectType: NOTE_UID },
        { id: r3.id, subjectId: draft?.id, subjectType: NOTE_UID },
      ]);
    });

    it('links only the first entry of a morphOne array', async () => {
      const [r1, r2, r3] = await createRemarks(3);
      const card = await strapi.db.query(CARD_UID).create({
        data: { title: 'pinned', pinnedRemark: [r1.id] },
      });

      await strapi.db.query(CARD_UID).update({
        where: { id: card.id },
        data: { pinnedRemark: [r2.id, r3.id] },
      });

      expect(await getRemarkSubjects()).toEqual([
        { id: r1.id, subjectId: null, subjectType: null },
        { id: r2.id, subjectId: card.id, subjectType: CARD_UID },
        { id: r3.id, subjectId: null, subjectType: null },
      ]);
    });

    it('replaces the linked entry of a morphOne on connect', async () => {
      const [r1, r2] = await createRemarks(2);
      const card = await strapi.db.query(CARD_UID).create({
        data: { title: 'pinned', pinnedRemark: [r1.id] },
      });

      await strapi.db.query(CARD_UID).update({
        where: { id: card.id },
        data: { pinnedRemark: { connect: [r2.id] } },
      });

      expect(await getRemarkSubjects()).toEqual([
        { id: r1.id, subjectId: null, subjectType: null },
        { id: r2.id, subjectId: card.id, subjectType: CARD_UID },
      ]);
    });

    /**
     * Through REST, an inverse morph item needs `__type` to resolve its target. The Content API
     * rejects `__type` in the array form (`Invalid key __type at remarks`), so a REST client
     * sends `{ set }`, `{ connect }` or `{ disconnect }` with `{ documentId, __type }` items.
     */
    describe('through REST', () => {
      let rqContent: ReturnType<typeof createContentAPIRequest>;

      beforeAll(async () => {
        rqContent = await createContentAPIRequest({ strapi });
      });

      const toItem = (remark: { documentId: string }) => ({
        documentId: remark.documentId,
        __type: REMARK_UID,
      });

      const updateNote = async (documentId: string, remarks: unknown) => {
        const res = await rqContent({
          method: 'PUT',
          url: `/morph-notes/${documentId}`,
          body: { data: { remarks } },
        });
        expect(res.statusCode).toBe(200);
      };

      const createNote = async (remarks: { id: number }[]) => {
        const note = await strapi.documents(NOTE_UID).create({
          data: { title: 'linked', remarks: remarks.map((remark) => remark.id) } as any,
        });
        const draft = await getNoteRow(note.documentId, 'draft');
        return { documentId: note.documentId, draftId: draft?.id };
      };

      it('links every entry of a set and unlinks the entries left out', async () => {
        const [r1, r2, r3] = await createRemarks(3);
        const note = await createNote([r1]);

        await updateNote(note.documentId, { set: [toItem(r2), toItem(r3)] });

        expect(await getRemarkSubjects()).toEqual([
          { id: r1.id, subjectId: null, subjectType: null },
          { id: r2.id, subjectId: note.draftId, subjectType: NOTE_UID },
          { id: r3.id, subjectId: note.draftId, subjectType: NOTE_UID },
        ]);
      });

      it('keeps the existing links on connect', async () => {
        const [r1, r2] = await createRemarks(2);
        const note = await createNote([r1]);

        await updateNote(note.documentId, { connect: [toItem(r2)] });

        expect(await getRemarkSubjects()).toEqual([
          { id: r1.id, subjectId: note.draftId, subjectType: NOTE_UID },
          { id: r2.id, subjectId: note.draftId, subjectType: NOTE_UID },
        ]);
      });

      it('unlinks only the entries given to disconnect', async () => {
        const [r1, r2] = await createRemarks(2);
        const note = await createNote([r1, r2]);

        await updateNote(note.documentId, { disconnect: [toItem(r1)] });

        expect(await getRemarkSubjects()).toEqual([
          { id: r1.id, subjectId: null, subjectType: null },
          { id: r2.id, subjectId: note.draftId, subjectType: NOTE_UID },
        ]);
      });

      it('keeps every link on { set: null }', async () => {
        const [r1, r2] = await createRemarks(2);
        const note = await createNote([r1, r2]);

        await updateNote(note.documentId, { set: null });

        expect(await getRemarkSubjects()).toEqual([
          { id: r1.id, subjectId: note.draftId, subjectType: NOTE_UID },
          { id: r2.id, subjectId: note.draftId, subjectType: NOTE_UID },
        ]);
      });
    });
  });
});
