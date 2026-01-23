/**
 * Unit tests for model cache utility.
 */

import { createModelCache } from '../model-cache';

describe('Model Cache', () => {
  const mockModels = {
    'api::page.page': {
      uid: 'api::page.page',
      modelType: 'contentType',
      kind: 'collectionType',
      attributes: {
        title: { type: 'string' },
        content: { type: 'component', component: 'sections.hero', repeatable: true },
        seo: { type: 'component', component: 'shared.seo' },
        author: { type: 'relation', target: 'api::author.author' },
        relatedPages: { type: 'relation', target: 'api::page.page' },
      },
    },
    'api::author.author': {
      uid: 'api::author.author',
      modelType: 'contentType',
      kind: 'collectionType',
      attributes: {
        name: { type: 'string' },
        bio: { type: 'text' },
        avatar: { type: 'media' },
        articles: { type: 'relation', target: 'api::article.article' },
      },
    },
    'api::article.article': {
      uid: 'api::article.article',
      modelType: 'contentType',
      kind: 'collectionType',
      attributes: {
        title: { type: 'string' },
        content: { type: 'richtext' },
        author: { type: 'relation', target: 'api::author.author' },
        tags: { type: 'relation', target: 'api::tag.tag' },
        category: { type: 'relation', target: 'api::category.category' },
      },
    },
    'api::tag.tag': {
      uid: 'api::tag.tag',
      modelType: 'contentType',
      kind: 'collectionType',
      attributes: {
        name: { type: 'string' },
        articles: { type: 'relation', target: 'api::article.article' },
      },
    },
    'api::category.category': {
      uid: 'api::category.category',
      modelType: 'contentType',
      kind: 'collectionType',
      attributes: {
        name: { type: 'string' },
        articles: { type: 'relation', target: 'api::article.article' },
      },
    },
    'sections.hero': {
      uid: 'sections.hero',
      modelType: 'component',
      attributes: {
        title: { type: 'string' },
        subtitle: { type: 'string' },
        backgroundImage: { type: 'media' },
        cta: { type: 'component', component: 'shared.button' },
      },
    },
    'shared.seo': {
      uid: 'shared.seo',
      modelType: 'component',
      attributes: {
        title: { type: 'string' },
        description: { type: 'text' },
        image: { type: 'media' },
      },
    },
    'shared.button': {
      uid: 'shared.button',
      modelType: 'component',
      attributes: {
        label: { type: 'string' },
        url: { type: 'string' },
      },
    },
  };

  const complexPopulateQuery = {
    content: {
      populate: {
        cta: true,
        backgroundImage: true,
      },
    },
    seo: {
      populate: {
        image: true,
      },
    },
    author: {
      populate: {
        avatar: true,
        articles: {
          populate: {
            author: {
              populate: {
                avatar: true,
              },
            },
            tags: true,
            category: {
              populate: {
                articles: {
                  populate: {
                    author: true,
                    tags: true,
                  },
                },
              },
            },
          },
        },
      },
    },
    relatedPages: {
      populate: {
        content: {
          populate: {
            cta: true,
            backgroundImage: true,
          },
        },
        seo: {
          populate: {
            image: true,
          },
        },
        author: {
          populate: {
            avatar: true,
            articles: {
              populate: {
                tags: true,
                category: true,
              },
            },
          },
        },
      },
    },
  };

  describe('Performance Comparison', () => {
    it('should show significant reduction in getModel() calls with cache', async () => {
      let getModelCallsWithoutCache = 0;
      let getModelCallsWithCache = 0;

      // Mock getModel function that tracks calls
      const createMockGetModel = (counter: { count: number }) => {
        return (uid: string) => {
          counter.count += 1;
          const model = mockModels[uid as keyof typeof mockModels];
          if (!model) {
            throw new Error(`Model ${uid} not found`);
          }
          return model;
        };
      };

      // Test WITHOUT cache (baseline)
      const counterWithoutCache = { count: 0 };
      const getModelWithoutCache = createMockGetModel(counterWithoutCache);

      // Simulate traversing the populate query multiple times (as happens in validation)
      for (let i = 0; i < 4; i += 1) {
        // This simulates the 4 validation calls (filters, sort, fields, populate)
        await traversePopulate(
          complexPopulateQuery,
          mockModels['api::page.page'],
          getModelWithoutCache
        );
      }

      getModelCallsWithoutCache = counterWithoutCache.count;

      // Test with cache
      const counterWithCache = { count: 0 };
      const getModelWithCacheSource = createMockGetModel(counterWithCache);
      const modelCache = createModelCache(getModelWithCacheSource);

      // Same traversal, but with cached getModel
      for (let i = 0; i < 4; i += 1) {
        await traversePopulate(
          complexPopulateQuery,
          mockModels['api::page.page'],
          modelCache.getModel
        );
      }

      getModelCallsWithCache = counterWithCache.count;

      // Calculate improvements
      const callReduction =
        ((getModelCallsWithoutCache - getModelCallsWithCache) / getModelCallsWithoutCache) * 100;

      // Assertions
      expect(getModelCallsWithCache).toBeLessThan(getModelCallsWithoutCache);
      expect(callReduction).toBeGreaterThan(50); // At least 50% reduction in calls
    });

    it('should cache models correctly across multiple validations', () => {
      let callCount = 0;
      const getModel = (uid: string) => {
        callCount += 1;

        return mockModels[uid as keyof typeof mockModels];
      };

      const cache = createModelCache(getModel);

      // Request same model multiple times
      cache.getModel('api::page.page');
      cache.getModel('api::page.page');
      cache.getModel('api::page.page');
      cache.getModel('api::author.author');
      cache.getModel('api::author.author');
      cache.getModel('api::page.page');

      // Should only call getModel twice (once per unique model)
      expect(callCount).toBe(2);
    });

    it('should clear cache properly', () => {
      let callCount = 0;
      const getModel = (uid: string) => {
        callCount += 1;

        return mockModels[uid as keyof typeof mockModels];
      };

      const cache = createModelCache(getModel);

      cache.getModel('api::page.page');
      expect(callCount).toBe(1);

      cache.clear();

      cache.getModel('api::page.page');
      expect(callCount).toBe(2); // Called again after clear
    });
  });

  describe('Real-world Scenario Simulation', () => {
    it('should handle deeply nested populate with components and relations', async () => {
      const callCounter = { count: 0 };

      const getModel = (uid: string) => {
        callCounter.count += 1;

        return mockModels[uid as keyof typeof mockModels];
      };

      const cache = createModelCache(getModel);

      // Simulate the validateParams function flow
      const ctx = {
        schema: mockModels['api::page.page'],
        getModel: cache.getModel,
      };

      // Traverse the complex populate (simulating validatePopulate)
      await traversePopulate(complexPopulateQuery, ctx.schema, ctx.getModel);

      const uniqueModels = new Set(Object.keys(mockModels));
      expect(callCounter.count).toBeLessThanOrEqual(uniqueModels.size * 2); // Allow some overhead
    });
  });
});

/**
 * Helper function to traverse a populate query
 * This simulates what happens in the validate/traverse code
 */
async function traversePopulate(
  populate: any,
  schema: any,
  getModel: (uid: string) => any
): Promise<void> {
  if (!populate || typeof populate !== 'object') {
    return;
  }

  for (const key of Object.keys(populate)) {
    const attribute = schema.attributes?.[key];

    if (!attribute) {
      continue;
    }

    // Handle relations
    if (attribute.type === 'relation' && attribute.target) {
      const targetModel = getModel(attribute.target);

      if (populate[key]?.populate) {
        await traversePopulate(populate[key].populate, targetModel, getModel);
      }
    }

    // Handle components
    if (attribute.type === 'component' && attribute.component) {
      const componentModel = getModel(attribute.component);

      if (populate[key]?.populate) {
        await traversePopulate(populate[key].populate, componentModel, getModel);
      }
    }

    // Handle nested populate
    if (populate[key]?.populate) {
      await traversePopulate(populate[key].populate, schema, getModel);
    }
  }
}
