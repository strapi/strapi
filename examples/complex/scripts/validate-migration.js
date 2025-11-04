#!/usr/bin/env node

/**
 * Validation script to verify migrated data from v4 to v5
 *
 * This script validates:
 * - Draft/publish document structure: published entries in v4 should have both draft and published versions in v5
 * - Relations are preserved: relations to draft/published entries should still point correctly
 * - Self-referential relations are maintained
 * - Component and dynamic zone structure is preserved
 *
 * Usage: node scripts/validate-migration.js [multiplier]
 */

const { createStrapi, compileStrapi } = require('@strapi/strapi');
const path = require('path');

// Try to load optional dependencies for pre-check
let knex, dotenv;
try {
  knex = require('knex');
  dotenv = require('dotenv');
  // Load environment variables
  const envPath = path.resolve(__dirname, '..', '.env');
  dotenv.config({ path: envPath });
} catch (error) {
  // knex/dotenv might not be available, skip pre-check
  console.warn('⚠️  knex/dotenv not available, skipping database format pre-check');
}

// Expected counts per multiplier run (from v4 seed)
const EXPECTED_COUNTS_PER_RUN = {
  basic: 5,
  basicDp: { published: 3, drafts: 2, total: 5 },
  basicDpI18n: { published: 6, drafts: 4, total: 10 }, // 3+2 per locale × 2 locales
  relation: 5,
  relationDp: { published: 5, drafts: 3, total: 8 },
  relationDpI18n: { published: 10, drafts: 6, total: 16 }, // 5+3 per locale × 2 locales
};

function getExpectedCounts(multiplier = 1) {
  const mult = parseInt(multiplier, 10) || 1;
  return {
    basic: EXPECTED_COUNTS_PER_RUN.basic * mult,
    basicDp: {
      published: EXPECTED_COUNTS_PER_RUN.basicDp.published * mult,
      drafts: EXPECTED_COUNTS_PER_RUN.basicDp.drafts * mult,
      total: EXPECTED_COUNTS_PER_RUN.basicDp.total * mult,
    },
    basicDpI18n: {
      published: EXPECTED_COUNTS_PER_RUN.basicDpI18n.published * mult,
      drafts: EXPECTED_COUNTS_PER_RUN.basicDpI18n.drafts * mult,
      total: EXPECTED_COUNTS_PER_RUN.basicDpI18n.total * mult,
    },
    relation: EXPECTED_COUNTS_PER_RUN.relation * mult,
    relationDp: {
      published: EXPECTED_COUNTS_PER_RUN.relationDp.published * mult,
      drafts: EXPECTED_COUNTS_PER_RUN.relationDp.drafts * mult,
      total: EXPECTED_COUNTS_PER_RUN.relationDp.total * mult,
    },
    relationDpI18n: {
      published: EXPECTED_COUNTS_PER_RUN.relationDpI18n.published * mult,
      drafts: EXPECTED_COUNTS_PER_RUN.relationDpI18n.drafts * mult,
      total: EXPECTED_COUNTS_PER_RUN.relationDpI18n.total * mult,
    },
  };
}

