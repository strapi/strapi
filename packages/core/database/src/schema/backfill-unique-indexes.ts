import type { Database } from '..';
import type { SchemaDiff } from './types';
import type { Meta } from '../metadata';

const VARIANT_CLAIM_ATTR_PREFIX = '__uniqueVariantClaim_';
const DOCUMENTS_UID_SUFFIX = '.documents';

/**
 * Backfill variant unique claim columns: set the claim column to the attribute value
 * on the designated row (first row by id) per document_id.
 */
async function backfillVariantClaimColumns(
  db: Database,
  meta: Meta,
  tableName: string,
  claimColumnName: string,
  attrColumnName: string
): Promise<void> {
  const documentIdCol = (meta.attributes.documentId as any)?.columnName ?? 'document_id';
  const idCol = db.metadata.identifiers.ID_COLUMN;
  const knex = db.connection;

  const designatedIdsSubquery = knex
    .from(
      knex.raw(
        '(SELECT ??, ??, ROW_NUMBER() OVER (PARTITION BY ?? ORDER BY ??) AS rn FROM ??) AS x',
        [idCol, documentIdCol, documentIdCol, idCol, tableName]
      )
    )
    .select(idCol)
    .where('rn', 1);

  await knex(tableName)
    .update({ [claimColumnName]: knex.ref(attrColumnName) })
    .whereIn(idCol, designatedIdsSubquery);
}

/**
 * Backfill documents table: insert one row per document_id from the main table.
 * Picks one row per document (prefer published, then min id).
 */
async function backfillDocumentsTable(
  db: Database,
  mainMeta: Meta,
  docMeta: Meta,
  mainTableName: string,
  docTableName: string
): Promise<void> {
  const documentIdCol = (mainMeta.attributes.documentId as any)?.columnName ?? 'document_id';
  const idCol = db.metadata.identifiers.ID_COLUMN;
  const attrs = Object.keys(docMeta.attributes).filter((k) => k !== 'document_id');
  if (attrs.length === 0) return;

  const mainAttrCols = attrs.map((a) => (mainMeta.attributes[a] as any)?.columnName ?? a);
  const docAttrCols = attrs.map((a) => (docMeta.attributes[a] as any)?.columnName ?? a);
  const hasPublishedAt = mainMeta.attributes.publishedAt != null;

  const knex = db.connection;
  const publishedAtCol = (mainMeta.attributes.publishedAt as any)?.columnName ?? 'published_at';

  // Prefer published row per document; dialect-agnostic (no NULLS LAST)
  const orderByRaw = hasPublishedAt
    ? 'CASE WHEN ?? IS NOT NULL THEN 1 ELSE 0 END DESC, ?? DESC, ?? ASC'
    : '?? ASC';
  const orderByBindings = hasPublishedAt ? [publishedAtCol, publishedAtCol, idCol] : [idCol];

  const rows = await knex
    .from(
      knex.raw(
        `(SELECT *, ROW_NUMBER() OVER (PARTITION BY ?? ORDER BY ${orderByRaw}) AS rn FROM ??) AS sub`,
        [documentIdCol, ...orderByBindings, mainTableName]
      )
    )
    .select(documentIdCol, ...mainAttrCols)
    .where('rn', 1);
  if (rows.length === 0) return;

  const toInsert = rows.map((row: Record<string, unknown>) => {
    const docRow: Record<string, unknown> = {
      document_id: row[documentIdCol],
    };
    attrs.forEach((attr, i) => {
      docRow[docAttrCols[i]] = row[mainAttrCols[i]];
    });
    return docRow;
  });

  await knex(docTableName).insert(toInsert);
}

/**
 * After schema DDL, backfill data for new variant claim columns and new documents tables.
 * Call this from the schema provider after builder.updateSchema(diff).
 */
export async function backfillUniqueIndexes(db: Database, diff: SchemaDiff['diff']): Promise<void> {
  // 1. Variant claim columns on main tables
  for (const table of diff.tables.updated) {
    const meta = findMetaByTableName(db, table.name);
    if (!meta) continue;

    const claimAttrs = Object.entries(meta.attributes).filter(([key]) =>
      key.startsWith(VARIANT_CLAIM_ATTR_PREFIX)
    );
    if (claimAttrs.length === 0) continue;

    for (const [attrKey, attr] of claimAttrs) {
      const claimCol = (attr as any).columnName;
      if (!table.columns.added.some((c) => c.name === claimCol)) continue;

      const sourceAttr = attrKey.slice(VARIANT_CLAIM_ATTR_PREFIX.length);
      const sourceCol = (meta.attributes[sourceAttr] as any)?.columnName ?? sourceAttr;
      await backfillVariantClaimColumns(db, meta, table.name, claimCol, sourceCol);
    }
  }

  // 2. New documents tables (identify by meta.uid ending with .documents)
  for (const table of diff.tables.added) {
    const docMeta = findMetaByTableName(db, table.name);
    if (!docMeta || !docMeta.uid.endsWith(DOCUMENTS_UID_SUFFIX)) continue;

    const mainUid = docMeta.uid.slice(0, -DOCUMENTS_UID_SUFFIX.length);
    if (!db.metadata.has(mainUid)) continue;

    const mainMeta = db.metadata.get(mainUid);
    await backfillDocumentsTable(db, mainMeta, docMeta, mainMeta.tableName, table.name);
  }
}

function findMetaByTableName(db: Database, tableName: string): Meta | undefined {
  for (const meta of db.metadata.values()) {
    if (meta.tableName === tableName) return meta;
  }
  return undefined;
}
