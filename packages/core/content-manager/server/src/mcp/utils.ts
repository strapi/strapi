import type { Modules, UID } from '@strapi/types';

import { formatDocumentWithMetadata } from '../controllers/utils/metadata';
import type { GetMetadataOptions } from '../services/document-metadata';
import { shapeRelationsForMcp } from './sanitizers/shape-relations';

/**
 * Converts a Strapi content-type UID into a safe MCP tool-name segment.
 * `api::article.article` → `article`; `plugin::i18n.locale` → `plugin-i18n_locale`.
 */
export const slugifyUidForMcpToolName = (uid: string): string => {
  const [namespace, modelName] = uid.split('::');
  const modelNameParts = modelName.split('.').map((part) => part.toLowerCase());
  if (namespace === 'api') {
    return `${modelNameParts[0]}`;
  }
  return `${namespace.toLowerCase()}_${modelNameParts[0]}`;
};

type McpPermissionChecker = {
  sanitizeOutput: (doc: unknown) => Promise<Record<string, unknown>>;
};

/**
 * Output chokepoint for MCP handlers returning `{ data, meta }`.
 * Order matters — calculate, then strip:
 * 1. permission-based sanitization,
 * 2. formatDocumentWithMetadata — computes `data.status` and `localizations[].status`
 *    from `publishedAt`/`updatedAt`, which relation shaping removes,
 * 3. relation shaping on the formatted `data` (identity-only relations; the
 *    freshly-computed `localizations[].status` survives via RelationIdentity).
 *
 * Handlers that do NOT attach metadata (delete, list) compose
 * `permissionChecker.sanitizeOutput` + `shapeRelationsForMcp` directly instead.
 */
export const sanitizeFormatShape = async (
  permissionChecker: McpPermissionChecker,
  uid: UID.ContentType,
  doc: unknown,
  opts?: GetMetadataOptions
): Promise<Record<string, unknown>> => {
  const sanitized = await permissionChecker.sanitizeOutput(doc);
  const formatted = await formatDocumentWithMetadata(
    permissionChecker,
    uid,
    sanitized as unknown as Parameters<typeof formatDocumentWithMetadata>[2],
    opts
  );

  if (formatted.data === null || formatted.data === undefined) {
    return formatted;
  }

  const shapedData = await shapeRelationsForMcp(uid, formatted.data as Record<string, unknown>);
  return { ...formatted, data: shapedData };
};

/** Wraps a plain object into the dual-representation MCP tool return value (text + structuredContent). */
export const ok = (
  structuredContent: Record<string, unknown>
): Modules.MCP.McpToolHandlerReturn => ({
  content: [{ type: 'text', text: JSON.stringify(structuredContent) }],
  structuredContent,
});

/**
 * Generates the `title` and `description` metadata for a derived MCP tool.
 * Appends operation-specific notes for write/publish/unpublish/discard_draft operations.
 */
export const describeTool = (params: {
  apiID: string;
  uid: string;
  operation: string;
}): { title: string; description: string } => {
  const { apiID, uid, operation } = params;
  const operationNoteByType: Partial<Record<string, string>> = {
    write:
      ' Creates or updates the single-type document. If no document exists, creates one; otherwise updates the existing draft.',
    publish:
      ' Operates on an existing document by documentId and may return a different numeric id for the published version row.',
    unpublish:
      ' Operates on an existing document by documentId and may return a different numeric id for the draft version row.',
    discard_draft:
      ' Operates on an existing document by documentId; treat documentId as the stable identity.',
  };

  return {
    title: `Content: ${apiID} — ${operation}`,
    description: `Content-manager ${operation} for ${uid}.${operationNoteByType[operation] ?? ''}`,
  };
};
