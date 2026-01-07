import type { Core } from '@strapi/strapi';

// ============================================================================
// BENCHMARK DATA CONFIGURATION
// ============================================================================
// Adjust these values to control the volume of test data generated.
// Default creates 320 component instances (10 entries × 2^5 items).
// For stress testing, increase MAX_DEPTH to 9 (creates 5,120 instances).
// ============================================================================
const BENCHMARK_CONFIG = {
  ENTRY_COUNT: 10, // Number of benchmark-page entries to create
  ITEMS_PER_LEVEL: 2, // Items in each repeatable component array
  MAX_DEPTH: 5, // Maximum nesting depth (1-9, where 9 is deepest)
};

// Component field names at each level (must match schema definitions)
const LEVEL_CONFIG = [
  { field: 'items', textField: 'title' }, // level-one
  { field: 'children', textField: 'name' }, // level-two
  { field: 'nodes', textField: 'label' }, // level-three
  { field: 'entries', textField: 'value' }, // level-four
  { field: 'elements', textField: 'text' }, // level-five
  { field: 'parts', textField: 'content' }, // level-six
  { field: 'pieces', textField: 'data' }, // level-seven
  { field: 'details', textField: 'info' }, // level-eight
  { textField: 'description' }, // level-nine (leaf - no nested field)
];

/**
 * Recursively generate nested component data.
 * @param depth - Current depth level (1-9)
 * @param maxDepth - Maximum depth to generate
 * @param itemsPerLevel - Number of items per repeatable array
 * @param path - Current path for naming (e.g., "1.2.3")
 */
function generateNestedData(
  depth: number,
  maxDepth: number,
  itemsPerLevel: number,
  path: string = ''
): any[] {
  const items: any[] = [];
  const config = LEVEL_CONFIG[depth - 1];

  for (let i = 1; i <= itemsPerLevel; i++) {
    const currentPath = path ? `${path}.${i}` : `${i}`;
    const item: any = {
      [config.textField]: `Level ${depth} Item ${currentPath}`,
    };

    // Add nested children if not at max depth and not at leaf level (9)
    if (depth < maxDepth && depth < 9 && config.field) {
      item[config.field] = generateNestedData(depth + 1, maxDepth, itemsPerLevel, currentPath);
    }

    items.push(item);
  }

  return items;
}

/**
 * Create benchmark test data if it doesn't already exist.
 */
async function createBenchmarkData(strapi: Core.Strapi) {
  const { ENTRY_COUNT, ITEMS_PER_LEVEL, MAX_DEPTH } = BENCHMARK_CONFIG;

  // Check if benchmark data already exists
  const existing = await strapi.documents('api::benchmark-page.benchmark-page').findFirst({});

  if (existing) {
    strapi.log.info('[Benchmark] Test data already exists, skipping creation');
    strapi.log.info(
      `[Benchmark] Config: ${ENTRY_COUNT} entries, ${ITEMS_PER_LEVEL} items/level, depth ${MAX_DEPTH}`
    );
    return;
  }

  strapi.log.info('[Benchmark] Creating test data...');
  strapi.log.info(
    `[Benchmark] Config: ${ENTRY_COUNT} entries, ${ITEMS_PER_LEVEL} items/level, depth ${MAX_DEPTH}`
  );

  const startTime = Date.now();
  const totalComponents = ENTRY_COUNT * Math.pow(ITEMS_PER_LEVEL, MAX_DEPTH);
  strapi.log.info(`[Benchmark] Expected component instances: ~${totalComponents}`);

  // Create benchmark entries
  for (let i = 1; i <= ENTRY_COUNT; i++) {
    await strapi.documents('api::benchmark-page.benchmark-page').create({
      data: {
        title: `Benchmark Page ${i}`,
        sections: generateNestedData(1, MAX_DEPTH, ITEMS_PER_LEVEL, `${i}`),
      },
    });

    if (i % 5 === 0 || i === ENTRY_COUNT) {
      strapi.log.info(`[Benchmark] Created ${i}/${ENTRY_COUNT} entries...`);
    }
  }

  const elapsed = Date.now() - startTime;
  strapi.log.info(`[Benchmark] Created ${ENTRY_COUNT} entries in ${elapsed}ms`);
}

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    // Create benchmark test data on startup
    await createBenchmarkData(strapi);
  },
};
