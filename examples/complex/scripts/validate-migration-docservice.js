#!/usr/bin/env node

/*
  A readable validator that uses the Strapi document/entity service
  to verify v4 -> v5 migration correctness for the example project.

  Usage:
    node scripts/validate-migration-docservice.js [multiplier] [--no-invalid-fk]

  Notes:
    - Run this from the `examples/complex` directory (the script compiles/loads Strapi).
    - It boots Strapi programmatically (no HTTP server) and uses `strapi.documentService`
      and `strapi.db.query` for targeted checks.
*/

const { createStrapi, compileStrapi } = require('@strapi/strapi');
const path = require('path');

// Expected counts per run (kept small for example seeding in this repo)
const EXPECTED_COUNTS_PER_RUN = {
  basic: 5,
  basicDp: { published: 3, drafts: 2, total: 5 },
  basicDpI18n: { published: 6, drafts: 4, total: 10 },
  relation: 5,
  relationDp: { published: 5, drafts: 3, total: 8 },
  relationDpI18n: { published: 10, drafts: 6, total: 16 },
};

const MEDIA_PER_RUN = 10;

function parseCliArgs(argv) {
  const opts = { multiplier: 1, expectInvalidFk: true };
  for (const a of argv) {
    if (a === '--no-invalid-fk') opts.expectInvalidFk = false;
    else if (!isNaN(Number(a))) opts.multiplier = Number(a);
  }
  return opts;
}

function getExpectedCounts(multiplier = 1) {
  const m = Number(multiplier) || 1;
  return {
    basic: EXPECTED_COUNTS_PER_RUN.basic * m,
    basicDp: {
      published: EXPECTED_COUNTS_PER_RUN.basicDp.published * m,
      drafts: EXPECTED_COUNTS_PER_RUN.basicDp.drafts * m,
      total: EXPECTED_COUNTS_PER_RUN.basicDp.total * m,
    },
    basicDpI18n: {
      published: EXPECTED_COUNTS_PER_RUN.basicDpI18n.published * m,
      drafts: EXPECTED_COUNTS_PER_RUN.basicDpI18n.drafts * m,
      total: EXPECTED_COUNTS_PER_RUN.basicDpI18n.total * m,
    },
    relation: EXPECTED_COUNTS_PER_RUN.relation * m,
    relationDp: {
      published: EXPECTED_COUNTS_PER_RUN.relationDp.published * m,
      drafts: EXPECTED_COUNTS_PER_RUN.relationDp.drafts * m,
      total: EXPECTED_COUNTS_PER_RUN.relationDp.total * m,
    },
    relationDpI18n: {
      published: EXPECTED_COUNTS_PER_RUN.relationDpI18n.published * m,
      drafts: EXPECTED_COUNTS_PER_RUN.relationDpI18n.drafts * m,
      total: EXPECTED_COUNTS_PER_RUN.relationDpI18n.total * m,
    },
    media: MEDIA_PER_RUN * m,
  };
}

function parseCountResult(countResult) {
  if (!countResult) return 0;
  if (typeof countResult === 'number') return countResult;
  if (countResult.count !== undefined) return Number(countResult.count) || 0;
  if (countResult['count(*)'] !== undefined) return Number(countResult['count(*)']) || 0;
  const first = Object.values(countResult)[0];
  return Number(first) || 0;
}

