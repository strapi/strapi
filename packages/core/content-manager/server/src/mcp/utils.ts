import type { Modules, UID } from '@strapi/types';

import { getService } from '../utils';
import { formatDocumentWithMetadata } from '../controllers/utils/metadata';
import type { GetMetadataOptions } from '../services/document-metadata';
import { shapeRelationsForMcp } from './sanitizers/shape-relations';
import type { ShapeRelationsOptions, InlineRelationResolver } from './sanitizers/shape-relations';
import type { InlinePathMatcher } from './schemas/query-schema';

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
 * Builds the {@link ShapeRelationsOptions} for a read handler from a populate-derived
 * inline-path matcher, or `undefined` when nothing was opted into inlining (preserving the
 * default identity-stub behavior).
 */
export const buildInlineOptions = (
  matcher: InlinePathMatcher,
  context: Modules.MCP.McpHandlerContext
): ShapeRelationsOptions | undefined => {
  if (matcher.hasAny === false) {
    return undefined;
  }
  return {
    shouldInline: matcher.shouldInline,
    inlineRelation: createInlineRelationResolver(context),
  };
};

// ---------------------------------------------------------------------------
// Explicit populate composition
// ---------------------------------------------------------------------------

/**
 * Composes a sanitized, caller-provided `populate` value (querystring notation: `"*"`,
 * `string[]`, or an object) with a fixed override (e.g. the localizations restriction),
 * so explicit populate reaches the Document Service unchanged instead of being dropped.
 * The override always wins for overlapping keys.
 */
export const composePopulate = (populate: unknown, override: Record<string, unknown>): unknown => {
  if (Object.keys(override).length === 0) {
    return populate;
  }
  if (populate === undefined) {
    return override;
  }
  if (populate === '*') {
    return { '*': true, ...override };
  }
  if (Array.isArray(populate)) {
    return { ...Object.fromEntries(populate.map((key) => [key, true])), ...override };
  }
  if (typeof populate === 'object' && populate !== null) {
    return { ...(populate as Record<string, unknown>), ...override };
  }
  return populate;
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
      ' Use "fields" to pick scalar fields and "populate" to inline related entries as deep as' +
      ' the spec asks (each RBAC-checked against its related type). "filters" supports' +
      ' logical/field operators and one-level-deep component fields.',
    get:
      ' Relations are returned as { documentId } stubs by default. Use "populate" to inline' +
      ' related entries as deep as the spec asks (e.g. { author: { populate: ["avatar"] } }' +
      ' inlines author and author.avatar; each RBAC-checked against its related type) and' +
      ' "fields" to pick scalar fields.',
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
