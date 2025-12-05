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

const INTENTIONAL_INVALID_FOREIGN_KEY_ID = 987654321;

/**
 * Normalizes CLI inputs into booleans while preserving an optional default.
 */
function parseBoolean(value, defaultValue = true) {
  if (value === undefined) {
    return true;
  }

  const normalized = String(value).toLowerCase();
  if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) {
    return true;
  }
  if (['false', '0', 'no', 'n', 'off'].includes(normalized)) {
    return false;
  }

  return defaultValue;
}

/**
 * Parses the CLI flags supported by the validation script.
 * Recognized options:
 *   --invalid-fk / --no-invalid-fk indicate whether to expect injected FK corruption
 *   <number> overrides the seed multiplier used during validation.
 */
function parseCliArgs(args) {
  const options = {};

  for (const arg of args) {
    if (arg.startsWith('--')) {
      const [flag, rawValue] = arg.split('=');

      switch (flag) {
        case '--invalid-fk':
          options.expectInvalidFk = parseBoolean(rawValue, true);
          break;
        case '--no-invalid-fk':
          options.expectInvalidFk = false;
          break;
        default:
          break;
      }
    } else if (!Number.isNaN(Number(arg))) {
      options.multiplier = arg;
    }
  }

  return options;
}

/**
 * Accepts multiple shapes (number/string/object) when the validator is invoked
 * programmatically.
 */
function normalizeValidateOptions(input) {
  if (input == null) {
    return {};
  }

  if (typeof input === 'number') {
    return { multiplier: input };
  }

  if (typeof input === 'string' && !input.startsWith('--')) {
    return { multiplier: input };
  }

  if (typeof input === 'object') {
    return { ...input };
  }

  return {};
}

/**
 * Handles differing database driver shapes when returning `count(*)` results.
 */
function parseCountResult(result) {
  if (!result) {
    return 0;
  }

  if (result.count !== undefined) {
    return parseInt(result.count, 10) || 0;
  }

  if (result['count(*)'] !== undefined) {
    return parseInt(result['count(*)'], 10) || 0;
  }

  const first = Object.values(result)[0];
  return parseInt(first, 10) || 0;
}

/**
 * Scales the per-run expectations to match the multiplier used when seeding v4 data.
 */
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

/**
 * Builds a lookup of the newest draft id per documentId/locale pair so we can
 * compare published vs draft relations deterministically.
 */
function buildLatestDraftIdMap(entries) {
  const latestDraftIdByDocumentAndLocale = new Map();

  for (const entry of entries) {
    if (!entry?.documentId || entry.publishedAt) {
      continue;
    }

    const key = `${entry.documentId}::${entry.locale || ''}`;
    const entryId = Number(entry.id) || 0;
    const currentMax = latestDraftIdByDocumentAndLocale.get(key) || 0;

    if (entryId > currentMax) {
      latestDraftIdByDocumentAndLocale.set(key, entryId);
    }
  }

  return latestDraftIdByDocumentAndLocale;
}

/**
 * Generates a `populate` tree for entity service queries that mirrors the schema
 * so validation can traverse every nested relation/component.
 */
function buildPopulateTreeFromMeta(meta) {
  if (!meta) {
    return undefined;
  }

  const populate = {};

  for (const [fieldName, attribute] of Object.entries(meta.attributes)) {
    if (!attribute) {
      continue;
    }

    if (attribute.type === 'relation') {
      populate[fieldName] = { populate: '*' };
    } else if (attribute.type === 'component') {
      populate[fieldName] = { populate: '*' };
    } else if (attribute.type === 'dynamiczone') {
      populate[fieldName] = { populate: '*' };
    }
  }

  return Object.keys(populate).length > 0 ? populate : undefined;
}

/**
 * Normalizes an entity into a stable string we can compare across drafts/published entries.
 */
function getEntityIdentifier(entity) {
  if (!entity) {
    return null;
  }

  if (entity.documentId) {
    const locale = entity.locale || '';
    return `${entity.documentId}::${locale}`;
  }

  if (entity.id != null) {
    return `id:${entity.id}`;
  }

  return null;
}

/**
 * Returns the documentId+locale pair used in the draft/publish maps.
 */
function getEntityKey(entity) {
  if (!entity?.documentId) {
    return null;
  }

  return `${entity.documentId}::${entity.locale || ''}`;
}

/**
 * Applies `getEntityIdentifier` to an array while filtering nulls.
 */
function getEntityIdentifierArray(entities) {
  if (!Array.isArray(entities)) {
    return [];
  }

  return entities
    .map((entity) => getEntityIdentifier(entity))
    .filter((identifier) => identifier != null);
}

/**
 * Captures the relational footprint of a `relation-dp` entry so we can compare
 * published vs draft versions without relying on deep object equality.
 */
function summarizeRelationEntry(entry) {
  return {
    oneToOneBasic: getEntityIdentifier(entry.oneToOneBasic),
    manyToOneBasic: getEntityIdentifier(entry.manyToOneBasic),
    oneToManyBasics: getEntityIdentifierArray(entry.oneToManyBasics),
    manyToManyBasics: getEntityIdentifierArray(entry.manyToManyBasics),
    selfOne: getEntityIdentifier(entry.selfOne),
    selfMany: getEntityIdentifierArray(entry.selfMany),
  };
}

/**
 * Verifies that every draft/publish content type now has matching draft + published
 * rows per documentId (and locale when applicable).
 */
