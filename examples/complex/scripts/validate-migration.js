#!/usr/bin/env node

const { createStrapi, compileStrapi } = require('@strapi/strapi');
const path = require('path');

// Expected row counts for the example seed
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
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--multiplier' && argv[i + 1] != null) {
      opts.multiplier = Number(argv[i + 1]);
      i += 1;
      continue;
    }
    if (arg?.startsWith('--multiplier=')) {
      opts.multiplier = Number(arg.split('=')[1]);
      continue;
    }
    if (!Number.isNaN(Number(arg))) {
      opts.multiplier = Number(arg);
    }
  }

  const envMultiplier = process.env.MIGRATION_MULTIPLIER ?? process.env.SEED_MULTIPLIER;
  if (!Number.isNaN(Number(envMultiplier))) {
    opts.multiplier = Number(envMultiplier);
  }

  if (!Number.isFinite(opts.multiplier) || opts.multiplier <= 0) {
    opts.multiplier = 1;
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

async function validateDocumentIdBackfill(strapi) {
  const errors = [];
  const conn = strapi.db.connection;

  for (const meta of strapi.db.metadata.values()) {
    if (!('documentId' in (meta.attributes || {}))) {
      continue;
    }

    const hasTable = await conn.schema.hasTable(meta.tableName);
    if (!hasTable) {
      continue;
    }

    const hasCol = await conn.schema.hasColumn(meta.tableName, 'document_id');
    if (!hasCol) {
      errors.push(
        `${meta.uid} (table ${meta.tableName}): expected document_id column after v5 migration`
      );
      continue;
    }

    const countRes = await conn(meta.tableName).whereNull('document_id').count('* as c');
    const n = parseCountResult(countRes[0] || countRes);
    if (n > 0) {
      errors.push(
        `${meta.uid} (table ${meta.tableName}): ${n} row(s) still have NULL document_id after migration`
      );
    }
  }

  return { errors };
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
    if (e.morph_to_one && !e.morph_to_one.id)
      errors.push(`relation.id=${e.id} morph_to_one missing id`);
    if (Array.isArray(e.morph_to_many) && e.morph_to_many.some((x) => !x || !x.id))
      errors.push(`relation.id=${e.id} morph_to_many contains missing refs`);
  }

  // relation-dp: verify relation fields present for both published/draft (basic presence)
  const relDp = await strapi.documents('api::relation-dp.relation-dp').findMany({ populate: '*' });
  for (const e of relDp) {
    if (e.oneToOneBasic && !e.oneToOneBasic.id)
      errors.push(`relation-dp.id=${e.id} oneToOneBasic missing id`);
  }

  return { errors };
}

function buildPopulateFromAttributes(attributes) {
  const populate = {};
  for (const [name, attr] of Object.entries(attributes || {})) {
    if (!attr) continue;
    if (attr.type === 'relation' || attr.type === 'media') {
      populate[name] = true;
    } else if (attr.type === 'component' || attr.type === 'dynamiczone') {
      populate[name] = { populate: '*' };
    }
  }
  return Object.keys(populate).length > 0 ? populate : undefined;
}

function isI18nContentType(contentType) {
  return Boolean(contentType?.pluginOptions?.i18n?.localized);
}

function validateRelationValue(value, path) {
  if (!value) return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      if (!item || item.id == null) {
        return `${path}: missing related id`;
      }
    }
    return null;
  }
  if (value.id == null) {
    return `${path}: missing related id`;
  }
  return null;
}

