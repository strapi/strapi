import { errors } from '@strapi/utils';
import type { Core } from '@strapi/types';

import { getService } from '../utils';
import {
  isSharedContentType,
  isSharedEditableContentType,
  isSpaceScopedContentType,
} from './content-types';
import { WorkspaceAccessError } from './access';
import { runScoped, runUnscoped } from '../utils/space-scope';

const { NotFoundError, ValidationError } = errors;

/**
 * Inheritance: an entry created in the default workspace and shared belongs to
 * every workspace at once, and every workspace reads the same row. A workspace
 * that needs its own version **overrides** it — takes a local copy of the
 * document, under the same documentId — and from then on reads its copy instead
 * of the original. Resetting deletes the copy and puts the workspace back on the
 * original.
 *
 * Storage is a row copy rather than a stored diff on purpose: the copy is an
 * ordinary entry, so filtering, sorting, searching and pagination work on it
 * natively. A diff would have to be applied after the query, which is exactly
 * where "sort by title" stops meaning anything.
 *
 * The copy is made by the document service (`clone`), so components, dynamic
 * zones and relations are duplicated the way core duplicates them, and then the
 * clone's generated documentId is rewritten to the original's — the whole point
 * being that `/api/articles/<documentId>` answers with the local version inside
 * the workspace and the original everywhere else.
 */

export interface Placement {
  spaceId: number | null;
  isOverride: boolean;
}

const placementsOf = async (
  strapi: Core.Strapi,
  uid: string,
  documentId: string
): Promise<Placement[]> => {
  const rows = (await runUnscoped(() =>
    strapi.db.query(uid as never).findMany({
      where: { documentId },
      select: ['id', 'spaceOverride'],
      populate: { space: { select: ['id'] } },
    })
  )) as Array<{ space?: { id: number } | null; spaceOverride?: boolean }>;

  const seen = new Map<string, Placement>();
  for (const row of rows) {
    const placement = {
      spaceId: row.space?.id ?? null,
      isOverride: row.spaceOverride === true,
    };
    seen.set(`${placement.spaceId}:${placement.isOverride}`, placement);
  }
  return [...seen.values()];
};

const assertOverridable = (
  strapi: Core.Strapi,
  uid: string,
  placements: Placement[],
  spaceId: number
) => {
  const contentType = strapi.contentTypes[uid as keyof typeof strapi.contentTypes];
  if (!contentType || !isSpaceScopedContentType(contentType)) {
    throw new NotFoundError('Unknown or unscoped content type');
  }
  if (isSharedEditableContentType(contentType)) {
    throw new ValidationError(
      'Entries of this content type are editable from every workspace, so there is nothing to override'
    );
  }
  /**
   * A content type whose every entry is shared (`sharedEntries`) is left out of
   * the read net entirely — the column is ignored for visibility there — so a
   * copy would not shadow anything: the workspace would see the original *and*
   * its own version of it. Refused rather than half-supported. Sharing entry by
   * entry from the default workspace is what inheritance is for.
   */
  if (isSharedContentType(contentType)) {
    throw new ValidationError(
      'Every entry of this content type is shared with every workspace. Overriding one is only possible for entries shared individually from the Default workspace'
    );
  }
  if (placements.length === 0) {
    throw new NotFoundError();
  }
  if (placements.some((row) => row.spaceId === spaceId)) {
    throw new ValidationError('This entry is already overridden in this workspace');
  }
  if (!placements.some((row) => row.spaceId === null && !row.isOverride)) {
    throw new WorkspaceAccessError(
      'Only an entry inherited from the default workspace can be overridden',
      { reason: 'shared-entry' }
    );
  }
};

