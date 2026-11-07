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
  confirmed: boolean;
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
  emailVerified: boolean;
  banned: boolean;
  createdAt: string;
  updatedAt: string;
} & Record<string, unknown>;

/** Fields of the user that only the engine uses: they have U&P names (`confirmed`, `blocked`) or none. */
const ENGINE_ONLY_FIELDS = new Set([
  'emailVerified',
  'banned',
  'banReason',
  'banExpires',
  'failedSignIns',
  'lockedUntil',
  'twoFactorEnabled',
  'lastSignInAt',
  'role',
  'roles',
]);

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
  const rest = Object.fromEntries(
    Object.entries(user).filter(([key]) => !ENGINE_ONLY_FIELDS.has(key))
  );

  const base = {
    ...rest,
    id: user.id,
    documentId: user.documentId,
    username: user.username ?? null,
    email: user.email,
    provider: opts.extras?.provider ?? 'local',
    confirmed: Boolean(user.emailVerified),
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

const renameKeysDeep = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(renameKeysDeep);
  }

  if (isPlain(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [renameKey(key), renameKeysDeep(entry)])
    );
  }

  return value;
};

const renameList = (value: unknown): unknown => {
  if (typeof value === 'string') {
    return renameTokens(value);
  }

  if (Array.isArray(value)) {
    return value.map(renameList);
  }

  // `{ role: { fields: [...] } }` for populate, `{ role: 'asc' }` for sort
  return isPlain(value) ? renameKeysDeep(value) : value;
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
    out.filters = renameKeysDeep(out.filters);
  }

  return out;
};
