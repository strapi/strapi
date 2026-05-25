import type { Core, UID } from '@strapi/types';
import { errors } from '@strapi/utils';

import { getService } from '../utils';

const { ApplicationError, NotFoundError, ValidationError } = errors;

interface MoveInput {
  uid: UID.ContentType;
  documentIds: string[];
  targetSpaceSlug: string;
}

interface MoveResult {
  movedCount: number;
  targetSpaceId: number;
  documentIds: string[];
}

/**
 * Moves N entries of a content type to another space.
 *
 * Validation order:
 *  1. CT must exist and be space-scoped (no-op otherwise — platform CTs have no space FK).
 *  2. Target space must exist and be active.
 *  3. Target space must be in the CT's `visibleIn` binding (or `visibleIn` empty/missing
 *     ⇒ visible in every space). This is the constraint the user asked for: an entry can
 *     only be moved to a space that's allowed to see the collection type.
 *  4. Source rows are looked up across every space (no filter), so the request context's
 *     own space doesn't accidentally exclude them. The caller's permission check is
 *     enforced one layer up by the controller.
 *
 * Update strategy: bypass the document service entirely and write the `space` FK on the
 * relation join table via `strapi.db.query(uid).update`. The document-service middleware
 * (`document-service/multitenancy.ts`) would otherwise (a) force `params.filters.space`
 * to the current request's space (excluding the source rows we want to move), and
 * (b) leave `params.data.space` alone only if we set it explicitly — but the filter
 * blockage alone is enough to prevent the document-service path from working.
 *
 * Components and dynamic-zone rows aren't moved here: they live in their own tables but
 * are queried via their parent's link table, which still points at the moved row. The
 * parent's new space implicitly carries them along. (A future "components carry an own
 * space_id" feature would need a recursive walker; today they don't.)
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
    throw new ValidationError(
      `${uid} is not space-scoped; moving between spaces is a no-op.`
    );
  }

  const spacesService = getService('spaces');
  const targetSpace = await spacesService.getBySlug(targetSpaceSlug);
  if (!targetSpace || targetSpace.status !== 'active') {
    throw new NotFoundError(`Unknown or inactive space: ${targetSpaceSlug}`);
  }

  const { isCTVisibleInSpace } = getService('visibility');
  if (!isCTVisibleInSpace(contentType, targetSpaceSlug)) {
    throw new ApplicationError(
      `${uid} is not visible in space "${targetSpaceSlug}". Add the space to the CT's visibleIn binding first.`
    );
  }

  const isLocalizedCT =
    !!strapi.plugin('i18n') &&
    (contentType as any).pluginOptions?.i18n?.localized === true;

  // Find every row matching any of the documentIds across every space (no filter).
  // We use db.query directly to bypass the document-service multitenancy filter.
  // For localized content types we also fetch `locale` so we can validate that the
  // target space supports every locale carried by the source rows — otherwise the
  // move would orphan a translation in a space that can't surface it. (See the
  // "i18n locale isolation gotcha" risk in the design doc.)
  const rows = await strapi.db.query(uid).findMany({
    where: { documentId: { $in: documentIds } },
    select: isLocalizedCT ? ['id', 'documentId', 'locale'] : ['id', 'documentId'],
  });

  if (rows.length === 0) {
    return { movedCount: 0, targetSpaceId: targetSpace.id, documentIds };
  }

  if (isLocalizedCT) {
    const sourceLocales = [
      ...new Set(
        rows
          .map((r: { locale?: string }) => r.locale)
          .filter((c): c is string => typeof c === 'string' && c.length > 0)
      ),
    ];
    if (sourceLocales.length > 0) {
      // A locale is visible in the target space when (a) its `spaces` M2M includes the
      // target slug, OR (b) its `spaces` is empty (= platform-wide). Hit `db.query`
      // directly so we sidestep the request-context-scoped service patch — we want raw
      // access keyed on `targetSpaceSlug`, not on the caller's active space.
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
      const availableCodes = new Set(
        availableInTarget.map((l: { code: string }) => l.code)
      );
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

  // Update inside a single transaction so a partial move can never persist.
  await strapi.db.transaction(async () => {
    await Promise.all(
      rows.map((row: { id: number }) =>
        strapi.db.query(uid).update({
          where: { id: row.id },
          data: { space: targetSpace.id },
        })
      )
    );
  });

  return {
    movedCount: rows.length,
    targetSpaceId: targetSpace.id,
    documentIds: [...new Set(rows.map((r: { documentId: string }) => r.documentId))],
  };
};

const moveService = ({ strapi }: { strapi: Core.Strapi }) => ({
  moveToSpace: (input: MoveInput) => moveToSpace(strapi, input),
});

type MoveService = typeof moveService;

export default moveService;
export { MoveService };
export type { MoveInput, MoveResult };