const inheritance = ({ strapi }: { strapi: Core.Strapi }) => ({
  placementsOf: (uid: string, documentId: string) => placementsOf(strapi, uid, documentId),

  /**
   * Takes a workspace-local copy of an inherited document.
   *
   * The clone runs inside a scope that (a) marks everything it creates as an
   * override and (b) hides the original from reads that do not name it — the
   * copy keeps the original's unique field values, which the entity validator
   * would otherwise refuse. All of it in one transaction: between the clone and
   * the rename the rows exist under a documentId nobody should ever see.
   */
  async override(uid: string, documentId: string, spaceId: number) {
    const placements = await placementsOf(strapi, uid, documentId);
    assertOverridable(strapi, uid, placements, spaceId);

    return strapi.db.transaction(async () => {
      const copy = await runScoped(
        spaceId,
        () =>
          strapi.documents(uid as never).clone({
            documentId,
            locale: '*',
            data: {},
          } as never),
        { asOverride: true, shadowDocumentId: documentId }
      );

      const cloneId = (copy as { documentId?: string } | null)?.documentId;
      if (!cloneId) {
        throw new ValidationError('Could not copy this entry into the workspace');
      }

      // The copy is the same document, seen from this workspace.
      await runUnscoped(() =>
        strapi.db.query(uid as never).updateMany({
          where: { documentId: cloneId },
          data: { documentId, spaceOverride: true },
        })
      );

      return { documentId, spaceId };
    });
  },

  /**
   * Drops the workspace's copy and puts it back on the inherited original.
   *
   * Deleted through the document service, scoped to the workspace, so the copy's
   * components go with it — inside that scope the documentId resolves to the
   * copy, never to the original.
   */
  async reset(uid: string, documentId: string, spaceId: number) {
    const placements = await placementsOf(strapi, uid, documentId);
    const own = placements.find((row) => row.spaceId === spaceId);
    if (!own || !own.isOverride) {
      throw new NotFoundError('This entry is not overridden in this workspace');
    }

    return strapi.db.transaction(async () => {
      await runScoped(spaceId, () =>
        strapi.documents(uid as never).delete({ documentId, locale: '*' } as never)
      );
      return { documentId, spaceId };
    });
  },

  /**
   * Turns the copies of these documents into ordinary entries of the workspaces
   * holding them.
   *
   * Called when the original stops being inherited — it was moved into one
   * workspace, or deleted. The copies could be cascaded away instead, but they
   * hold content somebody wrote and there is nothing left for them to shadow:
   * keeping them, as plain entries of their workspace, loses nothing and is
   * reversible by hand. They keep their documentId, which is now theirs alone.
   */
  async promoteOverrides(uid: string, documentIds: string[]) {
    if (documentIds.length === 0) {
      return 0;
    }
    const result = await runUnscoped(() =>
      strapi.db.query(uid as never).updateMany({
        where: { documentId: { $in: documentIds }, spaceOverride: true },
        data: { spaceOverride: false },
      })
    );
    return (result as { count?: number })?.count ?? 0;
  },

  /** The workspaces holding a copy of any of these documents. */
  async overridingSpaceIds(uid: string, documentIds: string[]): Promise<number[]> {
    if (documentIds.length === 0) {
      return [];
    }
    const rows = (await runUnscoped(() =>
      strapi.db.query(uid as never).findMany({
        where: { documentId: { $in: documentIds }, spaceOverride: true },
        select: ['id'],
        populate: { space: { select: ['id'] } },
      })
    )) as Array<{ space?: { id: number } | null }>;
    return [...new Set(rows.map((row) => row.space?.id).filter((id): id is number => !!id))];
  },

  /**
   * Which workspaces read an inherited document as it is, and which have taken
   * their own copy. The default workspace's answer to "who is following this
   * entry?".
   */
  async summarize(uid: string, documentIds: string[]) {
    if (documentIds.length === 0) {
      return {};
    }

    const rows = (await runUnscoped(() =>
      strapi.db.query(uid as never).findMany({
        where: { documentId: { $in: documentIds }, spaceOverride: true },
        select: ['documentId', 'createdAt', 'updatedAt'],
        populate: { space: { select: ['id', 'slug', 'name', 'color'] } },
      })
    )) as Array<{
      documentId: string;
      createdAt?: string;
      updatedAt?: string;
      space?: { id: number; slug: string; name: string; color: string | null } | null;
    }>;

    const inheritedIds = new Set(
      (
        (await runUnscoped(() =>
          strapi.db.query(uid as never).findMany({
            where: { documentId: { $in: documentIds } },
            select: ['documentId'],
            populate: { space: { select: ['id'] } },
          })
        )) as Array<{ documentId: string; space?: { id: number } | null }>
      )
        .filter((row) => row.space === null || row.space === undefined)
        .map((row) => row.documentId)
    );

    const spaces = await getService('spaces').getAll();
    const byDocument: Record<string, ReturnType<typeof emptySummary>> = {};

    const emptySummaryFor = (documentId: string) => {
      byDocument[documentId] = byDocument[documentId] ?? emptySummary(inheritedIds.has(documentId));
      return byDocument[documentId];
    };

    for (const documentId of documentIds) {
      emptySummaryFor(documentId);
    }

    for (const row of rows) {
      if (!row.space) {
        continue;
      }
      const summary = emptySummaryFor(row.documentId);
      if (summary.overriddenIn.some((space) => space.slug === row.space!.slug)) {
        continue;
      }
      summary.overriddenIn.push({
        id: row.space.id,
        slug: row.space.slug,
        name: row.space.name,
        color: row.space.color ?? null,
        // An override starts as an exact copy, so "edited" is the honest claim
        // to make cheaply: the copy has been written to since it was taken.
        edited: hasBeenEdited(row.createdAt, row.updatedAt),
      });
    }

    for (const documentId of documentIds) {
      const summary = byDocument[documentId];
      if (!summary.inherited) {
        continue;
      }
      const overriding = new Set(summary.overriddenIn.map((space) => space.slug));
      summary.inheritedIn = spaces
        .filter((space: { slug: string }) => !overriding.has(space.slug))
        .map((space: { id: number; slug: string; name: string; color: string | null }) => ({
          id: space.id,
          slug: space.slug,
          name: space.name,
          color: space.color ?? null,
        }));
    }

    return byDocument;
  },
});

export interface SummarySpace {
  id: number;
  slug: string;
  name: string;
  color: string | null;
}

const emptySummary = (inherited: boolean) => ({
  inherited,
  inheritedIn: [] as SummarySpace[],
  overriddenIn: [] as Array<SummarySpace & { edited: boolean }>,
});

/** A second of slack: `clone` writes `updatedAt` a hair after `createdAt`. */
const hasBeenEdited = (createdAt?: string, updatedAt?: string): boolean => {
  if (!createdAt || !updatedAt) {
    return false;
  }
  return new Date(updatedAt).getTime() - new Date(createdAt).getTime() > 1000;
};

type InheritanceService = typeof inheritance;

export default inheritance;
export type { InheritanceService };
