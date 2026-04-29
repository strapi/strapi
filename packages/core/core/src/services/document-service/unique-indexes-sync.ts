import type { UID } from '@strapi/types';

const VARIANT_CLAIM_ATTR_PREFIX = '__uniqueVariantClaim_';
const DOCUMENTS_UID_SUFFIX = '.documents';

type UniqueConfig = {
  hasGlobal: boolean;
  variantAttrs: string[];
  globalAttrs: string[];
};

function getUniqueConfigFromIndexes(
  indexes: Array<{ type?: string; attributes?: string[]; scope?: string }>
): UniqueConfig {
  const variantAttrs = new Set<string>();
  const globalAttrs = new Set<string>();
  for (const index of indexes ?? []) {
    if (
      index.type === 'unique' &&
      Array.isArray(index.attributes) &&
      index.attributes.length === 1
    ) {
      const scope = index.scope === 'global' ? 'global' : 'variant';
      const attr = index.attributes[0];
      if (scope === 'global') globalAttrs.add(attr);
      else variantAttrs.add(attr);
    }
  }
  return {
    hasGlobal: globalAttrs.size > 0,
    variantAttrs: [...variantAttrs],
    globalAttrs: [...globalAttrs],
  };
}

function isDesignatedRow(
  strapi: any,
  uid: string,
  doc: { locale?: string; documentId?: string }
): boolean {
  const contentType = strapi.contentType(uid);
  const i18nService = strapi.plugin('i18n')?.service('content-types');
  const isLocalized = i18nService?.isLocalizedContentType(contentType) ?? false;
  if (!isLocalized) return true;
  const defaultLocale = strapi.plugin('i18n')?.service('locales')?.getDefaultLocale?.();
  if (!defaultLocale) return true;
  return doc.locale === defaultLocale;
}

/**
 * Returns variant claim attribute key-value pairs to merge into create/update data
 * so the claim is written in the same query. Only for designated row (e.g. default locale).
 */
export function getVariantClaimDataForPayload(
  strapi: any,
  uid: UID.ContentType,
  data: Record<string, unknown>
): Record<string, unknown> {
  const contentType = strapi.contentType(uid);
  const config = getUniqueConfigFromIndexes((contentType as any).indexes ?? []);
  if (config.hasGlobal || config.variantAttrs.length === 0) return {};
  if (!isDesignatedRow(strapi, uid, data as any)) return {};

  const claimData: Record<string, unknown> = {};
  for (const attr of config.variantAttrs) {
    const claimKey = `${VARIANT_CLAIM_ATTR_PREFIX}${attr}`;
    claimData[claimKey] = data[attr] ?? null;
  }
  return claimData;
}

function getDocumentsTableName(strapi: any, uid: string): string | null {
  const docUid = `${uid}${DOCUMENTS_UID_SUFFIX}`;
  if (!strapi.db.metadata.has(docUid)) return null;
  return strapi.db.metadata.get(docUid).tableName;
}

/**
 * Parses a DB unique constraint error and returns the content-type attribute name
 * so the frontend can show "This attribute must be unique" on the right field.
 * Supports SQLite ("UNIQUE constraint failed: table.column"), Postgres and MySQL patterns.
 */
