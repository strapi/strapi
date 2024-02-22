import { Schema } from '@strapi/types';
import { createService } from '../index';
import { CollectionTypeService } from '../collection-type';
import { SingleTypeService } from '../single-type';

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
      const contentType: Schema.ContentType = {
        kind: 'singleType',
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

      expect(service).toBeInstanceOf(SingleTypeService);
    });

    describe('Passes the logic down to the entityService', () => {
      test('Creates data when no entity is found', async () => {
        const documentService = {
          update: jest.fn(() => Promise.resolve({ id: 1 })),
        };

        const strapi = {
          documents: jest.fn(() => documentService),
          query() {
            return { count() {} };
          },
        };

        global.strapi = strapi;

        const contentType: Schema.ContentType = {
          kind: 'singleType',
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

        const input = {};
        await service.createOrUpdate({ data: input });

        expect(documentService.update).toHaveBeenCalledWith({
          data: input,
          status: 'published',
        });
      });

      test('Updates data when entity is found', async () => {
        const documentService = {
          update: jest.fn(() => Promise.resolve({ id: 1 })),
        };

        const strapi = {
          documents: jest.fn(() => documentService),
          query() {
            return { count() {} };
          },
        };

        global.strapi = strapi;

        const contentType: Schema.ContentType = {
          kind: 'singleType',
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

        const input = {};
        await service.createOrUpdate({ data: input });

        expect(documentService.update).toHaveBeenCalledWith({
          data: input,
          status: 'published',
        });
      });

      test('Delete data when entity is found', async () => {
        const documentService = {
          delete: jest.fn(() => Promise.resolve({ id: 1 })),
        };

        const strapi = {
          documents: jest.fn(() => documentService),
        };

        global.strapi = strapi;

        const contentType: Schema.ContentType = {
          kind: 'singleType',
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

        await service.delete();

        expect(documentService.delete).toHaveBeenCalledWith({
          status: 'published',
        });
      });
    });
  });
});