async function validateCounts(strapi, expected) {
  const errors = [];
  const checks = [];

  // Helper to count using db.query
  async function countFor(uid) {
    const res = await strapi.db.query(uid).count();
    return parseCountResult(res[0] || res);
  }

  async function countPublishedDrafts(uid) {
    const publishedRes = await strapi.db.query(uid).count({
      where: { publishedAt: { $notNull: true } },
    });
    const draftRes = await strapi.db.query(uid).count({
      where: { publishedAt: { $null: true } },
    });

    return {
      published: parseCountResult(publishedRes[0] || publishedRes),
      drafts: parseCountResult(draftRes[0] || draftRes),
    };
  }

  // basic
  const basicCount = await countFor('api::basic.basic');
  checks.push({ type: 'basic', actual: basicCount, expected: expected.basic });
  if (basicCount !== expected.basic)
    errors.push(`basic: expected ${expected.basic}, got ${basicCount}`);

  // basic-dp
  const basicDpCounts = await countPublishedDrafts('api::basic-dp.basic-dp');
  const basicDpExpectedDrafts = expected.basicDp.drafts + expected.basicDp.published;
  const basicDpExpectedTotal = expected.basicDp.published * 2 + expected.basicDp.drafts;
  checks.push({
    type: 'basic-dp (published)',
    actual: basicDpCounts.published,
    expected: expected.basicDp.published,
  });
  checks.push({
    type: 'basic-dp (drafts)',
    actual: basicDpCounts.drafts,
    expected: basicDpExpectedDrafts,
  });
  checks.push({
    type: 'basic-dp (total)',
    actual: basicDpCounts.published + basicDpCounts.drafts,
    expected: basicDpExpectedTotal,
  });
  if (basicDpCounts.published !== expected.basicDp.published)
    errors.push(
      `basic-dp published: expected ${expected.basicDp.published}, got ${basicDpCounts.published}`
    );
  if (basicDpCounts.drafts !== basicDpExpectedDrafts)
    errors.push(`basic-dp drafts: expected ${basicDpExpectedDrafts}, got ${basicDpCounts.drafts}`);

  // basic-dp-i18n
  const basicDpI18nCounts = await countPublishedDrafts('api::basic-dp-i18n.basic-dp-i18n');
  const basicDpI18nExpectedDrafts = expected.basicDpI18n.drafts + expected.basicDpI18n.published;
  const basicDpI18nExpectedTotal = expected.basicDpI18n.published * 2 + expected.basicDpI18n.drafts;
  checks.push({
    type: 'basic-dp-i18n (published)',
    actual: basicDpI18nCounts.published,
    expected: expected.basicDpI18n.published,
  });
  checks.push({
    type: 'basic-dp-i18n (drafts)',
    actual: basicDpI18nCounts.drafts,
    expected: basicDpI18nExpectedDrafts,
  });
  checks.push({
    type: 'basic-dp-i18n (total)',
    actual: basicDpI18nCounts.published + basicDpI18nCounts.drafts,
    expected: basicDpI18nExpectedTotal,
  });
  if (basicDpI18nCounts.published !== expected.basicDpI18n.published)
    errors.push(
      `basic-dp-i18n published: expected ${expected.basicDpI18n.published}, got ${basicDpI18nCounts.published}`
    );
  if (basicDpI18nCounts.drafts !== basicDpI18nExpectedDrafts)
    errors.push(
      `basic-dp-i18n drafts: expected ${basicDpI18nExpectedDrafts}, got ${basicDpI18nCounts.drafts}`
    );

  // relation
  const relationCount = await countFor('api::relation.relation');
  checks.push({ type: 'relation', actual: relationCount, expected: expected.relation });
  if (relationCount !== expected.relation)
    errors.push(`relation: expected ${expected.relation}, got ${relationCount}`);

  // relation-dp
  const relationDpCounts = await countPublishedDrafts('api::relation-dp.relation-dp');
  const relationDpExpectedDrafts = expected.relationDp.drafts + expected.relationDp.published;
  const relationDpExpectedTotal = expected.relationDp.published * 2 + expected.relationDp.drafts;
  checks.push({
    type: 'relation-dp (published)',
    actual: relationDpCounts.published,
    expected: expected.relationDp.published,
  });
  checks.push({
    type: 'relation-dp (drafts)',
    actual: relationDpCounts.drafts,
    expected: relationDpExpectedDrafts,
  });
  checks.push({
    type: 'relation-dp (total)',
    actual: relationDpCounts.published + relationDpCounts.drafts,
    expected: relationDpExpectedTotal,
  });
  if (relationDpCounts.published !== expected.relationDp.published)
    errors.push(
      `relation-dp published: expected ${expected.relationDp.published}, got ${relationDpCounts.published}`
    );
  if (relationDpCounts.drafts !== relationDpExpectedDrafts)
    errors.push(
      `relation-dp drafts: expected ${relationDpExpectedDrafts}, got ${relationDpCounts.drafts}`
    );

  // relation-dp-i18n
  const relationDpI18nCounts = await countPublishedDrafts('api::relation-dp-i18n.relation-dp-i18n');
  const relationDpI18nExpectedDrafts =
    expected.relationDpI18n.drafts + expected.relationDpI18n.published;
  const relationDpI18nExpectedTotal =
    expected.relationDpI18n.published * 2 + expected.relationDpI18n.drafts;
  checks.push({
    type: 'relation-dp-i18n (published)',
    actual: relationDpI18nCounts.published,
    expected: expected.relationDpI18n.published,
  });
  checks.push({
    type: 'relation-dp-i18n (drafts)',
    actual: relationDpI18nCounts.drafts,
    expected: relationDpI18nExpectedDrafts,
  });
  checks.push({
    type: 'relation-dp-i18n (total)',
    actual: relationDpI18nCounts.published + relationDpI18nCounts.drafts,
    expected: relationDpI18nExpectedTotal,
  });
  if (relationDpI18nCounts.published !== expected.relationDpI18n.published)
    errors.push(
      `relation-dp-i18n published: expected ${expected.relationDpI18n.published}, got ${relationDpI18nCounts.published}`
    );
  if (relationDpI18nCounts.drafts !== relationDpI18nExpectedDrafts)
    errors.push(
      `relation-dp-i18n drafts: expected ${relationDpI18nExpectedDrafts}, got ${relationDpI18nCounts.drafts}`
    );

  // media files (plugin::upload.file)
  const mediaCountRes = await strapi.db.query('plugin::upload.file').count();
  const mediaCount = await parseCountResult(mediaCountRes[0] || mediaCountRes);
  checks.push({ type: 'media', actual: mediaCount, expected: expected.media });
  if (mediaCount < expected.media)
    errors.push(`media: expected >= ${expected.media}, got ${mediaCount}`);

  return { errors, checks };
}