function validateComponentValue(component, componentUid, path, strapi) {
  const errors = [];
  if (!component || !componentUid) return errors;
  const schema = strapi.components[componentUid];
  if (!schema) {
    errors.push(`${path}: unknown component ${componentUid}`);
    return errors;
  }

  for (const [name, attr] of Object.entries(schema.attributes || {})) {
    const value = component[name];
    if (attr.type === 'relation' || attr.type === 'media') {
      const err = validateRelationValue(value, `${path}.${name}`);
      if (err) errors.push(err);
    } else if (attr.type === 'component') {
      if (Array.isArray(value)) {
        value.forEach((item, idx) => {
          errors.push(
            ...validateComponentValue(item, attr.component, `${path}.${name}[${idx}]`, strapi)
          );
        });
      } else if (value) {
        errors.push(...validateComponentValue(value, attr.component, `${path}.${name}`, strapi));
      }
    } else if (attr.type === 'dynamiczone') {
      if (Array.isArray(value)) {
        value.forEach((item, idx) => {
          const compUid = item?.__component;
          errors.push(...validateComponentValue(item, compUid, `${path}.${name}[${idx}]`, strapi));
        });
      }
    }
  }

  return errors;
}

async function validateEntityGraph(strapi) {
  const errors = [];
  const contentTypes = Object.values(strapi.contentTypes).filter((ct) =>
    ct.uid.startsWith('api::')
  );

  for (const contentType of contentTypes) {
    const populate = buildPopulateFromAttributes(contentType.attributes);
    const locale = isI18nContentType(contentType) ? 'all' : undefined;
    const entries = await strapi
      .documents(contentType.uid)
      .findMany({ populate, ...(locale ? { locale } : {}) });

    for (const entry of entries) {
      for (const [name, attr] of Object.entries(contentType.attributes || {})) {
        const value = entry[name];
        if (attr.type === 'relation' || attr.type === 'media') {
          const err = validateRelationValue(value, `${contentType.uid}.${name}#${entry.id}`);
          if (err) errors.push(err);
        } else if (attr.type === 'component') {
          if (Array.isArray(value)) {
            value.forEach((item, idx) => {
              errors.push(
                ...validateComponentValue(
                  item,
                  attr.component,
                  `${contentType.uid}.${name}#${entry.id}[${idx}]`,
                  strapi
                )
              );
            });
          } else if (value) {
            errors.push(
              ...validateComponentValue(
                value,
                attr.component,
                `${contentType.uid}.${name}#${entry.id}`,
                strapi
              )
            );
          }
        } else if (attr.type === 'dynamiczone') {
          if (Array.isArray(value)) {
            value.forEach((item, idx) => {
              const compUid = item?.__component;
              if (!compUid) {
                errors.push(`${contentType.uid}.${name}#${entry.id}[${idx}]: missing __component`);
                return;
              }
              errors.push(
                ...validateComponentValue(
                  item,
                  compUid,
                  `${contentType.uid}.${name}#${entry.id}[${idx}]`,
                  strapi
                )
              );
            });
          }
        }
      }
    }
  }

  return { errors };
}

function summarizeRelations(entry, relationFields) {
  const summary = {};
  for (const field of relationFields) {
    const value = entry[field];
    if (Array.isArray(value)) {
      summary[field] = getEntityIdentifierArray(value).sort();
    } else {
      summary[field] = getEntityIdentifier(value);
    }
  }
  return summary;
}

function areRelationSummariesEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function describeRelationSummaryDiff(publishedSummary, draftSummary) {
  const keys = new Set([
    ...Object.keys(publishedSummary || {}),
    ...Object.keys(draftSummary || {}),
  ]);
  const parts = [];
  for (const k of keys) {
    const pj = JSON.stringify(publishedSummary?.[k]);
    const dj = JSON.stringify(draftSummary?.[k]);
    if (pj !== dj) {
      parts.push(`${k}: published=${pj} draft=${dj}`);
    }
  }
  return parts.length > 0 ? parts.join(' | ') : 'summaries differ';
}

function collectMediaIds(value, path = '') {
  const ids = [];
  if (!value) return ids;
  if (Array.isArray(value)) {
    value.forEach((item, idx) => {
      if (item && (item.id != null || item.documentId != null)) {
        ids.push(item.id ?? item.documentId);
      }
      if (item && typeof item === 'object' && !item.id && !item.documentId) {
        ids.push(...collectMediaIds(item, `${path}[${idx}]`));
      }
    });
    return ids;
  }
  if (value.id != null || value.documentId != null) {
    ids.push(value.id ?? value.documentId);
    return ids;
  }
  if (typeof value === 'object') {
    for (const v of Object.values(value)) {
      ids.push(...collectMediaIds(v, path));
    }
  }
  return ids;
}

