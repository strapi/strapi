import { contentTypes } from '@strapi/utils';
import type { Core, Struct, UID } from '@strapi/types';

import { ACCOUNT_UID, PROFILE_UID, USER_UID } from '../constants';
import { writableProfileAttributes } from '../utils/writable-profile-attributes';

export interface UserExtras {
  profile: Record<string, unknown> | null;
  provider: string;
}

type Plain = Record<string, unknown>;

interface Documents {
  findMany(params: Plain): Promise<Plain[]>;
}

/** Keys of the profile that never merge into the user: its own identity and its link back. */
const PROFILE_IDENTITY = new Set(['id', 'documentId', 'user']);

/** Body keys users-permissions let a request write that the engine owns or no longer has. */
const REFUSED_WRITES = ['role', 'confirmed', 'blocked', 'provider'] as const;

const relatedDocumentId = (user: unknown): string | undefined => {
  const value = (user as { documentId?: unknown } | null | undefined)?.documentId;

  return typeof value === 'string' ? value : undefined;
};

/**
 * The profile fields and the `provider` of each user, for the payloads users-permissions shaped.
 * One profile query and one accounts query serve any number of users. A profile field the caller's
 * role cannot read is dropped by the profile type's own output sanitizer, and a profile key that
 * collides with a key of the user it belongs to is dropped.
 */
export const loadUserExtras = async (
  strapi: Core.Strapi,
  auth: unknown,
  users: ReadonlyArray<{ documentId: string }>
): Promise<Map<string, UserExtras>> => {
  const extras = new Map<string, UserExtras>();

  if (users.length === 0) {
    return extras;
  }

  const ids = users.map(({ documentId }) => documentId);
  const schema = strapi.contentType(PROFILE_UID) as Struct.ContentTypeSchema;

  const [profiles, accounts] = await Promise.all([
    (strapi.documents(PROFILE_UID as UID.ContentType) as unknown as Documents).findMany({
      filters: { user: { documentId: { $in: ids } } },
      populate: { user: { fields: ['documentId'] } },
    }),
    (strapi.documents(ACCOUNT_UID as UID.ContentType) as unknown as Documents).findMany({
      filters: { userId: { $in: ids } },
      fields: ['userId', 'providerId'],
      sort: 'createdAt:asc',
    }),
  ]);

  const providers = new Map<string, string[]>();

  for (const account of accounts) {
    const userId = account.userId as string;
    const providerId = account.providerId as string;

    providers.set(userId, [...(providers.get(userId) ?? []), providerId]);
  }

  const providerOf = (documentId: string): string => {
    const linked = providers.get(documentId) ?? [];

    return linked.includes('credential') ? 'local' : (linked[0] ?? 'local');
  };

  const profileOf = new Map<string, Plain>();

  for (const profile of profiles) {
    const owner = relatedDocumentId(profile.user);

    if (owner !== undefined) {
      profileOf.set(owner, profile);
    }
  }

  for (const user of users) {
    const { documentId } = user;
    const stored = profileOf.get(documentId);
    let profile: Plain | null = null;

    if (stored) {
      // The profile's own identity and its link to the user stay while the rules are applied: a
      // field group held under `is-owner` is judged by them. They are dropped from what is merged.
      const kept = Object.fromEntries(
        Object.entries(stored).filter(
          ([key]) =>
            (PROFILE_IDENTITY.has(key) || !(key in user)) &&
            !contentTypes.isPrivateAttribute(schema, key)
        )
      );

      const readable = (await strapi.contentAPI.sanitize.output(kept, schema, {
        auth: auth ?? {},
        action: 'findOne',
        unfiltered: true,
      } as never)) as Plain;

      profile = Object.fromEntries(
        Object.entries(readable).filter(([key]) => !PROFILE_IDENTITY.has(key))
      );
    }

    extras.set(documentId, { profile, provider: providerOf(documentId) });
  }

  return extras;
};

/**
 * Sorts the keys of a users-permissions write: the profile's own attributes go to the profile, the
 * ones the engine owns or no longer has (`role`, `confirmed`, `blocked`, `provider`) are refused,
 * and the rest is the user's, as is a key both the user and the profile have.
 */
export const splitUserWrites = (
  strapi: Core.Strapi,
  body: Record<string, unknown>
): { user: Plain; profile: Plain; refused: string[] } => {
  // A key the user has is the user's, as it is on a read, where the user's value wins over the profile's
  const userKeys = new Set([
    'id',
    'documentId',
    'createdAt',
    'updatedAt',
    ...Object.keys(
      (strapi.contentType(USER_UID) as { attributes?: object } | undefined)?.attributes ?? {}
    ),
  ]);
  const profileKeys = new Set(
    writableProfileAttributes(strapi).filter((name) => !userKeys.has(name))
  );
  const refusedKeys = new Set<string>(REFUSED_WRITES);
  const user: Plain = {};
  const profile: Plain = {};
  const refused: string[] = [];

  for (const [key, value] of Object.entries(body)) {
    if (refusedKeys.has(key)) {
      refused.push(key);
    } else if (profileKeys.has(key)) {
      profile[key] = value;
    } else {
      user[key] = value;
    }
  }

  return { user, profile, refused };
};
