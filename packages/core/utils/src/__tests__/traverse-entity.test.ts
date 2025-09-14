import traverseEntity from '../traverse-entity';
import type { VisitorUtils } from '../traverse-entity';
import type { Model } from '../types';

// Mock schemas for testing
const createBaseSchema = (attributes = {}): Model => ({
  modelType: 'contentType',
  uid: 'api::test.test',
  kind: 'collectionType',
  info: {
    displayName: 'Test',
    singularName: 'test',
    pluralName: 'tests',
  },
  attributes,
});

const createComponentSchema = (attributes = {}): Model => ({
  modelType: 'component',
  uid: 'default.test-component',
  info: {
    displayName: 'Test Component',
  },
  attributes,
});

const createMediaSchema = (): Model => ({
  modelType: 'contentType',
  uid: 'plugin::upload.file',
  kind: 'collectionType',
  info: {
    displayName: 'File',
    singularName: 'file',
    pluralName: 'files',
  },
  attributes: {
    name: { type: 'string' },
    url: { type: 'string' },
    mime: { type: 'string' },
  },
});

describe('traverse-entity', () => {
  let mockGetModel: jest.Mock;
  let mockVisitor: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetModel = jest.fn();
    mockVisitor = jest.fn();
  });

  describe('Basic traversal behavior', () => {
    test('should clone entity and not mutate original', async () => {
      const schema = createBaseSchema({
        title: { type: 'string' },
      });
      const entity = { id: 1, title: 'Test' };

      const result = await traverseEntity(mockVisitor, { schema, getModel: mockGetModel }, entity);

      expect(result).toEqual(entity);
      expect(result).not.toBe(entity); // Different object reference
      expect(entity).toEqual({ id: 1, title: 'Test' }); // Original unchanged
    });

    test('should call visitor for each attribute', async () => {
      const schema = createBaseSchema({
        title: { type: 'string' },
        description: { type: 'text' },
        count: { type: 'integer' },
      });
      const entity = { id: 1, title: 'Test', description: 'Description', count: 5 };

      await traverseEntity(mockVisitor, { schema, getModel: mockGetModel }, entity);

      expect(mockVisitor).toHaveBeenCalledTimes(4); // id, title, description, count
    });

    test('should return entity unchanged for null schema', async () => {
      const entity = { id: 1, title: 'Test' };

      const result = await traverseEntity(
        mockVisitor,
        { schema: null as any, getModel: mockGetModel },
        entity
      );

      expect(result).toBe(entity);
      expect(mockVisitor).not.toHaveBeenCalled();
    });

    test('should return entity unchanged for non-object entity', async () => {
      const schema = createBaseSchema();

      const result1 = await traverseEntity(mockVisitor, { schema, getModel: mockGetModel }, null);
      const result2 = await traverseEntity(
        mockVisitor,
        { schema, getModel: mockGetModel },
        'string' as any
      );
      const result3 = await traverseEntity(
        mockVisitor,
        { schema, getModel: mockGetModel },
        123 as any
      );

      expect(result1).toBe(null);
      expect(result2).toBe('string');
      expect(result3).toBe(123);
      expect(mockVisitor).not.toHaveBeenCalled();
    });
  });

  describe('Path tracking', () => {
    test('should build raw path correctly', async () => {
      const schema = createBaseSchema({
        level1: { type: 'string' },
      });
      const entity = { level1: 'value' };

      await traverseEntity(mockVisitor, { schema, getModel: mockGetModel }, entity);

      expect(mockVisitor).toHaveBeenCalledWith(
        expect.objectContaining({
          path: expect.objectContaining({
            raw: 'level1',
            attribute: 'level1',
            rawWithIndices: 'level1',
          }),
        }),
        expect.any(Object)
      );
    });

    test('should inherit path from parent', async () => {
      const schema = createBaseSchema({
        field: { type: 'string' },
      });
      const entity = { field: 'value' };
      const path = { raw: 'parent', attribute: 'parent', rawWithIndices: 'parent' };

      await traverseEntity(mockVisitor, { schema, path, getModel: mockGetModel }, entity);

      expect(mockVisitor).toHaveBeenCalledWith(
        expect.objectContaining({
          path: expect.objectContaining({
            raw: 'parent.field',
            attribute: 'parent.field',
            rawWithIndices: 'parent.field',
          }),
        }),
        expect.any(Object)
      );
    });

    test('should not build attribute path for fields not in schema', async () => {
      const schema = createBaseSchema({
        validField: { type: 'string' },
      });
      const entity = { validField: 'value', extraField: 'extra' };

      await traverseEntity(mockVisitor, { schema, getModel: mockGetModel }, entity);

      const calls = mockVisitor.mock.calls;
      const validFieldCall = calls.find((call) => call[0].key === 'validField');
      const extraFieldCall = calls.find((call) => call[0].key === 'extraField');

      expect(validFieldCall[0].path.attribute).toBe('validField');
      expect(extraFieldCall[0].path.attribute).toBe(null);
    });
  });

  describe('Visitor utils', () => {
    test('should provide remove and set methods', async () => {
      const schema = createBaseSchema({
        field: { type: 'string' },
      });
      const entity = { field: 'value', extra: 'extra' };

      let capturedUtils: VisitorUtils;
      mockVisitor.mockImplementation((options, utils) => {
        if (options.key === 'field') {
          capturedUtils = utils;
        }
      });

      await traverseEntity(mockVisitor, { schema, getModel: mockGetModel }, entity);

      expect(capturedUtils!).toHaveProperty('remove');
      expect(capturedUtils!).toHaveProperty('set');
      expect(typeof capturedUtils!.remove).toBe('function');
      expect(typeof capturedUtils!.set).toBe('function');
    });

    test('should allow visitor to remove fields', async () => {
      const schema = createBaseSchema({
        keep: { type: 'string' },
        remove: { type: 'string' },
      });
      const entity = { keep: 'keep', remove: 'remove' };

      mockVisitor.mockImplementation((options, utils) => {
        if (options.key === 'remove') {
          utils.remove(options.key);
        }
      });

      const result = await traverseEntity(mockVisitor, { schema, getModel: mockGetModel }, entity);

      expect(result).toEqual({ keep: 'keep' });
      expect(result).not.toHaveProperty('remove');
    });

    test('should allow visitor to set field values', async () => {
      const schema = createBaseSchema({
        field: { type: 'string' },
      });
      const entity = { field: 'original' };

      mockVisitor.mockImplementation((options, utils) => {
        if (options.key === 'field') {
          utils.set(options.key, 'modified');
        }
      });

      const result = await traverseEntity(mockVisitor, { schema, getModel: mockGetModel }, entity);

      expect(result.field).toBe('modified');
    });
  });

  describe('Relational attributes', () => {
    test('should traverse oneToOne relation', async () => {
      const relatedSchema = createBaseSchema({
        name: { type: 'string' },
      });

      const schema = createBaseSchema({
        relation: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'api::related.related',
        },
      });

      mockGetModel.mockReturnValue(relatedSchema);

      const entity = {
        relation: { id: 1, name: 'Related' },
      };

      await traverseEntity(mockVisitor, { schema, getModel: mockGetModel }, entity);

      expect(mockGetModel).toHaveBeenCalledWith('api::related.related');
      expect(mockVisitor).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'name',
          schema: relatedSchema,
        }),
        expect.any(Object)
      );
    });

    test('should traverse oneToMany relation array', async () => {
      const relatedSchema = createBaseSchema({
        name: { type: 'string' },
      });

      const schema = createBaseSchema({
        relations: {
          type: 'relation',
          relation: 'oneToMany',
          target: 'api::related.related',
        },
      });

      mockGetModel.mockReturnValue(relatedSchema);

      const entity = {
        relations: [
          { id: 1, name: 'First' },
          { id: 2, name: 'Second' },
        ],
      };

      await traverseEntity(mockVisitor, { schema, getModel: mockGetModel }, entity);

      expect(mockGetModel).toHaveBeenCalledWith('api::related.related');

      // Should call visitor for array items with proper indices
      const calls = mockVisitor.mock.calls.filter((call) => call[0].key === 'name');
      expect(calls).toHaveLength(2);

      // Check rawWithIndices includes array indices
      const paths = calls.map((call) => call[0].path.rawWithIndices);
      expect(paths).toContain('relations.0.name');
      expect(paths).toContain('relations.1.name');
    });

    test('should traverse morphTo relation', async () => {
      const targetSchema = createBaseSchema({
        title: { type: 'string' },
      });

      const schema = createBaseSchema({
        morphRelation: {
          type: 'relation',
          relation: 'morphToOne',
        },
      });

      mockGetModel.mockReturnValue(targetSchema);

      const entity = {
        morphRelation: {
          __type: 'api::target.target',
          id: 1,
          title: 'Morph Target',
        },
      };

      await traverseEntity(mockVisitor, { schema, getModel: mockGetModel }, entity);

      expect(mockGetModel).toHaveBeenCalledWith('api::target.target');
      expect(mockVisitor).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'title',
          schema: targetSchema,
        }),
        expect.any(Object)
      );
    });

    test('should skip null relations', async () => {
      const schema = createBaseSchema({
        relation: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'api::related.related',
        },
      });

      const entity = {
        relation: null,
      };

      await traverseEntity(mockVisitor, { schema, getModel: mockGetModel }, entity);

      expect(mockGetModel).not.toHaveBeenCalled();
      // Should still call visitor for the relation field itself, but not traverse further
      expect(mockVisitor).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'relation',
          value: null,
        }),
        expect.any(Object)
      );
    });
  });

  describe('Media attributes', () => {
    test('should traverse media attribute', async () => {
      const mediaSchema = createMediaSchema();

      const schema = createBaseSchema({
        image: { type: 'media' },
      });

      mockGetModel.mockReturnValue(mediaSchema);

      const entity = {
        image: { id: 1, name: 'image.jpg', url: '/uploads/image.jpg' },
      };

      await traverseEntity(mockVisitor, { schema, getModel: mockGetModel }, entity);

      expect(mockGetModel).toHaveBeenCalledWith('plugin::upload.file');
      expect(mockVisitor).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'name',
          schema: mediaSchema,
        }),
        expect.any(Object)
      );
    });

    test('should traverse media array', async () => {
      const mediaSchema = createMediaSchema();

      const schema = createBaseSchema({
        images: { type: 'media' },
      });

      mockGetModel.mockReturnValue(mediaSchema);

      const entity = {
        images: [
          { id: 1, name: 'first.jpg' },
          { id: 2, name: 'second.jpg' },
        ],
      };

      await traverseEntity(mockVisitor, { schema, getModel: mockGetModel }, entity);

      const nameCalls = mockVisitor.mock.calls.filter((call) => call[0].key === 'name');
      expect(nameCalls).toHaveLength(2);

      const paths = nameCalls.map((call) => call[0].path.rawWithIndices);
      expect(paths).toContain('images.0.name');
      expect(paths).toContain('images.1.name');
    });
  });

  describe('Component attributes', () => {
    test('should traverse component attribute', async () => {
      const componentSchema = createComponentSchema({
        text: { type: 'string' },
        number: { type: 'integer' },
      });

      const schema = createBaseSchema({
        component: {
          type: 'component',
          component: 'default.test-component',
        },
      });

      mockGetModel.mockReturnValue(componentSchema);

      const entity = {
        component: { text: 'Hello', number: 42 },
      };

      await traverseEntity(mockVisitor, { schema, getModel: mockGetModel }, entity);

      expect(mockGetModel).toHaveBeenCalledWith('default.test-component');
      expect(mockVisitor).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'text',
          schema: componentSchema,
        }),
        expect.any(Object)
      );
      expect(mockVisitor).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'number',
          schema: componentSchema,
        }),
        expect.any(Object)
      );
    });

    test('should traverse repeatable component', async () => {
      const componentSchema = createComponentSchema({
        title: { type: 'string' },
      });

      const schema = createBaseSchema({
        components: {
          type: 'component',
          component: 'default.test-component',
          repeatable: true,
        },
      });

      mockGetModel.mockReturnValue(componentSchema);

      const entity = {
        components: [{ title: 'First' }, { title: 'Second' }],
      };

      await traverseEntity(mockVisitor, { schema, getModel: mockGetModel }, entity);

      const titleCalls = mockVisitor.mock.calls.filter((call) => call[0].key === 'title');
      expect(titleCalls).toHaveLength(2);

      const paths = titleCalls.map((call) => call[0].path.rawWithIndices);
      expect(paths).toContain('components.0.title');
      expect(paths).toContain('components.1.title');
    });
  });

  describe('Dynamic zone attributes', () => {
    test('should traverse dynamic zone entries', async () => {
      const componentSchema1 = createComponentSchema({
        text: { type: 'string' },
      });

      const componentSchema2 = createComponentSchema({
        number: { type: 'integer' },
      });

      const schema = createBaseSchema({
        dynamicZone: {
          type: 'dynamiczone',
          components: ['default.text-component', 'default.number-component'],
        },
      });

      mockGetModel.mockReturnValueOnce(componentSchema1).mockReturnValueOnce(componentSchema2);

      const entity = {
        dynamicZone: [
          { __component: 'default.text-component', text: 'Hello' },
          { __component: 'default.number-component', number: 123 },
        ],
      };

      await traverseEntity(mockVisitor, { schema, getModel: mockGetModel }, entity);

      expect(mockGetModel).toHaveBeenCalledWith('default.text-component');
      expect(mockGetModel).toHaveBeenCalledWith('default.number-component');

      expect(mockVisitor).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'text',
          schema: componentSchema1,
        }),
        expect.any(Object)
      );

      expect(mockVisitor).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'number',
          schema: componentSchema2,
        }),
        expect.any(Object)
      );
    });

    test('should handle empty dynamic zone', async () => {
      const schema = createBaseSchema({
        dynamicZone: {
          type: 'dynamiczone',
          components: ['default.test-component'],
        },
      });

      const entity = {
        dynamicZone: [],
      };

      const result = await traverseEntity(mockVisitor, { schema, getModel: mockGetModel }, entity);

      expect(result.dynamicZone).toEqual([]);
      expect(mockGetModel).not.toHaveBeenCalled();
    });
  });

  describe('Array handling and index tracking', () => {
    test('should track array indices in rawWithIndices path', async () => {
      const relatedSchema = createBaseSchema({
        name: { type: 'string' },
      });

      const schema = createBaseSchema({
        items: {
          type: 'relation',
          relation: 'oneToMany',
          target: 'api::related.related',
        },
      });

      mockGetModel.mockReturnValue(relatedSchema);

      const entity = {
        items: [{ name: 'Item 1' }, { name: 'Item 2' }, { name: 'Item 3' }],
      };

      await traverseEntity(mockVisitor, { schema, getModel: mockGetModel }, entity);

      const nameCalls = mockVisitor.mock.calls.filter((call) => call[0].key === 'name');
      const indices = nameCalls.map((call) => {
        const match = call[0].path.rawWithIndices.match(/items\.(\d+)\.name/);
        return match ? parseInt(match[1], 10) : -1;
      });

      expect(indices).toEqual([0, 1, 2]);
    });

    test('should preserve rawWithIndices when no arrays in path', async () => {
      const componentSchema = createComponentSchema({
        field: { type: 'string' },
      });

      const schema = createBaseSchema({
        component: {
          type: 'component',
          component: 'default.test-component',
        },
      });

      mockGetModel.mockReturnValue(componentSchema);

      const entity = {
        component: { field: 'value' },
      };

      await traverseEntity(mockVisitor, { schema, getModel: mockGetModel }, entity);

      const fieldCall = mockVisitor.mock.calls.find((call) => call[0].key === 'field');
      expect(fieldCall[0].path.raw).toBe('component.field');
      expect(fieldCall[0].path.rawWithIndices).toBe('component.field');
    });
  });

  describe('Parent context', () => {
    test('should pass parent context to nested traversals', async () => {
      const componentSchema = createComponentSchema({
        field: { type: 'string' },
      });

      const schema = createBaseSchema({
        component: {
          type: 'component',
          component: 'default.test-component',
        },
      });

      mockGetModel.mockReturnValue(componentSchema);

      const entity = {
        component: { field: 'value' },
      };

      await traverseEntity(mockVisitor, { schema, getModel: mockGetModel }, entity);

      const fieldCall = mockVisitor.mock.calls.find((call) => call[0].key === 'field');
      expect(fieldCall[0].parent).toEqual({
        schema,
        key: 'component',
        attribute: { type: 'component', component: 'default.test-component' },
        path: { raw: 'component', attribute: 'component', rawWithIndices: 'component' },
      });
    });
  });

  describe('Async behavior', () => {
    test('should handle async visitor functions', async () => {
      const schema = createBaseSchema({
        field: { type: 'string' },
      });

      const entity = { field: 'value' };

      const order: string[] = [];

      mockVisitor.mockImplementation(async (options) => {
        order.push(`start-${options.key}`);
        await new Promise<void>((resolve) => {
          setTimeout(resolve, 10);
        });
        order.push(`end-${options.key}`);
      });

      await traverseEntity(mockVisitor, { schema, getModel: mockGetModel }, entity);

      expect(order).toEqual(['start-field', 'end-field']);
    });

    test('should wait for nested async traversals', async () => {
      const componentSchema = createComponentSchema({
        nested: { type: 'string' },
      });

      const schema = createBaseSchema({
        component: {
          type: 'component',
          component: 'default.test-component',
        },
      });

      mockGetModel.mockReturnValue(componentSchema);

      const entity = {
        component: { nested: 'value' },
      };

      const order: string[] = [];

      mockVisitor.mockImplementation(async (options) => {
        order.push(`start-${options.key}`);
        await new Promise<void>((resolve) => {
          setTimeout(resolve, 5);
        });
        order.push(`end-${options.key}`);
      });

      await traverseEntity(mockVisitor, { schema, getModel: mockGetModel }, entity);

      // All operations should complete in order
      expect(order).toContain('start-component');
      expect(order).toContain('end-component');
      expect(order).toContain('start-nested');
      expect(order).toContain('end-nested');
    });
  });

  describe('Edge cases', () => {
    test('should handle entities with no matching attributes', async () => {
      const schema = createBaseSchema({
        knownField: { type: 'string' },
      });

      const entity = {
        unknownField1: 'value1',
        unknownField2: 'value2',
      };

      const result = await traverseEntity(mockVisitor, { schema, getModel: mockGetModel }, entity);

      expect(result).toEqual(entity);
      expect(mockVisitor).toHaveBeenCalledTimes(2); // Called for unknown fields too
    });

    test('should handle deeply nested structures', async () => {
      const deepComponentSchema = createComponentSchema({
        deepField: { type: 'string' },
      });

      const componentSchema = createComponentSchema({
        nested: {
          type: 'component',
          component: 'default.deep-component',
        },
      });

      const schema = createBaseSchema({
        component: {
          type: 'component',
          component: 'default.component',
        },
      });

      mockGetModel.mockReturnValueOnce(componentSchema).mockReturnValueOnce(deepComponentSchema);

      const entity = {
        component: {
          nested: {
            deepField: 'deep value',
          },
        },
      };

      await traverseEntity(mockVisitor, { schema, getModel: mockGetModel }, entity);

      const deepFieldCall = mockVisitor.mock.calls.find((call) => call[0].key === 'deepField');
      expect(deepFieldCall).toBeDefined();
      expect(deepFieldCall[0].path.raw).toBe('component.nested.deepField');
    });

    test('should handle mixed null and valid values in arrays', async () => {
      const relatedSchema = createBaseSchema({
        name: { type: 'string' },
      });

      const schema = createBaseSchema({
        relations: {
          type: 'relation',
          relation: 'oneToMany',
          target: 'api::related.related',
        },
      });

      mockGetModel.mockReturnValue(relatedSchema);

      const entity = {
        relations: [{ id: 1, name: 'Valid' }, null, { id: 3, name: 'Also Valid' }],
      };

      const result = await traverseEntity(mockVisitor, { schema, getModel: mockGetModel }, entity);

      expect(result.relations).toHaveLength(3);
      expect(result.relations[0]).toEqual({ id: 1, name: 'Valid' });
      expect(result.relations[1]).toBe(null);
      expect(result.relations[2]).toEqual({ id: 3, name: 'Also Valid' });
    });
  });

  describe('Curried function export', () => {
    test('should work with curried syntax', async () => {
      const schema = createBaseSchema({
        field: { type: 'string' },
      });
      const entity = { field: 'value' };

      // Test partial application
      const traverseWithVisitor = traverseEntity(mockVisitor);
      const traverseWithOptions = traverseWithVisitor({ schema, getModel: mockGetModel });
      const result = await traverseWithOptions(entity);

      expect(result).toEqual(entity);
      expect(mockVisitor).toHaveBeenCalled();
    });

    test('should work with full application', async () => {
      const schema = createBaseSchema({
        field: { type: 'string' },
      });
      const entity = { field: 'value' };

      const result = await traverseEntity(mockVisitor, { schema, getModel: mockGetModel }, entity);

      expect(result).toEqual(entity);
      expect(mockVisitor).toHaveBeenCalled();
    });
  });
});
