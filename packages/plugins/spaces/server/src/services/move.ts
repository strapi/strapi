import type { Core, UID } from '@strapi/types';
import { errors } from '@strapi/utils';

import { RELEASE_ACTION_UID } from '../releases-integration';
import { getService } from '../utils';
import { getRequestSpace, runUnscoped } from '../utils/space-scope';
import { MESSAGES, WorkspaceAccessError, assertWritable } from './access';
import { isSharedContentType } from './content-types';

const { ApplicationError, NotFoundError, ValidationError } = errors;

interface MoveInput {
  uid: UID.ContentType;
  documentIds: string[];
  /** Target workspace slug, or `null` to share the entries with every workspace. */
  targetSpaceSlug: string | null;
}

interface MoveResult {
  movedCount: number;
  targetSpaceId: number | null;
  documentIds: string[];
}

interface SourceRow {
  id: number;
  documentId: string;
  locale?: string;
  spaceOverride?: boolean;
  space?: { id: number } | null;
}

/**
 * Moves N entries of a content type to another workspace, or shares them
 * (`targetSpaceSlug: null` → `space_id = NULL`, visible read-only everywhere).
 *
 * Validation order:
 *  1. CT must exist and carry a workspace; content types whose entries are all
 *     shared (`sharedEntries`) have nothing to move.
 *  2. Target workspace must exist, be active and be in the CT's `visibleIn`
 *     binding (empty = every workspace). Sharing skips this step.
 *  3. Source rows are looked up across every workspace. A sub-workspace caller
 *     may only move its own rows and may not share (sharing is a default-only
 *     decision); the default workspace and headerless callers may move anything.
 *  4. For localized CTs every locale carried by the source rows must be
 *     available in the target workspace (a move must not orphan a translation).
 *
 * Update strategy: one bulk `updateMany` on the `space_id` join column, under
 * `runUnscoped` so neither the read net nor the write net interferes.
 * Components and dynamic-zone rows follow their parent through its link table.
 */
