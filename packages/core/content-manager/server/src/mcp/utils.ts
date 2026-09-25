import type { Modules, UID } from '@strapi/types';

import { formatDocumentWithMetadata } from '../controllers/utils/metadata';
import type { GetMetadataOptions } from '../services/document-metadata';
import { shapeRelationsForMcp } from './sanitizers/shape-relations';

/**
 * Converts a Strapi content-type UID into a safe MCP tool-name segment.
 * `api::article.article` → `article`; `api::writer.editor` → `writer_editor` (the api name and the
 * content-type name differ, so both are kept to stay unique within the api);
 * `plugin::i18n.locale` → `plugin-i18n_locale`.
 */
export const slugifyUidForMcpToolName = (uid: string): string => {
  const [namespace, modelName] = uid.split('::');
  const parts = modelName.split('.').map((part) => part.toLowerCase());

  if (namespace === 'api') {
    return parts[0] === parts[1] ? parts[0] : parts.join('_');
  }

  return `${namespace.toLowerCase()}-${parts.join('_')}`;
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
 * Note appended to `update`/`write` on a model without draft & publish.
 *
 * Both tools can reach a *create* on the server — `update_*` creates a missing locale
 * (`collection-handlers.ts`), and `write_*` is an upsert that creates on first write. Their
 * input schema is partial (REST/admin update parity) and is resolved per tool, before the
 * request, so it cannot know whether a given call will update an existing version or create
 * a new one. On a draft & publish model that create is a draft and omitted required fields
 * match the server. On a model without draft & publish the create is published immediately,
 * so the entity validator enforces required fields *after* this schema has accepted the
 * payload, and the failure surfaces as a tool result rather than a schema error.
 *
 * `tools/list` is the only thing an agent sees, so that late check is stated here rather
 * than only in `buildDataSchema`'s source comment — otherwise the advertised shape looks
 * uniformly lenient across both model kinds.
 */
const PUBLISHED_CREATE_VIA_UPDATE_NOTE =
  ' This content type has no draft & publish, so a write that creates (a new locale, or the' +
  ' first write of a single type) is published immediately: the server enforces required' +
  ' fields on that create even though this schema accepts them as optional.';

/**
 * Note appended to `update` on a localized model.
 *
 * When `update_*` creates a locale that does not exist yet, the Document Service copies the
 * document's non-localized (shared) attributes from an existing locale
 * (`document-service/repository.ts` → `copyNonLocalizedFields` →
 * `fillNonLocalizedAttributes`). That fill tests `isNil`, so it does not distinguish an
 * omitted key from an explicit `null`: a shared field this schema advertises as nullable is
 * refilled from the other locale rather than cleared.
 *
 * This is Document Service behaviour, not an MCP one — REST and the admin Content Manager
 * enter at the same seam and lose the clear identically, and the same `null` on an
 * *existing* locale is a real write on every surface. It is stated here only because the
 * advertised schema accepts `null`, so an agent would otherwise expect the clear to land.
 */
const LOCALIZED_NEW_LOCALE_FILL_NOTE =
  ' When this creates a locale that does not exist yet, non-localized (shared) fields are' +
  ' copied from an existing locale of the same document — including over an explicit null,' +
  ' so a shared field cannot be cleared in the same call that creates the locale. Clearing' +
  ' one on a locale that already exists works normally.';

/**
 * Generates the `title` and `description` metadata for a derived MCP tool.
 * Appends operation-specific notes for write/publish/unpublish/discard_draft operations,
 * on a model without draft & publish the late published-create note for update/write
 * (see `PUBLISHED_CREATE_VIA_UPDATE_NOTE`), and on a localized model the new-locale fill
 * note for update (see `LOCALIZED_NEW_LOCALE_FILL_NOTE`).
 */
export const describeTool = (params: {
  apiID: string;
  uid: string;
  operation: string;
  draftAndPublish?: boolean;
  localized?: boolean;
}): { title: string; description: string } => {
  const { apiID, uid, operation, draftAndPublish, localized } = params;
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

  const publishedCreateNote =
    draftAndPublish === false && (operation === 'update' || operation === 'write')
      ? PUBLISHED_CREATE_VIA_UPDATE_NOTE
      : '';

  // Only `update_*` reaches the new-locale create branch; `write_*` (single type) has no
  // per-locale create of this shape.
  const newLocaleFillNote =
    localized === true && operation === 'update' ? LOCALIZED_NEW_LOCALE_FILL_NOTE : '';

  return {
    title: `Content: ${apiID} — ${operation}`,
    description: `Content-manager ${operation} for ${uid}.${operationNoteByType[operation] ?? ''}${publishedCreateNote}${newLocaleFillNote}`,
  };
};
