import { ForbiddenError } from './errors';
import { hasDraftAndPublish } from './content-types';
import type { Model } from './types';

/** Content API action id for reading draft publication rows for a given content-type UID. */
export const getReadDraftActionForUid = (uid: string): string => `${uid}.readDraft`;

/** Split `api::blog.post` / `plugin::foo.bar` into registry keys used by users-permissions. */
export const parseContentApiUidParts = (
  uid: string
): { apiKey: string; controllerName: string } | null => {
  const sep = uid.indexOf('::');
  if (sep === -1) {
    return null;
  }
  const afterNs = uid.slice(sep + 2);
  const dot = afterNs.indexOf('.');
  if (dot === -1) {
    return null;
  }
  return {
    apiKey: uid.slice(0, sep + 2 + dot),
    controllerName: afterNs.slice(dot + 1),
  };
};

const normalizeStatus = (status: unknown): 'draft' | 'published' | undefined => {
  if (status === undefined || status === null) {
    return undefined;
  }
  if (status === 'published' || status === 'PUBLISHED') {
    return 'published';
  }
  if (status === 'draft' || status === 'DRAFT') {
    return 'draft';
  }
  if (typeof status === 'string') {
    const l = status.toLowerCase();
    if (l === 'published') {
      return 'published';
    }
    if (l === 'draft') {
      return 'draft';
    }
  }
  return undefined;
};

/**
 * True when the query may return draft physical rows for a draft & publish content type.
 * Published-only queries (`status=published`) do not require read-draft permission.
 * Omitted status follows REST defaults (draft); GraphQL typically supplies `published` via schema default.
 */
export const queryRequiresDraftReadPermission = (
  query: Record<string, unknown>,
  schema: Model
): boolean => {
  if (!hasDraftAndPublish(schema)) {
    return false;
  }

  const status = normalizeStatus(query.status);
  if (status === 'published') {
    return false;
  }

  return true;
};

type AuthWithAbility = { ability?: { can: (action: string) => boolean } };

/**
 * Enforces `readDraft` when the query targets draft rows. Skips when no `ability` (e.g. API token
 * full-access / read-only strategies that do not attach a CASL ability).
 */
export const assertReadDraftPermission = (
  query: Record<string, unknown>,
  schema: Model,
  auth: AuthWithAbility | undefined
): void => {
  if (!queryRequiresDraftReadPermission(query, schema)) {
    return;
  }

  if (!auth?.ability) {
    return;
  }

  const uid = schema.uid;
  if (typeof uid !== 'string') {
    return;
  }

  const readDraftAction = getReadDraftActionForUid(uid);
  if (auth.ability.can(readDraftAction)) {
    return;
  }

  throw new ForbiddenError('You are not allowed to read draft content for this content type');
};