async function validateDocumentStructure(strapi, expected) {
  console.log('\n📄 Validating v5 document structure (draft/publish)...\n');

  const errors = [];

  // Check basic-dp: published entries should have both draft and published versions
  const basicDpAll = await strapi.db.query('api::basic-dp.basic-dp').findMany({
    publicationState: 'all',
  });

  const basicDpPublished = basicDpAll.filter((e) => e.publishedAt !== null);
  const basicDpDrafts = basicDpAll.filter((e) => e.publishedAt === null);

  // Group by documentId
  const basicDpByDocument = {};
  for (const entry of basicDpAll) {
    if (!entry.documentId) {
      errors.push(`basic-dp entry ${entry.id}: missing documentId`);
      continue;
    }
    if (!basicDpByDocument[entry.documentId]) {
      basicDpByDocument[entry.documentId] = { draft: null, published: null };
    }
    if (entry.publishedAt) {
      basicDpByDocument[entry.documentId].published = entry;
    } else {
      basicDpByDocument[entry.documentId].draft = entry;
    }
  }

  // Validate: every published entry should have a draft counterpart
  let publishedWithDraft = 0;
  let publishedWithoutDraft = 0;
  for (const [documentId, versions] of Object.entries(basicDpByDocument)) {
    if (versions.published && !versions.draft) {
      errors.push(
        `basic-dp documentId ${documentId}: has published entry but no draft (v5 requires both)`
      );
      publishedWithoutDraft++;
    } else if (versions.published && versions.draft) {
      publishedWithDraft++;
    }
  }

  // Check basic-dp-i18n: same validation per locale
  const basicDpI18nAll = await strapi.db.query('api::basic-dp-i18n.basic-dp-i18n').findMany({
    publicationState: 'all',
    locale: 'all',
  });

  const basicDpI18nByDocument = {};
  for (const entry of basicDpI18nAll) {
    if (!entry.documentId) {
      errors.push(`basic-dp-i18n entry ${entry.id}: missing documentId`);
      continue;
    }
    const key = `${entry.documentId}:${entry.locale}`;
    if (!basicDpI18nByDocument[key]) {
      basicDpI18nByDocument[key] = { draft: null, published: null, locale: entry.locale };
    }
    if (entry.publishedAt) {
      basicDpI18nByDocument[key].published = entry;
    } else {
      basicDpI18nByDocument[key].draft = entry;
    }
  }

  for (const [key, versions] of Object.entries(basicDpI18nByDocument)) {
    if (versions.published && !versions.draft) {
      errors.push(`basic-dp-i18n ${key}: has published entry but no draft (v5 requires both)`);
    }
  }

  // Check relation-dp: same validation
  const relationDpAll = await strapi.db.query('api::relation-dp.relation-dp').findMany({
    publicationState: 'all',
  });

  const relationDpByDocument = {};
  for (const entry of relationDpAll) {
    if (!entry.documentId) {
      errors.push(`relation-dp entry ${entry.id}: missing documentId`);
      continue;
    }
    if (!relationDpByDocument[entry.documentId]) {
      relationDpByDocument[entry.documentId] = { draft: null, published: null };
    }
    if (entry.publishedAt) {
      relationDpByDocument[entry.documentId].published = entry;
    } else {
      relationDpByDocument[entry.documentId].draft = entry;
    }
  }

  for (const [documentId, versions] of Object.entries(relationDpByDocument)) {
    if (versions.published && !versions.draft) {
      errors.push(
        `relation-dp documentId ${documentId}: has published entry but no draft (v5 requires both)`
      );
    }
  }

  // Check relation-dp-i18n: same validation
  const relationDpI18nAll = await strapi.db
    .query('api::relation-dp-i18n.relation-dp-i18n')
    .findMany({
      publicationState: 'all',
      locale: 'all',
    });

  const relationDpI18nByDocument = {};
  for (const entry of relationDpI18nAll) {
    if (!entry.documentId) {
      errors.push(`relation-dp-i18n entry ${entry.id}: missing documentId`);
      continue;
    }
    const key = `${entry.documentId}:${entry.locale}`;
    if (!relationDpI18nByDocument[key]) {
      relationDpI18nByDocument[key] = { draft: null, published: null, locale: entry.locale };
    }
    if (entry.publishedAt) {
      relationDpI18nByDocument[key].published = entry;
    } else {
      relationDpI18nByDocument[key].draft = entry;
    }
  }

  for (const [key, versions] of Object.entries(relationDpI18nByDocument)) {
    if (versions.published && !versions.draft) {
      errors.push(`relation-dp-i18n ${key}: has published entry but no draft (v5 requires both)`);
    }
  }

  // Summary
  if (errors.length === 0) {
    console.log(`✅ All documents have correct draft/publish structure`);
    console.log(`   basic-dp: ${publishedWithDraft} published entries have draft counterparts`);
  } else {
    console.log(`❌ Found ${errors.length} document structure errors`);
    errors.slice(0, 10).forEach((err) => console.log(`   - ${err}`));
    if (errors.length > 10) {
      console.log(`   ... and ${errors.length - 10} more`);
    }
  }

  return errors;
}