export function parseUniqueConstraintError(
  strapi: any,
  uid: UID.ContentType,
  error: unknown
): { attributeName: string } | null {
  const message = error instanceof Error ? error.message : String(error);
  if (!message || typeof message !== 'string') return null;

  // SQLite: "UNIQUE constraint failed: articles_documents.canonical_path"
  const sqliteMatch = message.match(/UNIQUE constraint failed:\s*(\S+)/);
  // Postgres: "duplicate key value violates unique constraint" often includes column in detail
  // MySQL: "Duplicate entry ... for key" - column may be in message
  const genericMatch = message.match(/unique constraint|duplicate entry|duplicate key/i);
  let columnName: string | null = null;
  let tableName: string | null = null;

  if (sqliteMatch) {
    const tableDotColumn = sqliteMatch[1];
    const lastDot = tableDotColumn.lastIndexOf('.');
    tableName = lastDot >= 0 ? tableDotColumn.slice(0, lastDot) : null;
    columnName = lastDot >= 0 ? tableDotColumn.slice(lastDot + 1) : tableDotColumn;
  }
  if (!columnName && genericMatch) {
    // Try to extract column from message, e.g. " ... column \"canonical_path\" ..." or " ... 'canonical_path' ..."
    const quoted = message.match(/["']([a-z_][a-z0-9_]*)["']/i);
    if (quoted) columnName = quoted[1];
  }
  if (!columnName) return null;

  const mainMeta = strapi.db.metadata.get(uid);
  const mainTableName = mainMeta?.tableName;
  const docTableName = getDocumentsTableName(strapi, uid);

  // Documents table: map column to attribute via documents model meta
  if (tableName && docTableName && tableName === docTableName) {
    const docUid = `${uid}${DOCUMENTS_UID_SUFFIX}`;
    const docMeta = strapi.db.metadata.get(docUid);
    if (docMeta?.attributes) {
      for (const [attrName, attr] of Object.entries(docMeta.attributes)) {
        const col = (attr as any)?.columnName ?? attrName;
        if (col === columnName) return { attributeName: attrName };
      }
    }
    return null;
  }

  // Main table: variant claim column (e.g. slug_unique_variant_claim -> slug) or direct column
  if (tableName && mainTableName && tableName === mainTableName && mainMeta?.attributes) {
    for (const [attrName, attr] of Object.entries(mainMeta.attributes)) {
      const col = (attr as any)?.columnName ?? attrName;
      if (col === columnName) {
        const attributeName = attrName.startsWith(VARIANT_CLAIM_ATTR_PREFIX)
          ? attrName.slice(VARIANT_CLAIM_ATTR_PREFIX.length)
          : attrName;
        return { attributeName };
      }
    }
  }

  // If we only have column name (e.g. from generic match), try documents then main
  if (!tableName) {
    const docUid = `${uid}${DOCUMENTS_UID_SUFFIX}`;
    if (strapi.db.metadata.has(docUid)) {
      const docMeta = strapi.db.metadata.get(docUid);
      for (const [attrName, attr] of Object.entries(docMeta.attributes)) {
        const col = (attr as any)?.columnName ?? attrName;
        if (col === columnName) return { attributeName: attrName };
      }
    }
    if (mainMeta?.attributes) {
      for (const [attrName, attr] of Object.entries(mainMeta.attributes)) {
        if (attrName.startsWith(VARIANT_CLAIM_ATTR_PREFIX)) {
          const attrCol = (mainMeta.attributes[attrName] as any)?.columnName;
          if (attrCol === columnName) {
            return { attributeName: attrName.slice(VARIANT_CLAIM_ATTR_PREFIX.length) };
          }
        }
        const col = (attr as any)?.columnName ?? attrName;
        if (col === columnName) return { attributeName: attrName };
      }
    }
  }

  return null;
}

/**
 * Check if a single attribute value is "available" for publish (not taken by another document).
 * Used for the "Available" / "Unavailable" badge in the UI. Exclude current document when editing.
 */
export async function checkUniqueAttributeAvailability(
  strapi: any,
  uid: UID.ContentType,
  attributeName: string,
  value: unknown,
  options: { documentId?: string; locale?: string } = {}
): Promise<boolean> {
  if (value == null || value === '') return true;
  const contentType = strapi.contentType(uid);
  const config = getUniqueConfigFromIndexes((contentType as any).indexes ?? []);
  const isVariant = config.variantAttrs.includes(attributeName);
  const isGlobal = config.globalAttrs.includes(attributeName);
  if (!isVariant && !isGlobal) return true;

  const meta = strapi.db.metadata.get(uid);
  const mainDocumentIdCol = (meta.attributes.documentId as any)?.columnName ?? 'document_id';

  if (isVariant) {
    const claimKey = `${VARIANT_CLAIM_ATTR_PREFIX}${attributeName}`;
    const columnName = (meta.attributes[claimKey] as any)?.columnName ?? claimKey;
    let q = strapi.db.connection(meta.tableName).select(columnName).where(columnName, value);
    if (options.documentId) {
      q = q.whereNot(mainDocumentIdCol, options.documentId);
    }
    const rows = await q.limit(1);
    return rows.length === 0;
  }

  const tableName = getDocumentsTableName(strapi, uid);
  if (!tableName) return true;
  const docMeta = strapi.db.metadata.get(`${uid}${DOCUMENTS_UID_SUFFIX}`);
  const docDocumentIdCol = (docMeta.attributes.document_id as any)?.columnName ?? 'document_id';
  const columnName = (docMeta.attributes[attributeName] as any)?.columnName ?? attributeName;
  let q = strapi.db.connection(tableName).select(docDocumentIdCol).where(columnName, value);
  if (options.documentId) {
    q = q.whereNot(docDocumentIdCol, options.documentId);
  }
  const rows = await q.limit(1);
  return rows.length === 0;
}

/**
 * Check all variant unique (claim) columns and return attribute names that are already taken.
 * Only checks when data represents the designated row (e.g. default locale).
 */
export async function validateVariantClaimUniques(
  strapi: any,
  uid: UID.ContentType,
  data: Record<string, unknown>,
  options: { excludeId?: number } = {}
): Promise<string[]> {
  const contentType = strapi.contentType(uid);
  const config = getUniqueConfigFromIndexes((contentType as any).indexes ?? []);
  if (config.hasGlobal || config.variantAttrs.length === 0) return [];
  if (!isDesignatedRow(strapi, uid, data as any)) return [];

  const meta = strapi.db.metadata.get(uid);
  const idCol = strapi.db.metadata.identifiers?.ID_COLUMN ?? 'id';
  const conflicting: string[] = [];

  for (const attr of config.variantAttrs) {
    const value = data[attr];
    if (value != null && value !== '') {
      const claimKey = `${VARIANT_CLAIM_ATTR_PREFIX}${attr}`;
      const columnName = (meta.attributes[claimKey] as any)?.columnName ?? claimKey;
      let q = strapi.db.connection(meta.tableName).select(idCol).where(columnName, value);
      if (options.excludeId != null) {
        q = q.whereNot(idCol, options.excludeId);
      }
      const rows = await q.limit(1);
      if (rows.length > 0) conflicting.push(attr);
    }
  }
  return conflicting;
}

/**
 * Check all global unique columns in the documents table and return attribute names that are already taken.
 */
export async function validateDocumentsTableUniques(
  strapi: any,
  uid: UID.ContentType,
  data: Record<string, unknown>,
  options: { excludeDocumentId?: string } = {}
): Promise<string[]> {
  const tableName = getDocumentsTableName(strapi, uid);
  if (!tableName) return [];

  const contentType = strapi.contentType(uid);
  const config = getUniqueConfigFromIndexes((contentType as any).indexes ?? []);
  if (!config.hasGlobal) return [];

  const docMeta = strapi.db.metadata.get(`${uid}${DOCUMENTS_UID_SUFFIX}`);
  const docDocumentIdCol = (docMeta.attributes.document_id as any)?.columnName ?? 'document_id';
  const conflicting: string[] = [];

  for (const attr of config.globalAttrs) {
    const value = data[attr];
    if (value != null && value !== '') {
      const columnName = (docMeta.attributes[attr] as any)?.columnName ?? attr;
      let q = strapi.db.connection(tableName).select(docDocumentIdCol).where(columnName, value);
      if (options.excludeDocumentId) {
        q = q.whereNot(docDocumentIdCol, options.excludeDocumentId);
      }
      const rows = await q.limit(1);
      if (rows.length > 0) conflicting.push(attr);
    }
  }
  return conflicting;
}

/**
 * Sync documents table after publish: upsert one row per document with published values.
 * Uses current transaction when inside one (getTransaction) to avoid connection pool stall;
 * otherwise uses raw connection.
 */
export async function syncDocumentsTableAfterPublish(
  strapi: any,
  uid: UID.ContentType,
  publishedDoc: Record<string, unknown>
): Promise<void> {
  const tableName = getDocumentsTableName(strapi, uid);
  if (!tableName) return;

  const contentType = strapi.contentType(uid);
  const config = getUniqueConfigFromIndexes((contentType as any).indexes ?? []);
  if (!config.hasGlobal) return;

  const meta = strapi.db.metadata.get(uid);
  const docMeta = strapi.db.metadata.get(`${uid}${DOCUMENTS_UID_SUFFIX}`);
  const documentIdCol = (meta.attributes.documentId as any)?.columnName ?? 'document_id';
  const docDocumentIdCol = (docMeta.attributes.document_id as any)?.columnName ?? 'document_id';
  const attrs = [...new Set([...config.variantAttrs, ...config.globalAttrs])];
  const docAttrCols = attrs.map((a) => (docMeta.attributes[a] as any)?.columnName ?? a);

  const row: Record<string, unknown> = {
    [docDocumentIdCol]: publishedDoc.documentId ?? (publishedDoc as any)[documentIdCol],
  };
  attrs.forEach((attr, i) => {
    row[docAttrCols[i]] = publishedDoc[attr] ?? null;
  });

  const trx = strapi.db.getTransaction?.();
  let q = strapi.db
    .connection(tableName)
    .insert(row)
    .onConflict(docDocumentIdCol)
    .merge(docAttrCols);
  if (trx) q = q.transacting(trx);
  await q;
}

/**
 * Sync documents table after unpublish: set published columns to null.
 * Uses current transaction when inside one to avoid connection pool stall.
 */
export async function syncDocumentsTableAfterUnpublish(
  strapi: any,
  uid: UID.ContentType,
  documentId: string
): Promise<void> {
  const tableName = getDocumentsTableName(strapi, uid);
  if (!tableName) return;

  const docMeta = strapi.db.metadata.get(`${uid}${DOCUMENTS_UID_SUFFIX}`);
  const docDocumentIdCol = (docMeta.attributes.document_id as any)?.columnName ?? 'document_id';
  const attrs = Object.keys(docMeta.attributes).filter((k) => k !== 'document_id');
  const nullRow: Record<string, unknown> = {};
  for (const a of attrs) {
    nullRow[(docMeta.attributes[a] as any)?.columnName ?? a] = null;
  }
  const trx = strapi.db.getTransaction?.();
  let q = strapi.db.connection(tableName).where(docDocumentIdCol, documentId).update(nullRow);
  if (trx) q = q.transacting(trx);
  await q;
}

/**
 * Sync documents table after update of a published row.
 * Uses current transaction when inside one to avoid connection pool stall.
 */
export async function syncDocumentsTableAfterUpdate(
  strapi: any,
  uid: UID.ContentType,
  updatedDoc: Record<string, unknown>,
  isPublished: boolean
): Promise<void> {
  if (!isPublished) return;
  const tableName = getDocumentsTableName(strapi, uid);
  if (!tableName) return;

  const config = getUniqueConfigFromIndexes((strapi.contentType(uid) as any).indexes ?? []);
  if (!config.hasGlobal) return;

  const docMeta = strapi.db.metadata.get(`${uid}${DOCUMENTS_UID_SUFFIX}`);
  const attrs = [...new Set([...config.variantAttrs, ...config.globalAttrs])];
  const docAttrCols = attrs.map((a) => (docMeta.attributes[a] as any)?.columnName ?? a);

  const updateRow: Record<string, unknown> = {};
  attrs.forEach((attr, i) => {
    updateRow[docAttrCols[i]] = updatedDoc[attr] ?? null;
  });
  if (Object.keys(updateRow).length === 0) return;

  const docDocumentIdCol = (docMeta.attributes.document_id as any)?.columnName ?? 'document_id';
  const documentId = updatedDoc.documentId ?? (updatedDoc as any).document_id;
  const trx = strapi.db.getTransaction?.();
  let q = strapi.db.connection(tableName).where(docDocumentIdCol, documentId).update(updateRow);
  if (trx) q = q.transacting(trx);
  await q;
}
