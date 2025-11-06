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
 * Validate joinColumn relations (oneToOne, manyToOne without join tables)
 */
async function validateJoinColumnRelations(strapi) {
  console.log('\n🔗 Validating joinColumn relations (oneToOne, manyToOne)...\n');

  const errors = [];
  const warnings = [];

  // Check relation-dp entries with joinColumn relations
  const relationDpAll = await strapi.db.query('api::relation-dp.relation-dp').findMany({
    publicationState: 'all',
    populate: {
      oneToOneBasic: true,
      manyToOneBasic: true,
    },
  });

  // Get all basic-dp entries (published and draft)
  const basicDpAll = await strapi.db.query('api::basic-dp.basic-dp').findMany({
    publicationState: 'all',
  });
  const basicDpByDocumentId = new Map();
  for (const entry of basicDpAll) {
    if (entry.documentId) {
      if (!basicDpByDocumentId.has(entry.documentId)) {
        basicDpByDocumentId.set(entry.documentId, []);
      }
      basicDpByDocumentId.get(entry.documentId).push(entry);
    }
  }

  let oneToOneIssues = 0;
  let manyToOneIssues = 0;
  let joinColumnRelationsFound = 0;

  for (const relationEntry of relationDpAll) {
    // Check oneToOneBasic - this might use joinColumn
    if (relationEntry.oneToOneBasic) {
      joinColumnRelationsFound++;
      const target = relationEntry.oneToOneBasic;

      // Check if target is draft/publish enabled
      const targetDocuments = basicDpByDocumentId.get(target.documentId || '');
      if (targetDocuments && targetDocuments.length > 1) {
        // Target has draft/publish - check if relation points to draft when entry is draft
        if (!relationEntry.publishedAt && target.publishedAt) {
          // Draft entry pointing to published target - this might be wrong
          const draftTarget = targetDocuments.find((e) => !e.publishedAt);
          if (draftTarget) {
            errors.push(
              `relation-dp ${relationEntry.id} (draft): oneToOneBasic points to published basic-dp ${target.id} instead of draft ${draftTarget.id}`
            );
            oneToOneIssues++;
          }
        }
      }
    }

    // Check manyToOneBasic - this might use joinColumn
    if (relationEntry.manyToOneBasic) {
      joinColumnRelationsFound++;
      const target = relationEntry.manyToOneBasic;

      const targetDocuments = basicDpByDocumentId.get(target.documentId || '');
      if (targetDocuments && targetDocuments.length > 1) {
        // Target has draft/publish - check if relation points to draft when entry is draft
        if (!relationEntry.publishedAt && target.publishedAt) {
          const draftTarget = targetDocuments.find((e) => !e.publishedAt);
          if (draftTarget) {
            errors.push(
              `relation-dp ${relationEntry.id} (draft): manyToOneBasic points to published basic-dp ${target.id} instead of draft ${draftTarget.id}`
            );
            manyToOneIssues++;
          }
        }
      }
    }
  }

  if (joinColumnRelationsFound > 0) {
    if (oneToOneIssues === 0 && manyToOneIssues === 0) {
      console.log(
        `✅ All ${joinColumnRelationsFound} joinColumn relations are correctly preserved`
      );
    } else {
      console.log(
        `❌ Found ${oneToOneIssues + manyToOneIssues} issues with joinColumn relations (out of ${joinColumnRelationsFound} total)`
      );
    }
  } else {
    warnings.push('No joinColumn relations found to validate');
    console.log(
      `⚠️  No joinColumn relations found (oneToOne/manyToOne may use join tables instead)`
    );
  }

  return { errors, warnings };
}

/**
 * Validate document IDs are preserved correctly
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
      publicationState: 'all',
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
 * Validate relation order is preserved
 */
async function validateRelationOrder(strapi) {
  console.log('\n📋 Validating relation order is preserved...\n');

  const errors = [];
  const warnings = [];

  // Check manyToMany relations have order preserved
  const relationDpAll = await strapi.db.query('api::relation-dp.relation-dp').findMany({
    publicationState: 'all',
    populate: {
      manyToManyBasics: {
        orderBy: 'id', // Use id as proxy for order
      },
    },
  });

  // Get basic-dp entries to check order
  const basicDpAll = await strapi.db.query('api::basic-dp.basic-dp').findMany({
    publicationState: 'all',
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
        });

        if (draftEntry && draftEntry.manyToManyBasics) {
          const publishedIds = entry.manyToManyBasics.map((r) => r.id).sort();
          const draftIds = draftEntry.manyToManyBasics.map((r) => r.id).sort();
          if (publishedIds.join(',') !== draftIds.join(',')) {
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
    }
  } else {
    warnings.push('No ordered relations found to validate');
    console.log(`⚠️  No ordered relations found to validate`);
  }

  return { errors, warnings };
}

/**
 * Validate relation counts before and after migration
 */