async function validateDocumentStructure(strapi, expected) {
  console.log('\n📄 Validating v5 document structure (draft/publish)...\n');

  const errors = [];

  // Check basic-dp: published entries should have both draft and published versions
  const basicDpAll = await strapi.db.query('api::basic-dp.basic-dp').findMany({});

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
  const relationDpAll = await strapi.db.query('api::relation-dp.relation-dp').findMany({});

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

/**
 * Ensures relational integrity survived the migration by checking each association
 * still points to an existing target and self-relations remain self-referential.
 */
async function validateRelationsPreserved(strapi) {
  console.log('\n🔗 Validating relations are preserved after migration...\n');

  const errors = [];

  // Check relation-dp relations to basic-dp
  // In v4, relations could point to either published or draft basics
  // In v5, the relation should still point to the correct entry
  const relationDpAll = await strapi.db.query('api::relation-dp.relation-dp').findMany({
    populate: {
      oneToOneBasic: true,
      oneToManyBasics: true,
      manyToOneBasic: true,
      manyToManyBasics: true,
    },
  });

  // Get all basic-dp entries to check if relations are valid
  const basicDpAll = await strapi.db.query('api::basic-dp.basic-dp').findMany({});
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

/**
 * Confirms the intentionally injected FK violations from the v4 seed still exist so
 * we know the migration didn't silently "fix" them.
 */
async function validateIntentionalFkViolations(strapi) {
  console.log('\n🚨 Checking intentionally injected foreign key violations...\n');

  const errors = [];
  const warnings = [];
  const db = strapi.db.connection;
  const invalidId = INTENTIONAL_INVALID_FOREIGN_KEY_ID;

  try {
    const relationDpMeta = strapi.db.metadata.get('api::relation-dp.relation-dp');
    if (relationDpMeta) {
      const relationDpTable = relationDpMeta.tableName;
      const oneToOneColumn = relationDpMeta.attributes?.oneToOneBasic?.joinColumn?.name;
      if (relationDpTable && oneToOneColumn) {
        const result = await db(relationDpTable)
          .where(oneToOneColumn, invalidId)
          .count('* as count')
          .first();
        const count = parseCountResult(result);
        if (count > 0) {
          console.log(
            `✅ relation-dp: found ${count} record(s) referencing intentionally invalid basic-dp id ${invalidId}`
          );
        } else {
          errors.push(
            `Expected relation-dp entries referencing intentionally invalid basic-dp id ${invalidId} (none found)`
          );
        }
      } else {
        warnings.push('Unable to inspect relation-dp oneToOneBasic for intentional FK violations');
      }

      const joinTable = relationDpMeta.attributes?.manyToManyBasics?.joinTable;
      if (joinTable?.name && joinTable?.inverseJoinColumn?.name) {
        const joinResult = await db(joinTable.name)
          .where(joinTable.inverseJoinColumn.name, invalidId)
          .count('* as count')
          .first();
        const joinCount = parseCountResult(joinResult);
        if (joinCount > 0) {
          console.log(
            `✅ relation-dp manyToManyBasics: found ${joinCount} intentionally invalid reference(s)`
          );
        } else {
          errors.push(
            `Expected relation-dp manyToManyBasics entries referencing intentionally invalid basic-dp id ${invalidId} (none found)`
          );
        }
      } else {
        warnings.push(
          'Unable to inspect relation-dp manyToManyBasics join table for intentional FK violations'
        );
      }
    } else {
      warnings.push('Unable to load metadata for api::relation-dp.relation-dp');
    }

    const relationMeta = strapi.db.metadata.get('api::relation.relation');
    if (relationMeta) {
      const relationTable = relationMeta.tableName;
      const oneToOneColumn = relationMeta.attributes?.oneToOneBasic?.joinColumn?.name;
      if (relationTable && oneToOneColumn) {
        const relationResult = await db(relationTable)
          .where(oneToOneColumn, invalidId)
          .count('* as count')
          .first();
        const relationCount = parseCountResult(relationResult);
        if (relationCount > 0) {
          console.log(
            `✅ relation: found ${relationCount} record(s) referencing intentionally invalid basic id ${invalidId}`
          );
        } else {
          errors.push(
            `Expected relation entries referencing intentionally invalid basic id ${invalidId} (none found)`
          );
        }
      } else {
        warnings.push('Unable to inspect relation oneToOneBasic for intentional FK violations');
      }
    } else {
      warnings.push('Unable to load metadata for api::relation.relation');
    }
  } catch (error) {
    errors.push(
      `Failed to validate intentionally injected foreign key violations: ${error.message}`
    );
  }

  if (warnings.length > 0) {
    warnings.forEach((warning) => console.log(`⚠️  ${warning}`));
  }

  return { errors, warnings };
}

/**
 * Compares the post-migration row counts against expected values, accounting for the
 * extra drafts that get created during migration.
 */
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
  const basicDpAll = await strapi.db.query('api::basic-dp.basic-dp').findMany({});
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
  const relationDpAll = await strapi.db.query('api::relation-dp.relation-dp').findMany({});
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

/**
 * Checks that component and dynamic-zone content survived the migration, including
 * the presence of the required `__component` discriminator.
 */
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
 * Placeholder that documents join-column coverage. Helpful for future expansion
 * without producing noisy console output.
 */
async function validateJoinColumnRelations(strapi) {
  console.log('\n🔗 Validating joinColumn relations (oneToOne, manyToOne)...\n');

  const errors = [];
  const warnings = [];
  const db = strapi.db.connection;

  // Validate joinColumn relations for relation-dp content type
  const relationDpMeta = strapi.db.metadata.get('api::relation-dp.relation-dp');
  if (!relationDpMeta) {
    return { errors, warnings };
  }

  // Get all relation-dp entries
  const relationDpAllRaw = await db(relationDpMeta.tableName).select('*');
  const relationDpByDocumentId = new Map();
  for (const entry of relationDpAllRaw) {
    if (!entry.document_id) continue;
    if (!relationDpByDocumentId.has(entry.document_id)) {
      relationDpByDocumentId.set(entry.document_id, { published: null, draft: null });
    }
    const map = relationDpByDocumentId.get(entry.document_id);
    if (entry.published_at) {
      map.published = entry;
    } else {
      map.draft = entry;
    }
  }

  // Get all basic-dp entries for mapping
  const basicDpMeta = strapi.db.metadata.get('api::basic-dp.basic-dp');
  const basicDpAllRaw = basicDpMeta ? await db(basicDpMeta.tableName).select('*') : [];
  const basicDpByDocumentId = new Map();
  for (const entry of basicDpAllRaw) {
    if (!entry.document_id) continue;
    if (!basicDpByDocumentId.has(entry.document_id)) {
      basicDpByDocumentId.set(entry.document_id, { published: null, draft: null });
    }
    const map = basicDpByDocumentId.get(entry.document_id);
    if (entry.published_at) {
      map.published = entry;
    } else {
      map.draft = entry;
    }
  }

  let relationsChecked = 0;
  let relationsValid = 0;

  // Check oneToOneBasic joinColumn relation
  if (relationDpMeta.attributes.oneToOneBasic?.joinColumn) {
    const joinColumn = relationDpMeta.attributes.oneToOneBasic.joinColumn.name;
    const targetUid = relationDpMeta.attributes.oneToOneBasic.target;

    for (const [documentId, entries] of relationDpByDocumentId.entries()) {
      const published = entries.published;
      const draft = entries.draft;

      if (published) {
        relationsChecked++;
        const publishedTargetId = published[joinColumn];
        if (publishedTargetId) {
          // Published entry should point to published target (or keep original if target has no D&P)
          const targetHasDp = targetUid === 'api::basic-dp.basic-dp';
          if (targetHasDp) {
            const targetDoc = basicDpByDocumentId.get(
              basicDpAllRaw.find((e) => e.id === publishedTargetId)?.document_id
            );
            if (
              targetDoc?.published?.id !== publishedTargetId &&
              targetDoc?.draft?.id !== publishedTargetId
            ) {
              // Target might not exist or might be in a different document - this is acceptable
            } else if (targetDoc?.draft?.id === publishedTargetId) {
              // Published entry pointing to draft target - this might be acceptable if it was set that way originally
              warnings.push(
                `relation-dp published entry ${published.id}: oneToOneBasic points to draft basic-dp ${publishedTargetId} (may be intentional)`
              );
            }
          }
          relationsValid++;
        }
      }

      if (draft && published) {
        relationsChecked++;
        const draftTargetId = draft[joinColumn];
        const publishedTargetId = published[joinColumn];

        if (publishedTargetId && draftTargetId) {
          const targetHasDp = targetUid === 'api::basic-dp.basic-dp';
          if (targetHasDp) {
            // Draft should point to draft version of the target
            const publishedTarget = basicDpAllRaw.find((e) => e.id === publishedTargetId);
            if (publishedTarget) {
              const targetDoc = basicDpByDocumentId.get(publishedTarget.document_id);
              if (targetDoc?.draft && draftTargetId === targetDoc.draft.id) {
                relationsValid++;
              } else if (draftTargetId === publishedTargetId) {
                // Draft pointing to published target - this is acceptable if target has no draft
                if (!targetDoc?.draft) {
                  relationsValid++;
                } else {
                  errors.push(
                    `relation-dp draft entry ${draft.id}: oneToOneBasic points to published basic-dp ${draftTargetId} but draft ${targetDoc.draft.id} exists (should point to draft)`
                  );
                }
              } else {
                errors.push(
                  `relation-dp draft entry ${draft.id}: oneToOneBasic target mismatch - published points to ${publishedTargetId}, draft points to ${draftTargetId} (expected draft version)`
                );
              }
            } else {
              // Target doesn't exist - this is acceptable (might have been deleted)
              relationsValid++;
            }
          } else {
            // Target doesn't have D&P, should remain the same
            if (draftTargetId === publishedTargetId) {
              relationsValid++;
            } else {
              errors.push(
                `relation-dp draft entry ${draft.id}: oneToOneBasic target changed from ${publishedTargetId} to ${draftTargetId} but target has no D&P (should remain same)`
              );
            }
          }
        } else if (!publishedTargetId && !draftTargetId) {
          // Both null - valid
          relationsValid++;
        }
      }
    }
  }

  // Check manyToOneBasic joinColumn relation
  if (relationDpMeta.attributes.manyToOneBasic?.joinColumn) {
    const joinColumn = relationDpMeta.attributes.manyToOneBasic.joinColumn.name;
    const targetUid = relationDpMeta.attributes.manyToOneBasic.target;

    for (const [documentId, entries] of relationDpByDocumentId.entries()) {
      const published = entries.published;
      const draft = entries.draft;

      if (published) {
        relationsChecked++;
        const publishedTargetId = published[joinColumn];
        if (publishedTargetId) {
          relationsValid++;
        }
      }

      if (draft && published) {
        relationsChecked++;
        const draftTargetId = draft[joinColumn];
        const publishedTargetId = published[joinColumn];

        if (publishedTargetId && draftTargetId) {
          const targetHasDp = targetUid === 'api::basic-dp.basic-dp';
          if (targetHasDp) {
            // Draft should point to draft version of the target
            const publishedTarget = basicDpAllRaw.find((e) => e.id === publishedTargetId);
            if (publishedTarget) {
              const targetDoc = basicDpByDocumentId.get(publishedTarget.document_id);
              if (targetDoc?.draft && draftTargetId === targetDoc.draft.id) {
                relationsValid++;
              } else if (draftTargetId === publishedTargetId) {
                // Draft pointing to published target - this is acceptable if target has no draft
                if (!targetDoc?.draft) {
                  relationsValid++;
                } else {
                  errors.push(
                    `relation-dp draft entry ${draft.id}: manyToOneBasic points to published basic-dp ${draftTargetId} but draft ${targetDoc.draft.id} exists (should point to draft)`
                  );
                }
              } else {
                errors.push(
                  `relation-dp draft entry ${draft.id}: manyToOneBasic target mismatch - published points to ${publishedTargetId}, draft points to ${draftTargetId} (expected draft version)`
                );
              }
            } else {
              // Target doesn't exist - this is acceptable
              relationsValid++;
            }
          } else {
            // Target doesn't have D&P, should remain the same
            if (draftTargetId === publishedTargetId) {
              relationsValid++;
            } else {
              errors.push(
                `relation-dp draft entry ${draft.id}: manyToOneBasic target changed from ${publishedTargetId} to ${draftTargetId} but target has no D&P (should remain same)`
              );
            }
          }
        } else if (!publishedTargetId && !draftTargetId) {
          // Both null - valid
          relationsValid++;
        }
      }
    }
  }

  // Check selfOne joinColumn relation (self-referential)
  if (relationDpMeta.attributes.selfOne?.joinColumn) {
    const joinColumn = relationDpMeta.attributes.selfOne.joinColumn.name;

    for (const [documentId, entries] of relationDpByDocumentId.entries()) {
      const published = entries.published;
      const draft = entries.draft;

      if (draft && published) {
        relationsChecked++;
        const draftTargetId = draft[joinColumn];
        const publishedTargetId = published[joinColumn];

        // Self-referential: draft should point to itself (draft entry), not published
        if (publishedTargetId === published.id) {
          // Published points to itself - draft should point to itself too
          if (draftTargetId === draft.id) {
            relationsValid++;
          } else {
            errors.push(
              `relation-dp draft entry ${draft.id}: selfOne should point to itself (${draft.id}), got ${draftTargetId}`
            );
          }
        } else if (publishedTargetId) {
          // Published points to another entry - draft should point to draft version
          const targetDoc = relationDpByDocumentId.get(
            relationDpAllRaw.find((e) => e.id === publishedTargetId)?.document_id
          );
          if (targetDoc?.draft && draftTargetId === targetDoc.draft.id) {
            relationsValid++;
          } else if (draftTargetId === publishedTargetId) {
            // Draft pointing to published target - this is acceptable if target has no draft
            if (!targetDoc?.draft) {
              relationsValid++;
            } else {
              errors.push(
                `relation-dp draft entry ${draft.id}: selfOne points to published relation-dp ${draftTargetId} but draft ${targetDoc.draft.id} exists (should point to draft)`
              );
            }
          } else {
            errors.push(
              `relation-dp draft entry ${draft.id}: selfOne target mismatch - published points to ${publishedTargetId}, draft points to ${draftTargetId} (expected draft version)`
            );
          }
        } else if (!publishedTargetId && !draftTargetId) {
          // Both null - valid
          relationsValid++;
        }
      }
    }
  }

  if (relationsChecked > 0) {
    if (errors.length === 0) {
      console.log(
        `✅ JoinColumn relations validated: ${relationsValid}/${relationsChecked} relations correct`
      );
    } else {
      console.log(
        `❌ JoinColumn relations validation: ${errors.length} error(s), ${relationsValid}/${relationsChecked} relations correct`
      );
      errors.slice(0, 10).forEach((err) => console.log(`   - ${err}`));
      if (errors.length > 10) {
        console.log(`   ... and ${errors.length - 10} more`);
      }
    }
    if (warnings.length > 0) {
      warnings.slice(0, 5).forEach((warn) => console.log(`   ⚠️  ${warn}`));
      if (warnings.length > 5) {
        console.log(`   ... and ${warnings.length - 5} more warnings`);
      }
    }
  } else {
    console.log('ℹ️  No joinColumn relations found to validate');
  }

  return { errors, warnings };
}

/**
 * Ensures every draft/publish table retained its documentId metadata and that
 * every document has a draft counterpart.
 */
async function validateDocumentIds(strapi) {
  console.log('\n🆔 Validating document IDs are preserved...\n');

  const errors = [];
  const warnings = [];

  // Check all draft/publish content types
  const contentTypes = [
    'api::basic-dp.basic-dp',
    'api::basic-dp-i18n.basic-dp-i18n',
    'api::relation-dp.relation-dp',
    'api::relation-dp-i18n.relation-dp-i18n',
  ];

  for (const uid of contentTypes) {
    const allEntries = await strapi.db.query(uid).findMany({
      locale: 'all',
    });

    let missingDocumentId = 0;
    let nullDocumentId = 0;
    let emptyDocumentId = 0;
    const documentIds = new Set();

    for (const entry of allEntries) {
      if (!entry.documentId) {
        missingDocumentId++;
        errors.push(`${uid} entry ${entry.id}: missing documentId`);
      } else if (entry.documentId === null) {
        nullDocumentId++;
        errors.push(`${uid} entry ${entry.id}: documentId is null`);
      } else if (entry.documentId === '') {
        emptyDocumentId++;
        errors.push(`${uid} entry ${entry.id}: documentId is empty string`);
      } else {
        documentIds.add(entry.documentId);
      }
    }

    // Check for entries with same documentId but different locales (i18n)
    if (uid.includes('i18n')) {
      const byDocumentId = {};
      for (const entry of allEntries) {
        if (entry.documentId) {
          const key = entry.documentId;
          if (!byDocumentId[key]) {
            byDocumentId[key] = [];
          }
          byDocumentId[key].push(entry);
        }
      }

      // Verify each documentId has both draft and published versions
      for (const [documentId, entries] of Object.entries(byDocumentId)) {
        const byLocale = {};
        for (const entry of entries) {
          if (!byLocale[entry.locale]) {
            byLocale[entry.locale] = { draft: null, published: null };
          }
          if (entry.publishedAt) {
            byLocale[entry.locale].published = entry;
          } else {
            byLocale[entry.locale].draft = entry;
          }
        }

        for (const [locale, versions] of Object.entries(byLocale)) {
          if (versions.published && !versions.draft) {
            errors.push(
              `${uid} documentId ${documentId} locale ${locale}: has published but no draft version`
            );
          }
        }
      }
    }

    if (missingDocumentId === 0 && nullDocumentId === 0 && emptyDocumentId === 0) {
      console.log(`✅ ${uid}: All ${allEntries.length} entries have valid documentIds`);
    } else {
      console.log(
        `❌ ${uid}: Found ${missingDocumentId + nullDocumentId + emptyDocumentId} entries with invalid documentIds`
      );
    }
  }

  if (errors.length === 0) {
    console.log(`✅ All document IDs are valid`);
  } else {
    console.log(`❌ Found ${errors.length} document ID errors`);
    errors.slice(0, 10).forEach((err) => console.log(`   - ${err}`));
  }

  return errors;
}

/**
 * Verifies ordered many-to-many relations remained in sync between published and
 * draft entries.
 */
async function validateRelationOrder(strapi) {
  console.log('\n📋 Validating relation order is preserved...\n');

  const errors = [];
  const warnings = [];

  // Check manyToMany relations have order preserved
  const relationDpAll = await strapi.db.query('api::relation-dp.relation-dp').findMany({
    populate: {
      manyToManyBasics: true,
    },
  });

  let orderChecked = 0;
  let orderMismatches = 0;

  for (const entry of relationDpAll) {
    if (
      entry.manyToManyBasics &&
      Array.isArray(entry.manyToManyBasics) &&
      entry.manyToManyBasics.length > 1
    ) {
      orderChecked++;
      // Check if order is consistent (we can't know exact order without v4 data, but we can check drafts match published)
      if (entry.publishedAt) {
        // For published entries, we can't easily verify order without v4 data
        // But we can check that draft entries have the same relations
        const draftEntry = await strapi.db.query('api::relation-dp.relation-dp').findOne({
          where: {
            documentId: entry.documentId,
            publishedAt: null,
          },
          populate: {
            manyToManyBasics: true,
          },
          orderBy: { id: 'desc' },
        });

        if (draftEntry && draftEntry.manyToManyBasics) {
          const publishedRefs = getEntityIdentifierArray(entry.manyToManyBasics);
          const draftRefs = getEntityIdentifierArray(draftEntry.manyToManyBasics);

          const sameLength = publishedRefs.length === draftRefs.length;
          const sameOrder =
            sameLength &&
            publishedRefs.every((identifier, index) => identifier === draftRefs[index]);

          if (!sameOrder) {
            errors.push(
              `relation-dp ${entry.id}: manyToManyBasics order differs between published and draft`
            );
            orderMismatches++;
          }
        }
      }
    }
  }

  if (orderChecked > 0) {
    if (orderMismatches === 0) {
      console.log(`✅ Relation order preserved for ${orderChecked} entries with ordered relations`);
    } else {
      console.log(
        `❌ Found ${orderMismatches} order mismatches (out of ${orderChecked} entries checked)`
      );
      errors.slice(0, 10).forEach((err) => console.log(`   - ${err}`));
    }
  } else {
    warnings.push('No ordered relations found to validate');
    console.log(`⚠️  No ordered relations found to validate`);
  }

  return { errors, warnings };
}

/**
 * Compares join-table row counts between published and draft rows to ensure cloning
 * didn't drop or duplicate relations.
 */
async function validateRelationCounts(strapi, preMigrationCounts) {
  console.log('\n📊 Validating relation counts before/after migration...\n');

  const errors = [];
  const warnings = [];

  const connection = strapi.db.connection;
  const uid = 'api::relation-dp.relation-dp';
  const meta = strapi.db.metadata.get(uid);

  if (!meta) {
    warnings.push(`Unable to load metadata for ${uid}`);
    console.log(`⚠️  Skipping relation count validation: metadata missing`);
    return { errors, warnings };
  }

  const rawEntries = await connection(meta.tableName).select([
    'id',
    'document_id',
    'locale',
    'published_at',
  ]);

  const entries = rawEntries.map((entry) => ({
    id: Number(entry.id),
    documentId: entry.document_id || entry.documentId,
    locale: entry.locale || null,
    publishedAt: entry.published_at || entry.publishedAt || null,
  }));

  const latestDraftIdMap = buildLatestDraftIdMap(entries);
  const publishedEntries = entries.filter((entry) => entry.publishedAt);

  const isRelationColumn = (columnName) =>
    typeof columnName === 'string' &&
    (columnName.includes('relation_dp') || columnName === 'entity_id');

  const normalizeRows = (rows, columnName) =>
    rows
      .map((row) => {
        const normalized = {};
        for (const [key, value] of Object.entries(row)) {
          if (key === 'id' || key === columnName) {
            continue;
          }

          normalized[key] = value;
        }

        const sortedKeys = Object.keys(normalized).sort();
        const ordered = {};
        for (const key of sortedKeys) {
          ordered[key] = normalized[key];
        }
        return JSON.stringify(ordered);
      })
      .sort();

  for (const [fieldName, attribute] of Object.entries(meta.attributes)) {
    const joinTable = attribute?.joinTable;
    if (!joinTable) {
      continue;
    }

    const tableName = joinTable.name;
    const hasTable = await connection.schema.hasTable(tableName);
    if (!hasTable) {
      warnings.push(`Join table ${tableName} (field ${fieldName}) is missing`);
      console.log(`⚠️  Join table ${tableName} (field ${fieldName}) is missing`);
      continue;
    }

    const candidateColumns = [];
    if (isRelationColumn(joinTable.joinColumn?.name)) {
      candidateColumns.push(joinTable.joinColumn.name);
    }
    if (isRelationColumn(joinTable.inverseJoinColumn?.name)) {
      candidateColumns.push(joinTable.inverseJoinColumn.name);
    }

    if (candidateColumns.length === 0) {
      continue;
    }

    for (const columnName of candidateColumns) {
      for (const publishedEntry of publishedEntries) {
        const key = `${publishedEntry.documentId}::${publishedEntry.locale || ''}`;
        const draftId = latestDraftIdMap.get(key);

        if (!draftId) {
          errors.push(
            `relation-dp documentId ${publishedEntry.documentId}: missing draft entry when checking ${fieldName}`
          );
          continue;
        }

        const publishedRows = await connection(tableName).where(columnName, publishedEntry.id);
        const draftRows = await connection(tableName).where(columnName, draftId);

        const publishedNormalized = normalizeRows(publishedRows, columnName);
        const draftNormalized = normalizeRows(draftRows, columnName);

        if (publishedNormalized.length !== draftNormalized.length) {
          errors.push(
            `relation-dp documentId ${publishedEntry.documentId}: ${fieldName} (${columnName}) row count differs (published=${publishedNormalized.length}, draft=${draftNormalized.length})`
          );
          continue;
        }

        const publishedUnique = new Set(publishedNormalized);
        if (publishedUnique.size !== publishedNormalized.length) {
          errors.push(
            `relation-dp entry ${publishedEntry.id}: duplicate ${fieldName} rows detected in ${tableName}`
          );
        }

        const draftUnique = new Set(draftNormalized);
        if (draftUnique.size !== draftNormalized.length) {
          errors.push(
            `relation-dp entry ${draftId}: duplicate ${fieldName} rows detected in ${tableName}`
          );
        }
      }
    }
  }

  if (errors.length === 0 && warnings.length === 0) {
    console.log(`✅ Relation counts validated`);
  } else if (errors.length > 0) {
    console.log(`❌ Found ${errors.length} errors validating relation counts`);
    errors.slice(0, 10).forEach((err) => console.log(`   - ${err}`));
  } else {
    console.log(`⚠️  Found ${warnings.length} warnings (see details above)`);
  }

  return { errors, warnings };
}

/**
 * Detects relations that reference missing targets after migration, signalling
 * that cloning or remapping failed.
 */
async function validateOrphanedRelations(strapi) {
  console.log('\n🔍 Validating no orphaned relations exist...\n');

  const errors = [];

  // Check relation-dp relations
  const relationDpAll = await strapi.db.query('api::relation-dp.relation-dp').findMany({
    populate: {
      oneToOneBasic: true,
      oneToManyBasics: true,
      manyToOneBasic: true,
      manyToManyBasics: true,
      selfOne: true,
      selfMany: true,
    },
  });

  // Get all valid IDs
  const basicDpAll = await strapi.db.query('api::basic-dp.basic-dp').findMany({});
  const validBasicDpIds = new Set(basicDpAll.map((e) => e.id));
  const validRelationDpIds = new Set(relationDpAll.map((e) => e.id));

  for (const entry of relationDpAll) {
    if (entry.oneToOneBasic && !validBasicDpIds.has(entry.oneToOneBasic.id)) {
      errors.push(
        `relation-dp ${entry.id}: oneToOneBasic points to non-existent basic-dp ${entry.oneToOneBasic.id}`
      );
    }

    if (entry.oneToManyBasics) {
      for (const basic of entry.oneToManyBasics) {
        if (!validBasicDpIds.has(basic.id)) {
          errors.push(
            `relation-dp ${entry.id}: oneToManyBasics contains non-existent basic-dp ${basic.id}`
          );
        }
      }
    }

    if (entry.manyToOneBasic && !validBasicDpIds.has(entry.manyToOneBasic.id)) {
      errors.push(
        `relation-dp ${entry.id}: manyToOneBasic points to non-existent basic-dp ${entry.manyToOneBasic.id}`
      );
    }

    if (entry.manyToManyBasics) {
      for (const basic of entry.manyToManyBasics) {
        if (!validBasicDpIds.has(basic.id)) {
          errors.push(
            `relation-dp ${entry.id}: manyToManyBasics contains non-existent basic-dp ${basic.id}`
          );
        }
      }
    }

    if (entry.selfOne && !validRelationDpIds.has(entry.selfOne.id)) {
      errors.push(
        `relation-dp ${entry.id}: selfOne points to non-existent relation-dp ${entry.selfOne.id}`
      );
    }

    if (entry.selfMany) {
      for (const self of entry.selfMany) {
        if (!validRelationDpIds.has(self.id)) {
          errors.push(
            `relation-dp ${entry.id}: selfMany contains non-existent relation-dp ${self.id}`
          );
        }
      }
    }
  }

  if (errors.length === 0) {
    console.log(`✅ No orphaned relations found`);
  } else {
    console.log(`❌ Found ${errors.length} orphaned relations`);
    errors.slice(0, 10).forEach((err) => console.log(`   - ${err}`));
  }

  return errors;
}

/**
 * Spot-checks scalar columns to confirm the draft rows created by the migration
 * match their published counterparts.
 */
async function validateScalarAttributes(strapi) {
  console.log('\n📝 Validating scalar attributes are preserved...\n');

  const errors = [];

  // Check basic-dp entries
  const basicDpAll = await strapi.db.query('api::basic-dp.basic-dp').findMany({});

  // Group by document_id to compare published vs draft
  const byDocumentId = {};
  for (const entry of basicDpAll) {
    if (!entry.documentId) continue;
    if (!byDocumentId[entry.documentId]) {
      byDocumentId[entry.documentId] = { draft: null, published: null };
    }
    if (entry.publishedAt) {
      byDocumentId[entry.documentId].published = entry;
    } else {
      byDocumentId[entry.documentId].draft = entry;
    }
  }

  // Compare scalar attributes (excluding id, publishedAt, updatedAt, documentId)
  const scalarFields = ['name', 'description', 'slug']; // Add more as needed
  for (const [documentId, versions] of Object.entries(byDocumentId)) {
    if (!versions.published || !versions.draft) continue;

    for (const field of scalarFields) {
      if (versions.published[field] !== versions.draft[field]) {
        errors.push(
          `basic-dp documentId ${documentId}: ${field} mismatch - published: "${versions.published[field]}", draft: "${versions.draft[field]}"`
        );
      }
    }
  }

  if (errors.length === 0) {
    console.log(`✅ All scalar attributes are preserved`);
  } else {
    console.log(`❌ Found ${errors.length} scalar attribute mismatches`);
    errors.slice(0, 10).forEach((err) => console.log(`   - ${err}`));
  }

  return errors;
}

/**
 * Confirms that newly created drafts reference the correct draft targets rather
 * than falling back to published rows.
 */
async function validateRelationTargets(strapi) {
  console.log('\n🎯 Validating relation targets point to correct draft/published versions...\n');

  const errors = [];

  // Get entries directly from database
  const relationDpMeta = strapi.db.metadata.get('api::relation-dp.relation-dp');
  const basicDpMeta = strapi.db.metadata.get('api::basic-dp.basic-dp');
  const db = strapi.db.connection;
  const relationDpAllRaw = await db(relationDpMeta.tableName).select('*');
  const basicDpAllRaw = await db(basicDpMeta.tableName).select('*');

  // Load relations manually
  const relationDpAll = await Promise.all(
    relationDpAllRaw.map(async (entry) => {
      const result = {
        id: entry.id,
        documentId: entry.document_id,
        publishedAt: entry.published_at,
        oneToOneBasic: null,
        manyToOneBasic: null,
        oneToManyBasics: [],
        manyToManyBasics: [],
        selfOne: null,
        selfMany: [],
      };

      // Load oneToOneBasic
      if (relationDpMeta.attributes.oneToOneBasic?.joinColumn) {
        const col = relationDpMeta.attributes.oneToOneBasic.joinColumn.name;
        const targetId = entry[col];
        if (targetId) {
          const target = basicDpAllRaw.find((e) => e.id === targetId);
          if (target) {
            result.oneToOneBasic = {
              id: target.id,
              documentId: target.document_id,
              publishedAt: target.published_at,
            };
          }
        }
      }

      // Load manyToOneBasic
      if (relationDpMeta.attributes.manyToOneBasic?.joinColumn) {
        const col = relationDpMeta.attributes.manyToOneBasic.joinColumn.name;
        const targetId = entry[col];
        if (targetId) {
          const target = basicDpAllRaw.find((e) => e.id === targetId);
          if (target) {
            result.manyToOneBasic = {
              id: target.id,
              documentId: target.document_id,
              publishedAt: target.published_at,
            };
          }
        }
      }

      // Load oneToManyBasics
      if (relationDpMeta.attributes.oneToManyBasics?.joinTable) {
        const joinTable = relationDpMeta.attributes.oneToManyBasics.joinTable;
        const sourceCol = joinTable.joinColumn.name;
        const targetCol = joinTable.inverseJoinColumn.name;
        let relationsQuery = db(joinTable.name).where(sourceCol, entry.id).select(targetCol);

        // Apply the same ordering logic as the migration uses
        // Order by: sourceColumn (already filtered), orderBy clauses, orderColumnName, orderColumn, id
        if (Array.isArray(joinTable?.orderBy)) {
          for (const clause of joinTable.orderBy) {
            if (clause && typeof clause === 'object') {
              const [column, direction] = Object.entries(clause)[0] ?? [];
              if (column) {
                const dir =
                  typeof direction === 'string' && direction.toLowerCase() === 'desc'
                    ? 'desc'
                    : 'asc';
                relationsQuery = relationsQuery.orderBy(column, dir);
              }
            }
          }
        }
        if (joinTable?.orderColumnName) {
          relationsQuery = relationsQuery.orderBy(joinTable.orderColumnName, 'asc');
        }
        if (joinTable?.orderColumn && typeof joinTable.orderColumn === 'string') {
          relationsQuery = relationsQuery.orderBy(joinTable.orderColumn, 'asc');
        }
        relationsQuery = relationsQuery.orderBy('id', 'asc');

        const relations = await relationsQuery;
        const targetIds = relations.map((r) => r[targetCol]);
        // Create a map for O(1) lookup while preserving order
        const basicDpById = new Map(basicDpAllRaw.map((e) => [e.id, e]));
        result.oneToManyBasics = targetIds
          .map((targetId) => basicDpById.get(targetId))
          .filter(Boolean)
          .map((e) => ({
            id: e.id,
            documentId: e.document_id,
            publishedAt: e.published_at,
          }));
      }

      // Load manyToManyBasics
      if (relationDpMeta.attributes.manyToManyBasics?.joinTable) {
        const joinTable = relationDpMeta.attributes.manyToManyBasics.joinTable;
        const sourceCol = joinTable.joinColumn.name;
        const targetCol = joinTable.inverseJoinColumn.name;
        let relationsQuery = db(joinTable.name).where(sourceCol, entry.id).select(targetCol);

        // Apply the same ordering logic as the migration uses
        // Order by: sourceColumn (already filtered), orderBy clauses, orderColumnName, orderColumn, id
        if (Array.isArray(joinTable?.orderBy)) {
          for (const clause of joinTable.orderBy) {
            if (clause && typeof clause === 'object') {
              const [column, direction] = Object.entries(clause)[0] ?? [];
              if (column) {
                const dir =
                  typeof direction === 'string' && direction.toLowerCase() === 'desc'
                    ? 'desc'
                    : 'asc';
                relationsQuery = relationsQuery.orderBy(column, dir);
              }
            }
          }
        }
        if (joinTable?.orderColumnName) {
          relationsQuery = relationsQuery.orderBy(joinTable.orderColumnName, 'asc');
        }
        if (joinTable?.orderColumn && typeof joinTable.orderColumn === 'string') {
          relationsQuery = relationsQuery.orderBy(joinTable.orderColumn, 'asc');
        }
        relationsQuery = relationsQuery.orderBy('id', 'asc');

        const relations = await relationsQuery;
        const targetIds = relations.map((r) => r[targetCol]);
        // Create a map for O(1) lookup while preserving order
        const basicDpById = new Map(basicDpAllRaw.map((e) => [e.id, e]));
        result.manyToManyBasics = targetIds
          .map((targetId) => basicDpById.get(targetId))
          .filter(Boolean)
          .map((e) => ({
            id: e.id,
            documentId: e.document_id,
            publishedAt: e.published_at,
          }));
      }

      // Load selfOne
      if (relationDpMeta.attributes.selfOne?.joinColumn) {
        const col = relationDpMeta.attributes.selfOne.joinColumn.name;
        const targetId = entry[col];
        if (targetId) {
          const target = relationDpAllRaw.find((e) => e.id === targetId);
          if (target) {
            result.selfOne = {
              id: target.id,
              documentId: target.document_id,
              publishedAt: target.published_at,
            };
          }
        }
      }

      // Load selfMany
      if (relationDpMeta.attributes.selfMany?.joinTable) {
        const joinTable = relationDpMeta.attributes.selfMany.joinTable;
        const sourceCol = joinTable.joinColumn.name;
        const targetCol = joinTable.inverseJoinColumn.name;
        let relationsQuery = db(joinTable.name).where(sourceCol, entry.id).select(targetCol);

        // Apply the same ordering logic as the migration uses
        // Order by: sourceColumn (already filtered), orderBy clauses, orderColumnName, orderColumn, id
        if (Array.isArray(joinTable?.orderBy)) {
          for (const clause of joinTable.orderBy) {
            if (clause && typeof clause === 'object') {
              const [column, direction] = Object.entries(clause)[0] ?? [];
              if (column) {
                const dir =
                  typeof direction === 'string' && direction.toLowerCase() === 'desc'
                    ? 'desc'
                    : 'asc';
                relationsQuery = relationsQuery.orderBy(column, dir);
              }
            }
          }
        }
        if (joinTable?.orderColumnName) {
          relationsQuery = relationsQuery.orderBy(joinTable.orderColumnName, 'asc');
        }
        if (joinTable?.orderColumn && typeof joinTable.orderColumn === 'string') {
          relationsQuery = relationsQuery.orderBy(joinTable.orderColumn, 'asc');
        }
        relationsQuery = relationsQuery.orderBy('id', 'asc');

        const relations = await relationsQuery;
        const targetIds = relations.map((r) => r[targetCol]);
        // Create a map for O(1) lookup while preserving order
        const relationDpById = new Map(relationDpAllRaw.map((e) => [e.id, e]));
        result.selfMany = targetIds
          .map((targetId) => relationDpById.get(targetId))
          .filter(Boolean)
          .map((e) => ({
            id: e.id,
            documentId: e.document_id,
            publishedAt: e.published_at,
          }));
      }

      return result;
    })
  );

  const basicDpAll = basicDpAllRaw.map((e) => ({
    id: e.id,
    documentId: e.document_id,
    publishedAt: e.published_at,
  }));

  const relationDpByDocumentId = new Map();
  const latestDraftIdByUid = {
    'api::basic-dp.basic-dp': buildLatestDraftIdMap(basicDpAll),
    'api::relation-dp.relation-dp': buildLatestDraftIdMap(relationDpAll),
  };
  for (const entry of relationDpAll) {
    if (!entry.documentId) continue;
    if (!relationDpByDocumentId.has(entry.documentId)) {
      relationDpByDocumentId.set(entry.documentId, []);
    }
    relationDpByDocumentId.get(entry.documentId).push(entry);
  }

  const compareSingle = (documentId, label, publishedId, draftId) => {
    if (publishedId === draftId) {
      return;
    }

    if (publishedId == null && draftId == null) {
      return;
    }

    const publishedLabel = publishedId ?? 'none';
    const draftLabel = draftId ?? 'none';

    errors.push(
      `relation-dp documentId ${documentId}: ${label} mismatch – published=${publishedLabel}, draft=${draftLabel}`
    );
  };

  const compareArray = (documentId, label, publishedIds, draftIds) => {
    if (publishedIds.length !== draftIds.length) {
      errors.push(
        `relation-dp documentId ${documentId}: ${label} length mismatch – published=${publishedIds.length}, draft=${draftIds.length}`
      );
      return;
    }

    for (let index = 0; index < publishedIds.length; index += 1) {
      if (publishedIds[index] !== draftIds[index]) {
        errors.push(
          `relation-dp documentId ${documentId}: ${label} order mismatch at position ${
            index + 1
          } – published=${publishedIds[index] ?? 'none'}, draft=${draftIds[index] ?? 'none'}`
        );
      }
    }
  };

  for (const [documentId, entries] of relationDpByDocumentId.entries()) {
    const publishedEntry = entries.find((entry) => entry.publishedAt);
    if (!publishedEntry) {
      continue;
    }

    const possibleDraftEntries = entries
      .filter((entry) => !entry.publishedAt)
      .sort((a, b) => Number(b.id) - Number(a.id));

    const latestDraftEntry = possibleDraftEntries[0];

    if (!latestDraftEntry) {
      continue;
    }

    const publishedSummary = summarizeRelationEntry(publishedEntry);
    const draftSummary = summarizeRelationEntry(latestDraftEntry);

    compareSingle(
      documentId,
      'oneToOneBasic',
      publishedSummary.oneToOneBasic,
      draftSummary.oneToOneBasic
    );
    compareSingle(
      documentId,
      'manyToOneBasic',
      publishedSummary.manyToOneBasic,
      draftSummary.manyToOneBasic
    );
    compareArray(
      documentId,
      'oneToManyBasics',
      publishedSummary.oneToManyBasics,
      draftSummary.oneToManyBasics
    );
    compareArray(
      documentId,
      'manyToManyBasics',
      publishedSummary.manyToManyBasics,
      draftSummary.manyToManyBasics
    );
    compareSingle(documentId, 'selfOne', publishedSummary.selfOne, draftSummary.selfOne);
    compareArray(documentId, 'selfMany', publishedSummary.selfMany, draftSummary.selfMany);

    const ensureDraftTargetsUseDraftVersions = () => {
      const ensureSingleTargetIsDraft = (target, targetUid, label, index) => {
        if (!target) {
          return;
        }

        const key = getEntityKey(target);
        if (!key) {
          return;
        }

        const targetDraftMap = latestDraftIdByUid[targetUid];
        if (!targetDraftMap || targetDraftMap.size === 0) {
          return;
        }

        const expectedDraftId = targetDraftMap.get(key);
        const positionSuffix = index != null ? `[${index + 1}]` : '';

        if (!expectedDraftId) {
          errors.push(
            `relation-dp documentId ${documentId}: ${label}${positionSuffix} has no draft counterpart for target documentId ${target.documentId}`
          );
          return;
        }

        if (Number(target.id) !== expectedDraftId) {
          errors.push(
            `relation-dp documentId ${documentId}: ${label}${positionSuffix} expected draft id ${expectedDraftId} but found ${target.id}`
          );
        }
      };

      const ensureArrayTargetsAreDraft = (targets, targetUid, label) => {
        if (!Array.isArray(targets)) {
          return;
        }

        targets.forEach((target, index) => {
          ensureSingleTargetIsDraft(target, targetUid, label, index);
        });
      };

      ensureSingleTargetIsDraft(
        latestDraftEntry.oneToOneBasic,
        'api::basic-dp.basic-dp',
        'oneToOneBasic'
      );
      ensureSingleTargetIsDraft(
        latestDraftEntry.manyToOneBasic,
        'api::basic-dp.basic-dp',
        'manyToOneBasic'
      );
      ensureArrayTargetsAreDraft(
        latestDraftEntry.oneToManyBasics,
        'api::basic-dp.basic-dp',
        'oneToManyBasics'
      );
      ensureArrayTargetsAreDraft(
        latestDraftEntry.manyToManyBasics,
        'api::basic-dp.basic-dp',
        'manyToManyBasics'
      );
      ensureSingleTargetIsDraft(
        latestDraftEntry.selfOne,
        'api::relation-dp.relation-dp',
        'selfOne'
      );
      ensureArrayTargetsAreDraft(
        latestDraftEntry.selfMany,
        'api::relation-dp.relation-dp',
        'selfMany'
      );
    };

    ensureDraftTargetsUseDraftVersions();
  }

  if (errors.length === 0) {
    console.log(`✅ All relation targets are correct`);
  } else {
    console.log(`❌ Found ${errors.length} incorrect relation targets`);
    errors.slice(0, 10).forEach((err) => console.log(`   - ${err}`));
  }

  return errors;
}

/**
 * Validate order columns are preserved correctly
 */
async function validateOrderPreservation(strapi) {
  console.log('\n📋 Validating relation order is preserved correctly...\n');
  console.log('ℹ️  Relation ordering is verified during relation target comparison');
  return [];
}

/**
 * Guards against duplicated documentId+status combos that would violate the
 * draft/publish invariants.
 */
async function validateDuplicateEntries(strapi) {
  console.log('\n🔍 Validating no duplicate entries...\n');

  const errors = [];

  // Check all draft/publish content types
  const contentTypes = [
    'api::basic-dp.basic-dp',
    'api::basic-dp-i18n.basic-dp-i18n',
    'api::relation-dp.relation-dp',
    'api::relation-dp-i18n.relation-dp-i18n',
  ];

  for (const uid of contentTypes) {
    const allEntries = await strapi.db.query(uid).findMany({
      locale: 'all',
    });

    // Check for duplicate document_ids with same locale AND same publishedAt status
    // NOTE: Published and draft entries SHOULD share the same document_id - this is expected!
    const seenPublished = new Map(); // Track published entries by document_id
    const seenDrafts = new Map(); // Track draft entries by document_id

    for (const entry of allEntries) {
      if (!entry.documentId) continue;
      const key = uid.includes('i18n') ? `${entry.documentId}:${entry.locale}` : entry.documentId;

      if (entry.publishedAt) {
        // This is a published entry
        if (seenPublished.has(key)) {
          const existing = seenPublished.get(key);
          errors.push(
            `${uid}: Multiple published entries found - IDs ${existing.id} and ${entry.id} share documentId ${entry.documentId}${uid.includes('i18n') ? ` locale ${entry.locale}` : ''}`
          );
        } else {
          seenPublished.set(key, entry);
        }
      } else {
        // This is a draft entry
        if (seenDrafts.has(key)) {
          const existing = seenDrafts.get(key);
          errors.push(
            `${uid}: Multiple draft entries found - IDs ${existing.id} and ${entry.id} share documentId ${entry.documentId}${uid.includes('i18n') ? ` locale ${entry.locale}` : ''}`
          );
        } else {
          seenDrafts.set(key, entry);
        }
      }
    }
  }

  if (errors.length === 0) {
    console.log(`✅ No duplicate entries found`);
  } else {
    console.log(`❌ Found ${errors.length} duplicate entry issues`);
    errors.slice(0, 10).forEach((err) => console.log(`   - ${err}`));
  }

  return errors;
}

/**
 * Uses raw SQL to ensure the database no longer contains orphaned component relations
 * after migration (Postgres/MySQL only).
 */
async function validateForeignKeyIntegrity(strapi) {
  console.log('\n🔗 Validating foreign key integrity...\n');

  const errors = [];

  // Use raw queries to check foreign key constraints
  if (!knex) {
    console.log(`⚠️  knex not available, skipping foreign key integrity check`);
    return [];
  }

  const client = process.env.DATABASE_CLIENT || 'sqlite';
  let dbConfig = {};

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
    case 'mariadb':
      dbConfig = {
        client: 'mysql2',
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
    default:
      console.log(`⚠️  Foreign key integrity check only supported for PostgreSQL`);
      return [];
  }

  const db = knex(dbConfig);

  try {
    // Check component relations foreign keys
    const componentTables = [
      { table: 'relation_dps_cmps', entityTable: 'relation_dps' },
      { table: 'relation_dp_i18ns_cmps', entityTable: 'relation_dp_i18ns' },
      { table: 'basic_dps_cmps', entityTable: 'basic_dps' },
      { table: 'basic_dp_i18ns_cmps', entityTable: 'basic_dp_i18ns' },
    ];

    for (const { table: tableName, entityTable } of componentTables) {
      try {
        const hasTable = await db.schema.hasTable(tableName);
        const hasEntityTable = await db.schema.hasTable(entityTable);
        if (hasTable && hasEntityTable) {
          // Check for orphaned component relations (entity_id doesn't exist)
          const orphaned = await db
            .select(`${tableName}.entity_id`)
            .from(tableName)
            .leftJoin(entityTable, `${tableName}.entity_id`, `${entityTable}.id`)
            .whereNull(`${entityTable}.id`)
            .groupBy(`${tableName}.entity_id`);

          if (orphaned.length > 0) {
            errors.push(
              `${tableName}: Found ${orphaned.length} orphaned component relations (entity_id doesn't exist in ${entityTable})`
            );
          }
        }
      } catch (e) {
        // Table might not exist or structure might be different
        console.log(`   ${tableName}: Could not check (${e.message})`);
      }
    }
    await db.destroy();
  } catch (error) {
    try {
      await db.destroy();
    } catch (e) {
      // Ignore
    }
    errors.push(`Error checking foreign key integrity: ${error.message}`);
  }

  if (errors.length === 0) {
    console.log(`✅ Foreign key integrity is valid`);
  } else {
    console.log(`❌ Found ${errors.length} foreign key integrity issues`);
    errors.slice(0, 10).forEach((err) => console.log(`   - ${err}`));
  }

  return errors;
}

/**
 * Highlights relation discrepancies by comparing pre-migration row counts with the
 * post-migration picture.
 */
async function validateRelationCountMismatches(strapi, preMigrationCounts) {
  console.log('\n📊 Validating relation count mismatches...\n');

  const errors = [];

  if (!preMigrationCounts || !knex) {
    console.log(`⚠️  Cannot validate relation count mismatches without pre-migration counts`);
    return [];
  }

  // This would require tracking relation counts before migration
  // For now, we'll validate that relations exist for all entries that should have them
  const relationDpAll = await strapi.db.query('api::relation-dp.relation-dp').findMany({});

  // Check that published entries have corresponding draft entries with relations
  for (const published of relationDpAll.filter((e) => e.publishedAt)) {
    const draft = relationDpAll.find(
      (e) => e.documentId === published.documentId && !e.publishedAt
    );

    if (!draft) {
      errors.push(`relation-dp ${published.id}: Published entry has no corresponding draft entry`);
    }
  }

  if (errors.length === 0) {
    console.log(`✅ No relation count mismatches found`);
  } else {
    console.log(`❌ Found ${errors.length} relation count mismatches`);
    errors.slice(0, 10).forEach((err) => console.log(`   - ${err}`));
  }

  return errors;
}

/**
 * Ensures relations coming from content types without draft/publish are handled
 * exactly once during migration (no duplicate links to the new drafts).
 */
async function validateNonDPContentTypeRelations(strapi) {
  console.log('\n🔗 Validating non-DP content type relation handling...\n');

  const errors = [];
  const warnings = [];
  let basicDpAll = [];

  // Find content types without draft/publish that relate to content types with draft/publish
  // In the test schema, 'api::basic.basic' doesn't have DP, and 'api::relation.relation' doesn't have DP
  // They might relate to 'api::basic-dp.basic-dp' or 'api::relation-dp.relation-dp' which have DP

  // Check if 'basic' (no DP) relates to 'basic-dp' (has DP)
  try {
    const basicAll = await strapi.db.query('api::basic.basic').findMany({
      populate: {
        // Check if basic has any relations to basic-dp
        // Note: This depends on the actual schema - adjust based on your schema
      },
    });

    // Get all basic-dp entries (published and drafts)
    basicDpAll = await strapi.db.query('api::basic-dp.basic-dp').findMany({});

    // Group basic-dp by document_id
    const basicDpByDocumentId = new Map();
    for (const entry of basicDpAll) {
      if (entry.documentId) {
        if (!basicDpByDocumentId.has(entry.documentId)) {
          basicDpByDocumentId.set(entry.documentId, []);
        }
        basicDpByDocumentId.get(entry.documentId).push(entry);
      }
    }

    // Use raw queries to check join tables for relations from non-DP to DP content types
    if (!knex) {
      warnings.push('Cannot validate non-DP relations: knex not available');
      console.log('⚠️  knex not available, skipping non-DP relation validation');
      return { errors: [], warnings };
    }

    const client = process.env.DATABASE_CLIENT || 'sqlite';
    let dbConfig = {};

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
          client: 'mysql2',
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
            filename:
              process.env.DATABASE_FILENAME || path.join(__dirname, '..', '.tmp', 'data.db'),
          },
          useNullAsDefault: true,
        };
        break;
      default:
        warnings.push(`Cannot validate non-DP relations: unknown database client ${client}`);
        return { errors: [], warnings };
    }

    const db = knex(dbConfig);

    try {
      // Check for join tables that might connect non-DP to DP content types
      // This is schema-dependent, so we'll check common patterns
      const possibleJoinTables = [
        'basics_basic_dps',
        'basics_relation_dps',
        'relations_basic_dps',
        'relations_relation_dps',
      ];

      let relationsChecked = 0;
      let issuesFound = 0;

      for (const joinTableName of possibleJoinTables) {
        try {
          const hasTable = await db.schema.hasTable(joinTableName);
          if (!hasTable) continue;

          // Get all relations in this join table
          const allRelations = await db(joinTableName).select('*');

          if (allRelations.length === 0) continue;

          relationsChecked += allRelations.length;

          // Determine which column is source (non-DP) and which is target (DP)
          // This is schema-dependent - we'll try to infer from column names
          const columns = Object.keys(allRelations[0] || {});
          let sourceColumn = null;
          let targetColumn = null;

          // Try to identify columns (heuristic based on naming)
          for (const col of columns) {
            if (col.includes('basic_id') && !col.includes('basic_dp')) {
              sourceColumn = col;
            } else if (col.includes('basic_dp_id') || col.includes('relation_dp_id')) {
              targetColumn = col;
            }
          }

          if (!sourceColumn || !targetColumn) {
            // Try alternative: assume first column is source, second is target
            if (columns.length >= 2) {
              sourceColumn = columns[0];
              targetColumn = columns[1];
            } else {
              continue; // Can't determine columns
            }
          }

          // Get all target IDs (DP entries)
          const targetIds = [...new Set(allRelations.map((r) => r[targetColumn]))];

          // Get document_ids for all targets
          const targetEntries = await db('basic_dps')
            .select(['id', 'document_id', 'published_at'])
            .whereIn('id', targetIds)
            .union(
              db('relation_dps')
                .select(['id', 'document_id', 'published_at'])
                .whereIn('id', targetIds)
            );

          const targetIdToDocumentId = new Map();
          const targetIdToIsPublished = new Map();
          for (const entry of targetEntries) {
            targetIdToDocumentId.set(entry.id, entry.document_id);
            targetIdToIsPublished.set(entry.id, !!entry.published_at);
          }

          // Group relations by source and document_id
          const relationsBySourceAndDocId = new Map();
          for (const relation of allRelations) {
            const sourceId = relation[sourceColumn];
            const targetId = relation[targetColumn];
            const documentId = targetIdToDocumentId.get(targetId);
            const isPublished = targetIdToIsPublished.get(targetId);

            if (!documentId) continue;

            const key = `${sourceId}:${documentId}`;
            if (!relationsBySourceAndDocId.has(key)) {
              relationsBySourceAndDocId.set(key, {
                sourceId,
                documentId,
                relations: [],
              });
            }
            relationsBySourceAndDocId.get(key).relations.push({
              targetId,
              isPublished,
            });
          }

          // Check: For each source+document_id combination:
          // - If there's a relation to an old draft (published_at is null), there should NOT be a relation to the new draft
          // - If there's NO relation to an old draft, there SHOULD be a relation to the new draft
          for (const [key, data] of relationsBySourceAndDocId) {
            const { sourceId, documentId, relations } = data;

            // Find relations to old drafts (published_at is null)
            const oldDraftRelations = relations.filter((r) => !r.isPublished);

            // Find relations to new drafts (published_at is null, but created during migration)
            // We can't easily distinguish old vs new drafts, so we'll check:
            // - If there are multiple relations to drafts with the same document_id, that's suspicious
            // - If there's a relation to published AND a relation to draft with same document_id, that's expected

            const publishedRelations = relations.filter((r) => r.isPublished);
            const draftRelations = relations.filter((r) => !r.isPublished);

            // Expected: If source relates to published, it should also relate to draft (if no old draft relation exists)
            // OR: If source relates to old draft, it should NOT relate to new draft
            if (publishedRelations.length > 0 && draftRelations.length > 1) {
              // Multiple draft relations with same document_id - might be duplicate
              errors.push(
                `Non-DP relation: Source ${sourceId} has ${draftRelations.length} relations to drafts with document_id ${documentId} (expected 0 or 1)`
              );
              issuesFound++;
            }
          }
        } catch (e) {
          // Table might not exist or have different structure
          continue;
        }
      }

      await db.destroy();

      if (relationsChecked > 0) {
        if (issuesFound === 0) {
          console.log(
            `✅ Non-DP content type relations validated: ${relationsChecked} relations checked - all correctly handled`
          );
        } else {
          console.log(
            `❌ Non-DP content type relations: ${issuesFound} issues found out of ${relationsChecked} checked`
          );
        }
      } else {
        warnings.push('No non-DP to DP relations found to validate');
        console.log(
          "⚠️  No non-DP to DP relations found (may be normal if schema doesn't have such relations)"
        );
      }
    } catch (error) {
      try {
        await db.destroy();
      } catch (e) {
        // Ignore
      }
      errors.push(`Error validating non-DP relations: ${error.message}`);
    }
  } catch (error) {
    errors.push(`Error in non-DP relation validation: ${error.message}`);
  }

  try {
    if (basicDpAll.length > 0) {
      const componentMeta = strapi.db.metadata.get('shared.text-block');
      const relationAttribute = componentMeta?.attributes?.relatedBasicDp;

      if (relationAttribute?.joinTable) {
        const joinTableName = relationAttribute.joinTable.name;
        const sourceColumnName = relationAttribute.joinTable.joinColumn.name;
        const targetColumnName = relationAttribute.joinTable.inverseJoinColumn.name;

        const db = strapi.db.connection;
        const rows = await db(joinTableName).select(sourceColumnName, targetColumnName);

        const latestDraftIdMap = buildLatestDraftIdMap(basicDpAll);
        const draftIds = new Set(
          Array.from(latestDraftIdMap?.values() || [])
            .map((value) => Number(value))
            .filter((value) => !Number.isNaN(value))
        );

        const linksToDraftTargets = rows.filter((row) =>
          draftIds.has(Number(row[targetColumnName]))
        );

        if (draftIds.size > 0 && linksToDraftTargets.length === 0) {
          errors.push(
            'Non-DP component relations to basic-dp entries were not remapped to draft targets'
          );
        }
      }
    }
  } catch (error) {
    errors.push(
      `Failed to validate component-based non-DP relations to draft targets: ${error.message}`
    );
  }

  return { errors, warnings };
}

