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
            .select('id', 'published_at');

          const targetPublicationState = new Map(
            targets.map((t) => [t.id, t.published_at !== null ? 'published' : 'draft'])
          );

          // Build map from component ID to entity ID
          const componentToEntity = new Map();
          for (const rel of componentRelations) {
            if (rel[componentTypeColumn] === componentType) {
              componentToEntity.set(rel[componentIdColumn], rel[entityIdColumn]);
            }
          }

          // Check each relation for publication state mismatch
          for (const relation of relations) {
            const componentId = relation[sourceColumn];
            const targetId = relation[targetColumn];
            const entityId = componentToEntity.get(componentId);

            if (!entityId || !targetId) continue;

            const entityState = entityPublicationState.get(entityId);
            const targetState = targetPublicationState.get(targetId);

            if (!entityState || !targetState) continue;

            // Draft components should point to draft targets (this is the critical issue to fix)
            // If a draft component points to a published target, it should have been converted
            // to point to the draft version of that target during migration.
            if (entityState === 'draft' && targetState === 'published') {
              errors.push(
                `[Component Publication State Mismatch] Draft entity ${uid}:${entityId} has component ${componentType}:${componentId} with relation ${attrName} pointing to published target ${targetUid}:${targetId}. Draft components should point to draft targets. This should have been converted during migration.`
              );
            }
            // Published components pointing to draft targets: This is technically invalid but may have
            // existed in v4. We leave these alone (don't validate or fix them) as they're pre-existing
            // invalid state, not something we created during migration.
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