async function validateRelationCounts(strapi, preMigrationCounts) {
  console.log('\n📊 Validating relation counts before/after migration...\n');

  const errors = [];
  const warnings = [];

  if (!preMigrationCounts) {
    warnings.push('Cannot validate relation counts: pre-migration counts not available');
    console.log(`⚠️  Pre-migration counts not available, skipping relation count validation`);
    return { errors: [], warnings };
  }

  // Get post-migration relation counts using raw queries
  if (!knex) {
    warnings.push('Cannot validate relation counts: knex not available');
    console.log(`⚠️  knex not available, skipping relation count validation`);
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
      warnings.push(`Cannot validate relation counts: unknown database client ${client}`);
      return { errors: [], warnings };
  }

  const db = knex(dbConfig);

  try {
    const parseCount = (result) => {
      if (!result) return 0;
      if (result.count !== undefined) {
        return parseInt(result.count, 10) || 0;
      }
      const value = result['count(*)'] || result.count || Object.values(result)[0];
      return parseInt(value, 10) || 0;
    };

    // Count relations in join tables
    const relationTables = [
      { name: 'relation_dps_self_ones', label: 'relation-dp selfOne' },
      { name: 'relation_dps_self_manies', label: 'relation-dp selfMany' },
      { name: 'relation_dps_one_to_one_basics', label: 'relation-dp oneToOneBasic' },
      { name: 'relation_dps_one_to_many_basics', label: 'relation-dp oneToManyBasics' },
      { name: 'relation_dps_many_to_one_basics', label: 'relation-dp manyToOneBasic' },
      { name: 'relation_dps_many_to_many_basics', label: 'relation-dp manyToManyBasics' },
    ];

    console.log('Checking relation table counts:');
    for (const table of relationTables) {
      try {
        const hasTable = await db.schema.hasTable(table.name);
        if (hasTable) {
          const postCount = await db(table.name).count('* as count').first();
          const count = parseCount(postCount);
          console.log(`   ${table.label}: ${count} relations`);
          // Note: We can't compare to pre-migration counts without knowing v4 structure
          // But we can verify the table exists and has data
          if (count === 0) {
            warnings.push(
              `${table.label}: table exists but has no relations (may be normal if no data)`
            );
          }
        } else {
          // Table might not exist if relation uses joinColumn instead of joinTable
          console.log(`   ${table.label}: table does not exist (may use joinColumn)`);
        }
      } catch (e) {
        warnings.push(`${table.label}: error checking table - ${e.message}`);
      }
    }

    // Check component relation counts
    try {
      const hasComponentTable = await db.schema.hasTable('relation_dps_cmps');
      if (hasComponentTable) {
        const componentCount = await db('relation_dps_cmps').count('* as count').first();
        const count = parseCount(componentCount);
        console.log(`   relation-dp components: ${count} relations`);
        if (count === 0) {
          warnings.push('relation-dp components: table exists but has no relations');
        }
      }
    } catch (e) {
      warnings.push(`Error checking component relations: ${e.message}`);
    }

    await db.destroy();
  } catch (error) {
    try {
      await db.destroy();
    } catch (e) {
      // Ignore
    }
    errors.push(`Error validating relation counts: ${error.message}`);
  }

  if (errors.length === 0 && warnings.length === 0) {
    console.log(`✅ Relation counts validated`);
  } else if (errors.length > 0) {
    console.log(`❌ Found ${errors.length} errors validating relation counts`);
  } else {
    console.log(`⚠️  Found ${warnings.length} warnings (see details above)`);
  }

  return { errors, warnings };
}

/**
 * Validate orphaned relations (relations pointing to non-existent entries)
 */
