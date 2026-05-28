'use strict';

const {
  parseCountResult,
  buildPopulateFromAttributes,
  isI18nContentType,
} = require('./db-helpers');
const {
  getEntityIdentifierArray,
  summarizeRelations,
  areRelationSummariesEqual,
  describeRelationSummaryDiff,
} = require('./relation-summary');

const HC_M2M_SOURCE_UID = 'api::hc-m2m-source.hc-m2m-source';

function hasActiveEntry(activeEntries, uid) {
  return activeEntries.some((entry) => entry.uid === uid);
}

/**
 * @param {import('@strapi/strapi').Core.Strapi} strapi
 */
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

/**
 * @param {import('@strapi/strapi').Core.Strapi} strapi
 * @param {string} uid
 * @param {{ label: string, localized?: boolean }} opts
 */
async function validateDraftPublishPairingForUid(strapi, uid, { label, localized = false }) {
  const errors = [];
  const entries = await strapi
    .documents(uid)
    .findMany({ populate: '*', ...(localized ? { locale: 'all' } : {}) });
  const byKey = new Map();
  for (const e of entries) {
    if (!e.documentId) {
      errors.push(`${label} id=${e.id}: missing documentId`);
      continue;
    }
    const key = localized ? `${e.documentId}::${e.locale || ''}` : e.documentId;
    const bucket = byKey.get(key) || { draft: null, published: null };
    if (e.publishedAt) bucket.published = e;
    else bucket.draft = e;
    byKey.set(key, bucket);
  }
  for (const [key, pair] of byKey.entries()) {
    if (pair.published && !pair.draft) {
      errors.push(`${label} ${key}: published without draft`);
    }
  }
  return { errors };
}

/**
 * @param {import('@strapi/strapi').Core.Strapi} strapi
 * @param {Array<{ uid: string, label: string, i18n?: boolean, checks?: string[] }>} activeEntries
 */
async function validateDraftPublishPairing(strapi, activeEntries) {
  const errors = [];

  for (const entry of activeEntries) {
    if (!entry.checks?.includes('draftPublishPair')) {
      continue;
    }
    const { errors: e } = await validateDraftPublishPairingForUid(strapi, entry.uid, {
      label: entry.label,
      localized: Boolean(entry.i18n),
    });
    errors.push(...e);
  }

  return { errors };
}

/**
 * @param {import('@strapi/strapi').Core.Strapi} strapi
 * @param {Array<{ uid: string }>} activeEntries
 */
async function validateRelationsPresence(strapi, activeEntries) {
  const errors = [];

  if (hasActiveEntry(activeEntries, 'api::relation.relation')) {
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
  }

  if (hasActiveEntry(activeEntries, 'api::relation-dp.relation-dp')) {
    const relDp = await strapi
      .documents('api::relation-dp.relation-dp')
      .findMany({ populate: '*' });
    for (const e of relDp) {
      if (e.oneToOneBasic && !e.oneToOneBasic.id)
        errors.push(`relation-dp.id=${e.id} oneToOneBasic missing id`);
    }
  }

  if (hasActiveEntry(activeEntries, HC_M2M_SOURCE_UID)) {
    const hcSources = await strapi
      .documents(HC_M2M_SOURCE_UID)
      .findMany({ populate: { targets: true } });
    for (const e of hcSources) {
      if (!e.publishedAt) continue;
      if (!Array.isArray(e.targets) || e.targets.length === 0) {
        errors.push(`hc-m2m-source id=${e.id}: published entry has no targets`);
      } else if (e.targets.some((t) => !t || t.id == null)) {
        errors.push(`hc-m2m-source id=${e.id}: targets contains missing refs`);
      }
    }
  }

  return { errors };
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

/**
 * @param {import('@strapi/strapi').Core.Strapi} strapi
 */
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

/**
 * @param {import('@strapi/strapi').Core.Strapi} strapi
 * @param {string} uid
 */
async function validateMediaParityForDp(strapi, uid) {
  const errors = [];
  const contentType = strapi.contentTypes[uid];
  if (!contentType) return { errors };
  const populate = buildPopulateFromAttributes(contentType.attributes);
  const locale = isI18nContentType(contentType) ? 'all' : undefined;
  const entries = await strapi.documents(uid).findMany({ populate, ...(locale ? { locale } : {}) });
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
  return { errors };
}

/**
 * @param {import('@strapi/strapi').Core.Strapi} strapi
 * @param {string} uid
 * @param {string} label
 */
async function validateNestedComponentRelationParityForUid(strapi, uid, label) {
  const errors = [];
  const contentType = strapi.contentTypes[uid];
  if (!contentType) return { errors };
  const localized = isI18nContentType(contentType);
  const populate = buildPopulateFromAttributes(contentType.attributes);
  const entries = await strapi
    .documents(uid)
    .findMany({ populate, ...(localized ? { locale: 'all' } : {}) });
  const byDoc = new Map();
  for (const entry of entries) {
    if (!entry.documentId) continue;
    const key = localized ? `${entry.documentId}::${entry.locale || ''}` : entry.documentId;
    const bucket = byDoc.get(key) || { draft: null, published: null };
    if (entry.publishedAt) bucket.published = entry;
    else bucket.draft = entry;
    byDoc.set(key, bucket);
  }
  for (const [docKey, pair] of byDoc.entries()) {
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
              `${label} ${docKey}: nested reference-list.references[${j}].article present on published, missing on draft`
            );
          }
          if (draftArticle != null && pubArticle == null) {
            errors.push(
              `${label} ${docKey}: nested reference-list.references[${j}].article present on draft, missing on published`
            );
          }
        }
      }
    }
  }
  return { errors };
}