async function validateRelationsPreserved(strapi) {
  console.log('\n🔗 Validating relations are preserved after migration...\n');

  const errors = [];

  // Check relation-dp relations to basic-dp
  // In v4, relations could point to either published or draft basics
  // In v5, the relation should still point to the correct entry
  const relationDpAll = await strapi.db.query('api::relation-dp.relation-dp').findMany({
    publicationState: 'all',
    populate: {
      oneToOneBasic: true,
      oneToManyBasics: true,
      manyToOneBasic: true,
      manyToManyBasics: true,
    },
  });

  // Get all basic-dp entries to check if relations are valid
  const basicDpAll = await strapi.db.query('api::basic-dp.basic-dp').findMany({
    publicationState: 'all',
  });
  const basicDpIds = new Set(basicDpAll.map((e) => e.id));

  for (const relationEntry of relationDpAll) {
    // Check oneToOneBasic
    if (relationEntry.oneToOneBasic && !basicDpIds.has(relationEntry.oneToOneBasic.id)) {
      errors.push(
        `relation-dp ${relationEntry.id}: oneToOneBasic points to non-existent basic-dp ${relationEntry.oneToOneBasic.id}`
      );
    }

    // Check oneToManyBasics
    if (relationEntry.oneToManyBasics) {
      for (const basic of relationEntry.oneToManyBasics) {
        if (!basicDpIds.has(basic.id)) {
          errors.push(
            `relation-dp ${relationEntry.id}: oneToManyBasics contains non-existent basic-dp ${basic.id}`
          );
        }
      }
    }

    // Check manyToOneBasic
    if (relationEntry.manyToOneBasic && !basicDpIds.has(relationEntry.manyToOneBasic.id)) {
      errors.push(
        `relation-dp ${relationEntry.id}: manyToOneBasic points to non-existent basic-dp ${relationEntry.manyToOneBasic.id}`
      );
    }

    // Check manyToManyBasics
    if (relationEntry.manyToManyBasics) {
      for (const basic of relationEntry.manyToManyBasics) {
        if (!basicDpIds.has(basic.id)) {
          errors.push(
            `relation-dp ${relationEntry.id}: manyToManyBasics contains non-existent basic-dp ${basic.id}`
          );
        }
      }
    }

    // Validate self-referential relations
    if (relationEntry.selfOne && relationEntry.selfOne.id !== relationEntry.id) {
      errors.push(
        `relation-dp ${relationEntry.id}: selfOne should reference itself, got ${relationEntry.selfOne.id}`
      );
    }

    if (
      relationEntry.selfMany &&
      (!Array.isArray(relationEntry.selfMany) ||
        relationEntry.selfMany.length !== 1 ||
        relationEntry.selfMany[0].id !== relationEntry.id)
    ) {
      errors.push(`relation-dp ${relationEntry.id}: selfMany should contain only itself`);
    }
  }

  // Check relation entries to basic
  const relations = await strapi.db.query('api::relation.relation').findMany({
    populate: {
      oneToOneBasic: true,
      oneToManyBasics: true,
      manyToOneBasic: true,
      manyToManyBasics: true,
      selfOne: true,
      selfMany: true,
    },
  });

  const basicAll = await strapi.db.query('api::basic.basic').findMany();
  const basicIds = new Set(basicAll.map((e) => e.id));

  for (const relationEntry of relations) {
    if (relationEntry.oneToOneBasic && !basicIds.has(relationEntry.oneToOneBasic.id)) {
      errors.push(
        `relation ${relationEntry.id}: oneToOneBasic points to non-existent basic ${relationEntry.oneToOneBasic.id}`
      );
    }

    if (relationEntry.selfOne && relationEntry.selfOne.id !== relationEntry.id) {
      errors.push(
        `relation ${relationEntry.id}: selfOne should reference itself, got ${relationEntry.selfOne.id}`
      );
    }
  }

  if (errors.length === 0) {
    console.log(`✅ All relations are preserved correctly`);
  } else {
    console.log(`❌ Found ${errors.length} relation errors`);
    errors.slice(0, 10).forEach((err) => console.log(`   - ${err}`));
    if (errors.length > 10) {
      console.log(`   ... and ${errors.length - 10} more`);
    }
  }

  return errors;
}