function getEntityIdentifier(entity) {
  if (!entity) return null;
  if (entity.documentId) return `${entity.documentId}::${entity.locale || ''}`;
  if (entity.id != null) return `id:${entity.id}`;
  return null;
}

function getEntityIdentifierArray(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map(getEntityIdentifier).filter(Boolean);
}

async function validateDocumentStructure(strapi, expected) {
  const errors = [];

  // basic-dp: ensure published entries have a draft counterpart
  // Use the Document Service API shorthand: strapi.documents(uid).findMany(...)
  const all = await strapi.documents('api::basic-dp.basic-dp').findMany({ populate: '*' });
  const byDoc = new Map();
  for (const e of all) {
    if (!e.documentId) {
      errors.push(`basic-dp id=${e.id}: missing documentId`);
      continue;
    }
    const doc = byDoc.get(e.documentId) || { draft: null, published: null };
    if (e.publishedAt) doc.published = e;
    else doc.draft = e;
    byDoc.set(e.documentId, doc);
  }
  for (const [docId, pair] of byDoc.entries()) {
    if (pair.published && !pair.draft)
      errors.push(`basic-dp documentId ${docId}: published without draft`);
  }

  // basic-dp-i18n: per-locale check
  const allI18n = await strapi
    .documents('api::basic-dp-i18n.basic-dp-i18n')
    .findMany({ populate: '*', locale: 'all' });
  const mapI18n = new Map();
  for (const e of allI18n) {
    if (!e.documentId) {
      errors.push(`basic-dp-i18n id=${e.id}: missing documentId`);
      continue;
    }
    const key = `${e.documentId}::${e.locale || ''}`;
    const cur = mapI18n.get(key) || { draft: null, published: null };
    if (e.publishedAt) cur.published = e;
    else cur.draft = e;
    mapI18n.set(key, cur);
  }
  for (const [k, v] of mapI18n.entries()) {
    if (v.published && !v.draft) errors.push(`basic-dp-i18n ${k}: published without draft`);
  }

  // relation-dp checks (draft/publish pairing)
  const relDpAll = await strapi
    .documents('api::relation-dp.relation-dp')
    .findMany({ populate: '*' });
  const relByDoc = new Map();
  for (const e of relDpAll) {
    if (!e.documentId) {
      errors.push(`relation-dp id=${e.id}: missing documentId`);
      continue;
    }
    const doc = relByDoc.get(e.documentId) || { draft: null, published: null };
    if (e.publishedAt) doc.published = e;
    else doc.draft = e;
    relByDoc.set(e.documentId, doc);
  }
  for (const [docId, pair] of relByDoc.entries()) {
    if (pair.published && !pair.draft)
      errors.push(`relation-dp documentId ${docId}: published without draft`);
  }

  // relation-dp-i18n: per-locale
  const relDpI18nAll = await strapi
    .documents('api::relation-dp-i18n.relation-dp-i18n')
    .findMany({ populate: '*', locale: 'all' });
  const relI18nMap = new Map();
  for (const e of relDpI18nAll) {
    if (!e.documentId) {
      errors.push(`relation-dp-i18n id=${e.id}: missing documentId`);
      continue;
    }
    const key = `${e.documentId}::${e.locale || ''}`;
    const cur = relI18nMap.get(key) || { draft: null, published: null };
    if (e.publishedAt) cur.published = e;
    else cur.draft = e;
    relI18nMap.set(key, cur);
  }
  for (const [k, v] of relI18nMap.entries()) {
    if (v.published && !v.draft) errors.push(`relation-dp-i18n ${k}: published without draft`);
  }

  return { errors };
}