async function validateMediaParityForDp(strapi) {
  const errors = [];
  const dpUids = [
    'api::basic-dp.basic-dp',
    'api::relation-dp.relation-dp',
    'api::basic-dp-i18n.basic-dp-i18n',
    'api::relation-dp-i18n.relation-dp-i18n',
  ];
  for (const uid of dpUids) {
    const contentType = strapi.contentTypes[uid];
    if (!contentType) continue;
    const populate = buildPopulateFromAttributes(contentType.attributes);
    const locale = isI18nContentType(contentType) ? 'all' : undefined;
    const entries = await strapi
      .documents(uid)
      .findMany({ populate, ...(locale ? { locale } : {}) });
    const byDoc = new Map();
    for (const entry of entries) {
      const key = locale ? `${entry.documentId}::${entry.locale || ''}` : entry.documentId;
      if (!key) continue;
      const bucket = byDoc.get(key) || { draft: null, published: null };
      if (entry.publishedAt) bucket.published = entry;
      else bucket.draft = entry;
      byDoc.set(key, bucket);
    }
    for (const [key, pair] of byDoc.entries()) {
      if (!pair.published || !pair.draft) continue;
      const pubIds = collectMediaIds(pair.published).sort();
      const draftIds = collectMediaIds(pair.draft).sort();
      if (JSON.stringify(pubIds) !== JSON.stringify(draftIds)) {
        errors.push(
          `${uid} ${key}: media parity failed (published: ${pubIds.length} media, draft: ${draftIds.length} media)`
        );
      }
    }
  }
  return { errors };
}

async function validateNestedComponentRelationParity(strapi) {
  const errors = [];
  // Sections/header: populate '*' only (no nested field paths)
  const populate = { sections: { populate: '*' }, header: { populate: '*' } };
  const entries = await strapi.documents('api::relation-dp.relation-dp').findMany({ populate });
  const byDoc = new Map();
  for (const entry of entries) {
    if (!entry.documentId) continue;
    const bucket = byDoc.get(entry.documentId) || { draft: null, published: null };
    if (entry.publishedAt) bucket.published = entry;
    else bucket.draft = entry;
    byDoc.set(entry.documentId, bucket);
  }
  for (const [docId, pair] of byDoc.entries()) {
    if (!pair.published || !pair.draft) continue;
    const sectionsPub = pair.published.sections || [];
    const sectionsDraft = pair.draft.sections || [];
    for (let i = 0; i < Math.max(sectionsPub.length, sectionsDraft.length); i++) {
      const sp = sectionsPub[i];
      const sd = sectionsDraft[i];
      if (
        sp?.__component === 'shared.reference-list' ||
        sd?.__component === 'shared.reference-list'
      ) {
        const refsPub = sp?.references || [];
        const refsDraft = sd?.references || [];
        for (let j = 0; j < Math.max(refsPub.length, refsDraft.length); j++) {
          const rp = refsPub[j];
          const rd = refsDraft[j];
          const pubArticle = rp?.article?.id ?? rp?.article?.documentId;
          const draftArticle = rd?.article?.id ?? rd?.article?.documentId;
          if (pubArticle != null && draftArticle == null) {
            errors.push(
              `relation-dp documentId ${docId}: nested reference-list.references[${j}].article present on published, missing on draft`
            );
          }
          if (draftArticle != null && pubArticle == null) {
            errors.push(
              `relation-dp documentId ${docId}: nested reference-list.references[${j}].article present on draft, missing on published`
            );
          }
        }
      }
    }
  }
  return { errors };
}

