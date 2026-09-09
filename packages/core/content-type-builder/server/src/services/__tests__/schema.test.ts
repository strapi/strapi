import type { UID } from '@strapi/types';

import { updateSchema, renameAttribute, renameComponent } from '../schema';
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

const migrationBuilderMock = {
  addRenameAttribute: jest.fn(),
  addRenameComponent: jest.fn(),
  hasChanges: jest.fn().mockReturnValue(true),
  getUnsupported: jest.fn().mockReturnValue([]),
  writeFiles: jest.fn().mockResolvedValue('/migrations/file.js'),
};

jest.mock('../migration-builder', () => ({
  createMigrationBuilder: jest.fn(() => migrationBuilderMock),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires, node/no-missing-require
const { createMigrationBuilder } = require('../migration-builder');

let renameMode = 'prompt';

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

// `renameAttribute` calls `getSchema`, which formats content types through these
// helpers. They are irrelevant to the rename wiring, so stub them out.
jest.mock('../content-types', () => ({
  getRestrictRelationsTo: jest.fn(() => null),
  isContentTypeVisible: jest.fn(() => true),
}));

describe('Content Type Builder - Schema service', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    renameMode = 'prompt';
    migrationBuilderMock.hasChanges.mockReturnValue(true);
    migrationBuilderMock.getUnsupported.mockReturnValue([]);

    // Mock strapi global
    global.strapi = {
      eventHub: {
        emit: jest.fn(),
      },
      log: {
        error: jest.fn(),
        warn: jest.fn(),
      },
      // The global unit-test setup wires `strapi.plugin = (name) => strapi.plugins[name]`,
      // so we expose the plugin config through `plugins` here.
      plugins: {
        'content-type-builder': {
          config: (_key: string, defaultValue: unknown) => renameMode ?? defaultValue,
        },
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

  describe('rename migrations', () => {
    const schemaWithRenames = (
      renames: Array<{ oldName: string; newName: string }>
    ): CTBSchema => ({
      contentTypes: [
        {
          action: 'update',
          uid: 'api::article.article',
          displayName: 'Article',
          kind: 'collectionType',
          draftAndPublish: false,
          pluginOptions: {},
          options: {},
          renames,
          attributes: [
            {
              action: 'update',
              name: 'heading',
              properties: { type: 'string' },
            } as any,
          ],
        } as any,
      ],
      components: [],
    });

    it('generates a rename migration from the ordered renames array', async () => {
      await updateSchema(schemaWithRenames([{ oldName: 'title', newName: 'heading' }]));

      expect(createMigrationBuilder).toHaveBeenCalledTimes(1);
      expect(migrationBuilderMock.addRenameAttribute).toHaveBeenCalledWith('api::article.article', {
        oldName: 'title',
        newName: 'heading',
      });
      expect(migrationBuilderMock.writeFiles).toHaveBeenCalledTimes(1);
    });

    it('forwards every rename hop in order (e.g. a user-routed swap)', async () => {
      await updateSchema(
        schemaWithRenames([
          { oldName: 'title', newName: 'tmp' },
          { oldName: 'subtitle', newName: 'title' },
          { oldName: 'tmp', newName: 'subtitle' },
        ])
      );

      expect(migrationBuilderMock.addRenameAttribute.mock.calls).toEqual([
        ['api::article.article', { oldName: 'title', newName: 'tmp' }],
        ['api::article.article', { oldName: 'subtitle', newName: 'title' }],
        ['api::article.article', { oldName: 'tmp', newName: 'subtitle' }],
      ]);
    });

    it('does not generate a migration when renameMigrations is never', async () => {
      renameMode = 'never';

      await updateSchema(schemaWithRenames([{ oldName: 'title', newName: 'heading' }]));

      expect(migrationBuilderMock.addRenameAttribute).not.toHaveBeenCalled();
      expect(migrationBuilderMock.writeFiles).not.toHaveBeenCalled();
    });

    it('ignores no-op renames where oldName equals newName', async () => {
      await updateSchema(schemaWithRenames([{ oldName: 'title', newName: 'title' }]));

      expect(migrationBuilderMock.addRenameAttribute).not.toHaveBeenCalled();
    });

    it('does not call writeFiles when the builder has no supported changes', async () => {
      migrationBuilderMock.hasChanges.mockReturnValue(false);

      await updateSchema(schemaWithRenames([{ oldName: 'title', newName: 'heading' }]));

      expect(migrationBuilderMock.addRenameAttribute).toHaveBeenCalledTimes(1);
      expect(migrationBuilderMock.writeFiles).not.toHaveBeenCalled();
    });

    it('warns when some renames are unsupported', async () => {
      migrationBuilderMock.getUnsupported.mockReturnValue([
        {
          uid: 'api::article.article',
          oldName: 'author',
          newName: 'writer',
          reason: 'unsupported-type',
        },
      ]);
      migrationBuilderMock.hasChanges.mockReturnValue(false);

      await updateSchema(schemaWithRenames([{ oldName: 'author', newName: 'writer' }]));

      expect(strapi.log.warn).toHaveBeenCalled();
    });

    it('collects renames from updated components as well', async () => {
      const schema: CTBSchema = {
        contentTypes: [],
        components: [
          {
            action: 'update',
            uid: 'default.seo',
            displayName: 'Seo',
            renames: [{ oldName: 'title', newName: 'metaTitle' }],
            attributes: [
              {
                action: 'update',
                name: 'metaTitle',
                properties: { type: 'string' },
              } as any,
            ],
          } as any,
        ],
      };

      await updateSchema(schema);

      expect(migrationBuilderMock.addRenameAttribute).toHaveBeenCalledWith('default.seo', {
        oldName: 'title',
        newName: 'metaTitle',
      });
    });

    it('collects a component-level rename when the category (uid) changes', async () => {
      const schema: CTBSchema = {
        contentTypes: [],
        components: [
          {
            action: 'update',
            uid: 'default.hero',
            displayName: 'Hero',
            // Moving the component to a new category changes its uid to
            // `shared.hero` (the name part is preserved).
            category: 'shared',
            attributes: [
              {
                action: 'update',
                name: 'title',
                properties: { type: 'string' },
              } as any,
            ],
          } as any,
        ],
      };

      await updateSchema(schema);

      expect(migrationBuilderMock.addRenameComponent).toHaveBeenCalledWith({
        oldUid: 'default.hero',
        newUid: 'shared.hero',
      });
    });

    it('does not collect a component rename when the category is unchanged', async () => {
      const schema: CTBSchema = {
        contentTypes: [],
        components: [
          {
            action: 'update',
            uid: 'default.hero',
            displayName: 'Hero',
            category: 'default',
            attributes: [],
          } as any,
        ],
      };

      await updateSchema(schema);

      expect(migrationBuilderMock.addRenameComponent).not.toHaveBeenCalled();
    });

    it('does not collect component renames when renameMigrations is never', async () => {
      renameMode = 'never';

      const schema: CTBSchema = {
        contentTypes: [],
        components: [
          {
            action: 'update',
            uid: 'default.hero',
            displayName: 'Hero',
            category: 'shared',
            attributes: [],
          } as any,
        ],
      };

      await updateSchema(schema);

      expect(migrationBuilderMock.addRenameComponent).not.toHaveBeenCalled();
      expect(migrationBuilderMock.writeFiles).not.toHaveBeenCalled();
    });
  });

  describe('renameAttribute (CLI single-step rename)', () => {
    const seedContentType = () => {
      (global.strapi as any).contentTypes = {
        'api::article.article': {
          uid: 'api::article.article',
          modelType: 'contentType',
          kind: 'collectionType',
          modelName: 'article',
          globalId: 'Article',
          collectionName: 'articles',
          info: { displayName: 'Article', singularName: 'article', pluralName: 'articles' },
          options: { draftAndPublish: false },
          pluginOptions: {},
          attributes: {
            title: { type: 'string' },
            age: { type: 'integer' },
          },
        },
      };
      (global.strapi as any).components = {};
    };

    it('edits the schema with the renamed key and forwards the rename hop', async () => {
      seedContentType();

      await renameAttribute('api::article.article', 'title', 'heading');

      expect(migrationBuilderMock.addRenameAttribute).toHaveBeenCalledWith('api::article.article', {
        oldName: 'title',
        newName: 'heading',
      });

      expect(builderServiceMock.editContentType).toHaveBeenCalledTimes(1);
      const editArg = jest.mocked(builderServiceMock.editContentType).mock.calls[0][0] as any;
      expect(editArg.attributes).toHaveProperty('heading');
      expect(editArg.attributes).not.toHaveProperty('title');
      expect(editArg.attributes).toHaveProperty('age');

      expect(builderServiceMock.writeFiles).toHaveBeenCalledTimes(1);
    });

    it('does not generate a migration when renameMigrations is never', async () => {
      renameMode = 'never';
      seedContentType();

      await renameAttribute('api::article.article', 'title', 'heading');

      expect(migrationBuilderMock.addRenameAttribute).not.toHaveBeenCalled();
      expect(builderServiceMock.editContentType).toHaveBeenCalledTimes(1);
    });

    it('throws when the uid is unknown', async () => {
      seedContentType();

      await expect(renameAttribute('api::missing.missing', 'title', 'heading')).rejects.toThrow(
        /No content-type or component/
      );
    });

    it('throws when the old attribute does not exist', async () => {
      seedContentType();

      await expect(renameAttribute('api::article.article', 'missing', 'heading')).rejects.toThrow(
        /does not exist/
      );
    });

    it('throws when the new attribute name is already taken', async () => {
      seedContentType();

      await expect(renameAttribute('api::article.article', 'title', 'age')).rejects.toThrow(
        /already exists/
      );
    });

    it('throws when renaming to the same name', async () => {
      seedContentType();

      await expect(renameAttribute('api::article.article', 'title', 'title')).rejects.toThrow(
        /itself/
      );
    });
  });

  describe('renameComponent (CLI single-step component move)', () => {
    const seedComponent = () => {
      (global.strapi as any).contentTypes = {};
      (global.strapi as any).components = {
        'default.hero': {
          uid: 'default.hero',
          modelType: 'component',
          modelName: 'hero',
          globalId: 'ComponentDefaultHero',
          collectionName: 'components_default_heroes',
          category: 'default',
          info: { displayName: 'Hero', icon: 'star' },
          pluginOptions: {},
          attributes: {
            title: { type: 'string' },
          },
        },
      };
    };

    it('moves the component to a new category and forwards the uid change', async () => {
      seedComponent();

      await renameComponent('default.hero', 'shared');

      expect(migrationBuilderMock.addRenameComponent).toHaveBeenCalledWith({
        oldUid: 'default.hero',
        newUid: 'shared.hero',
      });

      expect(builderServiceMock.editComponent).toHaveBeenCalledTimes(1);
      const editArg = jest.mocked(builderServiceMock.editComponent).mock.calls[0][0] as any;
      expect(editArg.uid).toBe('default.hero');
      expect(editArg.category).toBe('shared');

      expect(builderServiceMock.writeFiles).toHaveBeenCalledTimes(1);
    });

    it('does not generate a migration when renameMigrations is never', async () => {
      renameMode = 'never';
      seedComponent();

      await renameComponent('default.hero', 'shared');

      expect(migrationBuilderMock.addRenameComponent).not.toHaveBeenCalled();
      expect(builderServiceMock.editComponent).toHaveBeenCalledTimes(1);
    });

    it('throws when the component uid is unknown', async () => {
      seedComponent();

      await expect(renameComponent('default.missing', 'shared')).rejects.toThrow(
        /No component found/
      );
    });

    it('throws when the component is already in the target category', async () => {
      seedComponent();

      await expect(renameComponent('default.hero', 'default')).rejects.toThrow(/already in/);
    });

    it('throws when a component already exists in the target category', async () => {
      seedComponent();
      (global.strapi as any).components['shared.hero'] = {
        uid: 'shared.hero',
        category: 'shared',
        info: { displayName: 'Hero' },
        attributes: {},
      };

      await expect(renameComponent('default.hero', 'shared')).rejects.toThrow(/already exists/);
    });
  });
});