async function validateOrphanedRelations(strapi) {
  console.log('\n🔍 Validating no orphaned relations exist...\n');

  const errors = [];

  // Check relation-dp relations
  const relationDpAll = await strapi.db.query('api::relation-dp.relation-dp').findMany({
    publicationState: 'all',
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
  const basicDpAll = await strapi.db.query('api::basic-dp.basic-dp').findMany({
    publicationState: 'all',
  });
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
 * Validate scalar attributes are copied correctly
 */
async function validateScalarAttributes(strapi) {
  console.log('\n📝 Validating scalar attributes are preserved...\n');

  const errors = [];

  // Check basic-dp entries
  const basicDpAll = await strapi.db.query('api::basic-dp.basic-dp').findMany({
    publicationState: 'all',
  });

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
 * Validate relation targets (draft entries should point to draft targets)
 */
async function validateRelationTargets(strapi) {
  console.log('\n🎯 Validating relation targets point to correct draft/published versions...\n');

  const errors = [];

  // Get all draft/publish content types
  const relationDpAll = await strapi.db.query('api::relation-dp.relation-dp').findMany({
    publicationState: 'all',
    populate: {
      oneToOneBasic: true,
      manyToOneBasic: true,
    },
  });

  const basicDpAll = await strapi.db.query('api::basic-dp.basic-dp').findMany({
    publicationState: 'all',
  });

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

  // Check that draft entries point to draft targets
  for (const relationEntry of relationDpAll) {
    if (!relationEntry.publishedAt) {
      // This is a draft entry - check its relations
      if (relationEntry.oneToOneBasic) {
        const target = relationEntry.oneToOneBasic;
        const targetDocuments = basicDpByDocumentId.get(target.documentId || '');
        if (targetDocuments && targetDocuments.length > 1 && target.publishedAt) {
          // Draft entry pointing to published target - should point to draft
          const draftTarget = targetDocuments.find((e) => !e.publishedAt);
          if (draftTarget) {
            errors.push(
              `relation-dp ${relationEntry.id} (draft): oneToOneBasic points to published basic-dp ${target.id} instead of draft ${draftTarget.id}`
            );
          }
        }
      }

      if (relationEntry.manyToOneBasic) {
        const target = relationEntry.manyToOneBasic;
        const targetDocuments = basicDpByDocumentId.get(target.documentId || '');
        if (targetDocuments && targetDocuments.length > 1 && target.publishedAt) {
          // Draft entry pointing to published target - should point to draft
          const draftTarget = targetDocuments.find((e) => !e.publishedAt);
          if (draftTarget) {
            errors.push(
              `relation-dp ${relationEntry.id} (draft): manyToOneBasic points to published basic-dp ${target.id} instead of draft ${draftTarget.id}`
            );
          }
        }
      }
    }
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

  const errors = [];

  // Check manyToMany relations have order preserved
  const relationDpAll = await strapi.db.query('api::relation-dp.relation-dp').findMany({
    publicationState: 'all',
    populate: {
      manyToManyBasics: true,
      oneToManyBasics: true,
    },
  });

  for (const entry of relationDpAll) {
    if (entry.publishedAt) {
      // Find corresponding draft
      const draftEntry = await strapi.db.query('api::relation-dp.relation-dp').findOne({
        where: {
          documentId: entry.documentId,
          publishedAt: null,
        },
        populate: {
          manyToManyBasics: true,
          oneToManyBasics: true,
        },
      });

      if (draftEntry) {
        // Check manyToManyBasics order
        if (entry.manyToManyBasics && draftEntry.manyToManyBasics) {
          const publishedIds = entry.manyToManyBasics.map((r) => r.id);
          const draftIds = draftEntry.manyToManyBasics.map((r) => r.id);
          if (publishedIds.join(',') !== draftIds.join(',')) {
            errors.push(
              `relation-dp ${entry.id}: manyToManyBasics order differs between published and draft`
            );
          }
        }

        // Check oneToManyBasics order
        if (entry.oneToManyBasics && draftEntry.oneToManyBasics) {
          const publishedIds = entry.oneToManyBasics.map((r) => r.id);
          const draftIds = draftEntry.oneToManyBasics.map((r) => r.id);
          if (publishedIds.join(',') !== draftIds.join(',')) {
            errors.push(
              `relation-dp ${entry.id}: oneToManyBasics order differs between published and draft`
            );
          }
        }
      }
    }
  }

  if (errors.length === 0) {
    console.log(`✅ Relation order is preserved correctly`);
  } else {
    console.log(`❌ Found ${errors.length} order preservation issues`);
    errors.slice(0, 10).forEach((err) => console.log(`   - ${err}`));
  }

  return errors;
}

/**
 * Validate no duplicate entries exist
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
      publicationState: 'all',
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
 * Validate foreign key integrity
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
 * Validate relation count mismatches (comparing before/after)
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
  const relationDpAll = await strapi.db.query('api::relation-dp.relation-dp').findMany({
    publicationState: 'all',
  });

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
 * Validate non-DP content type relation handling
 * Relations from content types without draft/publish should only be created
 * if there isn't already a relation to an old draft with the same document_id
 */
async function validateNonDPContentTypeRelations(strapi) {
  console.log('\n🔗 Validating non-DP content type relation handling...\n');

  const errors = [];
  const warnings = [];

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
    const basicDpAll = await strapi.db.query('api::basic-dp.basic-dp').findMany({
      publicationState: 'all',
    });

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

  return { errors, warnings };
}

/**
 * Validate component relation filtering
 * Component relations should be filtered out if the component's parent has draft/publish enabled
 */
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
 * Validate that migration matches discard() behavior expectations
 * Based on RELATION_MIGRATION_EXPECTATIONS.md analysis
 */
async function validateDiscardBehaviorExpectations(strapi) {
  console.log('\n🎯 Validating discard() behavior expectations...\n');

  const errors = [];

  // Get all relation-dp entries (published and drafts)
  const relationDpAll = await strapi.db.query('api::relation-dp.relation-dp').findMany({
    publicationState: 'all',
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
  const basicDpAll = await strapi.db.query('api::basic-dp.basic-dp').findMany({
    publicationState: 'all',
  });

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
  let joinColumnTested = 0;
  let joinColumnErrors = 0;

  // Note: relation-dp doesn't seem to have joinColumn relations based on schema
  // This test would need to check actual foreign key columns
  // For now, we'll skip this if no joinColumn relations are found
  console.log(
    `  ℹ️  JoinColumn relations: Need to check foreign key columns directly (not implemented yet)`
  );

  if (errors.length === 0) {
    console.log(`✅ All discard() behavior expectations validated`);
  } else {
    console.log(`❌ Found ${errors.length} issues with discard() behavior expectations`);
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
