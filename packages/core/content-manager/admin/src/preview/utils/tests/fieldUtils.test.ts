import {
  parsePathWithIndices,
  getAttributeSchemaFromPath,
  parseFieldMetaData,
  PreviewFieldError,
} from '../fieldUtils';

import type { Schema, Modules } from '@strapi/types';

describe('fieldUtils', () => {
  describe('parsePathWithIndices', () => {
    it('should parse a simple path without indices', () => {
      const result = parsePathWithIndices('field');
      expect(result).toEqual([{ name: 'field' }]);
    });

    it('should parse a nested path without indices', () => {
      const result = parsePathWithIndices('field.subfield.name');
      expect(result).toEqual([{ name: 'field' }, { name: 'subfield' }, { name: 'name' }]);
    });

    it('should parse a path with array indices', () => {
      const result = parsePathWithIndices('components.4.field');
      expect(result).toEqual([{ name: 'components', index: 4 }, { name: 'field' }]);
    });

    it('should parse a complex path with multiple indices', () => {
      const result = parsePathWithIndices('components.4.field.relations.2.name');
      expect(result).toEqual([
        { name: 'components', index: 4 },
        { name: 'field' },
        { name: 'relations', index: 2 },
        { name: 'name' },
      ]);
    });

    it('should handle single numeric part correctly', () => {
      const result = parsePathWithIndices('0');
      // Since '0' is parsed as a numeric index with no field name, it gets filtered out
      expect(result).toEqual([]);
    });

    it('should handle empty string', () => {
      const result = parsePathWithIndices('');
      expect(result).toEqual([{ name: '' }]);
    });

    it('should handle path starting with index', () => {
      const result = parsePathWithIndices('0.field');
      // Since '0' is parsed as a numeric index, it gets attached to the next field
      expect(result).toEqual([{ name: 'field' }]);
    });

    it('should handle consecutive indices correctly', () => {
      const result = parsePathWithIndices('field.0.1.name');
      // The algorithm attaches indices to the previous field, so 0 goes to 'field' and 1 goes to 'field' as well (overwriting)
      expect(result).toEqual([{ name: 'field', index: 1 }, { name: 'name' }]);
    });
  });

  describe('getAttributeSchemaFromPath', () => {
    const mockTextAttribute: Schema.Attribute.Text = {
      type: 'text',
    };

    const mockComponentAttributes = {
      title: mockTextAttribute,
      description: mockTextAttribute,
    };

    // Simplified mock objects that satisfy the function's needs without complex typing
    const mockComponents: any = {
      'basic.text-component': {
        attributes: mockComponentAttributes,
      },
    };

    const mockRepeatableComponent = {
      type: 'component' as const,
      repeatable: true,
      component: 'basic.text-component' as any,
    };

    const mockNonRepeatableComponent: Schema.Attribute.Component = {
      type: 'component',
      repeatable: false,
      component: 'basic.text-component' as any,
    };

    const mockDynamicZone: Schema.Attribute.DynamicZone = {
      type: 'dynamiczone',
      components: ['basic.text-component' as any],
    };

    const mockRelation: Schema.Attribute.Relation = {
      type: 'relation',
      relation: 'oneToMany',
      target: 'api::article.article' as any,
    };

    const mockSchema: any = {
      attributes: {
        title: mockTextAttribute,
        components: mockRepeatableComponent,
        singleComponent: mockNonRepeatableComponent,
        dynamicZone: mockDynamicZone,
        relation: mockRelation,
      },
    };

    const mockDocument: Modules.Documents.AnyDocument = {
      id: 1,
      documentId: 'doc-1',
      title: 'Test Article',
      components: [
        {
          __component: 'basic.text-component',
          title: 'Component Title',
          description: 'Component Description',
        },
      ],
      singleComponent: {
        __component: 'basic.text-component',
        title: 'Single Component Title',
        description: 'Single Component Description',
      },
      dynamicZone: [
        { __component: 'basic.text-component', title: 'DZ Title', description: 'DZ Description' },
      ],
      relation: { id: 1, title: 'Related Article' },
      locale: null,
      status: 'published',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      publishedAt: '2024-01-01T00:00:00.000Z',
      createdBy: null,
      updatedBy: null,
    };

    it('should return attribute for simple field path', () => {
      const result = getAttributeSchemaFromPath({
        path: 'title',
        schema: mockSchema,
        components: mockComponents,
        document: mockDocument,
      });

      expect(result).toEqual(mockTextAttribute);
    });

    it('should return attribute for repeatable component field with index', () => {
      const result = getAttributeSchemaFromPath({
        path: 'components.0.title',
        schema: mockSchema,
        components: mockComponents,
        document: mockDocument,
      });

      expect(result).toEqual(mockTextAttribute);
    });

    it('should return attribute for non-repeatable component field', () => {
      const result = getAttributeSchemaFromPath({
        path: 'singleComponent.title',
        schema: mockSchema,
        components: mockComponents,
        document: mockDocument,
      });

      expect(result).toEqual(mockTextAttribute);
    });

    it('should return attribute for dynamic zone field with index', () => {
      const result = getAttributeSchemaFromPath({
        path: 'dynamicZone.0.title',
        schema: mockSchema,
        components: mockComponents,
        document: mockDocument,
      });

      expect(result).toEqual(mockTextAttribute);
    });

    it('should throw error for invalid field path', () => {
      expect(() => {
        getAttributeSchemaFromPath({
          path: 'nonexistent',
          schema: mockSchema,
          components: mockComponents,
          document: mockDocument,
        });
      }).toThrow(PreviewFieldError);

      try {
        getAttributeSchemaFromPath({
          path: 'nonexistent',
          schema: mockSchema,
          components: mockComponents,
          document: mockDocument,
        });
      } catch (error: any) {
        expect(error.messageKey).toBe('INVALID_FIELD_PATH');
      }
    });

    it('should throw error for relation field', () => {
      expect(() => {
        getAttributeSchemaFromPath({
          path: 'relation',
          schema: mockSchema,
          components: mockComponents,
          document: mockDocument,
        });
      }).toThrow(PreviewFieldError);

      try {
        getAttributeSchemaFromPath({
          path: 'relation',
          schema: mockSchema,
          components: mockComponents,
          document: mockDocument,
        });
      } catch (error: any) {
        expect(error.messageKey).toBe('RELATIONS_NOT_HANDLED');
      }
    });

    it('should throw error for repeatable component without index', () => {
      expect(() => {
        getAttributeSchemaFromPath({
          path: 'components.title',
          schema: mockSchema,
          components: mockComponents,
          document: mockDocument,
        });
      }).toThrow(PreviewFieldError);

      try {
        getAttributeSchemaFromPath({
          path: 'components.title',
          schema: mockSchema,
          components: mockComponents,
          document: mockDocument,
        });
      } catch (error: any) {
        expect(error.messageKey).toBe('INVALID_FIELD_PATH');
      }
    });

    it('should throw error for dynamic zone without index', () => {
      expect(() => {
        getAttributeSchemaFromPath({
          path: 'dynamicZone.title',
          schema: mockSchema,
          components: mockComponents,
          document: mockDocument,
        });
      }).toThrow(PreviewFieldError);

      try {
        getAttributeSchemaFromPath({
          path: 'dynamicZone.title',
          schema: mockSchema,
          components: mockComponents,
          document: mockDocument,
        });
      } catch (error: any) {
        expect(error.messageKey).toBe('INVALID_FIELD_PATH');
      }
    });

    it('should handle nested component paths', () => {
      const nestedComponentAttributes = {
        nested: mockNonRepeatableComponent,
      };

      const nestedComponents = {
        ...mockComponents,
        'basic.nested-component': {
          attributes: nestedComponentAttributes,
        },
      };

      const nestedSchema = {
        attributes: {
          ...mockSchema.attributes,
          nestedComp: {
            type: 'component' as const,
            repeatable: false,
            component: 'basic.nested-component' as any,
          },
        },
      };

      const nestedDocument = {
        ...mockDocument,
        nestedComp: {
          __component: 'basic.nested-component',
          nested: {
            __component: 'basic.text-component',
            title: 'Nested Title',
            description: 'Nested Description',
          },
        },
      };

      const result = getAttributeSchemaFromPath({
        path: 'nestedComp.nested.title',
        schema: nestedSchema as any,
        components: nestedComponents as any,
        document: nestedDocument,
      });

      expect(result).toEqual(mockTextAttribute);
    });
  });

  describe('parseFieldMetaData', () => {
    it('should parse valid metadata with all parameters', () => {
      const strapiSource =
        'path=title&type=text&documentId=doc-1&locale=en&model=api::article.article&kind=collectionType';

      const result = parseFieldMetaData(strapiSource);

      expect(result).toEqual({
        path: 'title',
        type: 'text',
        documentId: 'doc-1',
        locale: 'en',
        model: 'api::article.article',
        kind: 'collectionType',
      });
    });

    it('should parse valid metadata with required parameters only', () => {
      const strapiSource = 'path=title&type=text&documentId=doc-1&model=api::article.article';

      const result = parseFieldMetaData(strapiSource);

      expect(result).toEqual({
        path: 'title',
        type: 'text',
        documentId: 'doc-1',
        locale: null,
        model: 'api::article.article',
        kind: undefined,
      });
    });

    it('should return null when path is missing', () => {
      const strapiSource = 'type=text&documentId=doc-1&model=api::article.article';

      const result = parseFieldMetaData(strapiSource);

      expect(result).toBeNull();
    });

    it('should return null when type is missing', () => {
      const strapiSource = 'path=title&documentId=doc-1&model=api::article.article';

      const result = parseFieldMetaData(strapiSource);

      expect(result).toBeNull();
    });

    it('should return null when documentId is missing', () => {
      const strapiSource = 'path=title&type=text&model=api::article.article';

      const result = parseFieldMetaData(strapiSource);

      expect(result).toBeNull();
    });

    it('should return null when model is missing', () => {
      const strapiSource = 'path=title&type=text&documentId=doc-1';

      const result = parseFieldMetaData(strapiSource);

      expect(result).toBeNull();
    });

    it('should handle empty string', () => {
      const result = parseFieldMetaData('');

      expect(result).toBeNull();
    });

    it('should handle malformed query string', () => {
      const result = parseFieldMetaData('invalid-query-string');

      expect(result).toBeNull();
    });

    it('should handle URL encoded values', () => {
      const strapiSource =
        'path=components.0.title&type=text&documentId=doc%2D1&model=api%3A%3Aarticle%2Earticle';

      const result = parseFieldMetaData(strapiSource);

      expect(result).toEqual({
        path: 'components.0.title',
        type: 'text',
        documentId: 'doc-1',
        locale: null,
        model: 'api::article.article',
        kind: undefined,
      });
    });

    it('should handle complex path with array indices', () => {
      const strapiSource =
        'path=components.4.relations.2.name&type=text&documentId=doc-1&model=api::article.article';

      const result = parseFieldMetaData(strapiSource);

      expect(result).toEqual({
        path: 'components.4.relations.2.name',
        type: 'text',
        documentId: 'doc-1',
        locale: null,
        model: 'api::article.article',
        kind: undefined,
      });
    });

    it('should handle different attribute types', () => {
      const testCases = ['text', 'richtext', 'number', 'email', 'component', 'dynamiczone'];

      testCases.forEach((type) => {
        const strapiSource = `path=field&type=${type}&documentId=doc-1&model=api::article.article`;
        const result = parseFieldMetaData(strapiSource);

        expect(result?.type).toBe(type);
      });
    });

    it('should handle different content type kinds', () => {
      const testCases = ['collectionType', 'singleType'];

      testCases.forEach((kind) => {
        const strapiSource = `path=field&type=text&documentId=doc-1&model=api::article.article&kind=${kind}`;
        const result = parseFieldMetaData(strapiSource);

        expect(result?.kind).toBe(kind);
      });
    });
  });
});
