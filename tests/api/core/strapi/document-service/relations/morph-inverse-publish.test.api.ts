import type { Core } from '@strapi/types';

import { createTestSetup, destroyTestSetup } from '../../../../utils/builder-helper';

const NOTE_UID = 'api::morph-note.morph-note' as const;
const REMARK_UID = 'api::morph-remark.morph-remark' as const;
const CARD_UID = 'api::morph-card.morph-card' as const;
const PIN_UID = 'api::morph-pin.morph-pin' as const;
const BOARD_UID = 'api::morph-board.morph-board' as const;

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

const resources = {
  schemas: {
    components: {},
    // The morphMany target must exist before the type that declares it
    'content-types': {
      [REMARK_UID]: remarkContentType,
      [NOTE_UID]: noteContentType,
      [CARD_UID]: cardContentType,
      [PIN_UID]: pinContentType,
      [BOARD_UID]: boardContentType,
    },
  },
  fixtures: {
    'content-types': {
      [NOTE_UID]: [],
      [REMARK_UID]: [],
      [CARD_UID]: [],
      [PIN_UID]: [],
      [BOARD_UID]: [],
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

  // A remark can point to the published row: data migrated from v4, where the existing rows
  // became the published versions, or a subject set to the published id. Publish deletes the old
  // published row, which clears these links: it must throw and roll back instead.
  it('throws on republish when the published version owns links and keeps them', async () => {
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

    await expect(
      strapi.documents(NOTE_UID).publish({ documentId: note.documentId })
    ).rejects.toThrow('expected at least one entry to link');

    expect(await getNoteRow(note.documentId, 'published')).toMatchObject({ id: published?.id });
    expect(await getRemarkSubjects()).toEqual([
      { id: r1.id, subjectId: draft?.id, subjectType: NOTE_UID },
      { id: r2.id, subjectId: published?.id, subjectType: NOTE_UID },
    ]);
  });

  it('answers a blocked publish from the admin with a 400 and the reason', async () => {
    const r1 = await strapi.db.query(REMARK_UID).create({ data: { text: 'r1' } });
    const r2 = await strapi.db.query(REMARK_UID).create({ data: { text: 'r2' } });
    const note = await strapi.documents(NOTE_UID).create({
      data: { title: 'with remarks', remarks: [r1.id] } as any,
    });
    await strapi.documents(NOTE_UID).publish({ documentId: note.documentId });
    const published = await getNoteRow(note.documentId, 'published');

    await strapi.db.query(REMARK_UID).update({
      where: { id: r2.id },
      data: { subject: { id: published?.id, __type: NOTE_UID } },
    });

    const res = await testUtils.rq.admin({
      method: 'POST',
      url: `/content-manager/collection-types/${NOTE_UID}/${note.documentId}/actions/publish`,
      body: {},
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatchObject({
      name: 'ValidationError',
      message: `Invalid ${NOTE_UID}.remarks value, expected at least one entry to link`,
    });
    expect(await getNoteRow(note.documentId, 'published')).toMatchObject({ id: published?.id });
  });

  // Publish makes one check per call, over every inverse attribute: a morphOne link owned by
  // the old published version keeps the empty morphMany value too, so publish throws.
  it('throws on republish when the published version owns a morphOne link only', async () => {
    const pin = await strapi.db.query(PIN_UID).create({ data: { label: 'p1' } });
    const board = await strapi.documents(BOARD_UID).create({ data: { title: 'board' } as any });
    await strapi.documents(BOARD_UID).publish({ documentId: board.documentId });
    const published = await strapi.db.query(BOARD_UID).findOne({
      where: { documentId: board.documentId, publishedAt: { $notNull: true } },
    });

    await strapi.db.query(PIN_UID).update({
      where: { id: pin.id },
      data: { holder: { id: published?.id, __type: BOARD_UID } },
    });

    await expect(
      strapi.documents(BOARD_UID).publish({ documentId: board.documentId })
    ).rejects.toThrow(`Invalid ${BOARD_UID}.remarks value, expected at least one entry to link`);
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
  });
});