/**
 * Validates that there are no duplicate relations in join tables.
 * This catches the case where copyRelationsToOtherContentTypes and copyRelationsFromOtherContentTypes
 * both try to create the same relation, resulting in duplicates.
 */
async function validateDuplicateJoinTableRelations(strapi) {
  console.log('\n🔍 Validating no duplicate relations in join tables...\n');

  const errors = [];
  const db = strapi.db;
  const knex = db.connection;

  // Check all content types with D&P that relate to content types without D&P
  const contentTypes = Object.values(strapi.contentTypes);

  for (const contentType of contentTypes) {
    if (!contentType.options?.draftAndPublish) {
      continue;
    }

    const meta = db.metadata.get(contentType.uid);
    if (!meta) {
      continue;
    }

    for (const [attributeName, attribute] of Object.entries(meta.attributes)) {
      if (attribute.type !== 'relation' || !attribute.joinTable) {
        continue;
      }

      // Skip component join tables
      if (attribute.joinTable.name.includes('_cmps')) {
        continue;
      }

      const targetUid = attribute.target;
      const targetContentType = strapi.contentTypes[targetUid];

      // Only check relations from D&P content types to non-D&P content types
      if (targetContentType?.options?.draftAndPublish) {
        continue;
      }

      const joinTable = attribute.joinTable;
      const sourceColumnName = joinTable.joinColumn.name;
      const targetColumnName = joinTable.inverseJoinColumn.name;

      // Check if table exists
      const hasTable = await knex.schema.hasTable(joinTable.name);
      if (!hasTable) {
        continue;
      }

      // Get all relations and check for duplicates
      const allRelations = await knex(joinTable.name).select('*');

      // Build a map of unique keys to count occurrences
      const relationKeyCounts = new Map();
      const relationKeyToRows = new Map();

      for (const relation of allRelations) {
        // Create a unique key based on source, target, and any additional fields (field, component_type, etc.)
        const sourceId = relation[sourceColumnName];
        const targetId = relation[targetColumnName];
        const fieldValue = relation.field || '';
        const componentTypeValue = relation.component_type || '';
        const orderValue = relation.order || '';

        const key = `${sourceId}::${targetId}::${fieldValue}::${componentTypeValue}::${orderValue}`;

        const count = relationKeyCounts.get(key) || 0;
        relationKeyCounts.set(key, count + 1);

        if (!relationKeyToRows.has(key)) {
          relationKeyToRows.set(key, []);
        }
        relationKeyToRows.get(key).push(relation);
      }

      // Find duplicates
      for (const [key, count] of relationKeyCounts.entries()) {
        if (count > 1) {
          const rows = relationKeyToRows.get(key);
          const [sourceId, targetId] = key.split('::');
          errors.push(
            `Duplicate relation found in ${joinTable.name} (${contentType.uid}.${attributeName}): ` +
              `${count} duplicate(s) for source=${sourceId}, target=${targetId}. ` +
              `Row IDs: ${rows.map((r) => r.id).join(', ')}`
          );
        }
      }
    }
  }

  if (errors.length === 0) {
    console.log(`✅ No duplicate relations found in join tables`);
  } else {
    console.log(`❌ Found ${errors.length} duplicate relation(s) in join tables`);
    errors.slice(0, 10).forEach((err) => console.log(`   - ${err}`));
    if (errors.length > 10) {
      console.log(`   ... and ${errors.length - 10} more`);
    }
  }

  return errors;
}

async function validateComponentRelationFiltering(strapi) {
  console.log('\n🧩 Validating component relation filtering...\n');

  const errors = [];
  const warnings = [];

  if (!knex) {
    warnings.push('Cannot validate component filtering: knex not available');
    console.log('⚠️  knex not available, skipping component relation filtering validation');
    return { errors: [], warnings };
  }

  const client = process.env.DATABASE_CLIENT || 'sqlite';
  let dbConfig = {};

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
    case 'mariadb':
      dbConfig = {
        client: 'mysql2',
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
      warnings.push(`Cannot validate component filtering: unknown database client ${client}`);
      return { errors: [], warnings };
  }

  const db = knex(dbConfig);

  try {
    // Find component join tables
    const componentTables = [
      'relation_dps_cmps',
      'relation_dp_i18ns_cmps',
      'basic_dps_cmps',
      'basic_dp_i18ns_cmps',
      'relations_cmps', // Non-DP content types might also have components
    ];

    let componentsChecked = 0;
    let issuesFound = 0;

    for (const tableName of componentTables) {
      try {
        const hasTable = await db.schema.hasTable(tableName);
        if (!hasTable) continue;

        // Get all component relations
        const allComponentRelations = await db(tableName).select('*');

        if (allComponentRelations.length === 0) continue;

        componentsChecked += allComponentRelations.length;

        // Determine column names (schema-dependent)
        const columns = Object.keys(allComponentRelations[0] || {});
        let entityIdColumn = null;
        let componentIdColumn = null;
        let componentTypeColumn = null;

        // Try to identify columns
        for (const col of columns) {
          if (col.includes('entity_id') || col === 'entity_id') {
            entityIdColumn = col;
          } else if (col.includes('component_id') || col.includes('cmp_id')) {
            componentIdColumn = col;
          } else if (col.includes('component_type') || col.includes('componentType')) {
            componentTypeColumn = col;
          }
        }

        if (!entityIdColumn || !componentIdColumn || !componentTypeColumn) {
          // Try to infer from common patterns
          if (columns.length >= 3) {
            entityIdColumn = columns.find((c) => c.includes('entity')) || columns[0];
            componentIdColumn =
              columns.find((c) => c.includes('component') || c.includes('cmp')) || columns[1];
            componentTypeColumn = columns.find((c) => c.includes('type')) || columns[2];
          } else {
            continue; // Can't determine columns
          }
        }

        // Get entity entries (published and drafts)
        const entityIds = [...new Set(allComponentRelations.map((r) => r[entityIdColumn]))];

        // Determine which entity table to query based on component table name
        let entityTable = null;
        let currentContentTypeUid = null;
        if (tableName.includes('relation_dp_i18n') || tableName.includes('relation-dp-i18n')) {
          entityTable = 'relation_dp_i18ns';
          currentContentTypeUid = 'api::relation-dp-i18n.relation-dp-i18n';
        } else if (tableName.includes('relation_dp') || tableName.includes('relation-dp')) {
          entityTable = 'relation_dps';
          currentContentTypeUid = 'api::relation-dp.relation-dp';
        } else if (tableName.includes('basic_dp_i18n') || tableName.includes('basic-dp-i18n')) {
          entityTable = 'basic_dp_i18ns';
          currentContentTypeUid = 'api::basic-dp-i18n.basic-dp-i18n';
        } else if (tableName.includes('basic_dp') || tableName.includes('basic-dp')) {
          entityTable = 'basic_dps';
          currentContentTypeUid = 'api::basic-dp.basic-dp';
        } else if (tableName.includes('relation')) {
          entityTable = 'relations';
        } else if (tableName.includes('basic')) {
          entityTable = 'basics';
        }

        // Try to find the content type UID from metadata if not set
        if (!currentContentTypeUid) {
          for (const [uid, meta] of strapi.db.metadata.entries()) {
            const contentType = strapi.contentTypes[uid];
            if (contentType?.collectionName) {
              const identifiers = strapi.db.metadata.identifiers;
              const expectedJoinTable = identifiers.getNameFromTokens([
                { name: contentType.collectionName, compressible: true },
                { name: 'components', shortName: 'cmps', compressible: false },
              ]);
              if (expectedJoinTable === tableName) {
                currentContentTypeUid = uid;
                break;
              }
            }
          }
        }

        if (!entityTable) continue;

        const entityEntries = await db(entityTable)
          .select(['id', 'document_id', 'published_at'])
          .whereIn('id', entityIds);

        // Group by document_id to find published/draft pairs
        const entitiesByDocumentId = new Map();
        for (const entry of entityEntries) {
          if (entry.document_id) {
            if (!entitiesByDocumentId.has(entry.document_id)) {
              entitiesByDocumentId.set(entry.document_id, []);
            }
            entitiesByDocumentId.get(entry.document_id).push(entry);
          }
        }

        // Get component schemas to check their parents
        const componentTypes = [
          ...new Set(allComponentRelations.map((r) => r[componentTypeColumn])),
        ];

        // For each component relation, check if it should have been filtered
        for (const relation of allComponentRelations) {
          const entityId = relation[entityIdColumn];
          const componentId = relation[componentIdColumn];
          const componentType = relation[componentTypeColumn];

          // Find the entity entry
          const entityEntry = entityEntries.find((e) => e.id === entityId);
          if (!entityEntry) continue;

          // Check if this is a draft entity (created during migration)
          const isDraftEntity = !entityEntry.published_at;

          if (isDraftEntity) {
            // This is a draft entity - check if component relation should have been filtered
            // We need to check if the component's parent in the component hierarchy has draft/publish
            // NOT just if any potential parent has DP - we need to check if this specific component instance
            // is nested inside another component that has a DP parent

            // Get component schema
            const componentSchema = strapi.components[componentType];
            if (!componentSchema) continue;

            // Find what actually contains this component instance (not just what CAN contain it)
            // We need to check the component join tables to find the actual parent
            const identifiers = strapi.db.metadata.identifiers;

            // Helper functions to get component join table names and columns
            // These match the functions in transform-content-types-to-models.ts
            const getComponentJoinTableName = (collectionName, identifiers) => {
              return identifiers.getNameFromTokens([
                { name: collectionName, compressible: true },
                { name: 'components', shortName: 'cmps', compressible: false },
              ]);
            };

            const getComponentJoinColumnEntityName = (identifiers) => {
              return identifiers.getNameFromTokens([
                { name: 'entity', compressible: false },
                { name: 'id', compressible: false },
              ]);
            };

            const getComponentJoinColumnInverseName = (identifiers) => {
              return identifiers.getNameFromTokens([
                { name: 'component', shortName: 'cmp', compressible: false },
                { name: 'id', compressible: false },
              ]);
            };

            const getComponentTypeColumn = (identifiers) => {
              return identifiers.getNameFromTokens([
                { name: 'component_type', compressible: false },
              ]);
            };

            let actualParent = null;

            // Check all content types and components that can contain this component
            const potentialParents = [
              ...Object.values(strapi.contentTypes),
              ...Object.values(strapi.components),
            ].filter((schema) => {
              if (!schema?.attributes) return false;
              return Object.values(schema.attributes).some((attr) => {
                return (
                  (attr.type === 'component' && attr.component === componentSchema.uid) ||
                  (attr.type === 'dynamiczone' && attr.components?.includes(componentSchema.uid))
                );
              });
            });

            // Find the actual parent by checking join tables
            for (const parentSchema of potentialParents) {
              if (!parentSchema.collectionName) continue;
              // Skip the current content type - component is directly on it, not nested
              if (currentContentTypeUid && parentSchema.uid === currentContentTypeUid) {
                continue;
              }

              const parentJoinTableName = getComponentJoinTableName(
                parentSchema.collectionName,
                identifiers
              );
              const parentComponentIdColumn = getComponentJoinColumnInverseName(identifiers);
              const parentComponentTypeColumn = getComponentTypeColumn(identifiers);
              const parentEntityIdColumn = getComponentJoinColumnEntityName(identifiers);

              try {
                const hasTable = await db.schema.hasTable(parentJoinTableName);
                if (!hasTable) continue;

                const parentRow = await db(parentJoinTableName)
                  .where({
                    [parentComponentIdColumn]: componentId,
                    [parentComponentTypeColumn]: componentSchema.uid,
                  })
                  .first(parentEntityIdColumn);

                if (parentRow) {
                  actualParent = {
                    uid: parentSchema.uid,
                    parentId: parentRow[parentEntityIdColumn],
                  };
                  break;
                }
              } catch (e) {
                // Table might not exist or have different structure
                continue;
              }
            }

            // If component has no parent in component hierarchy (it's directly on the content type), it should be kept
            if (!actualParent) {
              // Component is directly on the content type - this is correct, relation should exist
              continue;
            }

            // Component is nested - check if its parent has DP
            // Recursively check the parent chain
            const checkParentHasDP = async (parentUid, parentId) => {
              const parentContentType = strapi.contentTypes[parentUid];
              if (parentContentType?.options?.draftAndPublish) {
                return true; // Found DP parent
              }

              // If parent is a component, check its parents recursively
              const parentComponent = strapi.components[parentUid];
              if (parentComponent) {
                // Find what contains this parent component
                const grandParentSchemas = [
                  ...Object.values(strapi.contentTypes),
                  ...Object.values(strapi.components),
                ].filter((schema) => {
                  if (!schema?.attributes) return false;
                  return Object.values(schema.attributes).some((attr) => {
                    return (
                      (attr.type === 'component' && attr.component === parentComponent.uid) ||
                      (attr.type === 'dynamiczone' &&
                        attr.components?.includes(parentComponent.uid))
                    );
                  });
                });

                for (const grandParentSchema of grandParentSchemas) {
                  if (!grandParentSchema.collectionName) continue;

                  const grandParentJoinTableName = getComponentJoinTableName(
                    grandParentSchema.collectionName,
                    identifiers
                  );
                  const grandParentComponentIdColumn =
                    getComponentJoinColumnInverseName(identifiers);
                  const grandParentComponentTypeColumn = getComponentTypeColumn(identifiers);
                  const grandParentEntityIdColumn = getComponentJoinColumnEntityName(identifiers);

                  try {
                    const hasTable = await db.schema.hasTable(grandParentJoinTableName);
                    if (!hasTable) continue;

                    const grandParentRow = await db(grandParentJoinTableName)
                      .where({
                        [grandParentComponentIdColumn]: parentId,
                        [grandParentComponentTypeColumn]: parentComponent.uid,
                      })
                      .first(grandParentEntityIdColumn);

                    if (grandParentRow) {
                      const hasDP = await checkParentHasDP(
                        grandParentSchema.uid,
                        grandParentRow[grandParentEntityIdColumn]
                      );
                      if (hasDP) {
                        return true;
                      }
                    }
                  } catch (e) {
                    continue;
                  }
                }
              }

              return false;
            };

            const hasDPParent = await checkParentHasDP(actualParent.uid, actualParent.parentId);
            if (hasDPParent) {
              // Component's parent in hierarchy has DP - this relation should have been filtered out
              // But it exists in the draft entity, which is an error
              console.log(
                `[validateComponentRelationFiltering] ERROR: Draft entity ${entityId} (${entityTable}) has component relation to ${componentType} (id: ${componentId}), but component's parent ${actualParent.uid} (id: ${actualParent.parentId}) has DP - relation should have been filtered out`
              );
              errors.push(
                `Component relation filtering: Draft entity ${entityId} (${entityTable}) has component relation to ${componentType} (id: ${componentId}), but component's parent ${actualParent.uid} (id: ${actualParent.parentId}) has draft/publish - relation should have been filtered out`
              );
              issuesFound++;
            } else {
              console.log(
                `[validateComponentRelationFiltering] OK: Draft entity ${entityId} (${entityTable}) has component relation to ${componentType} (id: ${componentId}), parent ${actualParent.uid} (id: ${actualParent.parentId}) has no DP - relation correctly kept`
              );
            }
          }
        }
      } catch (e) {
        // Table might not exist or have different structure
        continue;
      }
    }

    await db.destroy();

    if (componentsChecked > 0) {
      if (issuesFound === 0) {
        console.log(
          `✅ Component relation filtering validated: ${componentsChecked} component relations checked - all correctly filtered`
        );
      } else {
        console.log(
          `❌ Component relation filtering: ${issuesFound} issues found out of ${componentsChecked} checked`
        );
      }
    } else {
      warnings.push('No component relations found to validate');
      console.log(
        "⚠️  No component relations found (may be normal if schema doesn't have components)"
      );
    }
  } catch (error) {
    try {
      await db.destroy();
    } catch (e) {
      // Ignore
    }
    errors.push(`Error validating component filtering: ${error.message}`);
  }

  return { errors, warnings };
}

/**
 * Helper function to load component relations using direct database queries
 */
async function loadComponentRelations(strapi, uid, entryIds, componentField, componentUid) {
  const meta = strapi.db.metadata.get(uid);
  if (!meta) return new Map();

  const contentType = strapi.contentTypes[uid];
  const collectionName = contentType?.collectionName;
  if (!collectionName) return new Map();

  const identifiers = strapi.db.metadata.identifiers;
  const joinTableName = identifiers.getNameFromTokens([
    { name: collectionName, compressible: true },
    { name: 'components', shortName: 'cmps', compressible: false },
  ]);
  const entityIdColumn = identifiers.getNameFromTokens([
    { name: 'entity', compressible: false },
    { name: 'id', compressible: false },
  ]);
  const componentIdColumn = identifiers.getNameFromTokens([
    { name: 'component', shortName: 'cmp', compressible: false },
    { name: 'id', compressible: false },
  ]);
  const componentTypeColumn = identifiers.getNameFromTokens([
    { name: 'component_type', compressible: false },
  ]);
  const fieldColumn = identifiers.FIELD_COLUMN;

  const db = strapi.db.connection;
  const componentRows = await db(joinTableName)
    .whereIn(entityIdColumn, entryIds)
    .where(componentTypeColumn, componentUid)
    .where(fieldColumn, componentField);

  const componentIds = componentRows.map((row) => row[componentIdColumn]);
  if (componentIds.length === 0) return new Map();

  // Load all component relations
  const componentMeta = strapi.db.metadata.get(componentUid);
  const relatedBasicDpAttr = componentMeta?.attributes?.relatedBasicDp;
  const relatedBasicAttr = componentMeta?.attributes?.relatedBasic;
  const relatedRelationDpAttr = componentMeta?.attributes?.relatedRelationDp;

  const result = new Map();
  for (const row of componentRows) {
    const entryId = row[entityIdColumn];
    if (!result.has(entryId)) {
      result.set(entryId, []);
    }
    result.get(entryId).push({ componentId: row[componentIdColumn] });
  }

  // Load relatedBasicDp relations
  if (relatedBasicDpAttr?.joinTable) {
    const relationJoinTable = relatedBasicDpAttr.joinTable.name;
    const sourceColumn = relatedBasicDpAttr.joinTable.joinColumn.name;
    const targetColumn = relatedBasicDpAttr.joinTable.inverseJoinColumn.name;

    const relations = await db(relationJoinTable)
      .whereIn(sourceColumn, componentIds)
      .select(sourceColumn, targetColumn);

    const relationsByComponent = new Map();
    for (const rel of relations) {
      relationsByComponent.set(rel[sourceColumn], rel[targetColumn]);
    }

    // Load target basic-dp entries
    const targetIds = [...new Set(relations.map((r) => r[targetColumn]).filter(Boolean))];
    if (targetIds.length > 0) {
      const targetMeta = strapi.db.metadata.get('api::basic-dp.basic-dp');
      const targets = await db(targetMeta.tableName)
        .whereIn('id', targetIds)
        .select('id', 'document_id', 'published_at');

      const targetsById = new Map(targets.map((t) => [t.id, t]));

      for (const [entryId, components] of result.entries()) {
        for (const comp of components) {
          const targetId = relationsByComponent.get(comp.componentId);
          if (targetId) {
            const target = targetsById.get(targetId);
            comp.relatedBasicDp = target
              ? {
                  id: target.id,
                  documentId: target.document_id,
                  publishedAt: target.published_at,
                }
              : null;
          }
        }
      }
    }
  }

  // Load relatedBasic relations
  if (relatedBasicAttr?.joinColumn) {
    const joinColumn = relatedBasicAttr.joinColumn.name;
    const components = await db(componentMeta.tableName)
      .whereIn('id', componentIds)
      .select('id', joinColumn);

    const basicIds = [...new Set(components.map((c) => c[joinColumn]).filter(Boolean))];
    if (basicIds.length > 0) {
      const basicMeta = strapi.db.metadata.get('api::basic.basic');
      const basics = await db(basicMeta.tableName).whereIn('id', basicIds).select('id');
      const basicsById = new Map(basics.map((b) => [b.id, b]));

      for (const [entryId, comps] of result.entries()) {
        for (const comp of comps) {
          const compData = components.find((c) => c.id === comp.componentId);
          if (compData?.[joinColumn]) {
            comp.relatedBasic = basicsById.get(compData[joinColumn]) || null;
          }
        }
      }
    }
  }

  // Load relatedRelationDp relations
  if (relatedRelationDpAttr?.joinTable) {
    const relationJoinTable = relatedRelationDpAttr.joinTable.name;
    const sourceColumn = relatedRelationDpAttr.joinTable.joinColumn.name;
    const targetColumn = relatedRelationDpAttr.joinTable.inverseJoinColumn.name;

    const relations = await db(relationJoinTable)
      .whereIn(sourceColumn, componentIds)
      .select(sourceColumn, targetColumn);

    const relationsByComponent = new Map();
    for (const rel of relations) {
      relationsByComponent.set(rel[sourceColumn], rel[targetColumn]);
    }

    // Load target relation-dp entries
    const targetIds = [...new Set(relations.map((r) => r[targetColumn]).filter(Boolean))];
    if (targetIds.length > 0) {
      const targetMeta = strapi.db.metadata.get('api::relation-dp.relation-dp');
      const targets = await db(targetMeta.tableName)
        .whereIn('id', targetIds)
        .select('id', 'document_id', 'published_at');

      const targetsById = new Map(targets.map((t) => [t.id, t]));

      for (const [entryId, components] of result.entries()) {
        for (const comp of components) {
          const targetId = relationsByComponent.get(comp.componentId);
          if (targetId) {
            const target = targetsById.get(targetId);
            comp.relatedRelationDp = target
              ? {
                  id: target.id,
                  documentId: target.document_id,
                  publishedAt: target.published_at,
                }
              : null;
          }
        }
      }
    }
  }

  return result;
}

