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
        const singleTypeUpdate = jest.fn(() => Promise.resolve({ id: 1 }));
        const documentService = {
          singleType: () => ({ update: singleTypeUpdate }),
        };

        const strapi = {
          documents: documentService,
          query() {
            return { count() {} };
          },
        };

        global.strapi = strapi;

        const contentType: Schema.SingleType = {
          kind: 'singleType',
          modelType: 'contentType',
          uid: 'api::testModel.testModel',
          globalId: 'TestModel',
          modelName: 'testModel',
          attributes: {},
          info: {
            singularName: 'test-model',
            displayName: 'Test Model',
            pluralName: 'test-models',
          },
        };

        const service = createService<Schema.SingleType>({ contentType });

        const input = {};
        await service.createOrUpdate({ data: input });

        expect(singleTypeUpdate).toHaveBeenCalledWith({
          data: input,
          status: 'published',
        });
      });

      test('Updates data when entity is found', async () => {
        const singleTypeUpdate = jest.fn(() => Promise.resolve({ id: 1 }));
        const documentService = {
          singleType: () => ({ update: singleTypeUpdate }),
        };

        const strapi = {
          documents: documentService,
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

        expect(singleTypeUpdate).toHaveBeenCalledWith({
          data: input,
          status: 'published',
        });
      });

      test('Delete data when entity is found', async () => {
        const singleTypeDelete = jest.fn(() => Promise.resolve({ id: 1 }));
        const documentService = {
          singleType: () => ({ delete: singleTypeDelete }),
        };

        const strapi = {
          documents: documentService,
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

        expect(singleTypeDelete).toHaveBeenCalledWith({
          status: 'published',
        });
      });
    });
  });
});
