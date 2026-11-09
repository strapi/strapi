import type { Core } from '@strapi/types';

import { USER_UID } from '../constants';

/**
 * The columns users-permissions kept on its user, which the user type carries while compatibility is
 * on: the migration copies them, and an old `?confirmation=` link is read from `confirmationToken`.
 * Types match users-permissions' own so schema sync never alters a carried column. All are private
 * and hidden in the Content Manager; none is written by a request.
 */
export const LEGACY_USER_ATTRIBUTES: Readonly<
  Record<'password' | 'provider' | 'confirmed' | 'blocked' | 'confirmationToken', object>
> = {
  password: {
    type: 'password',
    configurable: false,
    private: true,
    searchable: false,
    visible: false,
  },
  provider: { type: 'string', configurable: false, private: true, visible: false },
  confirmed: {
    type: 'boolean',
    default: false,
    configurable: false,
    private: true,
    visible: false,
  },
  blocked: { type: 'boolean', default: false, configurable: false, private: true, visible: false },
  confirmationToken: {
    type: 'string',
    configurable: false,
    private: true,
    searchable: false,
    visible: false,
  },
};

const LEGACY_TOKEN = /^[0-9a-f]{40}$/;

/** users-permissions made a confirmation token of 20 random bytes, as 40 lowercase hex characters. */
export const isLegacyConfirmationToken = (value: string): boolean => LEGACY_TOKEN.test(value);

export type LegacyConfirmation = { documentId: string; confirmedNow: boolean } | null;

/**
 * Confirms the address the token was mailed for and clears the token, in one transaction that first
 * locks the user's row, so a link used twice at the same moment confirms once. `confirmedNow` is
 * false when the address was already confirmed; an unknown token is `null`.
 */
export const confirmLegacyToken = async (
  strapi: Core.Strapi,
  token: string
): Promise<LegacyConfirmation> =>
  (await strapi.db.transaction(async (): Promise<LegacyConfirmation> => {
    const row = (await strapi.db
      .queryBuilder(USER_UID)
      .select(['id', 'documentId', 'emailVerified'])
      .where({ confirmationToken: token })
      .first()
      .forUpdate()
      .execute()) as { id: number | string; documentId: string; emailVerified?: boolean } | null;

    if (!row) {
      return null;
    }

    const confirmedNow = row.emailVerified !== true;

    await strapi.db.query(USER_UID).update({
      where: { id: row.id },
      data: { emailVerified: true, confirmationToken: null },
    });

    return { documentId: row.documentId, confirmedNow };
  })) as LegacyConfirmation;
