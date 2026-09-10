import { errors } from '@strapi/utils';

import { isSharedContentType, isSharedEditableContentType } from './content-types';

import type { RequestSpace } from '../utils/space-scope';

const { NotFoundError, PolicyError } = errors;

export type AccessReason =
  | 'shared-entry'
  | 'shared-content-type'
  | 'other-workspace'
  | 'default-only'
  | 'override-delete';

/**
 * A workspace refusal. Extends `PolicyError` on purpose: the endpoint composer
 * turns every other `ForbiddenError` into a bare 403, whereas policy errors keep
 * their public message — and "shared entry, edit it from default" must reach the
 * admin.
 */
export class WorkspaceAccessError extends PolicyError<string, { reason: AccessReason }> {
  constructor(message: string, details: { reason: AccessReason }) {
    super(message, details);
    Object.defineProperty(this, 'name', { value: 'WorkspaceAccessError', enumerable: false });
  }
}

export interface AccessDecision {
  /** Whether the row can be seen from the calling workspace. */
  visible: boolean;
  /** Whether the row can be written from the calling workspace. */
  editable: boolean;
  reason?: AccessReason;
  /**
   * Whether the calling workspace could take a local copy of this entry and
   * edit that instead (see services/inheritance.ts). True exactly when the
   * entry is inherited — read-only here because it belongs to every workspace.
   */
  canOverride?: boolean;
  /** Whether the row the caller sees is its own copy of an inherited entry. */
  isOverride?: boolean;
}

export interface DecideAccessInput {
  model: unknown;
  /** The calling workspace; `undefined` = no header (CLI, bootstrap, platform). */
  request: RequestSpace | undefined;
  /** The row's workspace; `null` = shared with every workspace. */
  entrySpaceId: number | null;
  /** Whether that row is the caller's own copy of an inherited entry. */
  isOverride?: boolean;
}

/** One row of a document, as it exists in some workspace. */
export interface EntryPlacement {
  spaceId: number | null;
  isOverride: boolean;
}

/**
 * Which of a document's rows the caller is looking at.
 *
 * A document normally has one workspace, but an inherited one has two the
 * moment a workspace overrides it: the shared original and that workspace's
 * copy, both under the same documentId. Every "find the row for this
 * documentId" outside a scoped read has to answer this question the same way
 * the read net does, or it answers with whichever row the database happened to
 * return first.
 */
export const resolvePlacement = (
  placements: EntryPlacement[],
  requestSpaceId?: number
): EntryPlacement | undefined => {
  if (requestSpaceId !== undefined) {
    const own = placements.find((row) => row.spaceId === requestSpaceId);
    if (own) {
      return own;
    }
  }
  // Outside a workspace — and for a workspace that has not overridden it — the
  // document is the shared original; another workspace's copy is not visible.
  const inherited = placements.find((row) => row.spaceId === null && !row.isOverride);
  if (inherited) {
    return inherited;
  }
  return placements.find((row) => !row.isOverride);
};

/**
 * The single decision table for entries (see the plan):
 *   - no header / default workspace → everything is visible and editable;
 *   - shared content type → every entry is visible; editable only when the
 *     type allows sub-workspace edits;
 *   - exclusive content type → own rows are editable, shared rows (NULL) are
 *     read-only, other workspaces' rows are invisible.
 */
export const decideAccess = ({
  model,
  request,
  entrySpaceId,
  isOverride = false,
}: DecideAccessInput): AccessDecision => {
  if (!request || request.isDefault) {
    return { visible: true, editable: true };
  }

  if (isSharedContentType(model)) {
    return isSharedEditableContentType(model)
      ? { visible: true, editable: true }
      : { visible: true, editable: false, reason: 'shared-content-type', canOverride: true };
  }

  if (entrySpaceId === request.id) {
    return { visible: true, editable: true, isOverride };
  }
  if (entrySpaceId === null) {
    // Inherited: read-only here, but the workspace may take its own copy.
    return { visible: true, editable: false, reason: 'shared-entry', canOverride: true };
  }
  return { visible: false, editable: false, reason: 'other-workspace' };
};

export const MESSAGES: Record<AccessReason, string> = {
  'shared-entry':
    'This entry is shared across workspaces and can only be edited from the default workspace',
  'shared-content-type': 'Entries of this content type are managed from the default workspace',
  'other-workspace': 'Not Found',
  'default-only': 'Only the default workspace can share entries with every workspace',
  'override-delete':
    "This entry is this workspace's copy of an inherited one. Reset it to the original instead of deleting it",
};

/** Throws the error matching a non-editable decision; a no-op when editable. */
export const assertWritable = (input: DecideAccessInput): AccessDecision => {
  const decision = decideAccess(input);
  if (decision.editable) {
    return decision;
  }
  if (!decision.visible) {
    // Do not leak the existence of another workspace's entry.
    throw new NotFoundError();
  }
  const reason = decision.reason ?? 'shared-entry';
  throw new WorkspaceAccessError(MESSAGES[reason], { reason });
};

const accessService = () => ({
  decideAccess,
  assertWritable,
  resolvePlacement,
});

type AccessService = typeof accessService;

export default accessService;
export type { AccessService };