async function validateRelationsPresence(strapi) {
  const errors = [];

  // For relation entries, ensure references exist (simple presence checks)
  const rels = await strapi.documents('api::relation.relation').findMany({ populate: '*' });
  for (const e of rels) {
    if (e.oneToOneBasic && !e.oneToOneBasic.id)
      errors.push(`relation.id=${e.id} oneToOneBasic missing id`);
    if (e.manyToOneBasic && !e.manyToOneBasic.id)
      errors.push(`relation.id=${e.id} manyToOneBasic missing id`);
    if (Array.isArray(e.oneToManyBasics) && e.oneToManyBasics.some((x) => !x || !x.id))
      errors.push(`relation.id=${e.id} oneToManyBasics contains missing refs`);
    if (Array.isArray(e.manyToManyBasics) && e.manyToManyBasics.some((x) => !x || !x.id))
      errors.push(`relation.id=${e.id} manyToManyBasics contains missing refs`);
  }

  // relation-dp: verify relation fields present for both published/draft (basic presence)
  const relDp = await strapi.documents('api::relation-dp.relation-dp').findMany({ populate: '*' });
  for (const e of relDp) {
    if (e.oneToOneBasic && !e.oneToOneBasic.id)
      errors.push(`relation-dp.id=${e.id} oneToOneBasic missing id`);
  }

  return { errors };
}

async function run() {
  const argv = process.argv.slice(2);
  const opts = parseCliArgs(argv);
  const expected = getExpectedCounts(opts.multiplier);

  console.log('🔍 Starting document-service validator (this will boot Strapi programmatically)...');
  console.log(`  multiplier: ${opts.multiplier}`);

  const appContext = await compileStrapi();
  const strapi = await createStrapi(appContext).load();
  strapi.log.level = 'error';

  try {
    const results = { errors: [], checks: [] };

    const countsResult = await validateCounts(strapi, expected);
    results.errors.push(...countsResult.errors);
    results.checks.push(...countsResult.checks);

    const docStruct = await validateDocumentStructure(strapi, expected);
    results.errors.push(...docStruct.errors);

    const relPresence = await validateRelationsPresence(strapi);
    results.errors.push(...relPresence.errors);

    // Summarize
    console.log('\n✅ Validation summary:');
    if (results.errors.length === 0) {
      console.log('  All checks passed (no errors)');
    } else {
      console.log(`  Found ${results.errors.length} error(s):`);
      for (const e of results.errors.slice(0, 50)) console.log(`   - ${e}`);
      if (results.errors.length > 50) console.log(`   ...and ${results.errors.length - 50} more`);
    }

    // Print detailed checks
    console.log('\n📊 Count checks:');
    for (const c of results.checks) {
      console.log(`  - ${c.type}: actual=${c.actual} expected=${c.expected}`);
    }

    process.exit(results.errors.length === 0 ? 0 : 2);
  } catch (err) {
    console.error('Validator error:', err);
    process.exit(1);
  } finally {
    try {
      await strapi.destroy();
    } catch (_) {}
  }
}

// Run if invoked directly
if (require.main === module) {
  run();
}