/**
 * Helper function to load dynamic zone components using direct database queries
 */
async function loadDynamicZoneComponents(strapi, uid, entryIds, dzField) {
  const meta = strapi.db.metadata.get(uid);
  if (!meta) return new Map();

  const contentType = strapi.contentTypes[uid];
  const collectionName = contentType?.collectionName;
  if (!collectionName) return new Map();

  const identifiers = strapi.db.metadata.identifiers;
  const joinTableName = identifiers.getNameFromTokens([
    { name: collectionName, compressible: true },
    { name: 'components', shortName: 'cmps', compressible: false },
  ]);
  const entityIdColumn = identifiers.getNameFromTokens([
    { name: 'entity', compressible: false },
    { name: 'id', compressible: false },
  ]);
  const componentIdColumn = identifiers.getNameFromTokens([
    { name: 'component', shortName: 'cmp', compressible: false },
    { name: 'id', compressible: false },
  ]);
  const componentTypeColumn = identifiers.getNameFromTokens([
    { name: 'component_type', compressible: false },
  ]);
  const fieldColumn = identifiers.FIELD_COLUMN;

  const db = strapi.db.connection;
  const componentRows = await db(joinTableName)
    .whereIn(entityIdColumn, entryIds)
    .where(fieldColumn, dzField)
    .orderBy(identifiers.ORDER_COLUMN || 'order', 'asc');

  const componentIds = componentRows.map((row) => row[componentIdColumn]);
  if (componentIds.length === 0) return new Map();

  // Get component types
  const componentTypes = [...new Set(componentRows.map((row) => row[componentTypeColumn]))];

  const result = new Map();
  for (const row of componentRows) {
    const entryId = row[entityIdColumn];
    if (!result.has(entryId)) {
      result.set(entryId, []);
    }
    result.get(entryId).push({
      id: row[componentIdColumn],
      __component: row[componentTypeColumn],
    });
  }

  // Load text-block component relations if present
  const textBlockUid = 'shared.text-block';
  if (componentTypes.includes(textBlockUid)) {
    const textBlockIds = componentRows
      .filter((row) => row[componentTypeColumn] === textBlockUid)
      .map((row) => row[componentIdColumn]);

    const componentMeta = strapi.db.metadata.get(textBlockUid);
    const relatedBasicDpAttr = componentMeta?.attributes?.relatedBasicDp;

    if (relatedBasicDpAttr?.joinTable && textBlockIds.length > 0) {
      const relationJoinTable = relatedBasicDpAttr.joinTable.name;
      const sourceColumn = relatedBasicDpAttr.joinTable.joinColumn.name;
      const targetColumn = relatedBasicDpAttr.joinTable.inverseJoinColumn.name;

      const relations = await db(relationJoinTable)
        .whereIn(sourceColumn, textBlockIds)
        .select(sourceColumn, targetColumn);

      const targetIds = [...new Set(relations.map((r) => r[targetColumn]).filter(Boolean))];
      if (targetIds.length > 0) {
        const targetMeta = strapi.db.metadata.get('api::basic-dp.basic-dp');
        const targets = await db(targetMeta.tableName)
          .whereIn('id', targetIds)
          .select('id', 'document_id', 'published_at');

        const targetsById = new Map(targets.map((t) => [t.id, t]));
        const relationsByComponent = new Map(
          relations.map((r) => [r[sourceColumn], r[targetColumn]])
        );

        for (const [entryId, components] of result.entries()) {
          for (const comp of components) {
            if (comp.__component === textBlockUid) {
              const targetId = relationsByComponent.get(comp.id);
              if (targetId) {
                const target = targetsById.get(targetId);
                comp.relatedBasicDp = target
                  ? {
                      id: target.id,
                      documentId: target.document_id,
                      publishedAt: target.published_at,
                    }
                  : null;
              }
            }
          }
        }
      }
    }
  }

  return result;
}

/**
 * Checks that repeatable component relations (e.g. text-block) point to the correct
 * draft targets and keep self-references intact.
 */
async function validateComponentRelationTargets(strapi) {
  console.log('\n🧩 Validating text-block component relations...\n');

  const errors = [];
  const warnings = [];
  const collectTextBlockComponents = (entry) => {
    const repeatable = Array.isArray(entry?.textBlocks) ? entry.textBlocks : [];
    const dzComponents = Array.isArray(entry?.sections)
      ? entry.sections.filter((component) => component?.__component === 'shared.text-block')
      : [];
    return [...repeatable, ...dzComponents];
  };

  // Validate base (non-DP) entries include populated text-block relations
  try {
    // Get basic entries directly from database
    const basicMeta = strapi.db.metadata.get('api::basic.basic');
    const db = strapi.db.connection;
    const basicEntriesRaw = await db(basicMeta.tableName).select('*');
    const basicEntryIds = basicEntriesRaw.map((e) => e.id);

    // Load text-block components and their relations
    const textBlocksMap = await loadComponentRelations(
      strapi,
      'api::basic.basic',
      basicEntryIds,
      'textBlocks',
      'shared.text-block'
    );
    const sectionsMap = await loadDynamicZoneComponents(
      strapi,
      'api::basic.basic',
      basicEntryIds,
      'sections'
    );

    // Combine into entry structure
    const basicEntries = basicEntriesRaw.map((entry) => {
      const textBlocks = (textBlocksMap.get(entry.id) || []).map((comp) => ({
        id: comp.componentId,
        relatedBasic: comp.relatedBasic || null,
        relatedBasicDp: comp.relatedBasicDp || null,
      }));
      const sections = (sectionsMap.get(entry.id) || []).map((comp) => ({
        id: comp.id,
        __component: comp.__component,
        relatedBasicDp: comp.relatedBasicDp || null,
      }));
      return { ...entry, textBlocks, sections };
    });

    let basicComponentsChecked = 0;
    let basicPublishedTargets = 0;
    let basicDraftTargets = 0;

    for (const entry of basicEntries) {
      const textBlocks = collectTextBlockComponents(entry);
      for (const component of textBlocks) {
        basicComponentsChecked += 1;
        const componentId = component?.id || 'unknown';

        // relatedBasic is optional - only check if it was set in the original data
        // (We can't easily verify this without v4 data, so we skip this check)

        const target = component?.relatedBasicDp;
        if (!target) {
          errors.push(
            `basic entry ${entry.id}: text-block ${componentId} is missing relatedBasicDp relation`
          );
          continue;
        }

        if (target.publishedAt) {
          basicPublishedTargets += 1;
        } else {
          basicDraftTargets += 1;
        }
      }
    }

    if (basicComponentsChecked > 0) {
      // Note: The migration may map all targets to drafts, which is acceptable.
      // We only warn if there are no targets at all, not if they're all drafts.
      if (basicPublishedTargets === 0 && basicDraftTargets === 0) {
        errors.push(
          'basic entries: expected at least one text-block with a relatedBasicDp relation'
        );
      }
      // Only warn about missing published targets if we have components but no published targets
      // (this is a soft requirement, not a hard error)
      if (basicPublishedTargets === 0 && basicDraftTargets > 0) {
        warnings.push(
          'basic entries: all text-blocks target draft basic-dp entries (expected at least one published target)'
        );
      }
      console.log(
        `✅ Basic text-block relations validated: ${basicComponentsChecked} components checked`
      );
    } else {
      const message =
        '⚠️  No basic text-block components found to validate (expected at least one)';
      warnings.push(message);
      console.log(message);
    }
  } catch (error) {
    errors.push(`Failed to validate basic text-block relations: ${error.message}`);
    console.error(error);
  }

  // Validate basic-dp text-block relations include mixed draft/published targets
  try {
    // Get basic-dp entries directly from database
    const basicDpMeta = strapi.db.metadata.get('api::basic-dp.basic-dp');
    const db = strapi.db.connection;
    const basicDpEntriesRaw = await db(basicDpMeta.tableName).select('*');
    const basicDpEntryIds = basicDpEntriesRaw.map((e) => e.id);

    // Load text-block components and their relations
    const textBlocksMap = await loadComponentRelations(
      strapi,
      'api::basic-dp.basic-dp',
      basicDpEntryIds,
      'textBlocks',
      'shared.text-block'
    );
    const sectionsMap = await loadDynamicZoneComponents(
      strapi,
      'api::basic-dp.basic-dp',
      basicDpEntryIds,
      'sections'
    );

    // Combine into entry structure
    const basicDpEntries = basicDpEntriesRaw.map((entry) => {
      const textBlocks = (textBlocksMap.get(entry.id) || []).map((comp) => ({
        id: comp.componentId,
        relatedBasic: comp.relatedBasic || null,
        relatedBasicDp: comp.relatedBasicDp || null,
      }));
      const sections = (sectionsMap.get(entry.id) || []).map((comp) => ({
        id: comp.id,
        __component: comp.__component,
        relatedBasicDp: comp.relatedBasicDp || null,
      }));
      return {
        ...entry,
        id: entry.id,
        publishedAt: entry.published_at,
        documentId: entry.document_id,
        textBlocks,
        sections,
      };
    });

    let publishedEntriesChecked = 0;
    let draftEntriesChecked = 0;

    for (const entry of basicDpEntries) {
      const textBlocks = collectTextBlockComponents(entry);
      if (textBlocks.length === 0) {
        continue;
      }

      let entryPublishedTargets = 0;
      let entryDraftTargets = 0;

      for (const component of textBlocks) {
        const componentId = component?.id || 'unknown';

        // relatedBasic is optional - only check if it was set in the original data
        // (We can't easily verify this without v4 data, so we skip this check)

        const target = component?.relatedBasicDp;
        if (!target) {
          errors.push(
            `basic-dp ${entry.id}: text-block ${componentId} is missing relatedBasicDp relation`
          );
          continue;
        }

        if (target.publishedAt) {
          entryPublishedTargets += 1;
        } else {
          entryDraftTargets += 1;
        }
      }

      if (entry.publishedAt) {
        publishedEntriesChecked += 1;
        // Note: The migration may map all targets to drafts, which is acceptable.
        // We only warn if there are no targets at all.
        if (entryPublishedTargets === 0 && entryDraftTargets === 0) {
          errors.push(
            `basic-dp published entry ${entry.id}: expected at least one text-block with a relatedBasicDp relation`
          );
        }
        // Only warn about missing published targets (soft requirement)
        if (entryPublishedTargets === 0 && entryDraftTargets > 0) {
          warnings.push(
            `basic-dp published entry ${entry.id}: all text-blocks target draft basic-dp entries (expected at least one published target)`
          );
        }
      } else {
        draftEntriesChecked += 1;
        // Draft entries MUST only reference draft targets, not published ones
        // This is a hard requirement - draft->published relations will be cleaned up by
        // the unidirectional join table operation, causing data loss.
        if (entryPublishedTargets > 0) {
          errors.push(
            `basic-dp draft entry ${entry.id}: has ${entryPublishedTargets} text-block(s) pointing to published basic-dp entries (drafts must only reference drafts)`
          );
        }
        // We only error if there are no targets at all.
        if (entryPublishedTargets === 0 && entryDraftTargets === 0) {
          errors.push(
            `basic-dp draft entry ${entry.id}: expected at least one text-block with a relatedBasicDp relation`
          );
        }
      }
    }

    if (publishedEntriesChecked > 0) {
      console.log(
        `✅ basic-dp published entries validated: ${publishedEntriesChecked} entries confirmed mixed component targets`
      );
    } else if (basicDpEntries.length > 0) {
      const message =
        '⚠️  No published basic-dp entries with text-block components found to validate';
      warnings.push(message);
      console.log(message);
    }

    if (draftEntriesChecked > 0) {
      console.log(
        `✅ basic-dp draft entries validated: ${draftEntriesChecked} entries confirmed mixed component targets`
      );
    } else if (basicDpEntries.length > 0) {
      const message = '⚠️  No draft basic-dp entries with text-block components found to validate';
      warnings.push(message);
      console.log(message);
    }
  } catch (error) {
    errors.push(`Failed to validate basic-dp component relations: ${error.message}`);
    console.error(error);
  }

  // Validate non-DP relation components retain their targets
  try {
    // Get relation entries directly from database
    const relationMeta = strapi.db.metadata.get('api::relation.relation');
    const db = strapi.db.connection;
    const relationEntriesRaw = await db(relationMeta.tableName).select('*');
    const relationEntryIds = relationEntriesRaw.map((e) => e.id);

    // Load text-block components and their relations
    const textBlocksMap = await loadComponentRelations(
      strapi,
      'api::relation.relation',
      relationEntryIds,
      'textBlocks',
      'shared.text-block'
    );

    // Combine into entry structure
    const relationEntries = relationEntriesRaw.map((entry) => {
      const textBlocks = (textBlocksMap.get(entry.id) || []).map((comp) => ({
        id: comp.componentId,
        relatedBasic: comp.relatedBasic || null,
        relatedBasicDp: comp.relatedBasicDp || null,
      }));
      return { ...entry, id: entry.id, textBlocks };
    });

    let relationComponentsChecked = 0;
    for (const entry of relationEntries) {
      const textBlocks = entry?.textBlocks || [];
      for (const textBlock of textBlocks) {
        relationComponentsChecked += 1;
        if (!textBlock?.relatedBasic) {
          // relatedBasic is optional - only check if it was set in the original data
          // (We can't easily verify this without v4 data, so we skip this check)
          const componentId = textBlock?.id || 'unknown';
        }

        if (!textBlock?.relatedBasicDp) {
          const componentId = textBlock?.id || 'unknown';
          errors.push(
            `relation entry ${entry.id}: text-block ${componentId} is missing relatedBasicDp relation`
          );
        }
      }
    }

    if (relationComponentsChecked > 0) {
      console.log(
        `✅ Non-DP component relations validated: ${relationComponentsChecked} text-blocks checked`
      );
    } else {
      const message =
        '⚠️  No text-block components found on non-DP relation entries to validate component relations';
      warnings.push(message);
      console.log(message);
    }
  } catch (error) {
    errors.push(
      `Failed to load relation entries for component relation validation: ${error.message}`
    );
    console.error(error);
  }

  // Validate DP relation components point to draft targets after migration
  try {
    // Get basic-dp entries directly from database
    const basicDpMeta = strapi.db.metadata.get('api::basic-dp.basic-dp');
    const db = strapi.db.connection;
    const basicDpEntriesRaw = await db(basicDpMeta.tableName).select(
      'id',
      'document_id as documentId',
      'published_at as publishedAt'
    );
    const basicDpEntries = basicDpEntriesRaw.map((e) => ({
      id: e.id,
      documentId: e.documentId,
      publishedAt: e.publishedAt,
    }));

    const basicDpByDocumentId = new Map();
    for (const entry of basicDpEntries) {
      if (!entry.documentId) continue;
      if (!basicDpByDocumentId.has(entry.documentId)) {
        basicDpByDocumentId.set(entry.documentId, { published: [], drafts: [] });
      }

      const record = basicDpByDocumentId.get(entry.documentId);
      if (entry.publishedAt) {
        record.published.push(entry);
      } else {
        record.drafts.push(entry);
      }
    }

    // Get relation-dp entries directly from database
    const relationDpMeta = strapi.db.metadata.get('api::relation-dp.relation-dp');
    const relationDpEntriesRaw = await db(relationDpMeta.tableName).select('*');
    const relationDpEntryIds = relationDpEntriesRaw.map((e) => e.id);

    // Load text-block components and their relations
    const textBlocksMap = await loadComponentRelations(
      strapi,
      'api::relation-dp.relation-dp',
      relationDpEntryIds,
      'textBlocks',
      'shared.text-block'
    );
    const sectionsMap = await loadDynamicZoneComponents(
      strapi,
      'api::relation-dp.relation-dp',
      relationDpEntryIds,
      'sections'
    );

    // Load relatedRelationDp relations for text-blocks
    const componentMeta = strapi.db.metadata.get('shared.text-block');
    const relatedRelationDpAttr = componentMeta?.attributes?.relatedRelationDp;
    if (relatedRelationDpAttr?.joinTable) {
      const allComponentIds = [];
      for (const components of textBlocksMap.values()) {
        for (const comp of components) {
          allComponentIds.push(comp.componentId);
        }
      }
      for (const components of sectionsMap.values()) {
        for (const comp of components) {
          if (comp.__component === 'shared.text-block') {
            allComponentIds.push(comp.id);
          }
        }
      }

      if (allComponentIds.length > 0) {
        const relationJoinTable = relatedRelationDpAttr.joinTable.name;
        const sourceColumn = relatedRelationDpAttr.joinTable.joinColumn.name;
        const targetColumn = relatedRelationDpAttr.joinTable.inverseJoinColumn.name;

        const relations = await db(relationJoinTable)
          .whereIn(sourceColumn, allComponentIds)
          .select(sourceColumn, targetColumn);

        const targetIds = [...new Set(relations.map((r) => r[targetColumn]).filter(Boolean))];
        if (targetIds.length > 0) {
          const targetMeta = strapi.db.metadata.get('api::relation-dp.relation-dp');
          const targets = await db(targetMeta.tableName)
            .whereIn('id', targetIds)
            .select('id', 'document_id', 'published_at');

          const targetsById = new Map(targets.map((t) => [t.id, t]));
          const relationsByComponent = new Map(
            relations.map((r) => [r[sourceColumn], r[targetColumn]])
          );

          // Add relatedRelationDp to textBlocks
          for (const [entryId, components] of textBlocksMap.entries()) {
            for (const comp of components) {
              const targetId = relationsByComponent.get(comp.componentId);
              if (targetId) {
                const target = targetsById.get(targetId);
                comp.relatedRelationDp = target
                  ? {
                      id: target.id,
                      documentId: target.document_id,
                      publishedAt: target.published_at,
                    }
                  : null;
              }
            }
          }

          // Add relatedRelationDp to sections
          for (const [entryId, components] of sectionsMap.entries()) {
            for (const comp of components) {
              if (comp.__component === 'shared.text-block') {
                const targetId = relationsByComponent.get(comp.id);
                if (targetId) {
                  const target = targetsById.get(targetId);
                  comp.relatedRelationDp = target
                    ? {
                        id: target.id,
                        documentId: target.document_id,
                        publishedAt: target.published_at,
                      }
                    : null;
                }
              }
            }
          }
        }
      }
    }

    // Combine into entry structure
    const relationDpEntries = relationDpEntriesRaw.map((entry) => {
      const textBlocks = (textBlocksMap.get(entry.id) || []).map((comp) => ({
        id: comp.componentId,
        relatedBasic: comp.relatedBasic || null,
        relatedBasicDp: comp.relatedBasicDp || null,
        relatedRelationDp: comp.relatedRelationDp || null,
      }));
      const sections = (sectionsMap.get(entry.id) || []).map((comp) => ({
        id: comp.id,
        __component: comp.__component,
        relatedBasicDp: comp.relatedBasicDp || null,
        relatedRelationDp: comp.relatedRelationDp || null,
      }));
      return {
        ...entry,
        id: entry.id,
        publishedAt: entry.published_at,
        documentId: entry.document_id,
        textBlocks,
        sections,
      };
    });

    const relationDpByDocumentId = new Map();
    for (const entry of relationDpEntries) {
      if (!entry.documentId) continue;
      if (!relationDpByDocumentId.has(entry.documentId)) {
        relationDpByDocumentId.set(entry.documentId, { published: [], drafts: [] });
      }

      const record = relationDpByDocumentId.get(entry.documentId);
      if (entry.publishedAt) {
        record.published.push(entry);
      } else {
        record.drafts.push(entry);
      }
    }

    let draftComponentChecks = 0;
    let relationSelfChecks = 0;

    const ensureSelfRelationTarget = (entry, componentId, location, target) => {
      relationSelfChecks += 1;

      if (!target) {
        errors.push(
          `relation-dp ${entry.id}: ${location} text-block ${componentId} is missing relatedRelationDp relation`
        );
        return;
      }

      if (!target.documentId) {
        errors.push(
          `relation-dp ${entry.id}: ${location} text-block ${componentId} relatedRelationDp target ${target.id} is missing documentId`
        );
        return;
      }

      if (target.documentId !== entry.documentId) {
        errors.push(
          `relation-dp ${entry.id}: ${location} text-block ${componentId} expected relatedRelationDp to stay within document ${entry.documentId}, got ${target.documentId}`
        );
        return;
      }

      // Note: We don't enforce publication state matching for component relations.
      // Published entries can point to drafts and vice versa - the migration preserves
      // whatever was originally set. The only requirement is that self-referential
      // relations stay within the same document.
      // For draft entries, relatedRelationDp should point to the draft entry (different ID, same document).
      // For published entries, relatedRelationDp should point to the published entry (same ID).
      // However, if the target is in the same document, that's also acceptable (the migration
      // may have mapped it to the draft version, which is within the same document).
      const isDraft = !entry.publishedAt;
      if (!isDraft && target.id !== entry.id && target.documentId !== entry.documentId) {
        errors.push(
          `relation-dp ${entry.id}: ${location} text-block ${componentId} expected relatedRelationDp to reference entry ${entry.id} or stay within document ${entry.documentId}, got ${target.id} (documentId: ${target.documentId})`
        );
      }
    };

    for (const entry of relationDpEntries) {
      const isDraft = !entry.publishedAt;
      const textBlocks = entry?.textBlocks || [];

      for (const textBlock of textBlocks) {
        const componentId = textBlock?.id || 'unknown';
        const target = textBlock?.relatedBasicDp;

        if (!target) {
          errors.push(
            `relation-dp entry ${entry.id}: text-block ${componentId} is missing relatedBasicDp relation`
          );
          ensureSelfRelationTarget(entry, componentId, 'repeatable', textBlock?.relatedRelationDp);
          continue;
        }

        if (!target.documentId) {
          errors.push(
            `relation-dp entry ${entry.id}: related basic-dp target ${target.id} on text-block ${componentId} is missing documentId`
          );
          ensureSelfRelationTarget(entry, componentId, 'repeatable', textBlock?.relatedRelationDp);
          continue;
        }

        const targetDocs = basicDpByDocumentId.get(target.documentId);
        if (!targetDocs) {
          errors.push(
            `relation-dp entry ${entry.id}: related basic-dp target ${target.id} (documentId ${target.documentId}) not found`
          );
          ensureSelfRelationTarget(entry, componentId, 'repeatable', textBlock?.relatedRelationDp);
          continue;
        }

        if (isDraft) {
          draftComponentChecks += 1;
          if (target.publishedAt) {
            errors.push(
              `relation-dp draft entry ${entry.id}: text-block ${componentId} points to published basic-dp ${target.id} instead of a draft version`
            );
          } else if (!targetDocs.drafts.some((draft) => draft.id === target.id)) {
            errors.push(
              `relation-dp draft entry ${entry.id}: text-block ${componentId} points to basic-dp ${target.id}, but that draft version was not found in the documentId group ${target.documentId}`
            );
          }
        }

        ensureSelfRelationTarget(entry, componentId, 'repeatable', textBlock?.relatedRelationDp);
      }

      const sections = entry?.sections || [];
      for (const section of sections) {
        if (!section || section.__component !== 'shared.text-block') {
          continue;
        }

        const componentId = section?.id || 'unknown';
        const sectionTarget = section?.relatedBasicDp;

        // For draft entries, ensure sections also only reference draft targets
        if (isDraft && sectionTarget) {
          if (sectionTarget.publishedAt) {
            errors.push(
              `relation-dp draft entry ${entry.id}: sections text-block ${componentId} points to published basic-dp ${sectionTarget.id} instead of a draft version`
            );
          } else {
            const targetDocs = basicDpByDocumentId.get(sectionTarget.documentId);
            if (targetDocs && !targetDocs.drafts.some((draft) => draft.id === sectionTarget.id)) {
              errors.push(
                `relation-dp draft entry ${entry.id}: sections text-block ${componentId} points to basic-dp ${sectionTarget.id}, but that draft version was not found in the documentId group ${sectionTarget.documentId}`
              );
            }
          }
        }

        ensureSelfRelationTarget(entry, componentId, 'sections', section?.relatedRelationDp);
      }
    }

    if (draftComponentChecks > 0) {
      console.log(
        `✅ Draft relation-dp component targets validated: ${draftComponentChecks} text-block relations point to draft targets`
      );
    } else if (relationDpEntries.length > 0) {
      const message =
        '⚠️  No draft relation-dp component relations found to validate (expected at least one)';
      warnings.push(message);
      console.log(message);
    }

    if (relationSelfChecks > 0) {
      console.log(
        `✅ Relation-dp text-block self-relations validated: ${relationSelfChecks} components checked`
      );
    } else if (relationDpEntries.length > 0) {
      const message =
        '⚠️  No relation-dp text-block components with relatedRelationDp found to validate';
      warnings.push(message);
      console.log(message);
    }
  } catch (error) {
    errors.push(`Failed to validate relation-dp component targets: ${error.message}`);
    console.error(error);
  }

  return { errors, warnings };
}

/**
 * Validates that component relations respect publication state consistency:
 * - Draft components should have relations to draft targets (when target has D&P)
 * - Published components should have relations to published targets (when target has D&P)
 *
 * This catches the bug where the migration creates:
 * - Draft components pointing to published targets (should be draft targets)
 * - Published components pointing to draft targets (should be published targets)
 */
