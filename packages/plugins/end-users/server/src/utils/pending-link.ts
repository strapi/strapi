import { createHmac } from 'node:crypto';
import type { Core } from '@strapi/types';

import { PLUGIN_ID } from '../constants';
import { normalizeEmail } from './normalize-email';

/**
 * A pending link: what the migration records for a user who signed up under Users & Permissions
 * with a provider that never asserts a verified address, and who had confirmed their address and
 * was not blocked. Users & Permissions never stored the provider's account id. The first sign-in
 * with that provider, with the address the user had, links the provider to their account, once
 * (the engine's `pending-link` plugin). The links exist only while the compatibility mode is on: no
 * link is written or honored without it, and the cleanup that follows it drops them, as a rollback
 * does.
 *
 * It is a row of the engine's verification table, which the plugin already uses for its own marks:
 * `identifier` is the provider and the address, `value` is the user's `documentId`. The address is
 * stored as an HMAC-SHA256 keyed with the engine's secret, which keeps the identifier within the
 * indexed column's length whatever the address, and the address itself out of a second table. Keyed,
 * nobody can compute the identifier of an address from outside: the verification table is also read
 * by identifier from a client's string, by the phone-number plugin's `/phone-number/verify`, so a
 * guessable identifier would tell whether an address has a link, and a wrong code would rewrite its
 * row. A changed secret orphans the links, which only ever refuses a link.
 */
export const PENDING_LINK_PREFIX = 'migrated-provider-link:';

/**
 * The providers a pending link is for: Better Auth's built-in social providers whose mapper answers
 * `emailVerified: false` whatever the provider sent, and that only ever give an address they have
 * confirmed. A user they signed up under Users & Permissions has no other way back to their account.
 * A provider that may give an address nobody confirmed is not one, nor is one that gives none:
 *
 * - VK and LINE: their docs say nothing on whether the address is confirmed.
 * - Notion: it sends `person.email_verified`, which Better Auth does not read, so its address may
 *   be one Notion has not verified.
 * - Spotify: its docs call the address unverified.
 * - TikTok: Better Auth gets no address from it.
 * - X (Twitter): Better Auth asks it for the confirmed address and calls that verified, so its users
 *   are linked by Better Auth's own rule.
 *
 * A generic OAuth or OpenID Connect provider never is, whatever its id: its claims are whatever its
 * issuer says. An administrator can still trust any provider for linking.
 */
export const PROVIDERS_WITHOUT_EMAIL_VERIFICATION: readonly string[] = Object.freeze([
  // Better Auth reads `email` from the Graph API's /me. Meta: the field "will not be returned if no
  // valid email address is available" (developers.facebook.com/docs/graph-api/reference/user), and
  // Facebook gives no address until its confirmation link was clicked (Auth0: support.auth0.com,
  // "Facebook Social Connection Does Not Return User Email Address")
  'facebook',
]);

/**
 * A pending link does not run out. Better Auth deletes verification rows whose date has passed, so
 * it carries one a century after the migration.
 */
export const PENDING_LINK_LIFETIME_MS = 100 * 365 * 24 * 60 * 60 * 1000;

/** What every pending link of `providerId` starts with */
export const pendingLinkPrefix = (providerId: string): string =>
  `${PENDING_LINK_PREFIX}${encodeURIComponent(providerId)}:`;

/**
 * The key of the pending links' hash: the plugin's `secret`, the one the engine signs with. It is
 * required in production; without it the key is empty, as the hash then only keeps the address out of
 * the identifier.
 */
export const pendingLinkSecret = (strapi: Core.Strapi): string =>
  strapi.config.get<string | undefined>(`plugin::${PLUGIN_ID}.secret`) ?? '';

/** The identifier of the pending link of `providerId` for `email`, in any capitals */
export const pendingLinkIdentifier = (providerId: string, email: string, secret: string): string =>
  `${pendingLinkPrefix(providerId)}${createHmac('sha256', secret)
    .update(normalizeEmail(email))
    .digest('hex')}`;