async function verifyMigrationFixAtDbLevel(strapi) {
  const out = [];
  const errors = [];
  try {
    const conn = strapi.db.connection;
    const meta = strapi.db.metadata;

    // Upload morph table — relation-dp direct media
    const fileMeta = meta.get('plugin::upload.file');
    const relatedAttr = fileMeta?.attributes?.related;
    const morphJoin = relatedAttr?.joinTable;
    if (morphJoin?.morphColumn) {
      const morphTable = morphJoin.name;
      const relatedIdCol = morphJoin.morphColumn.idColumn.name;
      const relatedTypeCol = morphJoin.morphColumn.typeColumn.name;
      const relationDpMeta = meta.get('api::relation-dp.relation-dp');
      const relTable = relationDpMeta.tableName;
      const rows = await conn(relTable).select('id', 'document_id', 'published_at');
      const publishedIds = rows.filter((r) => r.published_at != null).map((r) => r.id);
      const draftIds = rows.filter((r) => r.published_at == null).map((r) => r.id);

      const relType = 'api::relation-dp.relation-dp';
      const countPub =
        publishedIds.length === 0
          ? 0
          : Number(
              (
                await conn(morphTable)
                  .where(relatedTypeCol, relType)
                  .whereIn(relatedIdCol, publishedIds)
                  .count('* as c')
                  .first()
              )?.c ?? 0
            );
      const countDraft =
        draftIds.length === 0
          ? 0
          : Number(
              (
                await conn(morphTable)
                  .where(relatedTypeCol, relType)
                  .whereIn(relatedIdCol, draftIds)
                  .count('* as c')
                  .first()
              )?.c ?? 0
            );

      const morphNote =
        countPub === 0 && countDraft === 0
          ? ' (no direct media on relation-dp in this seed)'
          : countPub > 0 && countDraft > 0
            ? ' (draft rows present)'
            : ' (draft count lower than published)';
      out.push(
        `  Morph (relation-dp direct): ${countPub} published, ${countDraft} draft${morphNote}.`
      );
    }

    // Component media: shared.logo via header under relation-dp
    if (morphJoin?.morphColumn) {
      const morphTable = morphJoin.name;
      const relatedIdCol = morphJoin.morphColumn.idColumn.name;
      const relatedTypeCol = morphJoin.morphColumn.typeColumn.name;
      const relationDpMeta = meta.get('api::relation-dp.relation-dp');
      const relTable = relationDpMeta.tableName;
      const rows = await conn(relTable).select('id', 'published_at');
      const publishedIds = rows.filter((r) => r.published_at != null).map((r) => r.id);
      const draftIds = rows.filter((r) => r.published_at == null).map((r) => r.id);

      const rdCmps = meta.get('api::relation-dp.relation-dp').attributes?.sections?.joinTable;
      const rdCmpsTable = rdCmps?.name;
      const entityIdCol = rdCmps?.joinColumn?.name;
      const cmpIdCol = rdCmps?.morphColumn?.idColumn?.name;
      const cmpTypeCol = rdCmps?.morphColumn?.typeColumn?.name;
      if (!rdCmpsTable || !entityIdCol || !cmpIdCol || !cmpTypeCol) return out;

      // Header blocks in sections dynamic zone
      const headerType = 'shared.header';
      const headerRows = await conn(rdCmpsTable)
        .where(cmpTypeCol, headerType)
        .whereIn(entityIdCol, [...publishedIds, ...draftIds])
        .select(entityIdCol, cmpIdCol);
      const headerIdsByRelDp = new Map();
      for (const r of headerRows) {
        const eid = r[entityIdCol];
        if (!headerIdsByRelDp.has(eid)) headerIdsByRelDp.set(eid, []);
        headerIdsByRelDp.get(eid).push(r[cmpIdCol]);
      }

      // Logo components linked from shared.header
      let headerLogoJoinTable;
      let headerEntityCol;
      let logoCmpCol;
      for (const uid of ['shared.header', 'component::shared.header']) {
        try {
          const headerMeta = meta.get(uid);
          const headerLogoAttr = headerMeta?.attributes?.headerlogo;
          const jt = headerLogoAttr?.joinTable;
          if (jt?.joinColumn?.name && jt?.inverseJoinColumn?.name) {
            headerLogoJoinTable = jt.name;
            headerEntityCol = jt.joinColumn.name;
            logoCmpCol = jt.inverseJoinColumn.name;
            break;
          }
        } catch (_) {}
      }
      if (!headerLogoJoinTable) {
        out.push('  Morph (shared.logo under relation-dp): skipped (no header logo join table).');
      } else {
        const allHeaderIds = [...new Set(headerRows.map((r) => r[cmpIdCol]))];
        const logoRows = await conn(headerLogoJoinTable)
          .whereIn(headerEntityCol, allHeaderIds)
          .select(headerEntityCol, logoCmpCol);
        const logoIdByHeaderId = new Map();
        for (const r of logoRows) {
          logoIdByHeaderId.set(r[headerEntityCol], r[logoCmpCol]);
        }
        const publishedLogoIds = [];
        const draftLogoIds = [];
        for (const id of publishedIds) {
          for (const hid of headerIdsByRelDp.get(id) || []) {
            const lid = logoIdByHeaderId.get(hid);
            if (lid != null) publishedLogoIds.push(lid);
          }
        }
        for (const id of draftIds) {
          for (const hid of headerIdsByRelDp.get(id) || []) {
            const lid = logoIdByHeaderId.get(hid);
            if (lid != null) draftLogoIds.push(lid);
          }
        }
        const logoType = 'shared.logo';
        const countPubLogo =
          publishedLogoIds.length === 0
            ? 0
            : Number(
                (
                  await conn(morphTable)
                    .where(relatedTypeCol, logoType)
                    .whereIn(relatedIdCol, publishedLogoIds)
                    .count('* as c')
                    .first()
                )?.c ?? 0
              );
        const countDraftLogo =
          draftLogoIds.length === 0
            ? 0
            : Number(
                (
                  await conn(morphTable)
                    .where(relatedTypeCol, logoType)
                    .whereIn(relatedIdCol, draftLogoIds)
                    .count('* as c')
                    .first()
                )?.c ?? 0
              );
        const logoNote =
          countPubLogo > 0 && countDraftLogo === 0
            ? ' (draft morph rows missing)'
            : countPubLogo > 0 && countDraftLogo > 0
              ? ' (draft rows present)'
              : ' (no logo media on relation-dp in this seed)';
        out.push(
          `  Morph (shared.logo under relation-dp): ${countPubLogo} published, ${countDraftLogo} draft${logoNote}.`
        );
      }
    }

    // relation-dp.morphTargets (source-side morph)
    const relationDpMeta = meta.get('api::relation-dp.relation-dp');
    const morphTargetsAttr = relationDpMeta?.attributes?.morphTargets;
    const morphTargetsJoin = morphTargetsAttr?.joinTable;
    if (morphTargetsJoin?.morphColumn?.idColumn && morphTargetsJoin?.joinColumn?.name) {
      const morphTable = morphTargetsJoin.name;
      const sourceCol = morphTargetsJoin.joinColumn.name;
      const relTable = relationDpMeta.tableName;
      const relRows = await conn(relTable).select('id', 'published_at');
      const pubIds = relRows.filter((r) => r.published_at != null).map((r) => r.id);
      const draftIds = relRows.filter((r) => r.published_at == null).map((r) => r.id);
      const countPub =
        pubIds.length === 0
          ? 0
          : Number(
              (await conn(morphTable).whereIn(sourceCol, pubIds).count('* as c').first())?.c ?? 0
            );
      const countDraft =
        draftIds.length === 0
          ? 0
          : Number(
              (await conn(morphTable).whereIn(sourceCol, draftIds).count('* as c').first())?.c ?? 0
            );
      const note =
        countPub > 0 && countDraft > 0
          ? ' (draft rows present)'
          : countPub > 0 && countDraft === 0
            ? ' (draft morph rows missing)'
            : '';
      out.push(
        `  Morph (relation-dp morphTargets, source-side): ${countPub} published, ${countDraft} draft${note}.`
      );
    }

    // Dynamic zone: nested component ids per document
    const sectionsAttr = relationDpMeta?.attributes?.sections;
    const dzJoin = sectionsAttr?.joinTable;
    if (
      dzJoin?.joinColumn?.name &&
      dzJoin?.morphColumn?.idColumn?.name &&
      dzJoin?.morphColumn?.typeColumn?.name
    ) {
      const joinTableName = dzJoin.name;
      const entityIdCol = dzJoin.joinColumn.name;
      const componentIdCol = dzJoin.morphColumn.idColumn.name;
      const componentTypeCol = dzJoin.morphColumn.typeColumn.name;

      const relTable = relationDpMeta.tableName;
      const relRows = await conn(relTable).select('id', 'document_id', 'published_at');
      const byDoc = new Map();
      for (const r of relRows) {
        const docId = r.document_id;
        if (!docId) continue;
        const bucket = byDoc.get(docId) || { published: null, draft: null };
        if (r.published_at != null) bucket.published = r.id;
        else bucket.draft = r.id;
        byDoc.set(docId, bucket);
      }

      let docsWithRefList = 0;
      let docsWithDistinctCmpIds = 0;
      let docsWithDz = 0;
      let docsWithOverlap = 0;
      const refListType = 'shared.reference-list';
      for (const [docId, pair] of byDoc.entries()) {
        if (!pair.published || !pair.draft) continue;
        const dzRows = await conn(joinTableName)
          .whereIn(entityIdCol, [pair.published, pair.draft])
          .select(entityIdCol, componentIdCol, componentTypeCol);
        const pubDz = new Set(
          dzRows
            .filter((row) => row[entityIdCol] === pair.published)
            .map((row) => row[componentIdCol])
        );
        const draftDz = new Set(
          dzRows.filter((row) => row[entityIdCol] === pair.draft).map((row) => row[componentIdCol])
        );
        if (pubDz.size === 0 && draftDz.size === 0) continue;
        docsWithDz += 1;
        const overlaps = [...pubDz].filter((id) => draftDz.has(id));
        if (overlaps.length > 0) {
          docsWithOverlap += 1;
          errors.push(
            `relation-dp documentId ${docId}: ${overlaps.length} dynamic-zone component id(s) shared between published and draft`
          );
        }

        const refRows = dzRows.filter((row) => row[componentTypeCol] === refListType);
        const pubCmps = new Set(
          refRows
            .filter((row) => row[entityIdCol] === pair.published)
            .map((row) => row[componentIdCol])
        );
        const draftCmps = new Set(
          refRows.filter((row) => row[entityIdCol] === pair.draft).map((row) => row[componentIdCol])
        );
        if (pubCmps.size === 0 && draftCmps.size === 0) continue;
        docsWithRefList += 1;
        const disjoint = [...pubCmps].every((id) => !draftCmps.has(id));
        if (disjoint && pubCmps.size > 0) docsWithDistinctCmpIds += 1;
      }
      out.push(
        `  Nested components: ${docsWithRefList} document(s) with reference-list; ${docsWithDistinctCmpIds} have distinct draft vs published component IDs.`
      );
      out.push(
        `  Dynamic zone components: ${docsWithDz} document(s); ${docsWithOverlap} have overlapping component IDs.`
      );
    }
  } catch (e) {
    out.push(`  Verification skipped (${e.message}).`);
  }
  return { lines: out, errors };
}