function recordMorphDraftGap(errors, label, countPub, countDraft) {
  if (countPub > 0 && countDraft === 0) {
    errors.push(
      `${label}: ${countPub} published morph row(s) but no draft morph rows (discard-drafts should copy links to draft entries)`
    );
  }
}

/**
 * @param {import('@strapi/strapi').Core.Strapi} strapi
 */
async function verifyMigrationFixAtDbLevel(strapi) {
  const out = [];
  const errors = [];
  try {
    const conn = strapi.db.connection;
    const meta = strapi.db.metadata;

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

      recordMorphDraftGap(errors, 'Morph (relation-dp direct)', countPub, countDraft);
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
      if (!rdCmpsTable || !entityIdCol || !cmpIdCol || !cmpTypeCol) {
        return { lines: out, errors };
      }

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
        recordMorphDraftGap(
          errors,
          'Morph (shared.logo under relation-dp)',
          countPubLogo,
          countDraftLogo
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
      recordMorphDraftGap(errors, 'Morph (relation-dp morphTargets)', countPub, countDraft);
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
      const fieldCol = dzJoin.orderColumn?.name || 'field';
      const sectionsField = 'sections';

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
          .select(entityIdCol, componentIdCol, componentTypeCol, fieldCol);
        const sectionsRows = dzRows.filter((row) => row[fieldCol] === sectionsField);
        const componentInstanceKey = (row) => `${row[componentTypeCol]}:${row[componentIdCol]}`;
        const pubDz = new Set(
          sectionsRows
            .filter((row) => row[entityIdCol] === pair.published)
            .map(componentInstanceKey)
        );
        const draftDz = new Set(
          sectionsRows.filter((row) => row[entityIdCol] === pair.draft).map(componentInstanceKey)
        );
        if (pubDz.size === 0 && draftDz.size === 0) continue;
        docsWithDz += 1;
        const overlaps = [...pubDz].filter((key) => draftDz.has(key));
        if (overlaps.length > 0) {
          docsWithOverlap += 1;
          errors.push(
            `relation-dp documentId ${docId}: ${overlaps.length} sections dynamic-zone component instance(s) shared between published and draft (${overlaps.join(', ')})`
          );
        }

        const refRows = sectionsRows.filter((row) => row[componentTypeCol] === refListType);
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

/**
 * @param {import('@strapi/strapi').Core.Strapi} strapi
 * @param {string} uid
 */
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

/**
 * @param {import('@strapi/strapi').Core.Strapi} strapi
 * @param {string} uid
 */
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

module.exports = {
  validateDocumentIdBackfill,
  validateDraftPublishPairingForUid,
  validateDraftPublishPairing,
  validateRelationsPresence,
  validateEntityGraph,
  validateMediaParityForDp,
  validateNestedComponentRelationParityForUid,
  verifyMigrationFixAtDbLevel,
  validateJoinTableSourceParityForDp,
  validateRelationParityForDp,
  recordMorphDraftGap,
};