async function validateCounts(strapi, expected) {
  console.log('\n📊 Validating entry counts...\n');

  const errors = [];
  const checks = [];

  // Count basic (no draft/publish, so count should match)
  const basicCount = await strapi.db.query('api::basic.basic').count();
  checks.push({
    type: 'basic',
    expected: expected.basic,
    actual: basicCount,
    passed: basicCount === expected.basic,
  });

  // Count basic-dp: in v5, published entries should have both draft and published
  // So we expect: drafts (original drafts) + published (each published creates a draft too)
  // Total drafts = original drafts + published entries
  // Total published = original published entries
  const basicDpAll = await strapi.db.query('api::basic-dp.basic-dp').findMany({
    publicationState: 'all',
  });
  const basicDpPublished = basicDpAll.filter((e) => e.publishedAt !== null);
  const basicDpDrafts = basicDpAll.filter((e) => e.publishedAt === null);

  // Expected: published entries should match, but drafts should be more (drafts + published entries)
  const expectedDrafts = expected.basicDp.drafts + expected.basicDp.published; // Each published creates a draft
  checks.push({
    type: 'basic-dp (published)',
    expected: expected.basicDp.published,
    actual: basicDpPublished.length,
    passed: basicDpPublished.length === expected.basicDp.published,
  });
  checks.push({
    type: 'basic-dp (drafts)',
    expected: expectedDrafts,
    actual: basicDpDrafts.length,
    passed: basicDpDrafts.length === expectedDrafts,
  });

  // Count basic-dp-i18n: same logic as basic-dp
  const basicDpI18nAll = await strapi.db.query('api::basic-dp-i18n.basic-dp-i18n').findMany({
    publicationState: 'all',
    locale: 'all',
  });
  const basicDpI18nPublished = basicDpI18nAll.filter((e) => e.publishedAt !== null);
  const basicDpI18nDrafts = basicDpI18nAll.filter((e) => e.publishedAt === null);
  const expectedDraftsI18n = expected.basicDpI18n.drafts + expected.basicDpI18n.published;
  checks.push({
    type: 'basic-dp-i18n (published)',
    expected: expected.basicDpI18n.published,
    actual: basicDpI18nPublished.length,
    passed: basicDpI18nPublished.length === expected.basicDpI18n.published,
  });
  checks.push({
    type: 'basic-dp-i18n (drafts)',
    expected: expectedDraftsI18n,
    actual: basicDpI18nDrafts.length,
    passed: basicDpI18nDrafts.length === expectedDraftsI18n,
  });

  // Count relation (no draft/publish, so count should match)
  const relationCount = await strapi.db.query('api::relation.relation').count();
  checks.push({
    type: 'relation',
    expected: expected.relation,
    actual: relationCount,
    passed: relationCount === expected.relation,
  });

  // Count relation-dp: same logic as basic-dp
  const relationDpAll = await strapi.db.query('api::relation-dp.relation-dp').findMany({
    publicationState: 'all',
  });
  const relationDpPublished = relationDpAll.filter((e) => e.publishedAt !== null);
  const relationDpDrafts = relationDpAll.filter((e) => e.publishedAt === null);
  const expectedRelationDpDrafts = expected.relationDp.drafts + expected.relationDp.published;
  checks.push({
    type: 'relation-dp (published)',
    expected: expected.relationDp.published,
    actual: relationDpPublished.length,
    passed: relationDpPublished.length === expected.relationDp.published,
  });
  checks.push({
    type: 'relation-dp (drafts)',
    expected: expectedRelationDpDrafts,
    actual: relationDpDrafts.length,
    passed: relationDpDrafts.length === expectedRelationDpDrafts,
  });

  // Count relation-dp-i18n: same logic as basic-dp
  const relationDpI18nAll = await strapi.db
    .query('api::relation-dp-i18n.relation-dp-i18n')
    .findMany({
      publicationState: 'all',
      locale: 'all',
    });
  const relationDpI18nPublished = relationDpI18nAll.filter((e) => e.publishedAt !== null);
  const relationDpI18nDrafts = relationDpI18nAll.filter((e) => e.publishedAt === null);
  const expectedRelationDpI18nDrafts =
    expected.relationDpI18n.drafts + expected.relationDpI18n.published;
  checks.push({
    type: 'relation-dp-i18n (published)',
    expected: expected.relationDpI18n.published,
    actual: relationDpI18nPublished.length,
    passed: relationDpI18nPublished.length === expected.relationDpI18n.published,
  });
  checks.push({
    type: 'relation-dp-i18n (drafts)',
    expected: expectedRelationDpI18nDrafts,
    actual: relationDpI18nDrafts.length,
    passed: relationDpI18nDrafts.length === expectedRelationDpI18nDrafts,
  });

  // Display results
  for (const check of checks) {
    const icon = check.passed ? '✅' : '❌';
    console.log(
      `${icon} ${check.type}: ${check.actual}/${check.expected} ${
        check.passed ? '' : `(expected ${check.expected})`
      }`
    );
    if (!check.passed) {
      errors.push(
        `Count mismatch for ${check.type}: expected ${check.expected}, got ${check.actual}`
      );
    }
  }

  return { errors, checks };
}

async function validateComponents(strapi) {
  console.log('\n🧩 Validating components and dynamic zones...\n');

  const errors = [];

  // Check relation entries have components
  const relations = await strapi.db.query('api::relation.relation').findMany({
    populate: ['simpleInfo', 'content'],
  });

  for (const entry of relations) {
    if (!entry.simpleInfo) {
      errors.push(`relation ${entry.id}: missing simpleInfo component`);
    }

    if (!Array.isArray(entry.content) || entry.content.length !== 2) {
      errors.push(
        `relation ${entry.id}: content should be array with 2 items, got ${entry.content?.length || 0}`
      );
    } else {
      // Check dynamic zone components have __component field
      for (let i = 0; i < entry.content.length; i++) {
        const component = entry.content[i];
        if (!component.__component) {
          errors.push(`relation ${entry.id}: content[${i}] missing __component field`);
        } else if (!['shared.simple-info', 'shared.image-block'].includes(component.__component)) {
          errors.push(
            `relation ${entry.id}: content[${i}] has invalid __component: ${component.__component}`
          );
        }
      }
    }
  }

  if (errors.length === 0) {
    console.log(
      `✅ All components and dynamic zones are valid (checked ${relations.length} relation entries)`
    );
  } else {
    console.log(`❌ Found ${errors.length} component errors`);
    errors.slice(0, 10).forEach((err) => console.log(`   - ${err}`));
    if (errors.length > 10) {
      console.log(`   ... and ${errors.length - 10} more`);
    }
  }

  return errors;
}

/**
 * Get pre-migration counts using raw database queries (before Strapi loads)
 */
