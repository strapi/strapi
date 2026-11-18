import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import type { Core, Internal, Schema } from '@strapi/types';

import { transformParamsDocumentId } from '../id-transform';

const NOTE_UID = 'api::note.note' as Internal.UID.ContentType;
const REMARK_UID = 'api::remark.remark' as Internal.UID.ContentType;
const SOURCE_UID = 'api::source.source' as Internal.UID.ContentType;

const createModel = (
  uid: Internal.UID.ContentType,
  name: string,
  attributes: Record<string, unknown>
) => ({
  uid,
  modelType: 'contentType',
  kind: 'collectionType',
  modelName: name,
  globalId: name,
  info: { displayName: name, singularName: name, pluralName: `${name}s` },
  options: { draftAndPublish: false },
  attributes,
});

const models = {
  // Inverse sides of `remark.subject`: their target is fixed by the schema
  [NOTE_UID]: createModel(NOTE_UID, 'note', {
    remarks: { type: 'relation', relation: 'morphMany', target: REMARK_UID, morphBy: 'subject' },
    pinnedRemark: {
      type: 'relation',
      relation: 'morphOne',
      target: REMARK_UID,
      morphBy: 'subject',
    },
  }),
  [REMARK_UID]: createModel(REMARK_UID, 'remark', {
    subject: { type: 'relation', relation: 'morphToOne' },
  }),
  // Owner side: each entry names its target with `__type`
  [SOURCE_UID]: createModel(SOURCE_UID, 'source', {
    links: { type: 'relation', relation: 'morphToMany' },
  }),
} as unknown as Record<string, Schema.ContentType>;

const findRemarks = vi.fn();

describe('Transform polymorphic relation data', () => {
  beforeAll(() => {
    global.strapi = {
      getModel: (uid: string) => models[uid],
      localization: {
        isLocalizedContentType: () => false,
        getDefaultLocale: async () => 'en',
      },
      db: {
        query: vi.fn((uid: string) => {
          if (uid !== REMARK_UID) {
            throw new Error(`Model ${uid} not found`);
          }

          return { findMany: findRemarks };
        }),
      },
    } as unknown as Core.Strapi;
  });

  beforeEach(() => {
    findRemarks.mockReset();
    findRemarks.mockResolvedValue([
      { id: 1, documentId: 'remark-1' },
      { id: 2, documentId: 'remark-2' },
    ]);
  });

  it('maps the documentIds of an inverse morphMany to its target without a __type', async () => {
    const { data } = await transformParamsDocumentId(NOTE_UID, {
      data: { remarks: [{ documentId: 'remark-1' }, 'remark-2'] },
      status: 'draft',
    });

    expect(data).toEqual({
      remarks: {
        set: [
          { id: 1, __type: REMARK_UID },
          { id: 2, __type: REMARK_UID },
        ],
      },
    });
  });

  it('maps the documentIds of an inverse morphMany connect to its target', async () => {
    const { data } = await transformParamsDocumentId(NOTE_UID, {
      data: { remarks: { connect: [{ documentId: 'remark-1' }] } },
      status: 'draft',
    });

    expect(data).toEqual({ remarks: { connect: [{ id: 1, __type: REMARK_UID }] } });
  });

  it('maps the documentId of an inverse morphOne to its target', async () => {
    const { data } = await transformParamsDocumentId(NOTE_UID, {
      data: { pinnedRemark: { documentId: 'remark-2' } },
      status: 'draft',
    });

    expect(data).toEqual({ pinnedRemark: { set: [{ id: 2, __type: REMARK_UID }] } });
  });

  it('maps the documentIds of a morphToMany to the __type of each entry', async () => {
    const { data } = await transformParamsDocumentId(SOURCE_UID, {
      data: { links: [{ documentId: 'remark-1', __type: REMARK_UID }] },
      status: 'draft',
    });

    expect(data).toEqual({ links: { set: [{ id: 1, __type: REMARK_UID }] } });
  });
});
