/**
 * Performance benchmark for model cache optimization
 * This script demonstrates the performance improvement
 * Run with: node benchmark-model-cache.js
 */

// TODO - delete this file before merging

/* eslint-disable */
/* eslint-disable @typescript-eslint/no-var-requires */

const { createModelCache } = require('./dist/model-cache');

const mockModels = {
  'api::page.page': {
    uid: 'api::page.page',
    modelType: 'contentType',
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
    attributes: {
      name: { type: 'string' },
      articles: { type: 'relation', target: 'api::article.article' },
    },
  },
  'api::category.category': {
    uid: 'api::category.category',
    modelType: 'contentType',
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

/**
 * Helper function to traverse a populate query
 * This simulates what happens in the validate/traverse code
 */
async function traversePopulate(populate, schema, getModel) {
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

async function runBenchmark() {
  console.log('\n🚀 Model Cache Performance Benchmark\n');
  console.log('Simulating real-world scenario:');
  console.log('- Complex nested populate query');
  console.log('- Deep nesting with components and relations');
  console.log('- Multiple validation passes (filters, sort, fields, populate)');
  console.log('='.repeat(70) + '\n');

  // Test WITHOUT cache (baseline)
  let getModelCallsWithoutCache = 0;
  const getModelWithoutCache = (uid) => {
    getModelCallsWithoutCache++;
    const model = mockModels[uid];
    if (!model) {
      throw new Error(`Model ${uid} not found`);
    }

    return model;
  };

  console.log('📊 Running WITHOUT cache...');
  const startWithoutCache = performance.now();

  // Simulate 4 validation passes (as happens in validateParams)
  for (let i = 0; i < 4; i++) {
    await traversePopulate(
      complexPopulateQuery,
      mockModels['api::page.page'],
      getModelWithoutCache
    );
  }

  const timeWithoutCache = performance.now() - startWithoutCache;

  console.log(`Completed in ${timeWithoutCache.toFixed(2)}ms`);
  console.log(`getModel() called ${getModelCallsWithoutCache} times\n`);

  // Test WITH cache
  let getModelCallsWithCache = 0;
  const getModelWithCacheSource = (uid) => {
    getModelCallsWithCache++;
    const model = mockModels[uid];
    if (!model) {
      throw new Error(`Model ${uid} not found`);
    }
    return model;
  };

  const modelCache = createModelCache(getModelWithCacheSource);

  console.log('Running WITH cache...');
  const startWithCache = performance.now();

  // Same 4 validation passes, but with cached getModel
  for (let i = 0; i < 4; i++) {
    await traversePopulate(complexPopulateQuery, mockModels['api::page.page'], modelCache.getModel);
  }

  const timeWithCache = performance.now() - startWithCache;

  console.log(`Completed in ${timeWithCache.toFixed(2)}ms`);
  console.log(`getModel() called ${getModelCallsWithCache} times\n`);

  // Calculate improvements
  const callReduction =
    ((getModelCallsWithoutCache - getModelCallsWithCache) / getModelCallsWithoutCache) * 100;
  const timeImprovement = ((timeWithoutCache - timeWithCache) / timeWithoutCache) * 100;

  // Display results
  console.log('='.repeat(70));
  console.log('Performance Improvement Results');
  console.log('='.repeat(70));
  console.log('\ngetModel() Call Reduction:');
  console.log(`   Before: ${getModelCallsWithoutCache} calls`);
  console.log(`   After:  ${getModelCallsWithCache} calls`);
  console.log(
    `   Saved:  ${getModelCallsWithoutCache - getModelCallsWithCache} calls (${callReduction.toFixed(1)}% reduction)`
  );

  console.log('\n⚡ Execution Time Improvement:');
  console.log(`   Before: ${timeWithoutCache.toFixed(2)}ms`);
  console.log(`   After:  ${timeWithCache.toFixed(2)}ms`);
  console.log(
    `   Saved:  ${(timeWithoutCache - timeWithCache).toFixed(2)}ms (${timeImprovement.toFixed(1)}% faster)`
  );
}

runBenchmark().catch(console.error);