async function getPreMigrationCounts() {
  if (!knex) {
    return null; // Can't check without knex
  }

  const client = process.env.DATABASE_CLIENT || 'sqlite';
  let dbConfig = {};

  // Build database config from environment variables (same as checkDatabaseFormat)
  switch (client) {
    case 'postgres':
    case 'pg':
      dbConfig = {
        client: 'postgres',
        connection: {
          host: process.env.DATABASE_HOST || 'localhost',
          port: parseInt(process.env.DATABASE_PORT || '5432', 10),
          database: process.env.DATABASE_NAME || 'strapi',
          user: process.env.DATABASE_USERNAME || 'strapi',
          password: process.env.DATABASE_PASSWORD || 'strapi',
          ssl: process.env.DATABASE_SSL === 'true',
        },
      };
      break;
    case 'mysql':
    case 'mysql2':
      dbConfig = {
        client: 'mysql',
        connection: {
          host: process.env.DATABASE_HOST || 'localhost',
          port: parseInt(process.env.DATABASE_PORT || '3306', 10),
          database: process.env.DATABASE_NAME || 'strapi',
          user: process.env.DATABASE_USERNAME || 'strapi',
          password: process.env.DATABASE_PASSWORD || 'strapi',
          ssl: process.env.DATABASE_SSL === 'true',
        },
      };
      break;
    case 'sqlite':
    case 'better-sqlite3':
      dbConfig = {
        client: 'better-sqlite3',
        connection: {
          filename: process.env.DATABASE_FILENAME || path.join(__dirname, '..', '.tmp', 'data.db'),
        },
        useNullAsDefault: true,
      };
      break;
    default:
      return null;
  }

  const db = knex(dbConfig);
  const counts = {};

  // Helper to parse count result (handles different database formats)
  const parseCount = (result) => {
    if (!result) return 0;
    // PostgreSQL/MySQL returns { count: '5' } or { count: 5 }
    if (result.count !== undefined) {
      return parseInt(result.count, 10) || 0;
    }
    // Some databases might return different field names
    const value = result['count(*)'] || result.count || Object.values(result)[0];
    return parseInt(value, 10) || 0;
  };

  try {
    // Count basic entries
    try {
      const basicCount = await db('basics').count('* as count').first();
      counts.basic = parseCount(basicCount);
    } catch (e) {
      counts.basic = 0;
    }

    // Count basic-dp entries (separate published vs drafts)
    try {
      const basicDpPublished = await db('basic_dps')
        .whereNotNull('published_at')
        .count('* as count')
        .first();
      const basicDpDrafts = await db('basic_dps')
        .whereNull('published_at')
        .count('* as count')
        .first();
      counts.basicDp = {
        published: parseCount(basicDpPublished),
        drafts: parseCount(basicDpDrafts),
      };
    } catch (e) {
      counts.basicDp = { published: 0, drafts: 0 };
    }

    // Count basic-dp-i18n entries
    try {
      const basicDpI18nPublished = await db('basic_dp_i18ns')
        .whereNotNull('published_at')
        .count('* as count')
        .first();
      const basicDpI18nDrafts = await db('basic_dp_i18ns')
        .whereNull('published_at')
        .count('* as count')
        .first();
      counts.basicDpI18n = {
        published: parseCount(basicDpI18nPublished),
        drafts: parseCount(basicDpI18nDrafts),
      };
    } catch (e) {
      counts.basicDpI18n = { published: 0, drafts: 0 };
    }

    // Count relation entries
    try {
      const relationCount = await db('relations').count('* as count').first();
      counts.relation = parseCount(relationCount);
    } catch (e) {
      counts.relation = 0;
    }

    // Count relation-dp entries
    try {
      const relationDpPublished = await db('relation_dps')
        .whereNotNull('published_at')
        .count('* as count')
        .first();
      const relationDpDrafts = await db('relation_dps')
        .whereNull('published_at')
        .count('* as count')
        .first();
      counts.relationDp = {
        published: parseCount(relationDpPublished),
        drafts: parseCount(relationDpDrafts),
      };
    } catch (e) {
      counts.relationDp = { published: 0, drafts: 0 };
    }

    // Count relation-dp-i18n entries
    try {
      const relationDpI18nPublished = await db('relation_dp_i18ns')
        .whereNotNull('published_at')
        .count('* as count')
        .first();
      const relationDpI18nDrafts = await db('relation_dp_i18ns')
        .whereNull('published_at')
        .count('* as count')
        .first();
      counts.relationDpI18n = {
        published: parseCount(relationDpI18nPublished),
        drafts: parseCount(relationDpI18nDrafts),
      };
    } catch (e) {
      counts.relationDpI18n = { published: 0, drafts: 0 };
    }

    await db.destroy();
    return counts;
  } catch (error) {
    try {
      await db.destroy();
    } catch (e) {
      // Ignore destroy errors
    }
    console.warn(`⚠️  Could not get pre-migration counts: ${error.message}`);
    return null;
  }
}

/**
 * Check if database is in v4 format before running migrations
 * v4 indicators:
 * - Tables don't have `document_id` column
 * - Draft/publish uses `published_at` directly on content type tables
 * v5 indicators:
 * - Tables have `document_id` column for draft/publish content types
 * - `strapi_database_schema` table exists
 */
