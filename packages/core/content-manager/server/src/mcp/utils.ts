import type { Modules } from '@strapi/types';
import type { ExplorerAuth } from './types';

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

/** Builds the static auth descriptor used to gate a derived MCP tool by RBAC action + subject. */
export const authFor = (uid: string, action: string): ExplorerAuth => ({
  action,
  subject: uid,
});
