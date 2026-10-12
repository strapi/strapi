import type { Struct } from '@strapi/types';
import { createService } from '../index';
import { CollectionTypeService } from '../collection-type';
import { SingleTypeService } from '../single-type';

const singleType: Struct.SingleTypeSchema = {
  kind: 'singleType',
  modelType: 'contentType',
  uid: 'api::testModel.testModel',
  globalId: 'testModel',
  modelName: 'testModel',
  attributes: {},
  info: {
    singularName: 'test-model',
    displayName: 'Test Model',
    pluralName: 'test-models',
  },
};

describe('Default Service', () => {
  describe('Collection Type', () => {
    test('Creates default actions', () => {
      const contentType: Struct.ContentTypeSchema = {
        kind: 'collectionType',
        modelType: 'contentType',
        uid: 'api::testModel.testModel',
        globalId: 'testModel',
        modelName: 'testModel',
        attributes: {},
        info: {
          singularName: 'test-model',
          displayName: 'Test Model',
          pluralName: 'test-models',
        },
      };

      const service = createService({ strapi: {} as any, contentType });

      expect(service).toBeInstanceOf(CollectionTypeService);
    });
  });

  describe('Single Type', () => {
    test('Creates default actions', () => {
      const service = createService({ strapi: {} as any, contentType: singleType });
      expect(service).toBeInstanceOf(SingleTypeService);
    });

    describe('Passes the logic down to the documentService', () => {
      test('Creates data when no entity is found', async () => {
        const documentService = {
          create: jest.fn(() => Promise.resolve({ documentId: 1 })),
        };

        const dbInstance = {
          findOne: jest.fn(() => Promise.resolve(null)),
        };

        const strapi = {
          db: {
            query() {
              return dbInstance;
            },
          },
          documents: jest.fn(() => documentService),
          query() {
            return { count() {} };
          },
        };

        const service = createService({ strapi, contentType: singleType });

        const input = {};
        await service.createOrUpdate({ data: input });

        expect(dbInstance.findOne).toHaveBeenCalledWith();
        expect(documentService.create).toHaveBeenCalledWith({ data: input, status: 'published' });
      });

      test('Updates data when entity is found', async () => {
        const documentService = {
          update: jest.fn(() => Promise.resolve({ documentId: 1 })),
        };

        const dbInstance = {
          findOne: jest.fn(() => Promise.resolve({ documentId: 1 })),
          count() {},
        };

        const strapi = {
          db: {
            query() {
              return dbInstance;
            },
          },
          documents: jest.fn(() => documentService),
        };

        const service = createService({ strapi, contentType: singleType });

        const input = {};
        await service.createOrUpdate({ data: input });

        expect(dbInstance.findOne).toHaveBeenCalledWith();

        expect(documentService.update).toHaveBeenCalledWith({
          documentId: 1,
          data: input,
          status: 'published',
        });
      });

      test('Delete data when entity is found', async () => {
        const documentService = {
          delete: jest.fn(() => Promise.resolve({ documentId: 1, entries: [{}] })),
        };

        const dbInstance = {
          findOne: jest.fn(() => Promise.resolve({ documentId: 1 })),
        };

        const strapi = {
          db: {
            query() {
              return dbInstance;
            },
          },
          documents: jest.fn(() => documentService),
        };

        const service = createService({ strapi, contentType: singleType });

        await service.delete({});

        expect(dbInstance.findOne).toHaveBeenCalledWith();

        expect(documentService.delete).toHaveBeenCalledWith({ documentId: 1, status: 'published' });
      });
    });
  });
});