async function checkDatabaseFormat() {
  if (!knex) {
    return null; // Can't check without knex
  }

  const client = process.env.DATABASE_CLIENT || 'sqlite';
  let dbConfig = {};

  // Build database config from environment variables
  switch (client) {
    case 'postgres':
    case 'pg':
      dbConfig = {
        client: 'postgres',
        connection: {
          host: process.env.DATABASE_HOST || 'localhost',
          port: parseInt(process.env.DATABASE_PORT || '5432', 10),
          database: process.env.DATABASE_NAME || 'strapi',
          user: process.env.DATABASE_USERNAME || 'strapi',
          password: process.env.DATABASE_PASSWORD || 'strapi',
          ssl: process.env.DATABASE_SSL === 'true',
        },
      };
      break;
    case 'mysql':
    case 'mysql2':
      dbConfig = {
        client: 'mysql',
        connection: {
          host: process.env.DATABASE_HOST || 'localhost',
          port: parseInt(process.env.DATABASE_PORT || '3306', 10),
          database: process.env.DATABASE_NAME || 'strapi',
          user: process.env.DATABASE_USERNAME || 'strapi',
          password: process.env.DATABASE_PASSWORD || 'strapi',
          ssl: process.env.DATABASE_SSL === 'true',
        },
      };
      break;
    case 'sqlite':
    case 'better-sqlite3':
      dbConfig = {
        client: 'better-sqlite3',
        connection: {
          filename: process.env.DATABASE_FILENAME || path.join(__dirname, '..', '.tmp', 'data.db'),
        },
        useNullAsDefault: true,
      };
      break;
    default:
      console.warn(`⚠️  Unknown database client: ${client}, skipping format check`);
      return null;
  }

  const db = knex(dbConfig);

  // Helper to parse count result (handles different database formats)
  const parseCount = (result) => {
    if (!result) return 0;
    // PostgreSQL/MySQL returns { count: '5' } or { count: 5 }
    if (result.count !== undefined) {
      return parseInt(result.count, 10) || 0;
    }
    // Some databases might return different field names
    const value = result['count(*)'] || result.count || Object.values(result)[0];
    return parseInt(value, 10) || 0;
  };

  try {
    // Check if strapi_database_schema table exists (v5 indicator)
    const hasSchemaTable = await db.schema.hasTable('strapi_database_schema');
    if (hasSchemaTable) {
      // Check if entries actually have document_id set (indicates migrated data)
      // Just having the table doesn't mean data is migrated
      const hasBasicDpTable = await db.schema.hasTable('basic_dps');
      if (hasBasicDpTable) {
        try {
          // Check if any entries have non-null document_id (v5 migrated data)
          // Try to query for document_id - if column doesn't exist, this will fail
          const entriesWithDocumentId = await db('basic_dps')
            .whereNotNull('document_id')
            .limit(1)
            .count('* as count')
            .first();
          const count = parseCount(entriesWithDocumentId);
          if (count > 0) {
            await db.destroy();
            return 'v5'; // Has entries with document_id set, data is migrated
          }
        } catch (e) {
          // Column might not exist or query failed, continue checking
        }
      }
    }

    // Check if basic_dps table exists and has document_id column with actual values
    const hasBasicDpTable = await db.schema.hasTable('basic_dps');
    if (hasBasicDpTable) {
      try {
        // Check if column exists
        let hasDocumentIdColumn = false;
        try {
          const columns = await db('basic_dps').columnInfo();
          hasDocumentIdColumn = columns && (columns.document_id || columns['document_id']);
        } catch (error) {
          // Try alternative method for column checking
          if (client === 'sqlite' || client === 'better-sqlite3') {
            const pragmaResult = await db.raw('PRAGMA table_info(basic_dps)');
            hasDocumentIdColumn = pragmaResult.some(
              (col) => col.name === 'document_id' || col.name === 'documentId'
            );
          } else {
            const columnCheck = await db
              .select('column_name')
              .from('information_schema.columns')
              .where({ table_name: 'basic_dps', column_name: 'document_id' })
              .first();
            hasDocumentIdColumn = !!columnCheck;
          }
        }

        // If column exists, check if entries have document_id values set
        if (hasDocumentIdColumn) {
          const entriesWithDocumentId = await db('basic_dps')
            .whereNotNull('document_id')
            .limit(1)
            .count('* as count')
            .first();
          const count = parseCount(entriesWithDocumentId);
          if (count > 0) {
            await db.destroy();
            return 'v5'; // Has entries with document_id set, data is migrated
          }
          // Column exists but no entries have document_id set - likely v4 data in v5 schema
          await db.destroy();
          return 'v4';
        }
      } catch (error) {
        // Ignore errors and continue
      }
    }

    // Check relation_dps table similarly
    const hasRelationDpTable = await db.schema.hasTable('relation_dps');
    if (hasRelationDpTable) {
      try {
        let hasDocumentIdColumn = false;
        try {
          const columns = await db('relation_dps').columnInfo();
          hasDocumentIdColumn = columns && (columns.document_id || columns['document_id']);
        } catch (error) {
          if (client === 'sqlite' || client === 'better-sqlite3') {
            const pragmaResult = await db.raw('PRAGMA table_info(relation_dps)');
            hasDocumentIdColumn = pragmaResult.some(
              (col) => col.name === 'document_id' || col.name === 'documentId'
            );
          } else {
            const columnCheck = await db
              .select('column_name')
              .from('information_schema.columns')
              .where({ table_name: 'relation_dps', column_name: 'document_id' })
              .first();
            hasDocumentIdColumn = !!columnCheck;
          }
        }

        if (hasDocumentIdColumn) {
          const entriesWithDocumentId = await db('relation_dps')
            .whereNotNull('document_id')
            .limit(1)
            .count('* as count')
            .first();
          const count = parseCount(entriesWithDocumentId);
          if (count > 0) {
            await db.destroy();
            return 'v5'; // Has entries with document_id set, data is migrated
          }
          // Column exists but no entries have document_id set - likely v4 data in v5 schema
          await db.destroy();
          return 'v4';
        }
      } catch (e) {
        // Ignore errors and continue
      }
    }

    // If we get here, it's likely v4 format (no document_id column or no entries with document_id)
    await db.destroy();
    return 'v4';
  } catch (error) {
    // If tables don't exist, database might be empty or not initialized
    // Allow validation to proceed and let Strapi handle it
    try {
      await db.destroy();
    } catch (e) {
      // Ignore destroy errors
    }
    if (error.message && error.message.includes("doesn't exist")) {
      return null; // Database might be empty, allow to proceed
    }
    console.warn(`⚠️  Could not check database format: ${error.message}`);
    return null; // Unknown, allow to proceed
  }
}

