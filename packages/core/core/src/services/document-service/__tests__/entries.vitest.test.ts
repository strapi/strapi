import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Struct } from '@strapi/types';

import { createLocalizationService } from '../../localization';
import { createEntriesService } from '../entries';

vi.mock('../transform/id-transform', () => ({
  transformParamsDocumentId: vi.fn(async (_uid: string, params: any) => params),
}));

vi.mock('../transform/query', () => ({
  transformParamsToQuery: vi.fn(() => ({})),
}));

vi.mock('../transform/data', () => ({
  clearTransformDataRequestCache: vi.fn(),
  transformData: vi.fn(async (data: any) => data),
}));

vi.mock('../components', () => ({
  createComponents: vi.fn(async () => ({})),
  updateComponents: vi.fn(async () => ({})),
  assignComponentData: vi.fn((_contentType: any, _componentData: any, data: any) => data),
}));

const CT_UID = 'api::test.test';

const contentType: Struct.CollectionTypeSchema = {
  uid: CT_UID,
  kind: 'collectionType',
  collectionName: 'tests',
  modelName: 'test',
  modelType: 'contentType',
  globalId: 'Test',
  info: {
    displayName: 'Test',
    singularName: 'test',
    pluralName: 'tests',
  },
  options: {
    draftAndPublish: false,
  },
  attributes: {
    title: { type: 'string' },
  },
};

const dbCreate = vi.fn(async ({ data }: any) => ({ id: 1, ...data }));
const dbUpdate = vi.fn(async ({ data }: any) => ({ id: 1, ...data }));
const dbFindOne = vi.fn(async () => null);

const entityValidator = {
  validateEntityCreation: vi.fn(async (_contentType: any, data: any) => data),
  validateEntityUpdate: vi.fn(async (_contentType: any, data: any) => data),
};

describe('Document Service: entries', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    global.strapi = {
      contentType: vi.fn(() => contentType),
      plugins: {},
      localization: createLocalizationService(),
      config: { get: vi.fn(() => undefined) },
      db: {
        query: vi.fn(() => ({ create: dbCreate, update: dbUpdate, findOne: dbFindOne })),
      },
    } as any;
  });

  describe('create', () => {
    it.each([
      ['null', null],
      ['an empty string', ''],
      ['undefined', undefined],
    ])('does not forward documentId to the database when it is %s', async (_label, documentId) => {
      const entries = createEntriesService(CT_UID, entityValidator as any);

      await entries.create({ data: { documentId, title: 'Test' } });

      expect(dbCreate).toHaveBeenCalledTimes(1);

      const { data } = dbCreate.mock.calls[0][0];
      expect(data).not.toHaveProperty('documentId');
      expect(data).toMatchObject({ title: 'Test' });

      // No uniqueness lookup should be performed for an absent documentId
      expect(dbFindOne).not.toHaveBeenCalled();
    });

    it('keeps an explicitly provided documentId', async () => {
      const entries = createEntriesService(CT_UID, entityValidator as any);

      await entries.create({ data: { documentId: 'my-document-id', title: 'Test' } });

      expect(dbFindOne).toHaveBeenCalledWith({
        select: ['id'],
        where: { documentId: 'my-document-id' },
      });

      expect(dbCreate).toHaveBeenCalledTimes(1);
      expect(dbCreate.mock.calls[0][0].data).toMatchObject({
        documentId: 'my-document-id',
        title: 'Test',
      });
    });
  });

  describe('update', () => {
    it.each([
      ['null', null],
      ['an empty string', ''],
      ['another value', 'another-document-id'],
    ])('never forwards documentId to the database when it is %s', async (_label, documentId) => {
      const entries = createEntriesService(CT_UID, entityValidator as any);

      const entryToUpdate = { id: 1, documentId: 'existing-document-id', title: 'Old' };

      await entries.update(entryToUpdate, { data: { documentId, title: 'New' } });

      expect(dbUpdate).toHaveBeenCalledTimes(1);

      const { where, data } = dbUpdate.mock.calls[0][0];
      expect(where).toEqual({ id: 1 });
      expect(data).not.toHaveProperty('documentId');
      expect(data).toMatchObject({ title: 'New' });
    });
  });
  describe('publish', () => {
    const NOTE_UID = 'api::note.note';
    const REMARK_UID = 'api::remark.remark';

    // Inverse morphMany of a morphToOne: the links live in the morph columns of the remarks
    const noteContentType = {
      ...contentType,
      uid: NOTE_UID,
      options: { draftAndPublish: true },
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

    beforeEach(() => {
      (global.strapi as any).contentType = vi.fn(() => noteContentType);
      (global.strapi as any).getModel = vi.fn(() => ({
        attributes: { subject: { type: 'relation', relation: 'morphToOne' } },
      }));
    });

    it('omits an empty inverse morph value', async () => {
      const entries = createEntriesService(NOTE_UID, entityValidator as any);

      await entries.publish({ id: 1, title: 'Note', remarks: [] });

      expect(dbCreate).toHaveBeenCalledTimes(1);
      expect(dbCreate.mock.calls[0][0].data).not.toHaveProperty('remarks');
    });
  });
});