async function validateJoinTableSourceParityForDp(strapi, uid) {
  const errors = [];
  const contentType = strapi.contentTypes[uid];
  if (!contentType?.options?.draftAndPublish) return { errors };

  const meta = strapi.db.metadata.get(uid);
  if (!meta) return { errors };

  const conn = strapi.db.connection;
  const table = meta.tableName;
  const localized = Boolean(contentType.pluginOptions?.i18n?.localized);

  const hasTable = await conn.schema.hasTable(table);
  if (!hasTable) return { errors };

  const selectCols = ['id', 'document_id', 'published_at'];
  if (localized) selectCols.push('locale');

  const rows = await conn(table).select(selectCols).whereNotNull('document_id');
  const pairMap = new Map();
  for (const r of rows) {
    const key = localized ? `${r.document_id}::${r.locale || ''}` : r.document_id;
    const bucket = pairMap.get(key) || { pub: null, draft: null };
    if (r.published_at != null) bucket.pub = r.id;
    else bucket.draft = r.id;
    pairMap.set(key, bucket);
  }

  for (const [attrName, attribute] of Object.entries(meta.attributes || {})) {
    if (attribute.type !== 'relation' || !attribute.joinTable || attribute.joinTable.morphColumn) {
      continue;
    }
    const jt = attribute.joinTable;
    if (jt.name.includes('_cmps')) continue;

    const jtName = jt.name;
    const sourceCol = jt.joinColumn?.name;
    if (!sourceCol) continue;

    if (!(await conn.schema.hasTable(jtName))) continue;

    for (const [docKey, pair] of pairMap.entries()) {
      if (pair.pub == null || pair.draft == null) continue;

      const cPub = await conn(jtName).where(sourceCol, pair.pub).count('* as c');
      const cDraft = await conn(jtName).where(sourceCol, pair.draft).count('* as c');
      const nPub = parseCountResult(cPub[0] || cPub);
      const nDraft = parseCountResult(cDraft[0] || cDraft);
      if (nPub !== nDraft) {
        errors.push(
          `${uid} (document ${docKey}) — relation "${attrName}": published row id=${pair.pub} has ${nPub} outgoing row(s) in join table "${jtName}" (column "${sourceCol}"), but draft row id=${pair.draft} has ${nDraft}. After discard-drafts, those counts must match (draft should get copies of published links). A lower draft count means relation rows were not cloned to the draft entry.`
        );
      }
    }
  }

  return { errors };
}

