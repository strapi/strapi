import type { Core } from '@strapi/types';

import { isSpaceScopedContentType } from '../services/content-types';
import { resolvePlacement } from '../services/access';
import { resolveReadScope, runUnscoped } from './space-scope';

/**
 * The workspace of an entry identified by content type, document id and
 * locale, read across every workspace (`null` = inherited by all, unscoped
 * type, or not found). Used to stamp the rows that reference entries: release
 * actions, history versions.
 *
 * Read unscoped, so it must resolve the same ambiguity the read net does: an
 * inherited document that a workspace has overridden exists twice under one
 * documentId, and "the entry" is whichever of the two the writer is working on.
 * The scope in force says which — the document-service middleware has already
 * entered the entry's workspace by the time these lifecycles run.
 */
export const lookupEntrySpaceId = async (
  strapi: Core.Strapi,
  contentType: string | undefined,
  documentId: string | undefined,
  locale: string | null | undefined
): Promise<number | null> => {
  if (!contentType || !documentId) {
    return null;
  }
  const model = strapi.contentTypes[contentType as keyof typeof strapi.contentTypes];
  if (!model || !isSpaceScopedContentType(model)) {
    return null;
  }

  // Resolved before unscoping, which would answer `unscoped` for everything.
  const scope = resolveReadScope(strapi);
  const preferred = scope.kind === 'space' ? scope.id : undefined;

  const rows = (await runUnscoped(() =>
    strapi.db.query(contentType as never).findMany({
      where: { documentId, ...(locale ? { locale } : {}) },
      select: ['id', 'spaceOverride'],
      populate: { space: { select: ['id'] } },
    })
  )) as Array<{ space?: { id: number } | null; spaceOverride?: boolean }>;

  const placement = resolvePlacement(
    rows.map((row) => ({
      spaceId: row.space?.id ?? null,
      isOverride: row.spaceOverride === true,
    })),
    preferred
  );

  return placement?.spaceId ?? null;
};