async function validate(multiplier = 1) {
  const multiplierNum = parseInt(multiplier, 10) || 1;
  const expected = getExpectedCounts(multiplierNum);

  console.log(`🔍 Validating migrated data from v4 to v5 (multiplier: ${multiplierNum})...\n`);

  // Pre-check: Get counts before migrations run
  console.log('🔍 Getting pre-migration counts (before Strapi loads)...');
  const preMigrationCounts = await getPreMigrationCounts();
  if (preMigrationCounts) {
    console.log('\n📊 Pre-migration counts (v4 format):');
    console.log(`  basic: ${preMigrationCounts.basic}`);
    console.log(
      `  basic-dp: ${preMigrationCounts.basicDp.published} published, ${preMigrationCounts.basicDp.drafts} drafts`
    );
    console.log(
      `  basic-dp-i18n: ${preMigrationCounts.basicDpI18n.published} published, ${preMigrationCounts.basicDpI18n.drafts} drafts`
    );
    console.log(`  relation: ${preMigrationCounts.relation}`);
    console.log(
      `  relation-dp: ${preMigrationCounts.relationDp.published} published, ${preMigrationCounts.relationDp.drafts} drafts`
    );
    console.log(
      `  relation-dp-i18n: ${preMigrationCounts.relationDpI18n.published} published, ${preMigrationCounts.relationDpI18n.drafts} drafts\n`
    );
  } else {
    console.log('⚠️  Could not get pre-migration counts\n');
  }

  // Pre-check: Verify database is in v4 format before starting Strapi
  console.log('🔍 Checking database format...');
  const dbFormat = await checkDatabaseFormat();
  let formatWarning = null;
  if (dbFormat === 'v5') {
    formatWarning =
      'Database appears to already be in v5 format. Migrations may not have run during this validation.';
    console.warn('\n⚠️  WARNING: Database appears to already be in v5 format!');
    console.warn('   This validation script expects v4 format data that will be migrated to v5.');
    console.warn('   Validation will continue, but migrations may not have run.\n');
  } else if (dbFormat === 'v4') {
    console.log('✅ Database appears to be in v4 format (proceeding with validation)...\n');
  } else {
    console.log('⚠️  Could not determine database format (proceeding anyway)...\n');
  }
  console.log(`Expected counts from v4 seed:`);
  console.log(`  basic: ${EXPECTED_COUNTS_PER_RUN.basic} per run`);
  console.log(
    `  basic-dp: ${EXPECTED_COUNTS_PER_RUN.basicDp.published} published, ${EXPECTED_COUNTS_PER_RUN.basicDp.drafts} drafts per run`
  );
  console.log(`  relation: ${EXPECTED_COUNTS_PER_RUN.relation} per run`);
  console.log(
    `  relation-dp: ${EXPECTED_COUNTS_PER_RUN.relationDp.published} published, ${EXPECTED_COUNTS_PER_RUN.relationDp.drafts} drafts per run`
  );

  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();
  app.log.level = 'error';

  try {
    const allErrors = [];

    // Run all validations
    const countsResult = await validateCounts(app, expected);
    allErrors.push(...countsResult.errors);

    // Show pre vs post migration comparison
    if (preMigrationCounts) {
      console.log('\n📊 Pre vs Post Migration Comparison:');
      console.log('  basic:');
      console.log(
        `    Pre: ${preMigrationCounts.basic} → Post: ${countsResult.checks.find((c) => c.type === 'basic')?.actual || 'N/A'} (expected: ${expected.basic})`
      );
      console.log('  basic-dp:');
      const basicDpPublishedCheck = countsResult.checks.find(
        (c) => c.type === 'basic-dp (published)'
      );
      const basicDpDraftsCheck = countsResult.checks.find((c) => c.type === 'basic-dp (drafts)');
      console.log(
        `    Published - Pre: ${preMigrationCounts.basicDp.published} → Post: ${basicDpPublishedCheck?.actual || 'N/A'} (expected: ${expected.basicDp.published})`
      );
      console.log(
        `    Drafts - Pre: ${preMigrationCounts.basicDp.drafts} → Post: ${basicDpDraftsCheck?.actual || 'N/A'} (expected: ${expected.basicDp.drafts + expected.basicDp.published})`
      );
      console.log('  basic-dp-i18n:');
      const basicDpI18nPublishedCheck = countsResult.checks.find(
        (c) => c.type === 'basic-dp-i18n (published)'
      );
      const basicDpI18nDraftsCheck = countsResult.checks.find(
        (c) => c.type === 'basic-dp-i18n (drafts)'
      );
      console.log(
        `    Published - Pre: ${preMigrationCounts.basicDpI18n.published} → Post: ${basicDpI18nPublishedCheck?.actual || 'N/A'} (expected: ${expected.basicDpI18n.published})`
      );
      console.log(
        `    Drafts - Pre: ${preMigrationCounts.basicDpI18n.drafts} → Post: ${basicDpI18nDraftsCheck?.actual || 'N/A'} (expected: ${expected.basicDpI18n.drafts + expected.basicDpI18n.published})`
      );
      console.log('  relation:');
      console.log(
        `    Pre: ${preMigrationCounts.relation} → Post: ${countsResult.checks.find((c) => c.type === 'relation')?.actual || 'N/A'} (expected: ${expected.relation})`
      );
      console.log('  relation-dp:');
      const relationDpPublishedCheck = countsResult.checks.find(
        (c) => c.type === 'relation-dp (published)'
      );
      const relationDpDraftsCheck = countsResult.checks.find(
        (c) => c.type === 'relation-dp (drafts)'
      );
      console.log(
        `    Published - Pre: ${preMigrationCounts.relationDp.published} → Post: ${relationDpPublishedCheck?.actual || 'N/A'} (expected: ${expected.relationDp.published})`
      );
      console.log(
        `    Drafts - Pre: ${preMigrationCounts.relationDp.drafts} → Post: ${relationDpDraftsCheck?.actual || 'N/A'} (expected: ${expected.relationDp.drafts + expected.relationDp.published})`
      );
      console.log('  relation-dp-i18n:');
      const relationDpI18nPublishedCheck = countsResult.checks.find(
        (c) => c.type === 'relation-dp-i18n (published)'
      );
      const relationDpI18nDraftsCheck = countsResult.checks.find(
        (c) => c.type === 'relation-dp-i18n (drafts)'
      );
      console.log(
        `    Published - Pre: ${preMigrationCounts.relationDpI18n.published} → Post: ${relationDpI18nPublishedCheck?.actual || 'N/A'} (expected: ${expected.relationDpI18n.published})`
      );
      console.log(
        `    Drafts - Pre: ${preMigrationCounts.relationDpI18n.drafts} → Post: ${relationDpI18nDraftsCheck?.actual || 'N/A'} (expected: ${expected.relationDpI18n.drafts + expected.relationDpI18n.published})`
      );
      console.log('');
    }

    const documentStructureErrors = await validateDocumentStructure(app, expected);
    allErrors.push(...documentStructureErrors);

    const relationsErrors = await validateRelationsPreserved(app);
    allErrors.push(...relationsErrors);

    const componentsErrors = await validateComponents(app);
    allErrors.push(...componentsErrors);

    // Summary
    console.log('\n' + '='.repeat(60));
    if (allErrors.length === 0) {
      console.log('\n✅ All validations passed! Migration is correct.');
    } else {
      console.log(`\n❌ Validation failed with ${allErrors.length} error(s)`);
    }

    // Show format warning at the end if database was already v5
    if (formatWarning) {
      console.log('\n' + '='.repeat(60));
      console.warn('\n⚠️  IMPORTANT WARNING:');
      console.warn(`   ${formatWarning}`);
      console.warn(
        '   To properly test migrations, ensure the database is in v4 format before running validation.'
      );
      console.warn('   Consider:');
      console.warn('   - Restoring a v4 database snapshot');
      console.warn('   - Or wiping the database and seeding from the v4 project\n');
    }

    return allErrors.length === 0;
  } catch (error) {
    console.error('\n❌ Error during validation:', error.message);
    if (process.env.NODE_ENV !== 'production') {
      console.error(error);
    }
    throw error;
  } finally {
    await app.destroy();
  }
}

if (require.main === module) {
  const multiplier = process.argv[2] || '1';
  validate(multiplier)
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = validate;
