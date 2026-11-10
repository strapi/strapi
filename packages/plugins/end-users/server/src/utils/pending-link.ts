import { createHash } from 'node:crypto';

import { normalizeEmail } from './normalize-email';

/**
 * A pending link: what the migration records for a user who signed up with a provider under Users &
 * Permissions, which never stored the provider's account id. The first sign-in with that provider,
 * with the address the user had, links the provider to their account, once (the engine's
 * `pending-link` plugin).
 *
 * It is a row of the engine's verification table, which the plugin already uses for its own marks:
 * `identifier` is the provider and the address, `value` is the user's `documentId`. The address is
 * stored as its SHA-256, which keeps the identifier within the indexed column's length whatever the
 * address, and the address itself out of a second table.
 */
export const PENDING_LINK_PREFIX = 'migrated-provider-link:';

/**
 * A pending link does not run out. Better Auth deletes verification rows whose date has passed, so
 * it carries one a century after the migration.
 */
export const PENDING_LINK_LIFETIME_MS = 100 * 365 * 24 * 60 * 60 * 1000;

/** What every pending link of `providerId` starts with */
export const pendingLinkPrefix = (providerId: string): string =>
  `${PENDING_LINK_PREFIX}${encodeURIComponent(providerId)}:`;

/** The identifier of the pending link of `providerId` for `email`, in any capitals */
export const pendingLinkIdentifier = (providerId: string, email: string): string =>
  `${pendingLinkPrefix(providerId)}${createHash('sha256').update(normalizeEmail(email)).digest('hex')}`;