export const moveToSpace = async (
  strapi: Core.Strapi,
  { uid, documentIds, targetSpaceSlug }: MoveInput
): Promise<MoveResult> => {
  if (!Array.isArray(documentIds) || documentIds.length === 0) {
    throw new ValidationError('At least one documentId is required');
  }

  const contentType = strapi.contentTypes[uid];
  if (!contentType) {
    throw new NotFoundError(`Unknown content type: ${uid}`);
  }

  const { isSpaceScopedContentType } = getService('content-types');
  if (!isSpaceScopedContentType(contentType)) {
    throw new ValidationError(`${uid} is not space-scoped; moving between spaces is a no-op.`);
  }
  if (isSharedContentType(contentType)) {
    throw new WorkspaceAccessError(
      `Entries of ${uid} are shared with every workspace and cannot be moved.`,
      { reason: 'shared-content-type' }
    );
  }

  const request = getRequestSpace(strapi);
  const isSharing = targetSpaceSlug === null;

  if (isSharing && request && !request.isDefault) {
    throw new WorkspaceAccessError(MESSAGES['default-only'], { reason: 'default-only' });
  }

  let targetSpaceId: number | null = null;
  if (!isSharing) {
    const targetSpace = await getService('spaces').getBySlug(targetSpaceSlug);
    if (!targetSpace || targetSpace.status !== 'active') {
      throw new NotFoundError(`Unknown or inactive space: ${targetSpaceSlug}`);
    }
    if (!getService('visibility').isCTVisibleInSpace(contentType, targetSpaceSlug)) {
      throw new ApplicationError(
        `${uid} is not visible in space "${targetSpaceSlug}". Add the space to the CT's visibleIn binding first.`
      );
    }
    targetSpaceId = targetSpace.id;
  }

  const isLocalizedCT =
    !!strapi.plugin('i18n') && (contentType as any).pluginOptions?.i18n?.localized === true;

  /**
   * Every row of every requested document, wherever it lives (`runUnscoped`:
   * the read net would otherwise narrow the lookup to the caller's workspace).
   *
   * Copies of inherited entries are left out: they share the documentId of the
   * entry being moved but are a different workspace's local version of it, and
   * moving the original must not drag them along. What happens to them once the
   * original stops being inherited is decided further down.
   */
  const rows = (
    (await runUnscoped(() =>
      strapi.db.query(uid).findMany({
        where: { documentId: { $in: documentIds } },
        select: isLocalizedCT
          ? ['id', 'documentId', 'locale', 'spaceOverride']
          : ['id', 'documentId', 'spaceOverride'],
        populate: { space: { select: ['id'] } },
      })
    )) as SourceRow[]
  ).filter((row) => row.spaceOverride !== true);

  if (rows.length === 0) {
    return { movedCount: 0, targetSpaceId, documentIds };
  }

  // A sub-workspace may only move what it may edit: its own rows. Shared rows
  // are refused (403), other workspaces' rows are invisible (404).
  for (const row of rows) {
    assertWritable({ model: contentType, request, entrySpaceId: row.space?.id ?? null });
  }

  if (isLocalizedCT && !isSharing) {
    const sourceLocales = [
      ...new Set(
        rows.map((r) => r.locale).filter((c): c is string => typeof c === 'string' && c.length > 0)
      ),
    ];
    if (sourceLocales.length > 0) {
      // A locale is visible in the target workspace when its `spaces` M2M lists
      // the target, or is empty (= platform-wide). Raw `db.query` on purpose:
      // the request-scoped service patch keys on the caller's workspace.
      const availableInTarget = await strapi.db.query('plugin::i18n.locale').findMany({
        where: {
          code: { $in: sourceLocales },
          $or: [
            { spaces: { slug: targetSpaceSlug } },
            { spaces: { id: { $null: true } } }, // no linked spaces → platform-wide
          ],
        },
        select: ['code'],
      });
      const availableCodes = new Set(availableInTarget.map((l: { code: string }) => l.code));
      const missing = sourceLocales.filter((code) => !availableCodes.has(code));
      if (missing.length > 0) {
        throw new ApplicationError(
          `Cannot move: target space "${targetSpaceSlug}" does not support locale(s) ${missing
            .map((c) => `"${c}"`)
            .join(', ')}. Add the locale to that space first, or remove the affected entries.`
        );
      }
    }
  }

  /**
   * A workspace that overrode one of these entries holds a copy under the same
   * documentId. Moving the original into that workspace would put two rows of
   * one document there — refuse, and say which workspace to clear first.
   */
  const movedDocumentIdsForCheck = [...new Set(rows.map((r) => r.documentId))];
  if (targetSpaceId !== null) {
    const overriding = await getService('inheritance').overridingSpaceIds(
      uid,
      movedDocumentIdsForCheck
    );
    if (overriding.includes(targetSpaceId)) {
      throw new ApplicationError(
        `Workspace "${targetSpaceSlug}" has its own copy of one of these entries. Reset it there first, then move.`
      );
    }
  }

  // One bulk UPDATE inside a transaction. `updateMany` is safe for this
  // relation because `space` is a join-column FK (`useJoinTable: false` in
  // register.ts): the entity manager's `processData` maps `data.space`
  // straight onto the `space_id` column.
  const rowIds = rows.map((row) => row.id);
  await runUnscoped(() =>
    strapi.db.transaction(async () => {
      await strapi.db.query(uid).updateMany({
        where: { id: { $in: rowIds } },
        data: { space: targetSpaceId },
      });
    })
  );

  const movedDocumentIds = [...new Set(rows.map((r) => r.documentId))];

  /**
   * The entry has stopped being inherited: whatever copies other workspaces
   * took of it have nothing left to follow, so they become entries of their own.
   */
  if (targetSpaceId !== null) {
    await getService('inheritance').promoteOverrides(uid, movedDocumentIds);
  }

  // Release actions follow the entries they target.
  const releaseActionModel =
    strapi.contentTypes[RELEASE_ACTION_UID as keyof typeof strapi.contentTypes];
  if (releaseActionModel?.attributes?.space) {
    await runUnscoped(() =>
      strapi.db.query(RELEASE_ACTION_UID as never).updateMany({
        where: { contentType: uid, entryDocumentId: { $in: movedDocumentIds } },
        data: { space: targetSpaceId },
      })
    );
  }

  return {
    movedCount: rows.length,
    targetSpaceId,
    documentIds: movedDocumentIds,
  };
};

const moveService = ({ strapi }: { strapi: Core.Strapi }) => ({
  moveToSpace: (input: MoveInput) => moveToSpace(strapi, input),
});

type MoveService = typeof moveService;

export default moveService;
export { MoveService };
export type { MoveInput, MoveResult };
