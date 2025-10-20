import type { Schema, UID } from '@strapi/types';
import getNumberOfConditionalFields from '../conditional-fields';

const mockStrapi = {
  contentTypes: {} as Record<UID.ContentType, Schema.ContentType>,
  components: {} as Record<UID.Component, Schema.Component>,
};

(global as any).strapi = mockStrapi;

describe('getNumberOfConditionalFields', () => {
  beforeEach(() => {
    mockStrapi.contentTypes = {};
    mockStrapi.components = {};
  });

  describe('when no schemas exist', () => {
    it('should return 0 when there are no content types or components', () => {
      const result = getNumberOfConditionalFields();
      expect(result).toBe(0);
    });
  });

  describe('when schemas have no conditional fields', () => {
    it('should return 0 for content types without conditional fields', () => {
      mockStrapi.contentTypes = {
        'api::article.article': {
          modelType: 'contentType',
          uid: 'api::article.article',
          kind: 'collectionType',
          modelName: 'article',
          globalId: 'Article',
          info: { singularName: 'article', pluralName: 'articles', displayName: 'Article' },
          options: {},
          attributes: {
            title: { type: 'string', required: true },
            content: { type: 'text' },
            publishedAt: { type: 'datetime' },
          },
        } as unknown as Schema.ContentType,
      };

      const result = getNumberOfConditionalFields();
      expect(result).toBe(0);
    });

    it('should return 0 for components without conditional fields', () => {
      mockStrapi.components = {
        'default.hero': {
          modelType: 'component',
          uid: 'default.hero',
          category: 'default',
          modelName: 'hero',
          globalId: 'ComponentDefaultHero',
          info: { displayName: 'Hero', icon: 'layer' },
          options: {},
          attributes: {
            title: { type: 'string' },
            subtitle: { type: 'string' },
            image: { type: 'media', multiple: false },
          },
        } as unknown as Schema.Component,
      };

      const result = getNumberOfConditionalFields();
      expect(result).toBe(0);
    });
  });

  describe('when schemas have conditional fields', () => {
    it('should count conditional fields in content types correctly', () => {
      mockStrapi.contentTypes = {
        'api::article.article': {
          modelType: 'contentType',
          uid: 'api::article.article',
          kind: 'collectionType',
          modelName: 'article',
          globalId: 'Article',
          info: { singularName: 'article', pluralName: 'articles', displayName: 'Article' },
          options: {},
          attributes: {
            title: { type: 'string' },
            conditionalField: {
              type: 'string',
              conditions: { visible: true },
            },
            anotherConditionalField: {
              type: 'text',
              conditions: { required: { field: 'title', operator: 'isNotEmpty' } },
            },
            normalField: { type: 'string' },
          },
        } as unknown as Schema.ContentType,
      };

      const result = getNumberOfConditionalFields();
      expect(result).toBe(2);
    });

    it('should count conditional fields in components correctly', () => {
      mockStrapi.components = {
        'default.hero': {
          modelType: 'component',
          uid: 'default.hero',
          category: 'default',
          modelName: 'hero',
          globalId: 'ComponentDefaultHero',
          info: { displayName: 'Hero', icon: 'layer' },
          options: {},
          attributes: {
            conditionalSubtitle: {
              type: 'string',
              conditions: { visible: { field: 'title', operator: 'isNotEmpty' } },
            },
            normalTitle: { type: 'string' },
          },
        } as unknown as Schema.Component,
      };

      const result = getNumberOfConditionalFields();
      expect(result).toBe(1);
    });

    it('should count conditional fields across multiple content types and components', () => {
      mockStrapi.contentTypes = {
        'api::article.article': {
          modelType: 'contentType',
          uid: 'api::article.article',
          kind: 'collectionType',
          modelName: 'article',
          globalId: 'Article',
          info: { singularName: 'article', pluralName: 'articles', displayName: 'Article' },
          options: {},
          attributes: {
            conditionalField: {
              type: 'string',
              conditions: { visible: true },
            },
          },
        } as unknown as Schema.ContentType,
        'api::page.page': {
          modelType: 'contentType',
          uid: 'api::page.page',
          kind: 'collectionType',
          modelName: 'page',
          globalId: 'Page',
          info: { singularName: 'page', pluralName: 'pages', displayName: 'Page' },
          options: {},
          attributes: {
            anotherConditionalField: {
              type: 'text',
              conditions: { required: { field: 'title', value: 'test' } },
            },
          },
        } as unknown as Schema.ContentType,
      };

      mockStrapi.components = {
        'default.hero': {
          modelType: 'component',
          uid: 'default.hero',
          category: 'default',
          modelName: 'hero',
          globalId: 'ComponentDefaultHero',
          info: { displayName: 'Hero', icon: 'layer' },
          options: {},
          attributes: {
            conditionalSubtitle: {
              type: 'string',
              conditions: { visible: { field: 'title', operator: 'isNotEmpty' } },
            },
          },
        } as unknown as Schema.Component,
      };

      const result = getNumberOfConditionalFields();
      expect(result).toBe(3); // 2 from content types + 1 from component
    });
  });

  describe('when conditions are invalid', () => {
    it('should ignore fields with non-object conditions', () => {
      mockStrapi.contentTypes = {
        'api::article.article': {
          modelType: 'contentType',
          uid: 'api::article.article',
          kind: 'collectionType',
          modelName: 'article',
          globalId: 'Article',
          info: { singularName: 'article', pluralName: 'articles', displayName: 'Article' },
          options: {},
          attributes: {
            fieldWithStringCondition: {
              type: 'string',
              conditions: 'some string',
            } as any,
            fieldWithNumberCondition: {
              type: 'string',
              conditions: 123,
            } as any,
            fieldWithNullCondition: {
              type: 'string',
              conditions: null,
            } as any,
            fieldWithUndefinedCondition: {
              type: 'string',
              conditions: undefined,
            } as any,
            validConditionalField: {
              type: 'string',
              conditions: { visible: true },
            },
          },
        } as unknown as Schema.ContentType,
      };

      const result = getNumberOfConditionalFields();
      expect(result).toBe(1); // Only the valid conditional field
    });

    it('should handle empty conditions object', () => {
      mockStrapi.contentTypes = {
        'api::article.article': {
          modelType: 'contentType',
          uid: 'api::article.article',
          kind: 'collectionType',
          modelName: 'article',
          globalId: 'Article',
          info: { singularName: 'article', pluralName: 'articles', displayName: 'Article' },
          options: {},
          attributes: {
            fieldWithEmptyConditions: {
              type: 'string',
              conditions: {},
            },
            validConditionalField: {
              type: 'string',
              conditions: { visible: true },
            },
          },
        } as unknown as Schema.ContentType,
      };

      const result = getNumberOfConditionalFields();
      expect(result).toBe(2); // Both should be counted as they have object conditions
    });
  });

  describe('edge cases', () => {
    it('should handle schemas with empty attributes', () => {
      mockStrapi.contentTypes = {
        'api::empty.empty': {
          modelType: 'contentType',
          uid: 'api::empty.empty',
          kind: 'collectionType',
          modelName: 'empty',
          globalId: 'Empty',
          info: { singularName: 'empty', pluralName: 'empties', displayName: 'Empty' },
          options: {},
          attributes: {},
        } as unknown as Schema.ContentType,
      };

      mockStrapi.components = {
        'default.empty': {
          modelType: 'component',
          uid: 'default.empty',
          category: 'default',
          modelName: 'empty',
          globalId: 'ComponentDefaultEmpty',
          info: { displayName: 'Empty', icon: 'layer' },
          options: {},
          attributes: {},
        } as unknown as Schema.Component,
      };

      const result = getNumberOfConditionalFields();
      expect(result).toBe(0);
    });

    it('should handle large numbers of conditional fields', () => {
      const attributes: Record<string, Schema.Attribute.AnyAttribute> = {};

      // Create 100 conditional fields
      for (let i = 0; i < 100; i += 1) {
        attributes[`conditionalField${i}`] = {
          type: 'string',
          conditions: { visible: true },
        };
      }

      mockStrapi.contentTypes = {
        'api::large.large': {
          modelType: 'contentType',
          uid: 'api::large.large',
          kind: 'collectionType',
          modelName: 'large',
          globalId: 'Large',
          info: { singularName: 'large', pluralName: 'larges', displayName: 'Large' },
          options: {},
          attributes,
        } as unknown as Schema.ContentType,
      };

      const result = getNumberOfConditionalFields();
      expect(result).toBe(100);
    });
  });
});
