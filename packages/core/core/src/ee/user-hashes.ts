import crypto from 'crypto';
import type { Core } from '@strapi/types';

export const MAX_USER_HASHES = 10_000;

/** HMAC-SHA256 of the trimmed, lowercased email, keyed with the license key, as hex. */
export const hashAdminEmail = (licenseKey: string, email: string): string =>
  crypto.createHmac('sha256', licenseKey).update(email.trim().toLowerCase()).digest('hex');

/** Hashes of the active admin users, deduplicated and capped. `undefined` on failure. */
export const getUserHashes = async (
  strapi: Core.Strapi,
  licenseKey: string
): Promise<string[] | undefined> => {
  try {
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
  } catch (error) {
    strapi.log?.warn(
      `Could not hash the active admin users for the license check: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return undefined;
  }
};
