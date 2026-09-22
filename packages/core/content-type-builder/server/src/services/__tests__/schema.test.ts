import type { UID } from '@strapi/types';

import { updateSchema } from '../schema';
import type { Schema as CTBSchema } from '../../controllers/validation/schema';

const builderServiceMock = {
  createContentType: jest.fn(),
  createComponent: jest.fn(),
  createContentTypeAttributes: jest.fn(),
  editContentType: jest.fn(),
  deleteContentType: jest.fn(),
  createComponentAttributes: jest.fn(),
  editComponent: jest.fn(),
  deleteComponent: jest.fn(),
  writeFiles: jest.fn().mockResolvedValue(undefined),
  contentTypes: new Map(),
  components: new Map(),
};

jest.spyOn(builderServiceMock.contentTypes, 'get');
jest.spyOn(builderServiceMock.components, 'get');

const apiHandlerServiceMock = {
  clear: jest.fn().mockResolvedValue(undefined),
  backup: jest.fn().mockResolvedValue(undefined),
  rollback: jest.fn().mockResolvedValue(undefined),
};

const contentTypeServiceMock = {
  generateAPI: jest.fn().mockResolvedValue(undefined),
};

const getServiceMock = jest.fn().mockImplementation((service) => {
  if (service === 'content-types') {
    return contentTypeServiceMock;
  }

  if (service === 'api-handler') {
    return apiHandlerServiceMock;
  }

  return {};
});

// Mocks
jest.mock('../schema-builder', () => {
  return jest.fn(() => builderServiceMock);
});

jest.mock('../../utils', () => ({
  getService: jest.fn((name) => getServiceMock(name)),
}));

