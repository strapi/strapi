import { Schema } from '@strapi/types';
import { createService } from '../index';
import { CollectionTypeService } from '../collection-type';
import { SingleTypeService } from '../single-type';

const singleType: Schema.SingleType = {
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
      const contentType: Schema.ContentType = {
        kind: 'collectionType',
        modelType: 'contentType',
        uid: 'testModel',
        attributes: {},
        info: {
          singularName: 'test-model',
          displayName: 'Test Model',
          pluralName: 'test-models',
        },
      };

      const service = createService({ contentType });

      expect(service).toBeInstanceOf(CollectionTypeService);
    });
  });

  describe('Single Type', () => {
    test('Creates default actions', () => {
      const service = createService({ contentType: singleType });
      expect(service).toBeInstanceOf(SingleTypeService);
    });

    describe('Passes the logic down to the entityService', () => {
      test('Creates data when no entity is found', async () => {
        const documentService = {
          findFirst: jest.fn(() => Promise.resolve(null)),
          create: jest.fn(() => Promise.resolve({ documentId: 1 })),
        };

        const strapi = {
          documents: jest.fn(() => documentService),
          query() {
            return { count() {} };
          },
        };

        global.strapi = strapi;

        const service = createService({ contentType: singleType });

        const input = {};
        await service.createOrUpdate({ data: input });

        expect(documentService.findFirst).toHaveBeenCalledWith({ status: 'published' });
        expect(documentService.create).toHaveBeenCalledWith({ data: input, status: 'published' });
      });

      test('Updates data when entity is found', async () => {
        const documentService = {
          findFirst: jest.fn(() => Promise.resolve({ documentId: 1 })),
          update: jest.fn(() => Promise.resolve({ documentId: 1 })),
        };

        const strapi = {
          documents: jest.fn(() => documentService),
          query() {
            return { count() {} };
          },
        };

        global.strapi = strapi;

        const service = createService({ contentType: singleType });

        const input = {};
        await service.createOrUpdate({ data: input });

        expect(documentService.findFirst).toHaveBeenCalledWith({
          populate: undefined,
          status: 'published',
        });

        expect(documentService.update).toHaveBeenCalledWith(1, {
          data: input,
          status: 'published',
        });
      });

      test('Delete data when entity is found', async () => {
        const documentService = {
          findFirst: jest.fn(() => Promise.resolve({ documentId: 1 })),
          delete: jest.fn(() => Promise.resolve({ documentId: 1 })),
        };

        const strapi = {
          documents: jest.fn(() => documentService),
        };

        global.strapi = strapi;

        const service = createService({ contentType: singleType });

        await service.delete({});

        expect(documentService.findFirst).toHaveBeenCalledWith({
          populate: undefined,
        });

        expect(documentService.delete).toHaveBeenCalledWith(1, { status: 'published' });
      });
    });
  });
});
