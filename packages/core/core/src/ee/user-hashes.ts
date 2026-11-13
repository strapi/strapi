import crypto from 'crypto';
import type { Core } from '@strapi/types';

/**
 * Upper bound on the hashes sent with one license check, to keep the request body bounded.
 */
export const MAX_USER_HASHES = 10_000;

/**
 * Hashes an admin email for the license registry: HMAC-SHA256 keyed with the license key over
 * the trimmed, lowercased email, as lowercase hex. The registry only ever sees these hashes, so
 * it can count unique admins across every instance of a license without receiving any email.
 */
export const hashAdminEmail = (licenseKey: string, email: string): string =>
  crypto.createHmac('sha256', licenseKey).update(email.trim().toLowerCase()).digest('hex');

/**
 * Hashes of the active admin users, deduplicated and capped at {@link MAX_USER_HASHES}.
 * Throws when the users cannot be read; see {@link getUserHashes} for the safe variant.
 */
export const computeUserHashes = async (
  strapi: Core.Strapi,
  licenseKey: string
): Promise<string[]> => {
  const users: Array<{ email?: unknown }> = await strapi.db.query('admin::user').findMany({
    select: ['email'],
    where: { isActive: true },
    orderBy: { id: 'asc' },
  });

  const hashes = new Set<string>();

  for (const { email } of users) {
    if (hashes.size >= MAX_USER_HASHES) {
      break;
    }

    if (typeof email === 'string' && email.trim() !== '') {
      hashes.add(hashAdminEmail(licenseKey, email));
    }
  }

  return [...hashes];
};

/**
 * Same as {@link computeUserHashes}, but never throws: on failure it logs a warning and returns
 * `undefined`, so the license check is still sent, only without user hashes.
 */
export const getUserHashes = async (
  strapi: Core.Strapi,
  licenseKey: string
): Promise<string[] | undefined> => {
  try {
    return await computeUserHashes(strapi, licenseKey);
  } catch (error) {
    strapi.log?.warn(
      `Could not compute the active admin users for the license check: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return undefined;
  }
};