describe('Content Type Builder - Schema service', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock strapi global
    global.strapi = {
      eventHub: {
        emit: jest.fn(),
      },
      log: {
        error: jest.fn(),
      },
    } as any;
  });

  describe('updateSchema', () => {
    it('should handle content type creation and emit event', async () => {
      const contentTypeUid: UID.ContentType = 'api::test.test';
      const mockContentType = {
        uid: contentTypeUid,
        kind: 'collectionType',
        info: { displayName: 'Test' },
        attributes: { title: { type: 'string' } },
      };

      jest.mocked(builderServiceMock.contentTypes.get).mockReturnValue(mockContentType);

      const schema: CTBSchema = {
        contentTypes: [
          {
            action: 'create',
            uid: contentTypeUid,
            displayName: 'Test',
            singularName: 'test',
            pluralName: 'tests',
            kind: 'collectionType',
            draftAndPublish: false,
            pluginOptions: {},
            options: {},
            attributes: [
              {
                action: 'create',
                name: 'title',
                properties: {
                  type: 'string',
                },
              },
            ],
          },
        ],
        components: [],
      };

      await updateSchema(schema);

      // Verify content type creation operations
      expect(builderServiceMock.createContentType).toHaveBeenCalledWith({
        action: 'create',
        uid: contentTypeUid,
        displayName: 'Test',
        singularName: 'test',
        pluralName: 'tests',
        kind: 'collectionType',
        draftAndPublish: false,
        pluginOptions: {},
        options: {},
        attributes: {},
      });

      expect(builderServiceMock.createContentTypeAttributes).toHaveBeenCalledWith(contentTypeUid, {
        title: { type: 'string' },
      });

      // Verify event emission
      expect(strapi.eventHub.emit).toHaveBeenCalledWith('content-type.create', {
        contentType: mockContentType,
      });

      // Verify writeFiles is called
      expect(builderServiceMock.writeFiles).toHaveBeenCalledTimes(1);

      // Verify the order: writeFiles should be called before events are emitted
      const writeFilesCallOrder = jest.mocked(builderServiceMock.writeFiles).mock
        .invocationCallOrder[0];
      const emitCallOrder = jest.mocked(strapi.eventHub.emit).mock.invocationCallOrder[0];
      expect(writeFilesCallOrder).toBeLessThan(emitCallOrder);
    });

    it('should handle content type update and emit event', async () => {
      const contentTypeUid = 'api::test.test';
      const mockContentType = {
        uid: contentTypeUid,
        kind: 'collectionType',
        info: { displayName: 'Test' },
        attributes: { title: { type: 'string' } },
      };

      jest.mocked(builderServiceMock.contentTypes.get).mockReturnValue(mockContentType);

      const schema: CTBSchema = {
        contentTypes: [
          {
            action: 'update',
            uid: contentTypeUid,
            displayName: 'Test',
            kind: 'collectionType',
            draftAndPublish: false,
            pluginOptions: {},
            options: {},
            attributes: [
              {
                action: 'update',
                name: 'title',
                properties: {
                  type: 'string',
                },
              },
            ],
          },
        ],
        components: [],
      };

      await updateSchema(schema);

      // Verify content type update operations
      expect(builderServiceMock.editContentType).toHaveBeenCalled();

      // Verify event emission
      expect(strapi.eventHub.emit).toHaveBeenCalledWith('content-type.update', {
        contentType: mockContentType,
      });

      // Verify writeFiles is called
      expect(builderServiceMock.writeFiles).toHaveBeenCalledTimes(1);
    });

    it('should handle content type deletion, backup, clear API and emit event', async () => {
      const contentTypeUid = 'api::test.test';
      const mockContentType = {
        uid: contentTypeUid,
        kind: 'collectionType',
        info: { displayName: 'Test' },
      };

      jest.mocked(builderServiceMock.contentTypes.get).mockReturnValue(mockContentType);

      const schema: CTBSchema = {
        contentTypes: [
          {
            action: 'delete',
            uid: contentTypeUid,
          },
        ],
        components: [],
      };

      await updateSchema(schema);

      // Verify content type deletion operations
      expect(builderServiceMock.deleteContentType).toHaveBeenCalledWith(contentTypeUid);

      // Verify API operations

      expect(apiHandlerServiceMock.backup).toHaveBeenCalledWith(contentTypeUid);
      expect(apiHandlerServiceMock.clear).toHaveBeenCalledWith(contentTypeUid);

      // Verify event emission
      expect(strapi.eventHub.emit).toHaveBeenCalledWith('content-type.delete', {
        contentType: mockContentType,
      });

      // Verify writeFiles is called after building operations but before API operations
      expect(builderServiceMock.writeFiles).toHaveBeenCalledTimes(1);

      const writeFilesCallOrder = jest.mocked(builderServiceMock.writeFiles).mock
        .invocationCallOrder[0];
      const clearCallOrder = jest.mocked(apiHandlerServiceMock.clear).mock.invocationCallOrder[0];
      expect(writeFilesCallOrder).toBeLessThan(clearCallOrder);
    });

    it('should handle component creation and emit event', async () => {
      const componentUid = 'component.test';
      const mockComponent = {
        uid: componentUid,
        category: 'default',
        info: { displayName: 'Test Component' },
        attributes: { field: { type: 'string' } },
      };

      jest.mocked(builderServiceMock.components.get).mockReturnValue(mockComponent);

      const schema: CTBSchema = {
        contentTypes: [],
        components: [
          {
            action: 'create',
            uid: componentUid,
            displayName: 'Test',
            category: 'default',
            pluginOptions: {},
            config: {},
            attributes: [
              {
                action: 'create',
                name: 'field',
                properties: {
                  type: 'string',
                },
              },
            ],
          },
        ],
      };

      await updateSchema(schema);

      // Verify component creation operations
      expect(builderServiceMock.createComponent).toHaveBeenCalled();
      expect(builderServiceMock.createComponentAttributes).toHaveBeenCalled();

      // Verify event emission
      expect(strapi.eventHub.emit).toHaveBeenCalledWith('component.create', {
        component: mockComponent,
      });

      // Verify writeFiles is called
      expect(builderServiceMock.writeFiles).toHaveBeenCalledTimes(1);
    });

    it('should handle component update and emit event', async () => {
      const componentUid = 'component.test';
      const mockComponent = {
        uid: componentUid,
        category: 'default',
        info: { displayName: 'Test Component' },
        attributes: { field: { type: 'string' } },
      };

      jest.mocked(builderServiceMock.components.get).mockReturnValue(mockComponent);

      const schema: CTBSchema = {
        contentTypes: [],
        components: [
          {
            action: 'update',
            uid: componentUid,
            displayName: 'Test',
            attributes: [
              {
                action: 'update',
                name: 'field',
                properties: {
                  type: 'string',
                },
              },
            ],
          },
        ],
      };

      await updateSchema(schema);

      // Verify component update operations
      expect(builderServiceMock.editComponent).toHaveBeenCalled();

      // Verify event emission
      expect(strapi.eventHub.emit).toHaveBeenCalledWith('component.update', {
        component: mockComponent,
      });

      // Verify writeFiles is called
      expect(builderServiceMock.writeFiles).toHaveBeenCalledTimes(1);
    });

    it('should handle component deletion and emit event', async () => {
      const componentUid = 'component.test';
      const mockComponent = {
        uid: componentUid,
        category: 'default',
        info: { displayName: 'Test Component' },
      };

      jest.mocked(builderServiceMock.components.get).mockReturnValue(mockComponent);

      const schema: CTBSchema = {
        contentTypes: [],
        components: [
          {
            action: 'delete',
            uid: componentUid,
          },
        ],
      };

      await updateSchema(schema);

      // Verify component deletion operations
      expect(builderServiceMock.deleteComponent).toHaveBeenCalledWith(componentUid);

      // Verify event emission
      expect(strapi.eventHub.emit).toHaveBeenCalledWith('component.delete', {
        component: mockComponent,
      });

      // Verify writeFiles is called
      expect(builderServiceMock.writeFiles).toHaveBeenCalledTimes(1);
    });

    it('should handle errors and rollback when API clearing fails', async () => {
      const contentTypeUid = 'api::test.test';
      const mockContentType = {
        uid: contentTypeUid,
        kind: 'collectionType',
        info: { displayName: 'Test' },
      };

      jest.mocked(builderServiceMock.contentTypes.get).mockReturnValue(mockContentType);

      // Setup API handler to fail on clear

      apiHandlerServiceMock.clear.mockRejectedValueOnce(new Error('API clear failed'));

      const schema: CTBSchema = {
        contentTypes: [
          {
            action: 'delete',
            uid: contentTypeUid,
          },
        ],
        components: [],
      };

      await updateSchema(schema);

      // Verify writeFiles is called before API operations
      expect(builderServiceMock.writeFiles).toHaveBeenCalledTimes(1);

      // Verify error handling
      expect(strapi.log.error).toHaveBeenCalled();

      // Verify rollback was called
      expect(apiHandlerServiceMock.rollback).toHaveBeenCalledWith(contentTypeUid);

      // Events should still be emitted even after an error
      expect(strapi.eventHub.emit).toHaveBeenCalledWith('content-type.delete', {
        contentType: mockContentType,
      });

      // Verify the execution order: writeFiles should be called before clear attempt
      const writeFilesCallOrder = jest.mocked(builderServiceMock.writeFiles).mock
        .invocationCallOrder[0];
      const clearCallOrder = jest.mocked(apiHandlerServiceMock.clear).mock.invocationCallOrder[0];
      expect(writeFilesCallOrder).toBeLessThan(clearCallOrder);
    });

    it('should write files once regardless of how many operations are performed', async () => {
      // Test with multiple operations
      const schema: CTBSchema = {
        contentTypes: [
          {
            action: 'create',
            uid: 'api::test.test',
            displayName: 'Test',
            singularName: 'test',
            pluralName: 'tests',
            kind: 'collectionType',
            draftAndPublish: false,
            pluginOptions: {},
            options: {},
            attributes: [
              {
                action: 'create',
                name: 'title',
                properties: { type: 'string' },
              },
            ],
          },
          {
            action: 'update',
            uid: 'api::existing.existing',
            displayName: 'Existing',
            kind: 'collectionType',
            draftAndPublish: false,
            pluginOptions: {},
            options: {},
            attributes: [
              {
                action: 'update',
                name: 'title',
                properties: { type: 'string' },
              },
            ],
          },
          {
            action: 'delete',
            uid: 'api::old.old',
          },
        ],
        components: [
          {
            action: 'create',
            uid: 'component.test',
            displayName: 'Test Component',
            category: 'default',
            pluginOptions: {},
            config: {},
            attributes: [
              {
                action: 'create',
                name: 'field',
                properties: { type: 'string' },
              },
            ],
          },
        ],
      };

      const mockTypes: any = {
        'api::test.test': { uid: 'api::test.test', kind: 'collectionType' },
        'api::existing.existing': { uid: 'api::existing.existing', kind: 'collectionType' },
        'api::old.old': { uid: 'api::old.old', kind: 'collectionType' },
      };

      // Set up mock return values
      jest.mocked(builderServiceMock.contentTypes.get).mockImplementation((uid) => mockTypes[uid]);

      jest
        .mocked(builderServiceMock.components.get)
        .mockReturnValue({ uid: 'component.test', category: 'default' });

      await updateSchema(schema);

      // Verify writeFiles is called exactly once despite multiple operations
      expect(builderServiceMock.writeFiles).toHaveBeenCalledTimes(1);

      // Verify all building operations were called
      expect(builderServiceMock.createContentType).toHaveBeenCalled();
      expect(builderServiceMock.editContentType).toHaveBeenCalled();
      expect(builderServiceMock.deleteContentType).toHaveBeenCalled();
      expect(builderServiceMock.createComponent).toHaveBeenCalled();

      // Verify all events were emitted (3 content types + 1 component = 4 events)
      expect(strapi.eventHub.emit).toHaveBeenCalledTimes(4);
    });

    it('should handle attribute deletion during content type update', async () => {
      const contentTypeUid = 'api::test.test';
      const mockContentType = {
        uid: contentTypeUid,
        kind: 'collectionType',
        info: { displayName: 'Test' },
        attributes: { title: { type: 'string' } },
      };

      jest.mocked(builderServiceMock.contentTypes.get).mockReturnValue(mockContentType);

      const schema: CTBSchema = {
        contentTypes: [
          {
            action: 'update',
            uid: contentTypeUid,
            displayName: 'Test',
            kind: 'collectionType',
            draftAndPublish: false,
            pluginOptions: {},
            options: {},
            attributes: [
              {
                name: 'title',
                action: 'delete',
              },
              {
                action: 'update',
                name: 'description',
                properties: {
                  type: 'text',
                },
              },
            ],
          },
        ],
        components: [],
      };

      await updateSchema(schema);

      // Verify the content type is edited with only non-deleted attributes
      expect(builderServiceMock.editContentType).toHaveBeenCalledWith({
        action: 'update',
        uid: contentTypeUid,
        displayName: 'Test',
        kind: 'collectionType',
        draftAndPublish: false,
        pluginOptions: {},
        options: {},
        attributes: {
          description: { type: 'text' },
        },
      });

      // Verify event emission
      expect(strapi.eventHub.emit).toHaveBeenCalledWith('content-type.update', {
        contentType: mockContentType,
      });

      // Verify writeFiles is called
      expect(builderServiceMock.writeFiles).toHaveBeenCalledTimes(1);
    });

    it('should handle attribute deletion during component update', async () => {
      const componentUid = 'component.test';
      const mockComponent = {
        uid: componentUid,
        category: 'default',
        info: { displayName: 'Test Component' },
        attributes: {
          field: { type: 'string' },
          oldField: { type: 'integer' },
        },
      };

      jest.mocked(builderServiceMock.components.get).mockReturnValue(mockComponent);

      const schema: CTBSchema = {
        contentTypes: [],
        components: [
          {
            action: 'update',
            uid: componentUid,
            displayName: 'Test Component',
            category: 'default',
            attributes: [
              {
                name: 'oldField',
                action: 'delete',
              },
              {
                action: 'update',
                name: 'field',
                properties: {
                  type: 'string',
                },
              },
              {
                action: 'create',
                name: 'newField',
                properties: {
                  type: 'boolean',
                },
              },
            ],
          },
        ],
      };

      await updateSchema(schema);

      // Verify component update operations with deleted attributes excluded
      expect(builderServiceMock.editComponent).toHaveBeenCalledWith({
        action: 'update',
        uid: componentUid,
        displayName: 'Test Component',
        category: 'default',
        attributes: {
          field: { type: 'string' },
          newField: { type: 'boolean' },
        },
      });

      // Verify event emission
      expect(strapi.eventHub.emit).toHaveBeenCalledWith('component.update', {
        component: mockComponent,
      });

      // Verify writeFiles is called
      expect(builderServiceMock.writeFiles).toHaveBeenCalledTimes(1);
    });

    it('should handle mixed attribute operations during update', async () => {
      const contentTypeUid = 'api::test.test';
      const mockContentType = {
        uid: contentTypeUid,
        kind: 'collectionType',
        info: { displayName: 'Test' },
        attributes: {
          title: { type: 'string' },
          counter: { type: 'integer' },
          published: { type: 'boolean' },
        },
      };

      jest.mocked(builderServiceMock.contentTypes.get).mockReturnValue(mockContentType);

      const schema: CTBSchema = {
        contentTypes: [
          {
            action: 'update',
            uid: contentTypeUid,
            displayName: 'Test',
            kind: 'collectionType',
            draftAndPublish: false,
            pluginOptions: {},
            options: {},
            attributes: [
              // Delete an attribute
              {
                name: 'counter',
                action: 'delete',
              },
              // Modify an attribute
              {
                action: 'update',
                name: 'title',
                properties: {
                  type: 'string',
                  required: true,
                  maxLength: 100,
                },
              },
              // Add a new attribute
              {
                action: 'create',
                name: 'description',
                properties: {
                  type: 'text',
                },
              },
              // Keep an attribute unchanged
              {
                action: 'update',
                name: 'published',
                properties: {
                  type: 'boolean',
                },
              },
            ],
          },
        ],
        components: [],
      };

      await updateSchema(schema);

      // Verify the content type is edited with the correct attribute set
      expect(builderServiceMock.editContentType).toHaveBeenCalledWith({
        action: 'update',
        uid: contentTypeUid,
        displayName: 'Test',
        kind: 'collectionType',
        draftAndPublish: false,
        pluginOptions: {},
        options: {},
        attributes: {
          title: { type: 'string', required: true, maxLength: 100 },
          description: { type: 'text' },
          published: { type: 'boolean' },
        },
      });

      // Verify writeFiles and event emission
      expect(builderServiceMock.writeFiles).toHaveBeenCalledTimes(1);
      expect(strapi.eventHub.emit).toHaveBeenCalledWith('content-type.update', {
        contentType: mockContentType,
      });
    });
  });
});
