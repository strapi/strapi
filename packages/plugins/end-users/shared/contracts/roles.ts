import type { PermissionRow, RolePermission } from './permissions';

export type RoleType = 'public' | 'authenticated' | 'custom';

export interface RoleListItem {
  documentId: string;
  name: string;
  description: string | null;
  type: RoleType;
  requireTwoFactor: boolean;
  usersCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PermissionProblem {
  documentId: string | null;
  index: number;
  action: string;
  key: 'action' | 'subject' | 'properties' | 'conditions';
  reason: string;
}

/** A builder condition whose Who roles check names the role */
export interface RoleNamedBy {
  /** The condition's name, e.g. 'api::e2e-1793907065587' */
  name: string;
  displayName: string;
  /** The Who roles check's match: 'any' (users of this role match) or 'none' (users of this role are excluded) */
  match: 'any' | 'none';
}

export interface RoleDetail extends RoleListItem {
  revision: number;
  /** The builder conditions that name this role in a Who roles check, computed on the server */
  namedBy: RoleNamedBy[];
  permissions: RolePermission[];
  problems: PermissionProblem[];
}

export interface PermissionDiff {
  create: PermissionRow[];
  update: Array<{ documentId: string } & Partial<PermissionRow>>;
  delete: string[];
}

export interface RoleUpdateBody {
  revision: number;
  name?: string;
  description?: string | null;
  requireTwoFactor?: boolean;
  permissions?: PermissionDiff;
}

export interface RoleDeleteResult {
  documentId: string;
  movedToDefault: number;
}

/** What an export writes and an import reads: permissions keyed by action and subject, never by id. */
export interface RoleFile {
  version: 1;
  role: {
    name: string;
    description: string | null;
    type: RoleType;
    requireTwoFactor: boolean;
  };
  permissions: PermissionRow[];
}
