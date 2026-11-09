import type { RoleRow } from '../services/role';
import type { UserExtras } from './user-extras';

export interface UpRole {
  id: number;
  name: string;
  description: string | null;
  type: string | null;
}

/** A role as the engine's `roles` relation hands it out, with the numeric id users-permissions shows. */
export type UpRoleSource = Pick<RoleRow, 'name' | 'description' | 'type'> & { id: number };

export type UpUser = {
  id: number;
  documentId: string;
  username: string | null;
  email: string;
  provider: string;
  /** Left out when the caller's field rules do not show `emailVerified` */
  confirmed?: boolean;
  blocked: boolean;
  createdAt: string;
  updatedAt: string;
  role?: UpRole | null;
} & Record<string, unknown>;

/** A user after the Content API's output sanitizer. */
export type UpUserSource = {
  id: number;
  documentId: string;
  email: string;
  username?: string | null;
  emailVerified?: boolean;
  banned: boolean;
  createdAt: string;
  updatedAt: string;
} & Record<string, unknown>;

/** users-permissions has one role per user: the first the user holds. */
export const toUpRole = (roles: ReadonlyArray<UpRoleSource>): UpRole | null => {
  const [first] = roles;

  if (!first) {
    return null;
  }

  return {
    id: first.id,
    name: first.name,
    description: first.description ?? null,
    type: first.type ?? null,
  };
};

export const toUpUser = (
  user: UpUserSource,
  opts: { role?: UpRole | null; extras?: UserExtras } = {}
): UpUser => {
  // Built field by field: a column only the engine uses, or one Better Auth adds, never reaches
  // the payload. What a project adds to a user lives on the profile.
  const base = {
    id: user.id,
    documentId: user.documentId,
    username: user.username ?? null,
    email: user.email,
    provider: opts.extras?.provider ?? 'local',
    ...(user.emailVerified !== undefined && { confirmed: Boolean(user.emailVerified) }),
    blocked: Boolean(user.banned),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  // A profile field never replaces a user field
  const profile = Object.fromEntries(
    Object.entries(opts.extras?.profile ?? {}).filter(([key]) => !(key in base))
  );

  return {
    ...profile,
    ...base,
    ...(opts.role !== undefined && { role: opts.role }),
  };
};

const ROLE = 'role';
const ROLES = 'roles';

const isPlain = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const renameKey = (key: string): string => {
  if (key === ROLE) {
    return ROLES;
  }

  return key.startsWith(`${ROLE}.`) ? `${ROLES}${key.slice(ROLE.length)}` : key;
};

/** `role`, `role.name:asc` and a comma list of them: the string forms of populate and sort. */
const renameTokens = (value: string): string => value.split(',').map(renameKey).join(',');

/** Renames the keys of one object level, and leaves what is under them alone */
const renameKeys = (value: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(Object.entries(value).map(([key, entry]) => [renameKey(key), entry]));

const renameList = (value: unknown): unknown => {
  if (typeof value === 'string') {
    return renameTokens(value);
  }

  if (Array.isArray(value)) {
    return value.map(renameList);
  }

  // `{ role: { fields: [...] } }` for populate, `{ role: 'asc' }` for sort
  return isPlain(value) ? renameKeys(value) : value;
};

const LOGICAL_OPERATORS = new Set(['$and', '$or', '$not']);

/**
 * `role` names the user's relation at the top of the filters and inside the logical operators
 * there; a key `role` under any other key belongs to that relation (a profile attribute, say).
 */
const renameFilters = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(renameFilters);
  }

  if (!isPlain(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) =>
      LOGICAL_OPERATORS.has(key) ? [key, renameFilters(entry)] : [renameKey(key), entry]
    )
  );
};

/**
 * A users-permissions query names the user's one `role`; the engine's relation is `roles`. Maps
 * the name in `populate`, `filters` and `sort`, and leaves every other key alone.
 */
export const translateRoleQuery = (query: Record<string, unknown>): Record<string, unknown> => {
  const out = { ...query };

  if ('populate' in out) {
    out.populate = renameList(out.populate);
  }

  if ('sort' in out) {
    out.sort = renameList(out.sort);
  }

  if ('filters' in out) {
    out.filters = renameFilters(out.filters);
  }

  return out;
};
