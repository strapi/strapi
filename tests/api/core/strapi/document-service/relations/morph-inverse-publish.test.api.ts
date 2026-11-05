import type { Core } from '@strapi/types';

import { createTestSetup, destroyTestSetup } from '../../../../utils/builder-helper';

const NOTE_UID = 'api::morph-note.morph-note' as const;
const REMARK_UID = 'api::morph-remark.morph-remark' as const;

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

const resources = {
  schemas: {
    components: {},
    // The morphMany target must exist before the type that declares it
    'content-types': {
      [REMARK_UID]: remarkContentType,
      [NOTE_UID]: noteContentType,
    },
  },
  fixtures: {
    'content-types': {
      [NOTE_UID]: [],
      [REMARK_UID]: [],
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
});
