import type { Struct } from '@strapi/types';

import { createEntriesService } from '../entries';

jest.mock('../transform/id-transform', () => ({
  transformParamsDocumentId: jest.fn(async (_uid: string, params: any) => params),
}));

jest.mock('../transform/query', () => ({
  transformParamsToQuery: jest.fn(() => ({})),
}));

jest.mock('../components', () => ({
  createComponents: jest.fn(async () => ({})),
  updateComponents: jest.fn(async () => ({})),
  assignComponentData: jest.fn((_contentType: any, _componentData: any, data: any) => data),
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

const dbCreate = jest.fn(async ({ data }: any) => ({ id: 1, ...data }));
const dbUpdate = jest.fn(async ({ data }: any) => ({ id: 1, ...data }));
const dbFindOne = jest.fn(async () => null);

const entityValidator = {
  validateEntityCreation: jest.fn(async (_contentType: any, data: any) => data),
  validateEntityUpdate: jest.fn(async (_contentType: any, data: any) => data),
};

describe('Document Service: entries', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    global.strapi = {
      contentType: jest.fn(() => contentType),
      plugins: {},
      config: { get: jest.fn(() => undefined) },
      db: {
        query: jest.fn(() => ({ create: dbCreate, update: dbUpdate, findOne: dbFindOne })),
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
});