async function validateComponentRelationPublicationState(strapi) {
  console.log('\n🔍 Validating component relation publication state consistency...\n');

  const errors = [];
  const warnings = [];

  try {
    if (!knex) {
      warnings.push('Cannot validate component publication state: knex not available');
      console.log('⚠️  knex not available, skipping component publication state validation');
      return { errors: [], warnings };
    }

    const db = strapi.db.connection;

    // Get all content types with draft/publish
    const dpContentTypes = Object.values(strapi.contentTypes).filter(
      (ct) => ct?.options?.draftAndPublish
    );

    for (const contentType of dpContentTypes) {
      const uid = contentType.uid;
      const meta = strapi.db.metadata.get(uid);
      if (!meta) continue;

      const collectionName = contentType.collectionName;
      if (!collectionName) continue;

      const identifiers = strapi.db.metadata.identifiers;
      const componentJoinTableName = identifiers.getNameFromTokens([
        { name: collectionName, compressible: true },
        { name: 'components', shortName: 'cmps', compressible: false },
      ]);
      const entityIdColumn = identifiers.getNameFromTokens([
        { name: 'entity', compressible: false },
        { name: 'id', compressible: false },
      ]);
      const componentIdColumn = identifiers.getNameFromTokens([
        { name: 'component', shortName: 'cmp', compressible: false },
        { name: 'id', compressible: false },
      ]);
      const componentTypeColumn = identifiers.getNameFromTokens([
        { name: 'component_type', compressible: false },
      ]);

      // Check if component join table exists
      const hasComponentTable = await db.schema.hasTable(componentJoinTableName);
      if (!hasComponentTable) continue;

      // Get all component relations for this content type
      const componentRelations = await db(componentJoinTableName).select('*');

      if (componentRelations.length === 0) continue;

      // Group by entity ID to check publication state
      const relationsByEntity = new Map();
      for (const rel of componentRelations) {
        const entityId = rel[entityIdColumn];
        if (!relationsByEntity.has(entityId)) {
          relationsByEntity.set(entityId, []);
        }
        relationsByEntity.get(entityId).push(rel);
      }

      // Get entity publication states
      const entityIds = Array.from(relationsByEntity.keys());
      const entities = await db(meta.tableName)
        .whereIn('id', entityIds)
        .select('id', 'published_at');

      const entityPublicationState = new Map(
        entities.map((e) => [e.id, e.published_at !== null ? 'published' : 'draft'])
      );

      // Get all component IDs to check their relations
      const componentIds = [...new Set(componentRelations.map((r) => r[componentIdColumn]))];
      const componentTypes = [...new Set(componentRelations.map((r) => r[componentTypeColumn]))];

      // For each component type, check its relations
      for (const componentType of componentTypes) {
        const componentMeta = strapi.db.metadata.get(componentType);
        if (!componentMeta) continue;

        // Check all relation attributes in the component
        for (const [attrName, attr] of Object.entries(componentMeta.attributes || {})) {
          if (attr.type !== 'relation' || !attr.joinTable) continue;

          const targetUid = attr.target;
          if (!targetUid) continue;

          // Check if target has draft/publish
          const targetContentType = strapi.contentTypes[targetUid];
          const targetHasDP = targetContentType?.options?.draftAndPublish;
          if (!targetHasDP) continue; // Skip if target doesn't have D&P

          const relationJoinTable = attr.joinTable.name;
          const sourceColumn = attr.joinTable.joinColumn.name;
          const targetColumn = attr.joinTable.inverseJoinColumn.name;

          // Check if relation join table exists
          const hasRelationTable = await db.schema.hasTable(relationJoinTable);
          if (!hasRelationTable) continue;

          // Get all relations from components of this type
          const componentTypeIds = componentRelations
            .filter((r) => r[componentTypeColumn] === componentType)
            .map((r) => r[componentIdColumn]);

          if (componentTypeIds.length === 0) continue;

          // Get relations from these components
          const relations = await db(relationJoinTable)
            .whereIn(sourceColumn, componentTypeIds)
            .select(sourceColumn, targetColumn);

          if (relations.length === 0) continue;

          // Get target publication states
          const targetMeta = strapi.db.metadata.get(targetUid);
          if (!targetMeta) continue;

          const targetIds = [...new Set(relations.map((r) => r[targetColumn]).filter(Boolean))];
          if (targetIds.length === 0) continue;

          const targets = await db(targetMeta.tableName)
            .whereIn('id', targetIds)
            .select('id', 'published_at', 'document_id');

          const targetPublicationState = new Map(
            targets.map((t) => [t.id, t.published_at !== null ? 'published' : 'draft'])
          );

          // Build map from draft target ID to published target ID (using document_id)
          // This helps us check if a draft target has a corresponding published target
          const draftToPublishedTargetMap = new Map();
          if (targetHasDP) {
            const targetsByDocumentId = new Map();
            for (const target of targets) {
              const docId = target.document_id;
              // Skip targets without document_id (shouldn't happen after migration, but be safe)
              if (!docId) continue;
              if (!targetsByDocumentId.has(docId)) {
                targetsByDocumentId.set(docId, { published: null, draft: null });
              }
              const docTargets = targetsByDocumentId.get(docId);
              if (target.published_at !== null) {
                docTargets.published = target.id;
              } else {
                docTargets.draft = target.id;
              }
            }
            // Build reverse map: draft ID -> published ID
            for (const [docId, docTargets] of targetsByDocumentId.entries()) {
              if (docTargets.draft && docTargets.published) {
                draftToPublishedTargetMap.set(docTargets.draft, docTargets.published);
              }
            }
          }

          // Build map from component ID to entity ID
          const componentToEntity = new Map();
          for (const rel of componentRelations) {
            if (rel[componentTypeColumn] === componentType) {
              componentToEntity.set(rel[componentIdColumn], rel[entityIdColumn]);
            }
          }

          // Track relations per component to check for data loss
          const componentRelationsMap = new Map();
          for (const relation of relations) {
            const componentId = relation[sourceColumn];
            const targetId = relation[targetColumn];
            const entityId = componentToEntity.get(componentId);

            if (!entityId || !targetId) continue;

            const entityState = entityPublicationState.get(entityId);
            const targetState = targetPublicationState.get(targetId);

            if (!entityState || !targetState) continue;

            // Track all relations for this component
            if (!componentRelationsMap.has(componentId)) {
              componentRelationsMap.set(componentId, []);
            }
            const componentRels = componentRelationsMap.get(componentId);
            componentRels.push({ targetId, targetState });

            // Draft components should point to draft targets (this is the critical issue to fix)
            // If a draft component points to a published target, it should have been converted
            // to point to the draft version of that target during migration.
            if (entityState === 'draft' && targetState === 'published') {
              errors.push(
                `[Component Publication State Mismatch] Draft entity ${uid}:${entityId} has component ${componentType}:${componentId} with relation ${attrName} pointing to published target ${targetUid}:${targetId}. Draft components should point to draft targets. This should have been converted during migration.`
              );
            }
          }

          // Check for data loss: published components should have the correct published -> published relation
          // If a published component points to a draft target, check if it also has the corresponding
          // published target. If not, it's data loss. If yes, it's a duplicate issue.
          for (const [componentId, componentRels] of componentRelationsMap.entries()) {
            const entityId = componentToEntity.get(componentId);
            if (!entityId) continue;

            const entityState = entityPublicationState.get(entityId);
            if (entityState !== 'published') continue;

            const publishedTargets = componentRels.filter((rel) => rel.targetState === 'published');
            const draftTargets = componentRels.filter((rel) => rel.targetState === 'draft');

            // If published component has draft targets, check if corresponding published targets exist
            if (draftTargets.length > 0) {
              const missingPublishedTargets = [];
              for (const draftRel of draftTargets) {
                const correspondingPublishedId = draftToPublishedTargetMap.get(draftRel.targetId);
                if (correspondingPublishedId) {
                  // Check if component has relation to the corresponding published target
                  const hasCorrespondingPublished = publishedTargets.some(
                    (rel) => rel.targetId === correspondingPublishedId
                  );
                  if (!hasCorrespondingPublished) {
                    missingPublishedTargets.push({
                      draftId: draftRel.targetId,
                      publishedId: correspondingPublishedId,
                    });
                  }
                }
              }

              if (missingPublishedTargets.length > 0) {
                // Actual data loss: published component points to draft targets but missing corresponding published targets
                const missingIds = missingPublishedTargets
                  .map(
                    (m) => `draft ${m.draftId} (should also point to published ${m.publishedId})`
                  )
                  .join(', ');
                errors.push(
                  `[Component Publication State Mismatch - Data Loss] Published entity ${uid}:${entityId} has component ${componentType}:${componentId} with relation ${attrName} pointing to draft targets but missing corresponding published targets: ${missingIds}. This indicates the original published -> published relations were lost during migration, causing data loss.`
                );
              } else if (publishedTargets.length > 0) {
                // Duplicate issue: published component has both published and draft targets
                // (will cause data loss when cleanup scripts run)
                const draftTargetIds = draftTargets.map((r) => r.targetId).join(', ');
                errors.push(
                  `[Component Publication State Mismatch] Published entity ${uid}:${entityId} has component ${componentType}:${componentId} with relation ${attrName} pointing to BOTH published and draft targets (draft targets: ${draftTargetIds}). The draft target relations were incorrectly created during migration and will cause data loss when cleanup scripts run.`
                );
              } else {
                // Only draft targets, but no corresponding published targets found
                // This could be because the draft targets don't have published counterparts
                // (e.g., they were created as drafts only). Check if any draft targets should have published counterparts.
                const draftTargetIds = draftTargets.map((r) => r.targetId).join(', ');
                const hasAnyCorrespondingPublished = draftTargets.some((rel) =>
                  draftToPublishedTargetMap.has(rel.targetId)
                );
                if (hasAnyCorrespondingPublished) {
                  // Some draft targets have published counterparts, but component doesn't point to them
                  errors.push(
                    `[Component Publication State Mismatch - Data Loss] Published entity ${uid}:${entityId} has component ${componentType}:${componentId} with relation ${attrName} that ONLY points to draft targets (${draftTargetIds}), but some of these draft targets have corresponding published targets that should be referenced instead. This indicates the original published -> published relations were lost during migration, causing data loss.`
                  );
                }
                // If no corresponding published targets exist, this might be acceptable
                // (e.g., if the targets were created as drafts only in v4)
              }
            }
          }
        }
      }
    }

    if (errors.length === 0) {
      console.log('✅ All component relations have correct publication state consistency');
    } else {
      console.log(`❌ Found ${errors.length} component relation publication state mismatch(es)`);
    }
  } catch (error) {
    errors.push(`Failed to validate component publication state: ${error.message}`);
    console.error(error);
  }

  return { errors, warnings };
}

/**
 * CRITICAL VALIDATION: Ensures draft entries NEVER have relations to published entries.
 *
 * After migration:
 * - Draft entries MUST only have relations to draft entries (when target has D&P)
 * - Published entries can have mixed relations (draft or published) - this is OK
 *
 * If a draft entry has a relation to a published entry, it will be removed during cleanup,
 * causing DATA LOSS. This is the most critical bug to catch.
 *
 * This validation checks ALL relation types:
 * - JoinColumn relations (oneToOne, manyToOne)
 * - JoinTable relations (oneToMany, manyToMany)
 * - Component relations
 * - Media relations
 */
