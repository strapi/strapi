import { createHash } from 'node:crypto';

import { normalizeEmail } from './normalize-email';

/**
 * A pending link: what the migration records for a user who signed up under Users & Permissions
 * with a provider that never asserts a verified address, and who had confirmed their address and
 * was not blocked. Users & Permissions never stored the provider's account id. The first sign-in
 * with that provider, with the address the user had, links the provider to their account, once
 * (the engine's `pending-link` plugin). The links last while the compatibility mode is on: the
 * cleanup that follows it drops them, as a rollback does.
 *
 * It is a row of the engine's verification table, which the plugin already uses for its own marks:
 * `identifier` is the provider and the address, `value` is the user's `documentId`. The address is
 * stored as its SHA-256, which keeps the identifier within the indexed column's length whatever the
 * address, and the address itself out of a second table.
 */
export const PENDING_LINK_PREFIX = 'migrated-provider-link:';

/**
 * The providers a pending link is for: Better Auth's built-in social providers that never assert a
 * verified address, so that a user they signed up under Users & Permissions has no other way back
 * to their account. Better Auth's mapper of each answers `emailVerified: false` whatever the
 * provider sent (Facebook reads `email_verified` only when the Graph API answers with it, which it
 * does not by default; TikTok sends no address, so its placeholder never matches one).
 *
 * X (Twitter) is not one: Better Auth asks it for the confirmed address and calls that verified,
 * so its users are linked by Better Auth's own rule. A generic OAuth or OpenID Connect provider
 * never is, whatever its id: its claims are whatever its issuer says.
 */
export const PROVIDERS_WITHOUT_EMAIL_VERIFICATION: readonly string[] = Object.freeze([
  'facebook',
  'vk',
  'line',
  'tiktok',
  'notion',
  'spotify',
]);

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
