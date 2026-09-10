import { DEFAULT_SPACE_SLUG, getCurrentSpaceSlug } from './currentSpace';

export type WorkspaceAccessReason = 'platform-wide' | 'multi-bound';

/** What the server attaches to a settings resource fetched from a sub-workspace. */
export interface WorkspaceAccess {
  readOnly: boolean;
  reason?: WorkspaceAccessReason;
  boundSlugs: string[];
}

/**
 * Same rule as the server's `decideWritableInSpace`: from a sub-workspace a
 * settings resource is editable only when bound to that workspace alone.
 */
export const describeWorkspaceAccess = (
  boundSlugs: string[],
  spaceSlug: string = getCurrentSpaceSlug()
): WorkspaceAccess => {
  if (spaceSlug === DEFAULT_SPACE_SLUG) {
    return { readOnly: false, boundSlugs };
  }
  if (boundSlugs.length === 0) {
    return { readOnly: true, reason: 'platform-wide', boundSlugs };
  }
  if (boundSlugs.length === 1 && boundSlugs[0] === spaceSlug) {
    return { readOnly: false, boundSlugs };
  }
  return { readOnly: true, reason: 'multi-bound', boundSlugs };
};

/** The access the server attached to a fetched row, if any. */
export const getAttachedWorkspaceAccess = (row: unknown): WorkspaceAccess | undefined => {
  const access = (row as { workspaceAccess?: unknown } | null | undefined)?.workspaceAccess;
  return access && typeof access === 'object' ? (access as WorkspaceAccess) : undefined;
};

export const isReadOnlyInWorkspace = (row: unknown): boolean =>
  getAttachedWorkspaceAccess(row)?.readOnly === true;