async function validateRelationParityForDp(strapi, uid) {
  const errors = [];
  const contentType = strapi.contentTypes[uid];
  if (!contentType) return { errors };

  const relationFields = Object.entries(contentType.attributes || {})
    .filter(([, attr]) => attr.type === 'relation')
    .map(([name]) => name);
  if (relationFields.length === 0) return { errors };

  const populate = buildPopulateFromAttributes(contentType.attributes);
  const locale = isI18nContentType(contentType) ? 'all' : undefined;
  const entries = await strapi.documents(uid).findMany({ populate, ...(locale ? { locale } : {}) });

  const byDoc = new Map();
  for (const entry of entries) {
    if (!entry.documentId) continue;
    const key = `${entry.documentId}::${entry.locale || ''}`;
    const bucket = byDoc.get(key) || { draft: null, published: null };
    if (entry.publishedAt) bucket.published = entry;
    else bucket.draft = entry;
    byDoc.set(key, bucket);
  }

  for (const [key, pair] of byDoc.entries()) {
    if (!pair.published || !pair.draft) continue;
    const publishedSummary = summarizeRelations(pair.published, relationFields);
    const draftSummary = summarizeRelations(pair.draft, relationFields);
    if (!areRelationSummariesEqual(publishedSummary, draftSummary)) {
      errors.push(
        `${uid} (document ${key}): draft vs published relation populate mismatch (Document API). ${describeRelationSummaryDiff(
          publishedSummary,
          draftSummary
        )}. Same documentId should yield equivalent related targets for each field.`
      );
    }
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

  const dbConfig = strapi.config.get('database');
  const conn = dbConfig?.connection?.connection || {};
  const client = dbConfig?.connection?.client || '?';
  let dbDesc;
  if (conn.connectionString) {
    dbDesc = `${client} (from DATABASE_URL)`;
  } else if (client === 'sqlite' && conn.filename) {
    dbDesc = `sqlite ${conn.filename}`;
  } else {
    dbDesc = `${client} ${conn.host || 'localhost'}:${conn.port ?? (client === 'postgres' ? 5432 : 3306)}/${conn.database || 'strapi'}`;
  }
  console.log(`  database: ${dbDesc}`);

  try {
    const results = { errors: [], checks: [], sections: [] };

    const countsResult = await validateCounts(strapi, expected);
    results.errors.push(...countsResult.errors);
    results.checks.push(...countsResult.checks);
    results.sections.push({ name: 'Counts', errors: countsResult.errors });

    const documentIdBackfill = await validateDocumentIdBackfill(strapi);
    results.errors.push(...documentIdBackfill.errors);
    results.sections.push({
      name: 'document_id backfill',
      errors: documentIdBackfill.errors,
    });

    const docStruct = await validateDocumentStructure(strapi, expected);
    results.errors.push(...docStruct.errors);
    results.sections.push({ name: 'Draft/publish pairing', errors: docStruct.errors });

    const relPresence = await validateRelationsPresence(strapi);
    results.errors.push(...relPresence.errors);
    results.sections.push({ name: 'Relation targets', errors: relPresence.errors });

    const joinTableParity = await validateJoinTableSourceParityForDp(
      strapi,
      'api::relation-dp.relation-dp'
    );
    const joinTableParityI18n = await validateJoinTableSourceParityForDp(
      strapi,
      'api::relation-dp-i18n.relation-dp-i18n'
    );
    results.errors.push(...joinTableParity.errors, ...joinTableParityI18n.errors);
    results.sections.push({
      name: 'DP join-table source parity',
      errors: [...joinTableParity.errors, ...joinTableParityI18n.errors],
    });

    const relationParity = await validateRelationParityForDp(
      strapi,
      'api::relation-dp.relation-dp'
    );
    results.errors.push(...relationParity.errors);
    const relationParityI18n = await validateRelationParityForDp(
      strapi,
      'api::relation-dp-i18n.relation-dp-i18n'
    );
    results.errors.push(...relationParityI18n.errors);
    results.sections.push({
      name: 'DP relation parity (API)',
      errors: [...relationParity.errors, ...relationParityI18n.errors],
    });

    const entityGraph = await validateEntityGraph(strapi);
    results.errors.push(...entityGraph.errors);
    results.sections.push({ name: 'Components/dynamic zones/media', errors: entityGraph.errors });

    const mediaParity = await validateMediaParityForDp(strapi);
    results.errors.push(...mediaParity.errors);
    results.sections.push({
      name: 'Media parity (draft vs published)',
      errors: mediaParity.errors,
    });

    const nestedComponentParity = await validateNestedComponentRelationParity(strapi);
    results.errors.push(...nestedComponentParity.errors);
    results.sections.push({
      name: 'Nested component relation parity',
      errors: nestedComponentParity.errors,
    });

    const verification = await verifyMigrationFixAtDbLevel(strapi);
    if (verification.errors.length > 0) {
      results.errors.push(...verification.errors);
      results.sections.push({ name: 'DB-level verification', errors: verification.errors });
    } else {
      results.sections.push({ name: 'DB-level verification', errors: [] });
    }

    console.log('\n✅ Validation summary:');
    if (results.errors.length === 0) {
      console.log('  All checks passed (no errors)');
    } else {
      console.log(`  Found ${results.errors.length} error(s):`);
      for (const e of results.errors.slice(0, 50)) console.log(`   - ${e}`);
      if (results.errors.length > 50) console.log(`   ...and ${results.errors.length - 50} more`);
    }

    console.log('\n📊 Count checks:');
    for (const c of results.checks) {
      console.log(`  - ${c.type}: actual=${c.actual} expected=${c.expected}`);
    }

    console.log('\n🧪 Validation sections:');
    for (const section of results.sections) {
      const status = section.errors.length === 0 ? 'ok' : `errors=${section.errors.length}`;
      console.log(`  - ${section.name}: ${status}`);
    }

    if (verification.lines.length > 0) {
      console.log('\n🔬 DB-level verification:');
      for (const line of verification.lines) console.log(line);
    }

    if (results.errors.length > 0) {
      console.log(
        '\nExiting with code 2 (validation failed). Code 1 means this script crashed before finishing.'
      );
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

if (require.main === module) {
  run();
}