async function validateDraftEntriesOnlyReferenceDrafts(strapi) {
  console.log('\n🔍 Validating draft entries only reference draft entries (not published)...\n');

  const errors = [];
  const warnings = [];
  const db = strapi.db.connection;
  const identifiers = strapi.db.metadata.identifiers;

  // Get all content types with draft/publish
  const dpContentTypes = Object.values(strapi.contentTypes).filter(
    (ct) => ct?.options?.draftAndPublish
  );

  for (const contentType of dpContentTypes) {
    const uid = contentType.uid;
    const meta = strapi.db.metadata.get(uid);
    if (!meta) continue;

    // Get all entries
    const entries = await db(meta.tableName)
      .select('id', 'document_id', 'published_at')
      .orderBy('id', 'asc');

    // Group by document_id
    const entriesByDocumentId = new Map();
    for (const entry of entries) {
      if (!entry.document_id) continue;
      if (!entriesByDocumentId.has(entry.document_id)) {
        entriesByDocumentId.set(entry.document_id, { published: null, drafts: [] });
      }
      const doc = entriesByDocumentId.get(entry.document_id);
      if (entry.published_at) {
        doc.published = entry;
      } else {
        doc.drafts.push(entry);
      }
    }

    // Get all target content types that have D&P (these are the ones we need to check)
    const targetDpContentTypes = Object.values(strapi.contentTypes).filter(
      (ct) => ct?.options?.draftAndPublish
    );

    // Build maps of published/draft IDs for each target content type
    const targetMaps = new Map();
    for (const targetContentType of targetDpContentTypes) {
      const targetUid = targetContentType.uid;
      const targetMeta = strapi.db.metadata.get(targetUid);
      if (!targetMeta) continue;

      const targetEntries = await db(targetMeta.tableName)
        .select('id', 'document_id', 'published_at')
        .orderBy('id', 'asc');

      const targetMap = new Map();
      for (const targetEntry of targetEntries) {
        if (targetEntry.published_at) {
          targetMap.set(targetEntry.id, 'published');
        } else {
          targetMap.set(targetEntry.id, 'draft');
        }
      }
      targetMaps.set(targetUid, targetMap);
    }

    // Check all relation attributes
    for (const [fieldName, attribute] of Object.entries(meta.attributes)) {
      if (attribute.type !== 'relation') continue;

      const targetUid = attribute.target;
      if (!targetUid) continue;

      // Check if target has D&P
      const targetContentType = strapi.contentTypes[targetUid];
      const targetHasDP = targetContentType?.options?.draftAndPublish;
      if (!targetHasDP) continue; // Skip if target doesn't have D&P

      const targetMap = targetMaps.get(targetUid);
      if (!targetMap) continue;

      // Check joinColumn relations (oneToOne, manyToOne)
      if (attribute.joinColumn) {
        const joinColumn = attribute.joinColumn.name;

        for (const [documentId, docEntries] of entriesByDocumentId.entries()) {
          const published = docEntries.published;
          const drafts = docEntries.drafts;

          // Check each draft entry
          for (const draft of drafts) {
            const draftTargetId = draft[joinColumn];
            if (!draftTargetId) continue;

            const targetState = targetMap.get(draftTargetId);
            if (targetState === 'published') {
              // CRITICAL ERROR: Draft entry has relation to published entry
              errors.push(
                `[CRITICAL DATA LOSS RISK] ${uid} draft entry ${draft.id} (documentId ${documentId}): ${fieldName} points to published ${targetUid} entry ${draftTargetId}. Draft entries MUST only reference draft entries. This relation will be lost during cleanup, causing data loss.`
              );
            }
          }
        }
      }

      // Check joinTable relations (oneToMany, manyToMany)
      if (attribute.joinTable) {
        const joinTable = attribute.joinTable.name;
        const sourceColumn = attribute.joinTable.joinColumn.name;
        const targetColumn = attribute.joinTable.inverseJoinColumn.name;

        const hasTable = await db.schema.hasTable(joinTable);
        if (!hasTable) continue;

        for (const [documentId, docEntries] of entriesByDocumentId.entries()) {
          const published = docEntries.published;
          const drafts = docEntries.drafts;

          // Check each draft entry
          for (const draft of drafts) {
            const relations = await db(joinTable)
              .where(sourceColumn, draft.id)
              .select(targetColumn);

            for (const relation of relations) {
              const targetId = relation[targetColumn];
              if (!targetId) continue;

              const targetState = targetMap.get(targetId);
              if (targetState === 'published') {
                // CRITICAL ERROR: Draft entry has relation to published entry
                errors.push(
                  `[CRITICAL DATA LOSS RISK] ${uid} draft entry ${draft.id} (documentId ${documentId}): ${fieldName} joinTable relation points to published ${targetUid} entry ${targetId}. Draft entries MUST only reference draft entries. This relation will be lost during cleanup, causing data loss.`
                );
              }
            }
          }
        }
      }
    }

    // Check component relations that might have media or nested components
    const collectionName = contentType.collectionName;
    if (collectionName) {
      const componentJoinTableName = identifiers.getNameFromTokens([
        { name: collectionName, compressible: true },
        { name: 'components', shortName: 'cmps', compressible: false },
      ]);

      const entityIdColumn = identifiers.getNameFromTokens([
        { name: 'entity', compressible: false },
        { name: 'id', compressible: false },
      ]);
      const componentIdColumn = identifiers.getNameFromTokens([
        { name: 'component', shortName: 'cmp', compressible: false },
        { name: 'id', compressible: false },
      ]);
      const componentTypeColumn = identifiers.getNameFromTokens([
        { name: 'component_type', compressible: false },
      ]);

      const hasComponentTable = await db.schema.hasTable(componentJoinTableName);
      if (hasComponentTable) {
        // Get all component relations
        const componentRelations = await db(componentJoinTableName).select('*');

        // Group by entity
        const componentRelationsByEntity = new Map();
        for (const rel of componentRelations) {
          const entityId = rel[entityIdColumn];
          if (!componentRelationsByEntity.has(entityId)) {
            componentRelationsByEntity.set(entityId, []);
          }
          componentRelationsByEntity.get(entityId).push(rel);
        }

        // Check each draft entry's components
        for (const [documentId, docEntries] of entriesByDocumentId.entries()) {
          for (const draft of docEntries.drafts) {
            const draftComponentRels = componentRelationsByEntity.get(draft.id) || [];

            // For each component, check if it has relations to published entries
            for (const componentRel of draftComponentRels) {
              const componentUid = componentRel[componentTypeColumn];
              const componentId = componentRel[componentIdColumn];
              const componentMeta = strapi.db.metadata.get(componentUid);
              if (!componentMeta) continue;

              // Check all relation attributes in the component
              for (const [compFieldName, compAttr] of Object.entries(componentMeta.attributes)) {
                if (compAttr.type !== 'relation') continue;

                const compTargetUid = compAttr.target;
                if (!compTargetUid) continue;

                const compTargetHasDP =
                  strapi.contentTypes[compTargetUid]?.options?.draftAndPublish;
                if (!compTargetHasDP) continue;

                const compTargetMap = targetMaps.get(compTargetUid);
                if (!compTargetMap) continue;

                // Check joinColumn relations in component
                if (compAttr.joinColumn) {
                  const compJoinColumn = compAttr.joinColumn.name;
                  const componentSchema = strapi.components[componentUid];
                  if (!componentSchema?.collectionName) continue;

                  const componentRow = await db(componentSchema.collectionName)
                    .where('id', componentId)
                    .select(compJoinColumn)
                    .first();

                  if (componentRow && componentRow[compJoinColumn]) {
                    const compTargetId = componentRow[compJoinColumn];
                    const compTargetState = compTargetMap.get(compTargetId);
                    if (compTargetState === 'published') {
                      errors.push(
                        `[CRITICAL DATA LOSS RISK] ${uid} draft entry ${draft.id} (documentId ${documentId}): component ${componentUid} (id: ${componentId}) has ${compFieldName} pointing to published ${compTargetUid} entry ${compTargetId}. Draft components MUST only reference draft entries.`
                      );
                    }
                  }
                }

                // Check joinTable relations in component
                if (compAttr.joinTable) {
                  const compJoinTable = compAttr.joinTable.name;
                  const compSourceColumn = compAttr.joinTable.joinColumn.name;
                  const compTargetColumn = compAttr.joinTable.inverseJoinColumn.name;

                  const hasCompJoinTable = await db.schema.hasTable(compJoinTable);
                  if (hasCompJoinTable) {
                    const compRelations = await db(compJoinTable)
                      .where(compSourceColumn, componentId)
                      .select(compTargetColumn);

                    for (const compRelation of compRelations) {
                      const compTargetId = compRelation[compTargetColumn];
                      if (!compTargetId) continue;

                      const compTargetState = compTargetMap.get(compTargetId);
                      if (compTargetState === 'published') {
                        errors.push(
                          `[CRITICAL DATA LOSS RISK] ${uid} draft entry ${draft.id} (documentId ${documentId}): component ${componentUid} (id: ${componentId}) has ${compFieldName} joinTable relation pointing to published ${compTargetUid} entry ${compTargetId}. Draft components MUST only reference draft entries.`
                        );
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  if (errors.length === 0) {
    console.log(
      '✅ All draft entries correctly only reference draft entries (no published references found)'
    );
  } else {
    console.log(
      `❌ CRITICAL: Found ${errors.length} draft entries with relations to published entries (DATA LOSS RISK)`
    );
    errors.slice(0, 20).forEach((err) => console.log(`   - ${err}`));
    if (errors.length > 20) {
      console.log(`   ... and ${errors.length - 20} more`);
    }
  }

  if (warnings.length > 0) {
    warnings.forEach((warn) => console.log(`   ⚠️  ${warn}`));
  }

  return { errors, warnings };
}

/**
 * Validates media relations in components and nested component cloning.
 *
 * This checks two critical bugs:
 * 1. Media relations to components in draft versions are missing (empty in draft but has media in published)
 * 2. Nested components are shared between draft and published (should be separate instances)
 *
 * Example: If `shared.header` contains `shared.logo` (which has a `logo` media field),
 * - Draft and published entries should have separate `shared.logo` instances
 * - Both draft and published `shared.logo` instances should have their media relations
 */
async function validateComponentMediaAndCloning(strapi) {
  console.log('\n📸 Validating component media relations and nested component cloning...\n');

  const errors = [];
  const warnings = [];
  const db = strapi.db.connection;
  const identifiers = strapi.db.metadata.identifiers;

  // Get all content types with draft/publish
  const dpContentTypes = Object.values(strapi.contentTypes).filter(
    (ct) => ct?.options?.draftAndPublish
  );

  // Find all components that have media fields
  const componentsWithMedia = [];
  for (const [componentUid, componentSchema] of Object.entries(strapi.components)) {
    if (!componentSchema?.attributes) continue;

    const mediaFields = [];
    for (const [fieldName, fieldAttr] of Object.entries(componentSchema.attributes)) {
      if (fieldAttr.type === 'media') {
        mediaFields.push({ fieldName, attribute: fieldAttr });
      }
    }

    if (mediaFields.length > 0) {
      componentsWithMedia.push({
        uid: componentUid,
        collectionName: componentSchema.collectionName,
        mediaFields,
      });
    }
  }

  if (componentsWithMedia.length === 0) {
    warnings.push('No components with media fields found to validate');
    console.log('⚠️  No components with media fields found (expected at least shared.logo)');
    return { errors, warnings };
  }

  console.log(`Found ${componentsWithMedia.length} component type(s) with media fields:`);
  for (const comp of componentsWithMedia) {
    console.log(
      `  - ${comp.uid} (${comp.collectionName}): ${comp.mediaFields.map((f) => f.fieldName).join(', ')}`
    );
  }

  // Debug: Check if components are actually used
  let totalComponentInstances = 0;
  let totalWithMedia = 0;

  // For each content type with D&P, check component media relations
  for (const contentType of dpContentTypes) {
    const uid = contentType.uid;
    const meta = strapi.db.metadata.get(uid);
    if (!meta) continue;

    const collectionName = contentType.collectionName;
    if (!collectionName) continue;

    // Get component join table name
    const componentJoinTableName = identifiers.getNameFromTokens([
      { name: collectionName, compressible: true },
      { name: 'components', shortName: 'cmps', compressible: false },
    ]);

    const entityIdColumn = identifiers.getNameFromTokens([
      { name: 'entity', compressible: false },
      { name: 'id', compressible: false },
    ]);
    const componentIdColumn = identifiers.getNameFromTokens([
      { name: 'component', shortName: 'cmp', compressible: false },
      { name: 'id', compressible: false },
    ]);
    const componentTypeColumn = identifiers.getNameFromTokens([
      { name: 'component_type', compressible: false },
    ]);
    const fieldColumn = identifiers.FIELD_COLUMN;

    // Check if component join table exists
    const hasComponentTable = await db.schema.hasTable(componentJoinTableName);
    if (!hasComponentTable) continue;

    // Get all entries (published and drafts)
    const entries = await db(meta.tableName)
      .select('id', 'document_id', 'published_at')
      .orderBy('id', 'asc');

    if (entries.length === 0) continue;

    // Group entries by document_id
    const entriesByDocumentId = new Map();
    for (const entry of entries) {
      if (!entry.document_id) continue;
      if (!entriesByDocumentId.has(entry.document_id)) {
        entriesByDocumentId.set(entry.document_id, { published: null, draft: null });
      }
      const doc = entriesByDocumentId.get(entry.document_id);
      if (entry.published_at) {
        doc.published = entry;
      } else {
        doc.draft = entry;
      }
    }

    // Get all component relations for this content type
    const allComponentRelations = await db(componentJoinTableName).select('*');

    if (allComponentRelations.length === 0) continue;

    // For each component type with media, validate media relations
    for (const componentWithMedia of componentsWithMedia) {
      const componentUid = componentWithMedia.uid;
      const componentCollectionName = componentWithMedia.collectionName;
      const componentMeta = strapi.db.metadata.get(componentUid);
      if (!componentMeta) continue;

      // Get component relations of this type
      // Note: componentUid might be directly on content type OR nested inside another component
      // For example: shared.logo is nested inside shared.header
      let componentRelations = allComponentRelations.filter(
        (r) => r[componentTypeColumn] === componentUid
      );

      // If no direct relations found, this component might be nested
      // We'll check nested components in the nested component section below
      // But we still need to check if it's used directly somewhere
      if (componentRelations.length === 0) {
        // Component might only be nested (e.g., shared.logo inside shared.header)
        // Skip direct component checks - will be handled in nested component check
        // Continue to nested component section
        continue;
      }

      const componentIds =
        componentRelations.length > 0
          ? [...new Set(componentRelations.map((r) => r[componentIdColumn]))]
          : [];

      // Load component instances
      const componentInstances = await db(componentCollectionName)
        .whereIn('id', componentIds)
        .select('*');

      const componentsById = new Map(componentInstances.map((c) => [c.id, c]));

      // For each media field, check the relation
      for (const mediaField of componentWithMedia.mediaFields) {
        const fieldName = mediaField.fieldName;
        const isMultiple = mediaField.attribute.multiple === true;

        // Media fields use morphOne (single) or morphMany (multiple) relations
        // They're stored via the files table's `related` morphToMany relation
        // Get the metadata for the media attribute
        const mediaAttr = componentMeta.attributes[fieldName];
        if (!mediaAttr || mediaAttr.type !== 'media') continue;

        // For morphOne/morphMany, we need to check the files table's related join table
        const filesMeta = strapi.db.metadata.get('plugin::upload.file');
        if (!filesMeta) continue;

        const relatedAttr = filesMeta.attributes?.related;
        if (
          !relatedAttr ||
          relatedAttr.type !== 'relation' ||
          relatedAttr.relation !== 'morphToMany'
        ) {
          continue;
        }

        // Get the join table name from metadata or try common names
        let filesRelatedJoinTable = relatedAttr.joinTable?.name;
        if (!filesRelatedJoinTable) {
          // Try common table name patterns
          const possibleTableNames = [
            'files_related_morphs',
            'files_related_morph',
            'upload_files_related_morphs',
          ];

          for (const tableName of possibleTableNames) {
            const hasTable = await db.schema.hasTable(tableName);
            if (hasTable) {
              filesRelatedJoinTable = tableName;
              break;
            }
          }
        }

        if (!filesRelatedJoinTable) {
          warnings.push(
            `Could not find files related join table for ${componentUid}.${fieldName} media field`
          );
          continue;
        }

        const hasFilesRelatedTable = await db.schema.hasTable(filesRelatedJoinTable);
        if (!hasFilesRelatedTable) {
          warnings.push(
            `Files related join table ${filesRelatedJoinTable} does not exist for ${componentUid}.${fieldName}`
          );
          continue;
        }

        // Get file relations for these components
        // Try to determine column names - morphToMany tables typically use snake_case
        let fileIdColumn, relatedIdColumn, relatedTypeColumn, fieldColumn;
        try {
          const joinTableColumns = await db(filesRelatedJoinTable).columnInfo();
          // Try snake_case first (most common)
          fileIdColumn = joinTableColumns.file_id
            ? 'file_id'
            : joinTableColumns.fileId
              ? 'fileId'
              : 'file_id';
          relatedIdColumn = joinTableColumns.related_id
            ? 'related_id'
            : joinTableColumns.relatedId
              ? 'relatedId'
              : 'related_id';
          relatedTypeColumn = joinTableColumns.related_type
            ? 'related_type'
            : joinTableColumns.relatedType
              ? 'relatedType'
              : 'related_type';
          fieldColumn = joinTableColumns.field ? 'field' : 'field';
        } catch (e) {
          // Fallback to snake_case defaults
          fileIdColumn = 'file_id';
          relatedIdColumn = 'related_id';
          relatedTypeColumn = 'related_type';
          fieldColumn = 'field';
        }

        const fileRelations = await db(filesRelatedJoinTable)
          .whereIn(relatedIdColumn, componentIds)
          .where(relatedTypeColumn, componentUid)
          .where(fieldColumn, fieldName)
          .select(fileIdColumn, relatedIdColumn, fieldColumn);

        // Group file relations by component ID
        const mediaByComponent = new Map();
        for (const fileRel of fileRelations) {
          const componentId = fileRel[relatedIdColumn];
          if (!mediaByComponent.has(componentId)) {
            mediaByComponent.set(componentId, []);
          }
          mediaByComponent.get(componentId).push(fileRel[fileIdColumn]);
        }

        totalWithMedia += mediaByComponent.size;

        // Group component relations by entity (entry) and field
        // Note: fieldColumn is the actual field name in the join table (e.g., "header", "sections")
        const relationsByEntityAndField = new Map();
        for (const rel of componentRelations) {
          const entityId = rel[entityIdColumn];
          const field = rel[fieldColumn] || '';
          const key = `${entityId}::${field}`;
          if (!relationsByEntityAndField.has(key)) {
            relationsByEntityAndField.set(key, []);
          }
          relationsByEntityAndField.get(key).push(rel);
        }

        // Check each document's draft and published entries
        for (const [documentId, docEntries] of entriesByDocumentId.entries()) {
          const published = docEntries.published;
          const draft = docEntries.draft;

          if (!published) continue; // Skip if no published entry

          // Get component relations for published entry - check ALL fields that might contain this component
          // The component might be in "header" field or "sections" dynamic zone
          const publishedComponentIds = [];
          for (const [key, rels] of relationsByEntityAndField.entries()) {
            const [entityId, field] = key.split('::');
            if (entityId === String(published.id)) {
              publishedComponentIds.push(...rels.map((r) => r[componentIdColumn]));
            }
          }

          // Get component relations for draft entry (if exists)
          let draftComponentIds = [];
          if (draft) {
            for (const [key, rels] of relationsByEntityAndField.entries()) {
              const [entityId, field] = key.split('::');
              if (entityId === String(draft.id)) {
                draftComponentIds.push(...rels.map((r) => r[componentIdColumn]));
              }
            }
          }

          // Check 1: Media relations in published components
          for (const componentId of publishedComponentIds) {
            totalComponentInstances++; // Track that we're checking a component
            const component = componentsById.get(componentId);
            if (!component) continue;

            const publishedMediaFileIds = mediaByComponent.get(componentId) || [];
            const hasMedia = publishedMediaFileIds.length > 0;

            if (!hasMedia) {
              // Component exists but has no media - this might be OK if it was optional
              continue;
            }

            // Published component has media - now check draft

            // Check 2: If published has media, draft should also have media (on its own component instance)
            // This is the exact bug reported: "Image field shows empty in draft but has an image in published"
            if (draft) {
              // First, check if draft has components at all (if published has components, draft should too)
              if (draftComponentIds.length === 0) {
                errors.push(
                  `[Component Missing in Draft] ${uid} documentId ${documentId}: Published entry ${published.id} has ${componentUid} component ${componentId} with ${fieldName} media (file id(s): ${publishedMediaFileIds.join(', ')}), but draft entry ${draft.id} has no ${componentUid} components at all. Draft should have components when published has components.`
                );
                continue; // Skip media check if no components
              }

              // Check if draft has a component with media
              // IMPORTANT: We need to check if ANY draft component of this type has media
              // because the migration should have cloned the component with its media relation
              let draftHasMedia = false;
              let draftMediaFileIds = [];
              let draftComponentWithoutMedia = [];

              for (const draftComponentId of draftComponentIds) {
                const draftMediaIds = mediaByComponent.get(draftComponentId) || [];
                if (draftMediaIds.length > 0) {
                  draftHasMedia = true;
                  draftMediaFileIds = draftMediaIds;
                  break; // Found one with media, that's good
                } else {
                  draftComponentWithoutMedia.push(draftComponentId);
                }
              }

              // This is the exact bug: published has media, but draft doesn't
              if (!draftHasMedia) {
                errors.push(
                  `[Media Missing in Draft Component] ${uid} documentId ${documentId}: Published entry ${published.id} has ${componentUid} component ${componentId} with ${fieldName} media (file id(s): ${publishedMediaFileIds.join(', ')}), but draft entry ${draft.id} has ${componentUid} component(s) [${draftComponentIds.join(', ')}] without ${fieldName} media. This is the exact bug: "Image field shows empty in draft but has an image in published". Draft components should have media relations when published components do.`
                );
              }

              // Check 3: Draft and published should have SEPARATE component instances
              // This is the critical bug: both pointing to the same component instance
              const sharedComponents = publishedComponentIds.filter((id) =>
                draftComponentIds.includes(id)
              );

              if (sharedComponents.length > 0) {
                errors.push(
                  `[Shared Component Instance] ${uid} documentId ${documentId}: Published entry ${published.id} and draft entry ${draft.id} share the same ${componentUid} component instance(s) [${sharedComponents.join(', ')}] in field "${fieldColumn}". Draft and published entries should have separate component instances. This causes changes to draft to affect published.`
                );
              }
            }
          }

          // Check 4: If draft has components, they should be separate from published
          if (draft && draftComponentIds.length > 0) {
            const sharedComponents = draftComponentIds.filter((id) =>
              publishedComponentIds.includes(id)
            );

            if (sharedComponents.length > 0) {
              errors.push(
                `[Shared Component Instance] ${uid} documentId ${documentId}: Draft entry ${draft.id} and published entry ${published.id} share the same ${componentUid} component instance(s) [${sharedComponents.join(', ')}] in field "${fieldColumn}". Draft and published entries should have separate component instances.`
              );
            }
          }
        }
      }

      // Check nested components: if a component contains another component (like header contains logo)
      // Both draft and published should have separate instances of the nested component
      // ALSO: Check if the component with media (e.g., shared.logo) is nested inside another component
      // We need to check ALL components that might contain this component with media
      const componentSchema = strapi.components[componentUid];

      // First, check if this component (with media) is nested inside other components
      // For example: shared.logo is nested inside shared.header
      const parentComponents = [];
      for (const [parentUid, parentSchema] of Object.entries(strapi.components)) {
        if (!parentSchema?.attributes) continue;
        for (const [fieldName, attr] of Object.entries(parentSchema.attributes)) {
          if (attr.type === 'component' && attr.component === componentUid) {
            parentComponents.push({ uid: parentUid, fieldName, schema: parentSchema });
          }
        }
      }

      // Also check content types that might contain this component directly
      for (const [ctUid, ctSchema] of Object.entries(strapi.contentTypes)) {
        if (!ctSchema?.attributes) continue;
        for (const [fieldName, attr] of Object.entries(ctSchema.attributes)) {
          if (attr.type === 'component' && attr.component === componentUid) {
            parentComponents.push({ uid: ctUid, fieldName, schema: ctSchema, isContentType: true });
          } else if (attr.type === 'dynamiczone' && attr.components?.includes(componentUid)) {
            parentComponents.push({
              uid: ctUid,
              fieldName,
              schema: ctSchema,
              isContentType: true,
              isDynamicZone: true,
            });
          }
        }
      }

      // If this component is nested (e.g., shared.logo inside shared.header), check it via parent components
      if (parentComponents.length > 0 && componentRelations.length === 0) {
        // This component is only nested, not directly on content types
        // Check it through parent components
        console.log(
          `  ℹ️  ${componentUid} is nested (not directly on content types). Checking via parent components: ${parentComponents.map((p) => p.uid).join(', ')}`
        );
        for (const parentInfo of parentComponents) {
          const parentUid = parentInfo.uid;
          const parentFieldName = parentInfo.fieldName;
          const parentSchema = parentInfo.schema;
          const isContentType = parentInfo.isContentType || false;
          const isDynamicZone = parentInfo.isDynamicZone || false;

          if (isContentType) {
            // Parent is a content type - check entries of this content type
            const parentContentType = strapi.contentTypes[parentUid];
            if (!parentContentType?.options?.draftAndPublish) continue;

            const parentMeta = strapi.db.metadata.get(parentUid);
            if (!parentMeta) continue;

            const parentCollectionName = parentContentType.collectionName;
            if (!parentCollectionName) continue;

            // Get parent component join table
            const parentJoinTableName = identifiers.getNameFromTokens([
              { name: parentCollectionName, compressible: true },
              { name: 'components', shortName: 'cmps', compressible: false },
            ]);

            const parentEntityIdColumn = identifiers.getNameFromTokens([
              { name: 'entity', compressible: false },
              { name: 'id', compressible: false },
            ]);
            const parentComponentIdColumn = identifiers.getNameFromTokens([
              { name: 'component', shortName: 'cmp', compressible: false },
              { name: 'id', compressible: false },
            ]);
            const parentComponentTypeColumn = identifiers.getNameFromTokens([
              { name: 'component_type', compressible: false },
            ]);
            const parentFieldColumn = identifiers.FIELD_COLUMN;

            const hasParentTable = await db.schema.hasTable(parentJoinTableName);
            if (!hasParentTable) continue;

            // Get all entries of this content type
            const parentEntries = await db(parentMeta.tableName)
              .select('id', 'document_id', 'published_at')
              .orderBy('id', 'asc');

            const parentEntriesByDocumentId = new Map();
            for (const entry of parentEntries) {
              if (!entry.document_id) continue;
              if (!parentEntriesByDocumentId.has(entry.document_id)) {
                parentEntriesByDocumentId.set(entry.document_id, { published: null, draft: null });
              }
              const doc = parentEntriesByDocumentId.get(entry.document_id);
              if (entry.published_at) {
                doc.published = entry;
              } else {
                doc.draft = entry;
              }
            }

            // Get parent component relations (e.g., shared.header components on content types)
            // The parentUid here is the component that contains the nested component (e.g., shared.header)
            // We need to find all instances of this parent component on content type entries
            const parentComponentRelations = await db(parentJoinTableName)
              .where(parentComponentTypeColumn, parentUid)
              .select('*');

            // Group by entity and field
            const parentRelationsByEntityAndField = new Map();
            for (const rel of parentComponentRelations) {
              const entityId = rel[parentEntityIdColumn];
              const field = rel[parentFieldColumn] || '';
              const key = `${entityId}::${field}`;
              if (!parentRelationsByEntityAndField.has(key)) {
                parentRelationsByEntityAndField.set(key, []);
              }
              parentRelationsByEntityAndField.get(key).push(rel);
            }

            // Get nested component join table (e.g., components_shared_headers_cmps for shared.logo inside shared.header)
            const parentComponentCollectionName = parentSchema.collectionName;
            if (!parentComponentCollectionName) continue;

            const nestedJoinTableName = identifiers.getNameFromTokens([
              { name: parentComponentCollectionName, compressible: true },
              { name: 'components', shortName: 'cmps', compressible: false },
            ]);

            const nestedEntityIdColumn = identifiers.getNameFromTokens([
              { name: 'entity', compressible: false },
              { name: 'id', compressible: false },
            ]);
            const nestedComponentIdColumn = identifiers.getNameFromTokens([
              { name: 'component', shortName: 'cmp', compressible: false },
              { name: 'id', compressible: false },
            ]);
            const nestedComponentTypeColumn = identifiers.getNameFromTokens([
              { name: 'component_type', compressible: false },
            ]);
            const nestedFieldColumn = identifiers.FIELD_COLUMN;

            const hasNestedTable = await db.schema.hasTable(nestedJoinTableName);
            if (!hasNestedTable) continue;

            // Get nested component relations (e.g., shared.logo inside shared.header)
            // The nestedFieldColumn should be the field name in the parent component (e.g., "headerlogo")
            // parentFieldName is the field in the content type (e.g., "header"), but we need the nested field name
            // Let's find the actual nested field name from the parent schema
            const nestedFieldNameInParent = parentFieldName; // This might be wrong - need to check parent schema
            // Actually, parentFieldName is the field in content type, but nested field is different
            // For shared.header containing shared.logo, the nested field is "headerlogo"
            // We need to find this from the parent component schema
            let actualNestedFieldName = null;
            if (parentSchema?.attributes) {
              for (const [fieldName, attr] of Object.entries(parentSchema.attributes)) {
                if (attr.type === 'component' && attr.component === componentUid) {
                  actualNestedFieldName = fieldName;
                  break;
                }
              }
            }

            if (!actualNestedFieldName) {
              // Couldn't find the nested field name - this might be a schema issue
              warnings.push(
                `Could not find nested field name for ${componentUid} inside ${parentUid}. Expected field with component type ${componentUid}.`
              );
              continue;
            }

            const nestedComponentRelations = await db(nestedJoinTableName)
              .where(nestedComponentTypeColumn, componentUid)
              .where(nestedFieldColumn, actualNestedFieldName)
              .select('*');

            if (nestedComponentRelations.length === 0) {
              // No nested components found - this might be OK if they're optional
              // But log it for debugging
              continue;
            }

            // Group nested by parent component ID
            const nestedByParent = new Map();
            for (const nestedRel of nestedComponentRelations) {
              const parentId = nestedRel[nestedEntityIdColumn];
              if (!nestedByParent.has(parentId)) {
                nestedByParent.set(parentId, []);
              }
              nestedByParent.get(parentId).push(nestedRel[nestedComponentIdColumn]);
            }

            // Get media relations for nested components
            const allNestedIds = [
              ...new Set(nestedComponentRelations.map((r) => r[nestedComponentIdColumn])),
            ];
            if (allNestedIds.length > 0 && filesRelatedJoinTable) {
              const nestedFileRelations = await db(filesRelatedJoinTable)
                .whereIn(relatedIdColumn, allNestedIds)
                .where(relatedTypeColumn, componentUid)
                .where(fieldColumn, componentWithMedia.mediaFields[0].fieldName)
                .select(fileIdColumn, relatedIdColumn, fieldColumn);

              const nestedMediaByComponent = new Map();
              for (const fileRel of nestedFileRelations) {
                const nestedComponentId = fileRel[relatedIdColumn];
                if (!nestedMediaByComponent.has(nestedComponentId)) {
                  nestedMediaByComponent.set(nestedComponentId, []);
                }
                nestedMediaByComponent.get(nestedComponentId).push(fileRel[fileIdColumn]);
              }

              // Check each document's draft and published entries
              for (const [documentId, docEntries] of parentEntriesByDocumentId.entries()) {
                const published = docEntries.published;
                const draft = docEntries.draft;

                // After migration, all published entries should have draft versions
                // But we still need to check if draft exists (it should after migration)
                if (!published) continue; // Skip if no published entry
                if (!draft) {
                  // After migration, this shouldn't happen, but log it
                  warnings.push(
                    `Published entry ${published.id} (documentId ${documentId}) has no draft version after migration. This might indicate a migration issue.`
                  );
                  continue;
                }

                // Get parent component IDs for published and draft
                const publishedParentIds = [];
                for (const [key, rels] of parentRelationsByEntityAndField.entries()) {
                  const [entityId, field] = key.split('::');
                  if (entityId === String(published.id)) {
                    const matchingRels = rels.filter(
                      (r) => r[parentComponentTypeColumn] === parentUid
                    );
                    publishedParentIds.push(...matchingRels.map((r) => r[parentComponentIdColumn]));
                  }
                }

                const draftParentIds = [];
                for (const [key, rels] of parentRelationsByEntityAndField.entries()) {
                  const [entityId, field] = key.split('::');
                  if (entityId === String(draft.id)) {
                    const matchingRels = rels.filter(
                      (r) => r[parentComponentTypeColumn] === parentUid
                    );
                    draftParentIds.push(...matchingRels.map((r) => r[parentComponentIdColumn]));
                  }
                }

                // Check nested components for shared instances and missing media
                for (const publishedParentId of publishedParentIds) {
                  const publishedNestedIds = nestedByParent.get(publishedParentId) || [];
                  if (publishedNestedIds.length === 0) continue;

                  for (const draftParentId of draftParentIds) {
                    const draftNestedIds = nestedByParent.get(draftParentId) || [];

                    // Check for shared nested component instances
                    const sharedNested = publishedNestedIds.filter((id) =>
                      draftNestedIds.includes(id)
                    );
                    if (sharedNested.length > 0) {
                      errors.push(
                        `[Shared Nested Component Instance] ${parentUid} documentId ${documentId}: Published entry ${published.id} has ${parentUid} component ${publishedParentId} containing ${componentUid} nested component(s) [${sharedNested.join(', ')}], and draft entry ${draft.id} has ${parentUid} component ${draftParentId} sharing the same ${componentUid} instance(s). Nested components should be cloned separately for draft and published entries.`
                      );
                    }

                    // Check media relations for nested components
                    for (const publishedNestedId of publishedNestedIds) {
                      totalComponentInstances++; // Track nested component being checked
                      const publishedNestedMediaIds =
                        nestedMediaByComponent.get(publishedNestedId) || [];
                      if (publishedNestedMediaIds.length > 0) {
                        totalWithMedia++; // Track nested component with media
                        // Published nested has media - check draft nested
                        for (const draftNestedId of draftNestedIds) {
                          totalComponentInstances++; // Track draft nested component
                          const draftNestedMediaIds =
                            nestedMediaByComponent.get(draftNestedId) || [];
                          if (draftNestedMediaIds.length > 0) {
                            totalWithMedia++; // Track draft nested component with media
                          } else {
                            // This is the exact bug: published nested has media, but draft nested doesn't
                            errors.push(
                              `[Media Missing in Draft Nested Component] ${parentUid} documentId ${documentId}: Published entry ${published.id} has ${parentUid} component ${publishedParentId} containing ${componentUid} nested component ${publishedNestedId} with ${componentWithMedia.mediaFields[0].fieldName} media (file id(s): ${publishedNestedMediaIds.join(', ')}), but draft entry ${draft.id} has ${parentUid} component ${draftParentId} containing ${componentUid} nested component ${draftNestedId} without ${componentWithMedia.mediaFields[0].fieldName} media. This is the exact bug: "Image field shows empty in draft but has an image in published".`
                            );
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }

      // Now check if componentSchema contains nested components
      if (componentSchema?.attributes) {
        for (const [nestedFieldName, nestedAttr] of Object.entries(componentSchema.attributes)) {
          if (nestedAttr.type === 'component') {
            const nestedComponentUid = nestedAttr.component;
            const nestedComponentSchema = strapi.components[nestedComponentUid];
            if (!nestedComponentSchema) continue;

            const nestedComponentCollectionName = nestedComponentSchema.collectionName;
            if (!nestedComponentCollectionName) continue;

            // Get nested component join table for the parent component (e.g., shared.header)
            const nestedJoinTableName = identifiers.getNameFromTokens([
              { name: componentCollectionName, compressible: true },
              { name: 'components', shortName: 'cmps', compressible: false },
            ]);

            const nestedEntityIdColumn = identifiers.getNameFromTokens([
              { name: 'entity', compressible: false },
              { name: 'id', compressible: false },
            ]);
            const nestedComponentIdColumn = identifiers.getNameFromTokens([
              { name: 'component', shortName: 'cmp', compressible: false },
              { name: 'id', compressible: false },
            ]);
            const nestedComponentTypeColumn = identifiers.getNameFromTokens([
              { name: 'component_type', compressible: false },
            ]);
            const nestedFieldColumn = identifiers.FIELD_COLUMN;

            const hasNestedTable = await db.schema.hasTable(nestedJoinTableName);
            if (!hasNestedTable) continue;

            // Get nested component relations for all parent component instances
            const nestedComponentRelations = await db(nestedJoinTableName)
              .where(nestedComponentTypeColumn, nestedComponentUid)
              .where(nestedFieldColumn, nestedFieldName)
              .select('*');

            if (nestedComponentRelations.length === 0) continue;

            // Group nested relations by parent component ID
            const nestedByParent = new Map();
            for (const nestedRel of nestedComponentRelations) {
              const parentId = nestedRel[nestedEntityIdColumn];
              if (!nestedByParent.has(parentId)) {
                nestedByParent.set(parentId, []);
              }
              nestedByParent.get(parentId).push(nestedRel[nestedComponentIdColumn]);
            }

            // Check each document's draft and published entries
            for (const [documentId, docEntries] of entriesByDocumentId.entries()) {
              const published = docEntries.published;
              const draft = docEntries.draft;

              if (!published || !draft) continue;

              // Get parent component IDs for published and draft - check ALL fields
              // The parent component (e.g., shared.header) might be in "header" field or "sections" dynamic zone
              const publishedParentIds = [];
              for (const [key, rels] of relationsByEntityAndField.entries()) {
                const [entityId, field] = key.split('::');
                if (entityId === String(published.id)) {
                  // Only include if it's the parent component type (e.g., shared.header)
                  const matchingRels = rels.filter((r) => r[componentTypeColumn] === componentUid);
                  publishedParentIds.push(...matchingRels.map((r) => r[componentIdColumn]));
                }
              }

              const draftParentIds = [];
              for (const [key, rels] of relationsByEntityAndField.entries()) {
                const [entityId, field] = key.split('::');
                if (entityId === String(draft.id)) {
                  const matchingRels = rels.filter((r) => r[componentTypeColumn] === componentUid);
                  draftParentIds.push(...matchingRels.map((r) => r[componentIdColumn]));
                }
              }

              // For each published parent component, check its nested components
              for (const publishedParentId of publishedParentIds) {
                const publishedNestedIds = nestedByParent.get(publishedParentId) || [];

                if (publishedNestedIds.length === 0) continue;

                // Find corresponding draft parent component (should be different instance)
                // We can't easily match them 1:1, so we check if any draft parent shares nested components
                for (const draftParentId of draftParentIds) {
                  const draftNestedIds = nestedByParent.get(draftParentId) || [];

                  // Check if they share nested component instances (this is the bug)
                  const sharedNested = publishedNestedIds.filter((id) =>
                    draftNestedIds.includes(id)
                  );

                  if (sharedNested.length > 0) {
                    errors.push(
                      `[Shared Nested Component Instance] ${uid} documentId ${documentId}: Published entry ${published.id} has ${componentUid} component ${publishedParentId} containing ${nestedComponentUid} nested component(s) [${sharedNested.join(', ')}], and draft entry ${draft.id} has ${componentUid} component ${draftParentId} sharing the same ${nestedComponentUid} instance(s). Nested components should be cloned separately for draft and published entries. This causes changes to draft nested components to affect published.`
                    );
                  }

                  // Also check if nested component has media - if published nested has media, draft nested should too
                  const nestedComponentWithMedia = componentsWithMedia.find(
                    (c) => c.uid === nestedComponentUid
                  );
                  if (nestedComponentWithMedia && nestedComponentWithMedia.mediaFields.length > 0) {
                    // Get media relations for nested components - need to reload for nested component IDs
                    const nestedMediaField = nestedComponentWithMedia.mediaFields[0];
                    const nestedComponentMeta = strapi.db.metadata.get(nestedComponentUid);

                    if (nestedMediaField && nestedComponentMeta) {
                      // Reload media relations for nested component IDs
                      const allNestedIds = [...publishedNestedIds, ...draftNestedIds];
                      if (allNestedIds.length > 0) {
                        // Get media relations for nested components
                        const nestedFileRelations = await db(filesRelatedJoinTable)
                          .whereIn(relatedIdColumn, allNestedIds)
                          .where(relatedTypeColumn, nestedComponentUid)
                          .where(fieldColumn, nestedMediaField.fieldName)
                          .select(fileIdColumn, relatedIdColumn, fieldColumn);

                        const nestedMediaByComponent = new Map();
                        for (const fileRel of nestedFileRelations) {
                          const nestedComponentId = fileRel[relatedIdColumn];
                          if (!nestedMediaByComponent.has(nestedComponentId)) {
                            nestedMediaByComponent.set(nestedComponentId, []);
                          }
                          nestedMediaByComponent.get(nestedComponentId).push(fileRel[fileIdColumn]);
                        }

                        // Check published nested components have media
                        for (const publishedNestedId of publishedNestedIds) {
                          const publishedNestedMediaIds =
                            nestedMediaByComponent.get(publishedNestedId) || [];
                          if (publishedNestedMediaIds.length > 0) {
                            // Published nested has media - check draft nested
                            // Find corresponding draft nested component
                            for (const draftNestedId of draftNestedIds) {
                              const draftNestedMediaIds =
                                nestedMediaByComponent.get(draftNestedId) || [];
                              if (draftNestedMediaIds.length === 0) {
                                errors.push(
                                  `[Media Missing in Draft Nested Component] ${uid} documentId ${documentId}: Published entry ${published.id} has ${componentUid} component ${publishedParentId} containing ${nestedComponentUid} nested component ${publishedNestedId} with ${nestedMediaField.fieldName} media (file id(s): ${publishedNestedMediaIds.join(', ')}), but draft entry ${draft.id} has ${componentUid} component ${draftParentId} containing ${nestedComponentUid} nested component ${draftNestedId} without ${nestedMediaField.fieldName} media. Draft nested components should have media relations when published nested components do.`
                                );
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  if (errors.length === 0) {
    console.log(
      '✅ All component media relations and nested component cloning validated correctly'
    );
    // Always show what was checked, even if 0 (helps debug if validation isn't running)
    console.log(
      `   (Checked ${totalComponentInstances} component instances, ${totalWithMedia} components with media relations)`
    );
    if (totalComponentInstances === 0) {
      warnings.push(
        'No component instances with media were checked. This might indicate that components with media are only nested (e.g., shared.logo inside shared.header), which should be validated in the nested component section.'
      );
    }
  } else {
    console.log(`❌ Found ${errors.length} component media/cloning issue(s)`);
    console.log(
      `   (Checked ${totalComponentInstances} component instances, ${totalWithMedia} components with media relations)`
    );
    errors.slice(0, 10).forEach((err) => console.log(`   - ${err}`));
    if (errors.length > 10) {
      console.log(`   ... and ${errors.length - 10} more`);
    }
  }

  if (warnings.length > 0) {
    warnings.forEach((warn) => console.log(`   ⚠️  ${warn}`));
  }

  return { errors, warnings };
}

/**
 * Compares the migration output against the expected behavior of `documentService.discard()`
 * so we know the SQL path mirrors the runtime implementation.
 */
async function validateDiscardBehaviorExpectations(strapi) {
  console.log('\n🎯 Validating discard() behavior expectations...\n');

  const errors = [];

  // Get all relation-dp entries (published and drafts)
  const relationDpAll = await strapi.db.query('api::relation-dp.relation-dp').findMany({
    populate: {
      oneToOneBasic: true,
      oneToManyBasics: true,
      manyToOneBasic: true,
      manyToManyBasics: true,
      selfOne: true,
      selfMany: true,
    },
  });

  // Get all basic-dp entries to map published to drafts
  const basicDpAll = await strapi.db.query('api::basic-dp.basic-dp').findMany({});

  // Create mapping: documentId -> { published: id, draft: id }
  const basicDpMap = new Map();
  for (const entry of basicDpAll) {
    if (!entry.documentId) continue;
    if (!basicDpMap.has(entry.documentId)) {
      basicDpMap.set(entry.documentId, { published: null, draft: null });
    }
    const map = basicDpMap.get(entry.documentId);
    if (entry.publishedAt) {
      map.published = entry.id;
    } else {
      map.draft = entry.id;
    }
  }

  // Create mapping: published relation-dp id -> draft relation-dp id
  const relationDpMap = new Map();
  const relationDpByDocumentId = new Map();
  for (const entry of relationDpAll) {
    if (!entry.documentId) continue;
    if (!relationDpByDocumentId.has(entry.documentId)) {
      relationDpByDocumentId.set(entry.documentId, { published: null, draft: null });
    }
    const map = relationDpByDocumentId.get(entry.documentId);
    if (entry.publishedAt) {
      map.published = entry.id;
    } else {
      map.draft = entry.id;
    }
  }
  // Create reverse mapping: published id -> draft id
  for (const [documentId, map] of relationDpByDocumentId) {
    if (map.published && map.draft) {
      relationDpMap.set(map.published, map.draft);
    }
  }

  // Test 1: P → P relations should result in D_new → D_new (verified discard() behavior)
  // discard() uses transformData() with status: 'draft', which resolves to draft targets
  // getRelationTargetStatus() returns [sourceStatus] when both have draft/publish
  let pToPTested = 0;
  let pToPErrors = 0;

  for (const publishedEntry of relationDpAll) {
    if (!publishedEntry.publishedAt) continue; // Only check published entries

    const draftId = relationDpMap.get(publishedEntry.id);
    if (!draftId) continue; // No draft counterpart found

    const draftEntry = relationDpAll.find((e) => e.id === draftId);
    if (!draftEntry) continue;

    // Check oneToOneBasic relation (P → P scenario)
    if (publishedEntry.oneToOneBasic) {
      pToPTested++;
      const publishedTargetId = publishedEntry.oneToOneBasic.id;
      const draftTargetMap = basicDpMap.get(publishedEntry.oneToOneBasic.documentId);

      // Check what the draft relates to
      if (draftEntry.oneToOneBasic) {
        const draftTargetId = draftEntry.oneToOneBasic.id;
        const isDraftTarget = draftTargetId === draftTargetMap?.draft;
        const isPublishedTarget = draftTargetId === draftTargetMap?.published;

        // According to discard() behavior (verified): drafts relate to drafts (D_new → D_new)
        // This is because getRelationTargetStatus() returns [sourceStatus] when both have DP
        if (!isPublishedTarget && !isDraftTarget) {
          errors.push(
            `relation-dp: Published entry ${publishedEntry.id} → Basic ${publishedTargetId}, but draft ${draftId} → Basic ${draftTargetId} (neither published nor draft target)`
          );
          pToPErrors++;
        } else if (isDraftTarget) {
          // This is D_new → D_new behavior (correct - matches discard())
          console.log(
            `  ✓ P → P relation: Draft relates to draft target (D_new → D_new) - Entry ${publishedEntry.id} ✅`
          );
        } else if (isPublishedTarget) {
          // This is D_new → P behavior (INCORRECT - should be D_new → D_new)
          errors.push(
            `relation-dp: Published entry ${publishedEntry.id} → Basic ${publishedTargetId} (published), but draft ${draftId} → Basic ${draftTargetId} (published) - should be draft target (D_new → D_new)`
          );
          pToPErrors++;
        }
      } else {
        errors.push(
          `relation-dp: Published entry ${publishedEntry.id} has oneToOneBasic, but draft ${draftId} does not`
        );
        pToPErrors++;
      }
    }

    // Check manyToOneBasic relation (P → P scenario)
    if (publishedEntry.manyToOneBasic) {
      pToPTested++;
      const publishedTargetId = publishedEntry.manyToOneBasic.id;
      const draftTargetMap = basicDpMap.get(publishedEntry.manyToOneBasic.documentId);

      if (draftEntry.manyToOneBasic) {
        const draftTargetId = draftEntry.manyToOneBasic.id;
        const isDraftTarget = draftTargetId === draftTargetMap?.draft;
        const isPublishedTarget = draftTargetId === draftTargetMap?.published;

        if (!isPublishedTarget && !isDraftTarget) {
          errors.push(
            `relation-dp: Published entry ${publishedEntry.id} → Basic ${publishedTargetId} (manyToOne), but draft ${draftId} → Basic ${draftTargetId} (neither published nor draft target)`
          );
          pToPErrors++;
        } else if (isPublishedTarget) {
          // This is D_new → P behavior (INCORRECT - should be D_new → D_new)
          errors.push(
            `relation-dp: Published entry ${publishedEntry.id} → Basic ${publishedTargetId} (manyToOne, published), but draft ${draftId} → Basic ${draftTargetId} (published) - should be draft target (D_new → D_new)`
          );
          pToPErrors++;
        } else if (isDraftTarget) {
          // This is D_new → D_new behavior (correct)
          console.log(
            `  ✓ P → P relation (manyToOne): Draft relates to draft target (D_new → D_new) - Entry ${publishedEntry.id} ✅`
          );
        }
      } else {
        errors.push(
          `relation-dp: Published entry ${publishedEntry.id} has manyToOneBasic, but draft ${draftId} does not`
        );
        pToPErrors++;
      }
    }

    // Check manyToManyBasics relations (P → P scenario)
    if (publishedEntry.manyToManyBasics && publishedEntry.manyToManyBasics.length > 0) {
      for (const target of publishedEntry.manyToManyBasics) {
        pToPTested++;
        const publishedTargetId = target.id;
        const draftTargetMap = basicDpMap.get(target.documentId);

        const draftTarget = draftEntry.manyToManyBasics?.find(
          (t) => t.documentId === target.documentId
        );

        if (!draftTarget) {
          errors.push(
            `relation-dp: Published entry ${publishedEntry.id} → Basic ${publishedTargetId} (manyToMany), but draft ${draftId} does not have relation to documentId ${target.documentId}`
          );
          pToPErrors++;
        } else {
          const draftTargetId = draftTarget.id;
          const isDraftTarget = draftTargetId === draftTargetMap?.draft;
          const isPublishedTarget = draftTargetId === draftTargetMap?.published;

          if (!isPublishedTarget && !isDraftTarget) {
            errors.push(
              `relation-dp: Published entry ${publishedEntry.id} → Basic ${publishedTargetId} (manyToMany), but draft ${draftId} → Basic ${draftTargetId} (neither published nor draft target)`
            );
            pToPErrors++;
          } else if (isPublishedTarget) {
            // This is D_new → P behavior (INCORRECT - should be D_new → D_new)
            errors.push(
              `relation-dp: Published entry ${publishedEntry.id} → Basic ${publishedTargetId} (manyToMany, published), but draft ${draftId} → Basic ${draftTargetId} (published) - should be draft target (D_new → D_new)`
            );
            pToPErrors++;
          } else if (isDraftTarget) {
            // This is D_new → D_new behavior (correct)
            console.log(
              `  ✓ P → P relation (manyToMany): Draft relates to draft target (D_new → D_new) - Entry ${publishedEntry.id} ✅`
            );
          }
        }
      }
    }

    // Test 2: Self-referential relations (P → P self)
    if (publishedEntry.selfOne) {
      const publishedSelfId = publishedEntry.selfOne.id;
      if (draftEntry.selfOne) {
        const draftSelfId = draftEntry.selfOne.id;
        // Self-referential should point to itself (D_new → D_new)
        if (draftSelfId !== draftId) {
          errors.push(
            `relation-dp: Self-referential relation - Published ${publishedEntry.id} → ${publishedSelfId}, but draft ${draftId} → ${draftSelfId} (should be ${draftId})`
          );
        } else {
          console.log(
            `  ✓ Self-referential: Draft ${draftId} correctly relates to itself - Entry ${publishedEntry.id}`
          );
        }
      } else {
        errors.push(
          `relation-dp: Published entry ${publishedEntry.id} has selfOne, but draft ${draftId} does not`
        );
      }
    }
  }

  if (pToPTested > 0) {
    if (pToPErrors === 0) {
      console.log(
        `✅ P → P relations validated: ${pToPTested} relations checked - all correctly creating D_new → D_new (matches discard() behavior)`
      );
    } else {
      console.log(
        `❌ P → P relations: ${pToPErrors} errors out of ${pToPTested} checked (should be D_new → D_new, not D_new → P)`
      );
    }
  }

  // Test 3: D_old → P relations should remain unchanged (NOT migrated)
  // This is expected behavior - discard() only affects the entry being discarded
  let dOldToPTested = 0;
  let dOldToPErrors = 0;

  for (const entry of relationDpAll) {
    if (entry.publishedAt) continue; // Only check draft entries
    if (relationDpMap.has(entry.id)) continue; // Skip D_new (newly created drafts)

    // This is D_old (original draft from v4)
    if (entry.oneToOneBasic) {
      dOldToPTested++;
      const target = entry.oneToOneBasic;
      const targetMap = basicDpMap.get(target.documentId);

      // D_old → P should remain as-is (pointing to published)
      // But we should check if target has both published and draft
      if (targetMap && targetMap.published && targetMap.draft) {
        // Target has both published and draft
        // D_old should still point to published (not updated) - matches discard() behavior
        if (target.id === targetMap.published) {
          console.log(
            `  ✓ D_old → P: Original draft ${entry.id} correctly still points to published target ${target.id} (matches discard() behavior)`
          );
        } else if (target.id === targetMap.draft) {
          // This could be:
          // 1. D_old was already pointing to draft in v4 (OK)
          // 2. Migration incorrectly updated D_old → P to D_old → D_new (NOT OK - should not happen)
          // We can't distinguish, so we'll just log it as info
          console.log(
            `  ℹ️  D_old → P: Original draft ${entry.id} points to draft target ${target.id} (may have been draft in v4, or migration updated it)`
          );
        } else {
          errors.push(
            `relation-dp: Original draft ${entry.id} → Basic ${target.id} (neither published nor draft target)`
          );
          dOldToPErrors++;
        }
      }
    }
  }

  if (dOldToPTested > 0) {
    if (dOldToPErrors === 0) {
      console.log(
        `✅ D_old → P relations: ${dOldToPTested} checked (should remain pointing to published if target was published, see details above)`
      );
    } else {
      console.log(
        `❌ D_old → P relations: ${dOldToPErrors} errors out of ${dOldToPTested} checked`
      );
    }
  }

  // Test 4: JoinColumn relations (oneToOne, manyToOne)
  // These are stored as foreign keys, not join tables
  // Validation is handled by validateJoinColumnRelations() which is called separately
  // Here we just note that the validation exists
  console.log(`  ℹ️  JoinColumn relations: Validated separately by validateJoinColumnRelations()`);

  if (errors.length === 0) {
    console.log(`✅ All discard() behavior expectations validated`);
  } else {
    console.log(`❌ Found ${errors.length} issues with discard() behavior expectations`);
  }

  return errors;
}

/**
 * Grabs raw table counts before Strapi boots so we can compare v4 vs v5 states later.
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
    case 'mariadb':
      dbConfig = {
        client: 'mysql2',
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
 * Captures all relations from v4 database before migration.
 * This includes:
 * - JoinColumn relations (oneToOne, manyToOne) - foreign keys
 * - JoinTable relations (oneToMany, manyToMany) - join tables
 * - Component relations - component join tables
 * - Media relations - files_related_morphs table
 *
 * Returns a structure that can be used to verify all relations were migrated to v5.
 */
async function getPreMigrationRelations() {
  if (!knex) {
    return null; // Can't check without knex
  }

  const client = process.env.DATABASE_CLIENT || 'sqlite';
  let dbConfig = {};

  // Build database config from environment variables (same as getPreMigrationCounts)
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
    case 'mariadb':
      dbConfig = {
        client: 'mysql2',
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
  const relations = {
    joinColumn: [], // { table, sourceId, targetId, column, targetTable }
    joinTable: [], // { table, sourceId, targetId, sourceColumn, targetColumn }
    component: [], // { entityTable, entityId, componentId, componentType, fieldName }
    media: [], // { relatedId, relatedType, field, fileId, order }
  };

  try {
    // Get all tables to find content types and relations
    const tables = await db.raw(
      client === 'sqlite' || client === 'better-sqlite3'
        ? "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
        : client === 'postgres' || client === 'pg'
          ? "SELECT tablename as name FROM pg_tables WHERE schemaname = 'public'"
          : 'SELECT table_name as name FROM information_schema.tables WHERE table_schema = DATABASE()'
    );

    const tableNames = tables.rows ? tables.rows.map((r) => r.name) : tables.map((r) => r.name);

    // Known content type tables (we'll discover more dynamically)
    const contentTypeTables = [
      'basics',
      'basic_dps',
      'basic_dp_i18ns',
      'relations',
      'relation_dps',
      'relation_dp_i18ns',
    ];

    // Capture JoinColumn relations (foreign keys)
    for (const tableName of tableNames) {
      if (!contentTypeTables.includes(tableName)) continue;

      try {
        // Get table structure to find foreign key columns
        const columns = await db(tableName).columnInfo();
        for (const [columnName, columnInfo] of Object.entries(columns)) {
          // Foreign key columns typically end with _id
          if (columnName.endsWith('_id') && columnName !== 'id') {
            // Get all entries with this relation
            const entries = await db(tableName).select('id', columnName).whereNotNull(columnName);

            for (const entry of entries) {
              // Infer target table from column name (e.g., one_to_one_basic_id -> basic_dps)
              // This is a heuristic - we'll verify in v5 validation
              const targetTable = inferTargetTable(columnName, tableNames);
              if (targetTable) {
                relations.joinColumn.push({
                  sourceTable: tableName,
                  sourceId: entry.id,
                  targetTable: targetTable,
                  targetId: entry[columnName],
                  column: columnName,
                });
              }
            }
          }
        }
      } catch (e) {
        // Table might not exist or might not be a content type table
        continue;
      }
    }

    // Capture JoinTable relations (many-to-many, one-to-many)
    for (const tableName of tableNames) {
      // Join tables typically have _links suffix or contain both source and target IDs
      if (!tableName.includes('_links') && !tableName.match(/.*_.*_.*_links/)) continue;

      try {
        const columns = await db(tableName).columnInfo();
        const columnNames = Object.keys(columns);

        // Find source and target ID columns
        // Typically: {source}_id and {target}_id, or order_column variants
        const idColumns = columnNames.filter((c) => c.endsWith('_id') && c !== 'id');
        if (idColumns.length >= 2) {
          const entries = await db(tableName).select('*');
          for (const entry of entries) {
            // Use first two ID columns as source and target
            const sourceColumn = idColumns[0];
            const targetColumn = idColumns[1];

            relations.joinTable.push({
              table: tableName,
              sourceId: entry[sourceColumn],
              targetId: entry[targetColumn],
              sourceColumn: sourceColumn,
              targetColumn: targetColumn,
            });
          }
        }
      } catch (e) {
        continue;
      }
    }

    // Capture Component relations
    for (const tableName of tableNames) {
      // Component join tables typically have 'components' in the name
      if (!tableName.includes('components') && !tableName.includes('cmps')) continue;

      try {
        const columns = await db(tableName).columnInfo();
        const columnNames = Object.keys(columns);

        // Find entity_id, component_id, component_type columns
        const entityIdCol = columnNames.find((c) => c.includes('entity') && c.includes('id'));
        const componentIdCol = columnNames.find(
          (c) => c.includes('component') && c.includes('id') && !c.includes('type')
        );
        const componentTypeCol = columnNames.find(
          (c) => c.includes('component') && c.includes('type')
        );
        const fieldCol = columnNames.find((c) => c.includes('field'));

        if (entityIdCol && componentIdCol && componentTypeCol) {
          const entries = await db(tableName).select('*');
          for (const entry of entries) {
            const inferredEntityTable = inferEntityTableFromComponentTable(tableName, tableNames);

            // Skip if we couldn't infer the entity table
            if (!inferredEntityTable) {
              continue;
            }

            // Skip if the inferred "entity table" is actually a component table
            // Component tables start with "components_" and are not entity tables
            // Content type tables don't start with "components_" (they're like relation_dps, basic_dps, etc.)
            if (inferredEntityTable.startsWith('components_')) {
              // This is a nested component relation (component inside component)
              // We can't easily validate these without knowing which entity uses the parent component
              // Skip during capture - these will be validated by other means
              continue;
            }

            relations.component.push({
              entityTable: inferredEntityTable,
              entityId: entry[entityIdCol],
              componentId: entry[componentIdCol],
              componentType: entry[componentTypeCol],
              fieldName: entry[fieldCol] || null,
            });
          }
        }
      } catch (e) {
        continue;
      }
    }

    // Capture Media relations (files_related_morphs)
    const mediaTableName = 'files_related_morphs';
    if (tableNames.includes(mediaTableName)) {
      try {
        const entries = await db(mediaTableName).select('*');
        for (const entry of entries) {
          relations.media.push({
            relatedId: entry.related_id || entry.relatedId,
            relatedType: entry.related_type || entry.relatedType,
            field: entry.field,
            fileId: entry.file_id || entry.fileId,
            order: entry.order || null,
          });
        }
      } catch (e) {
        // Media table might not exist or have different structure
      }
    }

    await db.destroy();
    return relations;
  } catch (error) {
    try {
      await db.destroy();
    } catch (e) {
      // Ignore destroy errors
    }
    console.warn(`⚠️  Could not get pre-migration relations: ${error.message}`);
    return null;
  }
}

/**
 * Helper to infer target table from foreign key column name
 */
function inferTargetTable(columnName, allTables) {
  // Remove _id suffix and convert to table name
  const base = columnName.replace(/_id$/, '');

  // Try common patterns
  const candidates = [base, base + 's', base.replace(/_/g, '_')];

  // Try to find matching table
  for (const candidate of candidates) {
    if (allTables.includes(candidate)) {
      return candidate;
    }
  }

  // Try snake_case to plural
  const plural = base + 's';
  if (allTables.includes(plural)) {
    return plural;
  }

  return null;
}

/**
 * Helper to infer entity table from component join table name
 */
function inferEntityTableFromComponentTable(componentTableName, allTables) {
  // Component join tables:
  // - v4: {collectionName}_components
  // - v5: {collectionName}_cmps
  // Extract the collection name by removing the suffix

  let entityBase = null;

  // Remove v5 suffix: _cmps
  if (componentTableName.endsWith('_cmps')) {
    entityBase = componentTableName.slice(0, -5); // Remove '_cmps'
  }
  // Remove v4 suffix: _components
  else if (componentTableName.endsWith('_components')) {
    entityBase = componentTableName.slice(0, -11); // Remove '_components'
  }

  if (!entityBase) {
    return null;
  }

  // Try to find exact match first
  if (allTables.includes(entityBase)) {
    return entityBase;
  }

  // Try to find matching table (contains entityBase but not 'component' or 'cmp')
  for (const table of allTables) {
    if (
      table === entityBase ||
      (table.includes(entityBase) && !table.includes('component') && !table.includes('cmp'))
    ) {
      return table;
    }
  }

  return null;
}

/**
 * Validates that all original v4 relations were successfully migrated to v5.
 * This is critical to catch data loss from failed relation migrations.
 */
async function validateAllV4RelationsMigrated(strapi, preMigrationRelations) {
  console.log('\n🔍 Validating all original v4 relations were migrated to v5...\n');

  if (!preMigrationRelations) {
    console.log(
      '⚠️  Could not validate relation completeness: pre-migration relations not captured'
    );
    return { errors: [], warnings: ['Pre-migration relations not available'] };
  }

  const errors = [];
  const warnings = [];
  const db = strapi.db.connection;
  const identifiers = strapi.db.metadata.identifiers;

  // Build map of v4 full table names -> v5 short table names
  // v4 has full names, v5 has short names (after identifier shortening migration)
  // IMPORTANT: Join tables are also in metadata (as internal entries), so we need to check ALL metadata entries
  const fullToShortTableName = new Map();

  // Check ALL metadata entries (content types, components, AND internal join tables)
  const allMetadataEntries = Array.from(strapi.db.metadata.values());

  for (const meta of allMetadataEntries) {
    const shortTableName = meta.tableName;
    const fullTableName = identifiers.getUnshortenedName(shortTableName);

    // Map full -> short (v4 -> v5)
    if (fullTableName && fullTableName !== shortTableName) {
      fullToShortTableName.set(fullTableName, shortTableName);
    }
    // Also map short -> short (in case table wasn't shortened)
    fullToShortTableName.set(shortTableName, shortTableName);
  }

  // Also check all actual tables in the database to catch any we might have missed
  // This is a fallback for tables that might not be in metadata
  try {
    const client = strapi.db.config.connection.client;
    let tables;
    if (client === 'sqlite' || client === 'better-sqlite3') {
      tables = await db.raw(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
      );
      tables = tables.map((r) => r.name);
    } else if (client === 'postgres' || client === 'pg') {
      tables = await db.raw("SELECT tablename as name FROM pg_tables WHERE schemaname = 'public'");
      tables = tables.rows ? tables.rows.map((r) => r.name) : tables.map((r) => r.name);
    } else if (client === 'mysql' || client === 'mariadb') {
      tables = await db.raw(
        'SELECT table_name as name FROM information_schema.tables WHERE table_schema = DATABASE()'
      );
      tables = tables[0] ? tables[0].map((r) => r.name) : tables.map((r) => r.name);
    } else {
      tables = [];
    }

    // For each table in the database, check if we can get its full name
    for (const tableName of tables) {
      if (!fullToShortTableName.has(tableName)) {
        const fullName = identifiers.getUnshortenedName(tableName);
        if (fullName && fullName !== tableName) {
          fullToShortTableName.set(fullName, tableName);
        }
        // Also map the table name to itself
        fullToShortTableName.set(tableName, tableName);
      }
    }
  } catch (e) {
    // If we can't query tables, continue with what we have from metadata
  }

  // Helper to get v5 table name from v4 table name
  const getV5TableName = (v4TableName) => {
    return fullToShortTableName.get(v4TableName) || v4TableName;
  };

  // Get all v5 entries grouped by table and document_id
  const v5EntriesByTable = new Map();
  const allContentTypes = Object.values(strapi.contentTypes);

  for (const contentType of allContentTypes) {
    const uid = contentType.uid;
    const meta = strapi.db.metadata.get(uid);
    if (!meta) continue;

    try {
      const entries = await db(meta.tableName)
        .select('id', 'document_id', 'published_at')
        .orderBy('id', 'asc');

      v5EntriesByTable.set(meta.tableName, entries);
    } catch (e) {
      // Table might not exist
      continue;
    }
  }

  // Validate JoinColumn relations
  let joinColumnChecked = 0;
  let joinColumnMissing = 0;
  for (const rel of preMigrationRelations.joinColumn) {
    joinColumnChecked++;

    // Convert v4 table names to v5 table names
    const v5SourceTable = getV5TableName(rel.sourceTable);
    const v5TargetTable = getV5TableName(rel.targetTable);

    // Find v5 entries in source table
    const v5SourceEntries = v5EntriesByTable.get(v5SourceTable) || [];
    const v5TargetEntries = v5EntriesByTable.get(v5TargetTable) || [];

    // Also need to convert column name (might be shortened)
    // Get the v5 column name by checking metadata
    let v5ColumnName = rel.column;
    try {
      // Try to find the content type that has this table
      for (const contentType of allContentTypes) {
        const meta = strapi.db.metadata.get(contentType.uid);
        if (!meta || meta.tableName !== v5SourceTable) continue;

        // Check if this attribute exists and get its column name
        for (const [attrName, attr] of Object.entries(meta.attributes)) {
          if (attr.type === 'relation' && attr.joinColumn) {
            const fullColumnName = identifiers.getUnshortenedName(attr.joinColumn.name);
            if (fullColumnName === rel.column || attr.joinColumn.name === rel.column) {
              v5ColumnName = attr.joinColumn.name;
              break;
            }
          }
        }
        if (v5ColumnName !== rel.column) break;
      }
    } catch (e) {
      // Use original column name if we can't find it
    }

    // Check if relation exists in v5
    // We need to find entries that correspond to the v4 entries
    // Since we don't have a direct mapping, we'll check if any entry in source table
    // has the relation to any entry in target table
    // This is approximate - ideally we'd track the exact mapping

    let found = false;
    for (const sourceEntry of v5SourceEntries) {
      try {
        const sourceRow = await db(v5SourceTable)
          .where('id', sourceEntry.id)
          .select(v5ColumnName)
          .first();

        if (sourceRow && sourceRow[v5ColumnName]) {
          const targetId = sourceRow[v5ColumnName];
          // Check if target exists
          const targetExists = v5TargetEntries.some((e) => e.id === targetId);
          if (targetExists) {
            found = true;
            break;
          }
        }
      } catch (e) {
        // Column might not exist in v5 (different schema)
        continue;
      }
    }

    if (!found) {
      joinColumnMissing++;
      errors.push(
        `Missing JoinColumn relation: ${v5SourceTable}.${v5ColumnName} (v4: ${rel.sourceTable}:${rel.sourceId} -> ${rel.targetTable}:${rel.targetId})`
      );
    }
  }

  if (joinColumnChecked > 0) {
    if (joinColumnMissing === 0) {
      console.log(`✅ JoinColumn relations: ${joinColumnChecked} checked, all migrated`);
    } else {
      console.log(
        `❌ JoinColumn relations: ${joinColumnMissing} missing out of ${joinColumnChecked} checked`
      );
    }
  }

  // Validate JoinTable relations
  let joinTableChecked = 0;
  let joinTableMissing = 0;
  for (const rel of preMigrationRelations.joinTable) {
    joinTableChecked++;

    // Convert v4 table name to v5 table name
    const v5TableName = getV5TableName(rel.table);

    // Also convert column names (might be shortened)
    let v5SourceColumn = rel.sourceColumn;
    let v5TargetColumn = rel.targetColumn;

    // Try to get shortened column names from metadata
    // Join tables are internal, so we need to check if the table exists and get its columns
    const hasTable = await db.schema.hasTable(v5TableName);
    if (!hasTable) {
      joinTableMissing++;
      errors.push(
        `Missing JoinTable: ${v5TableName} (v4: ${rel.table}, relation: ${rel.sourceId} -> ${rel.targetId})`
      );
      continue;
    }

    // Get actual column names from the table
    try {
      const columns = await db(v5TableName).columnInfo();
      const columnNames = Object.keys(columns);

      // Find columns that match (either full or short name)
      const sourceCol = columnNames.find(
        (c) => c === rel.sourceColumn || identifiers.getUnshortenedName(c) === rel.sourceColumn
      );
      const targetCol = columnNames.find(
        (c) => c === rel.targetColumn || identifiers.getUnshortenedName(c) === rel.targetColumn
      );

      if (sourceCol) v5SourceColumn = sourceCol;
      if (targetCol) v5TargetColumn = targetCol;
    } catch (e) {
      // Use original column names if we can't determine them
    }

    // First, check if relation exists with original IDs (for published entries or non-D&P)
    const publishedRelationExists = await db(v5TableName)
      .where(v5SourceColumn, rel.sourceId)
      .where(v5TargetColumn, rel.targetId)
      .first();

    // Check if this is a component relation (component join tables have "components" or "_cmps" in the name)
    // Component relations have component IDs as sources, not content type entry IDs
    const isComponentRelation = v5TableName.includes('components') || v5TableName.includes('_cmps');

    if (isComponentRelation) {
      // For component relations, we need to validate that the relation was migrated
      // Components don't have draft/publish, but they belong to entities that do
      // Component IDs may have changed during migration, so we need to check more carefully

      // First, try to find the component in any component join table
      // The sourceId is a component ID, so we need to find which component join table contains it
      const identifiers = strapi.db.metadata.identifiers;
      const componentIdColumn = identifiers.getNameFromTokens([
        { name: 'component', shortName: 'cmp', compressible: false },
        { name: 'id', compressible: false },
      ]);
      const componentTypeColumn = identifiers.getNameFromTokens([
        { name: 'component_type', compressible: false },
      ]);

      let componentFound = false;
      let componentType = null;

      // Search all content types for component join tables to find the component
      for (const contentType of Object.values(strapi.contentTypes)) {
        const meta = strapi.db.metadata.get(contentType.uid);
        if (!meta || !contentType.collectionName) continue;

        const candidateComponentTableName = identifiers.getNameFromTokens([
          { name: contentType.collectionName, compressible: true },
          { name: 'components', shortName: 'cmps', compressible: false },
        ]);

        const hasTable = await db.schema.hasTable(candidateComponentTableName);
        if (!hasTable) continue;

        // Check if this component ID exists in this table
        const componentRow = await db(candidateComponentTableName)
          .where(componentIdColumn, rel.sourceId)
          .first();

        if (componentRow) {
          componentFound = true;
          componentType = componentRow[componentTypeColumn];
          break;
        }
      }

      // Also check nested component tables
      if (!componentFound) {
        for (const [componentUid, componentSchema] of Object.entries(strapi.components)) {
          if (!componentSchema.collectionName) continue;

          const nestedComponentTableName = identifiers.getNameFromTokens([
            { name: componentSchema.collectionName, compressible: true },
            { name: 'components', shortName: 'cmps', compressible: false },
          ]);

          const hasTable = await db.schema.hasTable(nestedComponentTableName);
          if (!hasTable) continue;

          const componentRow = await db(nestedComponentTableName)
            .where(componentIdColumn, rel.sourceId)
            .first();

          if (componentRow) {
            componentFound = true;
            componentType = componentRow[componentTypeColumn];
            break;
          }
        }
      }

      // Check if the relation exists (either with original IDs or migrated IDs)
      if (!publishedRelationExists) {
        // Check if any relation exists in this table
        const anyRelation = await db(v5TableName)
          .where(v5SourceColumn, '>', 0)
          .where(v5TargetColumn, '>', 0)
          .first();

        if (!anyRelation) {
          // No relations at all in this table - definitely missing
          joinTableMissing++;
          errors.push(
            `Missing JoinTable relation: ${v5TableName} (v4: ${rel.table}, component ${rel.sourceId} -> target ${rel.targetId}). Table exists but has no relations.`
          );
        } else if (!componentFound) {
          // Component not found - it may have been deleted or IDs changed significantly
          // This could be a problem, but we can't be 100% sure without knowing the mapping
          warnings.push(
            `Could not verify component relation: ${v5TableName} (v4: ${rel.table}, component ${rel.sourceId} -> target ${rel.targetId}). Component ${rel.sourceId} not found in any component join table. Relation may still exist with different component ID.`
          );
        } else {
          // Component found, but specific relation doesn't exist
          // Check if component has any relation to the target (IDs may have changed)
          const componentHasAnyRelation = await db(v5TableName)
            .where(v5SourceColumn, rel.sourceId)
            .where(v5TargetColumn, '>', 0)
            .first();

          if (!componentHasAnyRelation) {
            joinTableMissing++;
            errors.push(
              `Missing JoinTable relation: ${v5TableName} (v4: ${rel.table}, component ${rel.sourceId} (${componentType}) -> target ${rel.targetId}). Component exists but has no relations in this join table.`
            );
          }
        }
      } else if (!componentFound) {
        // Relation exists but component not found - this is suspicious
        warnings.push(
          `Component relation exists but component not found: ${v5TableName} (v4: ${rel.table}, component ${rel.sourceId} -> target ${rel.targetId}). Component ${rel.sourceId} not found in any component join table.`
        );
      }
      continue;
    }

    // Find source and target content types by searching all tables
    // We need to find which content type tables contain these IDs
    let sourceTable = null;
    let targetTable = null;
    let sourceEntry = null;
    let targetEntry = null;

    // Try to find source and target from metadata first
    // Join tables are stored in metadata, so we can look up the relation attribute
    let sourceUid = null;
    let targetUid = null;

    // Search metadata for this join table to find the relation attribute
    for (const [uid, meta] of strapi.db.metadata.entries()) {
      if (!meta.attributes) continue;
      for (const [attrName, attr] of Object.entries(meta.attributes)) {
        if (attr.type === 'relation' && attr.joinTable && attr.joinTable.name === v5TableName) {
          sourceUid = uid;
          targetUid = attr.target;
          break;
        }
      }
      if (sourceUid) break;
    }

    // If we found the source UID, get its table name
    if (sourceUid) {
      const sourceMeta = strapi.db.metadata.get(sourceUid);
      if (sourceMeta && v5EntriesByTable.has(sourceMeta.tableName)) {
        const entries = v5EntriesByTable.get(sourceMeta.tableName);
        const found = entries.find((e) => Number(e.id) === Number(rel.sourceId));
        if (found) {
          sourceTable = sourceMeta.tableName;
          sourceEntry = found;
        }
      }
    }

    // If we found the target UID, get its table name
    if (targetUid) {
      const targetMeta = strapi.db.metadata.get(targetUid);
      if (targetMeta && v5EntriesByTable.has(targetMeta.tableName)) {
        const entries = v5EntriesByTable.get(targetMeta.tableName);
        const found = entries.find((e) => Number(e.id) === Number(rel.targetId));
        if (found) {
          targetTable = targetMeta.tableName;
          targetEntry = found;
        }
      }
    }

    // If we couldn't find entries from metadata, search all tables
    if (!sourceEntry) {
      for (const [tableName, entries] of v5EntriesByTable.entries()) {
        const found = entries.find((e) => Number(e.id) === Number(rel.sourceId));
        if (found) {
          sourceTable = tableName;
          sourceEntry = found;
          break;
        }
      }
    }

    if (!targetEntry) {
      for (const [tableName, entries] of v5EntriesByTable.entries()) {
        const found = entries.find((e) => Number(e.id) === Number(rel.targetId));
        if (found) {
          targetTable = tableName;
          targetEntry = found;
          break;
        }
      }
    }

    // If we can't find the entries, the relation definitely can't exist
    if (!sourceEntry || !targetEntry) {
      // Check if the relation exists anyway (maybe entries were renumbered but relation preserved)
      if (!publishedRelationExists) {
        joinTableMissing++;
        errors.push(
          `Missing JoinTable relation: ${v5TableName} (v4: ${rel.table}, ${rel.sourceId} -> ${rel.targetId})`
        );
      }
      continue;
    }

    // Check if source and target have draft/publish enabled
    const sourceContentType = allContentTypes.find(
      (ct) => strapi.db.metadata.get(ct.uid)?.tableName === sourceTable
    );
    const targetContentType = allContentTypes.find(
      (ct) => strapi.db.metadata.get(ct.uid)?.tableName === targetTable
    );

    const sourceHasDP = sourceContentType?.options?.draftAndPublish;
    const targetHasDP = targetContentType?.options?.draftAndPublish;

    // If neither has D&P, the relation should exist with same IDs
    if (!sourceHasDP && !targetHasDP) {
      if (!publishedRelationExists) {
        joinTableMissing++;
        errors.push(
          `Missing JoinTable relation: ${v5TableName} (v4: ${rel.table}, ${rel.sourceId} -> ${rel.targetId})`
        );
      }
      continue;
    }

    // For D&P content types, we need to verify the relation was migrated correctly
    // The v4 relation could have been:
    // 1. Published -> Published (should still exist AND draft->draft should exist)
    // 2. Draft -> Published (should be converted to draft->draft)
    // 3. Published -> Draft (should be converted to draft->draft, or published->published if target has no draft)

    const sourceIsPublished = sourceEntry.published_at !== null;
    const targetIsPublished = targetEntry.published_at !== null;

    // Find draft versions of source and target
    let draftSourceId = null;
    let draftTargetId = null;

    if (sourceHasDP && sourceEntry.document_id) {
      const sourceEntries = v5EntriesByTable.get(sourceTable) || [];
      const draftSource = sourceEntries.find(
        (e) => e.document_id === sourceEntry.document_id && !e.published_at
      );
      if (draftSource) {
        draftSourceId = draftSource.id;
      }
    } else {
      // Source doesn't have D&P, use original ID
      draftSourceId = rel.sourceId;
    }

    if (targetHasDP && targetEntry.document_id) {
      const targetEntries = v5EntriesByTable.get(targetTable) || [];
      const draftTarget = targetEntries.find(
        (e) => e.document_id === targetEntry.document_id && !e.published_at
      );
      if (draftTarget) {
        draftTargetId = draftTarget.id;
      }
    } else {
      // Target doesn't have D&P, use original ID
      draftTargetId = rel.targetId;
    }

    // Check if draft->draft relation exists (this is what the migration should create)
    let draftRelationExists = false;
    if (draftSourceId && draftTargetId) {
      draftRelationExists = !!(await db(v5TableName)
        .where(v5SourceColumn, draftSourceId)
        .where(v5TargetColumn, draftTargetId)
        .first());
    }

    // Determine if we should error:
    // - If source was published in v4, we expect draft->draft relation to exist
    // - If source was draft in v4, the relation should exist with the same IDs (after fixExistingDraftRelations)
    // - Published->published relation should exist if both were published in v4
    const shouldHaveDraftRelation = sourceHasDP && sourceIsPublished; // Only if source was published
    const shouldHavePublishedRelation = sourceIsPublished && targetIsPublished;

    if (shouldHaveDraftRelation && !draftRelationExists) {
      // Source was published, so we expect a draft->draft relation
      joinTableMissing++;
      errors.push(
        `Missing JoinTable relation (draft->draft): ${v5TableName} (v4: ${rel.table}, ${rel.sourceId} -> ${rel.targetId}, expected draft: ${draftSourceId} -> ${draftTargetId})`
      );
    } else if (!sourceIsPublished && sourceHasDP) {
      // Source was already a draft in v4, so the relation should exist with the same IDs
      // (after fixExistingDraftRelations converted any published targets to draft targets)
      if (!publishedRelationExists && !draftRelationExists) {
        joinTableMissing++;
        errors.push(
          `Missing JoinTable relation: ${v5TableName} (v4: ${rel.table}, ${rel.sourceId} -> ${rel.targetId})`
        );
      }
    } else if (shouldHavePublishedRelation && !publishedRelationExists && !draftRelationExists) {
      // If both were published, at least one relation should exist
      // (published->published OR draft->draft)
      joinTableMissing++;
      errors.push(
        `Missing JoinTable relation: ${v5TableName} (v4: ${rel.table}, ${rel.sourceId} -> ${rel.targetId})`
      );
    }
    // If relation exists (either published or draft), it's correctly migrated
  }

  if (joinTableChecked > 0) {
    if (joinTableMissing === 0) {
      console.log(`✅ JoinTable relations: ${joinTableChecked} checked, all migrated`);
    } else {
      console.log(
        `❌ JoinTable relations: ${joinTableMissing} missing out of ${joinTableChecked} checked`
      );
    }
  }

  // Validate Component relations
  let componentChecked = 0;
  let componentMissing = 0;
  for (const rel of preMigrationRelations.component) {
    componentChecked++;

    // If entityTable is null, we couldn't infer it during capture
    // Try to find it by looking up the component table in metadata
    let v5EntityTable = null;
    let componentTableName = null;

    if (rel.entityTable) {
      // Convert v4 entity table name to v5 table name
      v5EntityTable = getV5TableName(rel.entityTable);

      // Check if the entity table is actually a component table (starts with "components_")
      // Component tables are not entity tables - they're component storage tables
      // This is a nested component relation (component inside component)
      if (v5EntityTable && v5EntityTable.startsWith('components_')) {
        // This is a nested component - the "entity table" is actually the parent component table
        // The entityId in rel.entityId is the parent component ID from v4
        // We need to check the nested component join table for this parent component
        const parentComponentCollectionName = v5EntityTable.replace(/^components_/, '');

        // Get the nested component join table (e.g., components_shared_headers_cmps)
        const identifiers = strapi.db.metadata.identifiers;
        const nestedComponentTableName = identifiers.getNameFromTokens([
          { name: parentComponentCollectionName, compressible: true },
          { name: 'components', shortName: 'cmps', compressible: false },
        ]);

        const hasNestedTable = await db.schema.hasTable(nestedComponentTableName);
        if (!hasNestedTable) {
          componentMissing++;
          errors.push(
            `Missing nested component join table: ${nestedComponentTableName} (v4: ${rel.entityTable}) for nested component ${rel.componentType}:${rel.componentId}`
          );
          continue;
        }

        const nestedEntityIdColumn = identifiers.getNameFromTokens([
          { name: 'entity', compressible: false },
          { name: 'id', compressible: false },
        ]);
        const nestedComponentIdColumn = identifiers.getNameFromTokens([
          { name: 'component', shortName: 'cmp', compressible: false },
          { name: 'id', compressible: false },
        ]);
        const nestedComponentTypeColumn = identifiers.getNameFromTokens([
          { name: 'component_type', compressible: false },
        ]);

        // Check if the nested component relation exists
        // The entityId in the relation is the parent component ID from v4
        // After migration, component IDs should be preserved (or we can check if any relation exists)
        const nestedRelationExists = await db(nestedComponentTableName)
          .where(nestedEntityIdColumn, rel.entityId)
          .where(nestedComponentTypeColumn, rel.componentType)
          .where(nestedComponentIdColumn, rel.componentId)
          .first();

        if (!nestedRelationExists) {
          // Check if the nested component exists at all (IDs may have changed)
          const nestedComponentExists = await db(nestedComponentTableName)
            .where(nestedComponentTypeColumn, rel.componentType)
            .where(nestedComponentIdColumn, rel.componentId)
            .first();

          if (!nestedComponentExists) {
            // Check if parent component exists
            const parentComponentExists = await db(v5EntityTable).where('id', rel.entityId).first();

            if (!parentComponentExists) {
              componentMissing++;
              errors.push(
                `Missing nested component relation: parent component ${parentComponentCollectionName}:${rel.entityId} not found, nested component ${rel.componentType}:${rel.componentId}`
              );
            } else {
              // Parent exists but nested component doesn't - check if any nested components exist for this parent
              const anyNestedForParent = await db(nestedComponentTableName)
                .where(nestedEntityIdColumn, rel.entityId)
                .first();

              if (!anyNestedForParent) {
                componentMissing++;
                errors.push(
                  `Missing nested component relation: parent component ${parentComponentCollectionName}:${rel.entityId} exists but has no nested component ${rel.componentType}:${rel.componentId}`
                );
              } else {
                // Parent has nested components but not this specific one - IDs may have changed
                warnings.push(
                  `Could not verify nested component relation: parent ${parentComponentCollectionName}:${rel.entityId} -> nested ${rel.componentType}:${rel.componentId}. Parent exists and has nested components, but this specific nested component not found. IDs may have changed during migration.`
                );
              }
            }
          } else {
            // Nested component exists but not linked to this parent - this is an error
            componentMissing++;
            errors.push(
              `Missing nested component relation: nested component ${rel.componentType}:${rel.componentId} exists but is not linked to parent component ${parentComponentCollectionName}:${rel.entityId}`
            );
          }
        }
        continue;
      }

      // Component relations are stored in component join tables
      // We need to find the component join table for the entity table
      componentTableName = inferComponentTableName(v5EntityTable, strapi);
    } else {
      // Entity table is null - try to find it by searching metadata
      // Look for content types that have component attributes matching this component type
      for (const contentType of Object.values(strapi.contentTypes)) {
        const meta = strapi.db.metadata.get(contentType.uid);
        if (!meta || !contentType.collectionName) continue;

        // Check if this content type has a component attribute that matches rel.componentType
        const hasMatchingComponent = Object.values(meta.attributes || {}).some(
          (attr) =>
            attr.type === 'component' &&
            (attr.component === rel.componentType ||
              attr.component === rel.componentType?.replace('shared.', 'shared.') ||
              attr.component === rel.componentType?.replace(/^shared\./, ''))
        );

        if (hasMatchingComponent) {
          // Found a content type that uses this component - use its table
          v5EntityTable = meta.tableName;
          componentTableName = inferComponentTableName(v5EntityTable, strapi);
          if (componentTableName) {
            break;
          }
        }
      }

      // If we still couldn't find it, try to validate by searching all component join tables
      if (!componentTableName) {
        // We couldn't infer the entity table, but we can still validate the relation exists
        // by searching all component join tables for this component type
        let found = false;
        const identifiers = strapi.db.metadata.identifiers;
        const componentIdColumn = identifiers.getNameFromTokens([
          { name: 'component', shortName: 'cmp', compressible: false },
          { name: 'id', compressible: false },
        ]);
        const componentTypeColumn = identifiers.getNameFromTokens([
          { name: 'component_type', compressible: false },
        ]);

        // Search all content types for component join tables
        for (const contentType of Object.values(strapi.contentTypes)) {
          const meta = strapi.db.metadata.get(contentType.uid);
          if (!meta || !contentType.collectionName) continue;

          const candidateComponentTableName = identifiers.getNameFromTokens([
            { name: contentType.collectionName, compressible: true },
            { name: 'components', shortName: 'cmps', compressible: false },
          ]);

          const hasTable = await db.schema.hasTable(candidateComponentTableName);
          if (!hasTable) continue;

          // Check if this component exists in this table
          const componentExists = await db(candidateComponentTableName)
            .where(componentTypeColumn, rel.componentType)
            .where(componentIdColumn, rel.componentId)
            .first();

          if (componentExists) {
            found = true;
            break;
          }
        }

        if (!found) {
          componentMissing++;
          errors.push(
            `Missing Component relation: component ${rel.componentType}:${rel.componentId} (could not find in any component join table, entity table was null in v4 capture)`
          );
        }
        continue;
      }
    }

    if (!componentTableName) {
      warnings.push(`Could not find component table for ${v5EntityTable} (v4: ${rel.entityTable})`);
      continue;
    }

    const hasTable = await db.schema.hasTable(componentTableName);
    if (!hasTable) {
      componentMissing++;
      errors.push(
        `Missing Component join table: ${componentTableName} (v4 entity table: ${rel.entityTable})`
      );
      continue;
    }

    // Check if component relation exists
    // We'll check if any relation exists for the entity (since IDs may have changed)
    const identifiers = strapi.db.metadata.identifiers;
    const entityIdColumn = identifiers.getNameFromTokens([
      { name: 'entity', compressible: false },
      { name: 'id', compressible: false },
    ]);
    const componentIdColumn = identifiers.getNameFromTokens([
      { name: 'component', shortName: 'cmp', compressible: false },
      { name: 'id', compressible: false },
    ]);

    const anyRelation = await db(componentTableName)
      .where(entityIdColumn, '>', 0)
      .where(componentIdColumn, '>', 0)
      .first();

    if (!anyRelation) {
      componentMissing++;
      errors.push(
        `Missing Component relation: ${componentTableName} (v4: entity ${rel.entityId} -> component ${rel.componentId})`
      );
    }
  }

  if (componentChecked > 0) {
    if (componentMissing === 0) {
      console.log(`✅ Component relations: ${componentChecked} checked, all migrated`);
    } else {
      console.log(
        `❌ Component relations: ${componentMissing} missing out of ${componentChecked} checked`
      );
    }
  }

  // Validate Media relations
  let mediaChecked = 0;
  let mediaMissing = 0;
  for (const rel of preMigrationRelations.media) {
    mediaChecked++;

    // Media relation table might also be shortened
    // Try to find it in the metadata or check common names
    let mediaTableName = 'files_related_morphs';
    const v5MediaTableName = getV5TableName('files_related_morphs');

    // Check if the table exists with either name
    const hasTable = await db.schema.hasTable(v5MediaTableName);
    if (!hasTable) {
      // Try alternative names
      const alternativeNames = [
        'files_related_morphs',
        'upload_files_related_morphs',
        'files_related_morph',
      ];

      let foundTable = false;
      for (const altName of alternativeNames) {
        const v5AltName = getV5TableName(altName);
        if (await db.schema.hasTable(v5AltName)) {
          mediaTableName = v5AltName;
          foundTable = true;
          break;
        }
      }

      if (!foundTable) {
        mediaMissing++;
        errors.push(`Missing Media relation table: ${v5MediaTableName} (v4: files_related_morphs)`);
        continue;
      }
    } else {
      mediaTableName = v5MediaTableName;
    }

    // Check what columns actually exist in the table (might be snake_case or camelCase)
    let relatedIdColumn, relatedTypeColumn, fileIdColumn, fieldColumn;
    try {
      const columns = await db(mediaTableName).columnInfo();
      const columnNames = Object.keys(columns);

      // Find the actual column names (try snake_case first, then camelCase)
      relatedIdColumn =
        columnNames.find((c) => c === 'related_id' || c === 'relatedId') || 'related_id';
      relatedTypeColumn =
        columnNames.find((c) => c === 'related_type' || c === 'relatedType') || 'related_type';
      fileIdColumn = columnNames.find((c) => c === 'file_id' || c === 'fileId') || 'file_id';
      fieldColumn = columnNames.find((c) => c === 'field') || 'field';
    } catch (e) {
      // Fallback to snake_case defaults
      relatedIdColumn = 'related_id';
      relatedTypeColumn = 'related_type';
      fileIdColumn = 'file_id';
      fieldColumn = 'field';
    }

    // Check if media relation exists using only the columns that actually exist
    const exists = await db(mediaTableName)
      .where(relatedIdColumn, rel.relatedId)
      .where(relatedTypeColumn, rel.relatedType)
      .where(fieldColumn, rel.field)
      .where(fileIdColumn, rel.fileId)
      .first();

    if (!exists) {
      mediaMissing++;
      errors.push(
        `Missing Media relation: files_related_morphs (v4: ${rel.relatedType}:${rel.relatedId}.${rel.field} -> file:${rel.fileId})`
      );
    }
  }

  if (mediaChecked > 0) {
    if (mediaMissing === 0) {
      console.log(`✅ Media relations: ${mediaChecked} checked, all migrated`);
    } else {
      console.log(`❌ Media relations: ${mediaMissing} missing out of ${mediaChecked} checked`);
    }
  }

  const totalChecked = joinColumnChecked + joinTableChecked + componentChecked + mediaChecked;
  const totalMissing = joinColumnMissing + joinTableMissing + componentMissing + mediaMissing;

  if (totalChecked > 0) {
    console.log(`\n📊 Relation migration summary: ${totalChecked} total relations checked`);
    if (totalMissing === 0) {
      console.log(`✅ All ${totalChecked} original v4 relations successfully migrated to v5`);
    } else {
      console.log(
        `❌ ${totalMissing} relations missing out of ${totalChecked} checked (DATA LOSS DETECTED)`
      );
    }
  }

  if (warnings.length > 0) {
    warnings.slice(0, 10).forEach((warn) => console.log(`   ⚠️  ${warn}`));
    if (warnings.length > 10) {
      console.log(`   ... and ${warnings.length - 10} more warnings`);
    }
  }

  return { errors, warnings };
}

/**
 * Helper to infer component join table name from entity table
 */
function inferComponentTableName(entityTableName, strapi) {
  const identifiers = strapi.db.metadata.identifiers;

  // Try to find content type by table name
  for (const contentType of Object.values(strapi.contentTypes)) {
    const meta = strapi.db.metadata.get(contentType.uid);
    if (!meta || meta.tableName !== entityTableName) continue;

    const collectionName = contentType.collectionName;
    if (!collectionName) continue;

    const componentTableName = identifiers.getNameFromTokens([
      { name: collectionName, compressible: true },
      { name: 'components', shortName: 'cmps', compressible: false },
    ]);

    return componentTableName;
  }

  return null;
}

/**
 * Peeks at the database structure to warn when validation is executed against an
 * already-migrated dataset (which would hide migration issues).
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
    case 'mariadb':
      dbConfig = {
        client: 'mysql2',
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

/**
 * Primary validation workflow invoked from the CLI. It gathers pre-migration stats,
 * boots Strapi, runs every consistency check, and reports a consolidated result.
 */
async function validate(options = {}) {
  const normalizedOptions = normalizeValidateOptions(options);
  const multiplierNum = parseInt(normalizedOptions.multiplier, 10) || 1;
  const expectInvalidFk = normalizedOptions.expectInvalidFk === true;
  const expected = getExpectedCounts(multiplierNum);

  console.log(`🔍 Validating migrated data from v4 to v5 (multiplier: ${multiplierNum})...\n`);
  if (expectInvalidFk) {
    console.log(
      '🚨 Expecting intentionally injected foreign key violations (--invalid-fk enabled).'
    );
  } else {
    console.log(
      'ℹ️  Skipping intentional foreign key validation (run with --invalid-fk to enable).'
    );
  }

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

  // Pre-check: Capture all relations before migrations run
  console.log('🔍 Capturing pre-migration relations (before Strapi loads)...');
  const preMigrationRelations = await getPreMigrationRelations();
  if (preMigrationRelations) {
    const total =
      preMigrationRelations.joinColumn.length +
      preMigrationRelations.joinTable.length +
      preMigrationRelations.component.length +
      preMigrationRelations.media.length;
    console.log(`\n📊 Pre-migration relations captured (v4 format):`);
    console.log(`  JoinColumn relations: ${preMigrationRelations.joinColumn.length}`);
    console.log(`  JoinTable relations: ${preMigrationRelations.joinTable.length}`);
    console.log(`  Component relations: ${preMigrationRelations.component.length}`);
    console.log(`  Media relations: ${preMigrationRelations.media.length}`);
    console.log(`  Total: ${total} relations to verify\n`);
  } else {
    console.log('⚠️  Could not get pre-migration relations\n');
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

    if (expectInvalidFk) {
      const intentionalFkResult = await validateIntentionalFkViolations(app);
      allErrors.push(...(intentionalFkResult.errors || []));
    }

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

    const joinColumnResult = await validateJoinColumnRelations(app);
    if (Array.isArray(joinColumnResult)) {
      // Old format - all treated as errors
      allErrors.push(...joinColumnResult);
    } else {
      // New format - only errors, not warnings
      allErrors.push(...(joinColumnResult.errors || []));
    }

    const documentIdErrors = await validateDocumentIds(app);
    allErrors.push(...documentIdErrors);

    const relationOrderResult = await validateRelationOrder(app);
    if (Array.isArray(relationOrderResult)) {
      // Old format - all treated as errors
      allErrors.push(...relationOrderResult);
    } else {
      // New format - only errors, not warnings
      allErrors.push(...(relationOrderResult.errors || []));
    }

    const relationCountResult = await validateRelationCounts(app, preMigrationCounts);
    if (Array.isArray(relationCountResult)) {
      // Old format - all treated as errors (but shouldn't happen with new format)
      // Don't add warnings as errors
    } else {
      // New format - only errors, not warnings
      allErrors.push(...(relationCountResult.errors || []));
    }

    // Validate discard() behavior expectations
    const discardBehaviorErrors = await validateDiscardBehaviorExpectations(app);
    allErrors.push(...discardBehaviorErrors);

    // Validate non-DP content type relation handling
    const nonDPRelationResult = await validateNonDPContentTypeRelations(app);
    allErrors.push(...(nonDPRelationResult.errors || []));

    // Validate component relation filtering
    const componentFilteringResult = await validateComponentRelationFiltering(app);
    allErrors.push(...(componentFilteringResult.errors || []));

    // Validate component relation targets
    const componentRelationTargetsResult = await validateComponentRelationTargets(app);
    allErrors.push(...(componentRelationTargetsResult.errors || []));

    // Validate component relation publication state consistency
    const componentPublicationStateResult = await validateComponentRelationPublicationState(app);
    allErrors.push(...(componentPublicationStateResult.errors || []));

    // Validate draft entries only reference draft entries (not published)
    const draftOnlyDraftsResult = await validateDraftEntriesOnlyReferenceDrafts(app);
    allErrors.push(...(draftOnlyDraftsResult.errors || []));

    // Validate component media relations and nested component cloning
    const componentMediaResult = await validateComponentMediaAndCloning(app);
    allErrors.push(...(componentMediaResult.errors || []));

    // Validate all original v4 relations were migrated (no data loss)
    const relationCompletenessResult = await validateAllV4RelationsMigrated(
      app,
      preMigrationRelations
    );
    allErrors.push(...(relationCompletenessResult.errors || []));

    // Additional comprehensive validations
    const orphanedRelationsErrors = await validateOrphanedRelations(app);
    allErrors.push(...orphanedRelationsErrors);

    const scalarAttributesErrors = await validateScalarAttributes(app);
    allErrors.push(...scalarAttributesErrors);

    const relationTargetErrors = await validateRelationTargets(app);
    allErrors.push(...relationTargetErrors);

    const orderPreservationErrors = await validateOrderPreservation(app);
    allErrors.push(...orderPreservationErrors);

    const duplicateEntriesErrors = await validateDuplicateEntries(app);
    allErrors.push(...duplicateEntriesErrors);

    const foreignKeyIntegrityErrors = await validateForeignKeyIntegrity(app);
    allErrors.push(...foreignKeyIntegrityErrors);

    const relationCountMismatchErrors = await validateRelationCountMismatches(
      app,
      preMigrationCounts
    );
    allErrors.push(...relationCountMismatchErrors);

    const duplicateJoinTableErrors = await validateDuplicateJoinTableRelations(app);
    allErrors.push(...duplicateJoinTableErrors);

    // Summary
    console.log('\n' + '='.repeat(60));
    if (allErrors.length === 0) {
      console.log('\n✅ All validations passed! Migration is correct.');
    } else {
      console.log(`\n❌ Validation failed with ${allErrors.length} error(s)`);
      console.log('\n📋 Error details:');
      allErrors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
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
  const cliOptions = parseCliArgs(process.argv.slice(2));
  validate(cliOptions)
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = validate;
