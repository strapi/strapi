import type { Core, Modules, UID } from '@strapi/types';

import { getService } from '../utils';
import { formatDocumentWithMetadata } from '../controllers/utils/metadata';
import type { GetMetadataOptions } from '../services/document-metadata';
import { shapeRelationsForMcp } from './sanitizers/shape-relations';
import type { ShapeRelationsOptions, InlineRelationResolver } from './sanitizers/shape-relations';

/**
 * Converts a Strapi content-type UID into a safe MCP tool-name segment.
 * `api::article.article` → `article`; `plugin::i18n.locale` → `plugin-i18n_locale`.
 */
export const slugifyUidForMcpToolName = (uid: string): string => {
  const [namespace, modelName] = uid.split('::');
  const parts = modelName.split('.').map((part) => part.toLowerCase());

  if (namespace === 'api') {
    return parts[0];
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
  opts?: GetMetadataOptions,
  inlineOptions?: ShapeRelationsOptions
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

  const shapedData = await shapeRelationsForMcp(
    uid,
    formatted.data as Record<string, unknown>,
    inlineOptions
  );
  return { ...formatted, data: shapedData };
};

// ---------------------------------------------------------------------------
// Relation inlining (opt-in via `populate`) — RBAC-safe
// ---------------------------------------------------------------------------

type InlinePermissionChecker = {
  cannot: { read: (entity?: unknown) => boolean };
  sanitizeOutput: (doc: unknown) => Promise<Record<string, unknown>>;
};

/**
 * Builds an {@link InlineRelationResolver} that sanitizes each inlined related entry
 * against the RELATED content type's own read permissions. Per-request memoized by
 * target UID. Returns `null` (→ identity stub) when the caller cannot read the target
 * type/entry, or when the target is an admin user (out of scope).
 */
export const createInlineRelationResolver = (
  context: Modules.MCP.McpHandlerContext
): InlineRelationResolver => {
  const cache = new Map<string, InlinePermissionChecker | null>();

  return async (targetUid, entry) => {
    if (targetUid === 'admin::user') {
      return null;
    }

    let checker = cache.get(targetUid);
    if (checker === undefined) {
      try {
        checker = getService('permission-checker').create({
          userAbility: context.userAbility,
          model: targetUid,
        }) as InlinePermissionChecker;
      } catch {
        checker = null;
      }
      cache.set(targetUid, checker);
    }

    if (checker === null) {
      return null;
    }

    // Type-level then entity-level read check — mirrors HTTP controller behavior.
    if (checker.cannot.read() === true || checker.cannot.read(entry) === true) {
      return null;
    }

    return checker.sanitizeOutput(entry);
  };
};

/**
 * Builds the {@link ShapeRelationsOptions} for a read handler, or `undefined` when no
 * relations were opted into inlining (preserving the default identity-stub behavior).
 */
export const buildInlineOptions = (
  inlineRelationKeys: Set<string>,
  context: Modules.MCP.McpHandlerContext
): ShapeRelationsOptions | undefined => {
  if (inlineRelationKeys.size === 0) {
    return undefined;
  }
  return {
    inlineRelationKeys,
    inlineRelation: createInlineRelationResolver(context),
  };
};

// ---------------------------------------------------------------------------
// Response-size guard
// ---------------------------------------------------------------------------

/** Default MCP read-tool response budget (1 MB). Overridable via `server.mcp.maxResponseBytes`. */
export const MCP_DEFAULT_MAX_RESPONSE_BYTES = 1_000_000;

/** Resolves the configured response budget in bytes. Values <= 0 disable the guard. */
export const getMaxResponseBytes = (strapi: Core.Strapi): number =>
  strapi.config.get('server.mcp.maxResponseBytes', MCP_DEFAULT_MAX_RESPONSE_BYTES);

/**
 * Enforces the response-size budget. When `structuredContent` serializes within budget it
 * is returned unchanged; otherwise `buildTruncated(notice)` is invoked to produce a small,
 * schema-valid payload carrying a `truncated` flag and a clear notice — so deep fetches
 * degrade gracefully instead of crashing the MCP transport.
 */
export const enforceResponseBudget = (
  structuredContent: Record<string, unknown>,
  maxBytes: number,
  buildTruncated: (notice: string) => Record<string, unknown>
): Record<string, unknown> => {
  if (maxBytes <= 0) {
    return structuredContent;
  }

  const size = Buffer.byteLength(JSON.stringify(structuredContent), 'utf8');
  if (size <= maxBytes) {
    return structuredContent;
  }

  const notice =
    `Response (${size} bytes) exceeded the ${maxBytes}-byte MCP limit and was truncated. ` +
    `Narrow "populate"/"fields", lower "maxDepth", or reduce "pageSize" to retrieve the data.`;

  return buildTruncated(notice);
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
    list:
      ' Relations are returned as { documentId } stubs by default; nested sub-fields inside' +
      ' components/relations may be omitted (absent, not null) at the shallow default depth.' +
      ' Use "fields" to pick scalar fields, "populate" to inline directly-related entries' +
      ' (RBAC-checked against the related type), and "maxDepth" to control auto-populate depth.' +
      ' "filters" supports logical/field operators and one-level-deep relation/component fields.',
    get:
      ' Relations are returned as { documentId } stubs by default. Use "populate" to inline' +
      ' directly-related entries (RBAC-checked against the related type), "fields" to pick' +
      ' scalar fields, and "maxDepth" to bound auto-populate depth on large nested documents.',
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
