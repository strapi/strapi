import type { Core } from '@strapi/types';

import type { SignInMethod } from '../../../shared/contracts/settings';
import { PLUGIN_ID } from '../constants';
import { resolveBasePath } from '../engine/better-auth/base-path';
import { requestPathname } from '../engine/better-auth/handler';
import type settingsService from '../services/settings';

/**
 * Which of Better Auth's endpoints the catch-all route lets through.
 *
 * Better Auth's router only has the endpoints of the plugins that are installed, so an endpoint of
 * a plugin that is off (magic link, passkeys, JWT, anonymous sign-in...) is a 404 without any help.
 * The one set that must be refused is the admin plugin's: it is installed for its ban fields and its
 * check when a session is created, but its endpoints (list users, set a role, ban, impersonate,
 * remove a user) would act on end users outside the Content Manager's permissions, and the Strapi
 * admin replaces them.
 *
 * The other refusal is per request: an administrator can turn a sign-in method off (Settings, Sign-in),
 * and its endpoints answer 404 from the next request, as if it were not installed. A method that is
 * not installed is a 404 from Better Auth already, and cannot be turned on.
 *
 * Endpoints are matched on the path of the request Better Auth will receive (see `requestPathname`),
 * relative to the base path, by their first segment, whatever its case or encoding.
 */
const BLOCKED_ROOT_SEGMENTS: ReadonlySet<string> = new Set(['admin']);

/** The path as a person would read it: percent-decoded when it can be. */
const decoded = (path: string) => {
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
};

/** The part of `pathname` after `basePath`, or `null` when it is not under it. */
const relativeTo = (pathname: string, basePath: string) =>
  pathname.startsWith(`${basePath}/`) ? pathname.slice(basePath.length) : null;

const firstSegment = (path: string) => path.split('/').find(Boolean)?.toLowerCase() ?? '';

/**
 * Better Auth does not decode the path it routes on, so `%61dmin` is not `admin` to it. The
 * decoded path is judged as well anyway: a router that did decode must not be a way round this.
 */
const isBlocked = (relative: string) =>
  BLOCKED_ROOT_SEGMENTS.has(firstSegment(relative)) ||
  BLOCKED_ROOT_SEGMENTS.has(firstSegment(decoded(relative)));

/**
 * The endpoints each method that can be turned off owns, by first segment and, for the sign-in
 * endpoints, by the segment after `/sign-in`. `paths` are single endpoints, `root/segment`.
 *
 * Two-factor is the exception: turning it off blocks enrolment only (Better Auth 1.7.14's
 * `/two-factor/enable`, `get-totp-uri` and `generate-backup-codes`). The verify endpoints
 * (`verify-totp`, `verify-otp`, `verify-backup-code`) and `send-otp` stay, so a user who already
 * has two-factor can finish signing in, and `disable` stays so they can still turn it off.
 */
const METHOD_ENDPOINTS: ReadonlyArray<{
  method: SignInMethod;
  roots: readonly string[];
  signIn: readonly string[];
  paths?: readonly string[];
}> = [
  {
    method: 'emailPassword',
    // Sign-up is also `signUp.enabled`. Password reset only has a use where there are passwords.
    roots: ['sign-up', 'forget-password', 'request-password-reset', 'reset-password'],
    signIn: ['email'],
  },
  { method: 'username', roots: ['is-username-available'], signIn: ['username'] },
  {
    method: 'twoFactor',
    roots: [],
    signIn: [],
    paths: ['two-factor/enable', 'two-factor/get-totp-uri', 'two-factor/generate-backup-codes'],
  },
  { method: 'magicLink', roots: ['magic-link'], signIn: ['magic-link'] },
  { method: 'emailOtp', roots: ['email-otp'], signIn: ['email-otp'] },
  { method: 'passkey', roots: ['passkey'], signIn: ['passkey'] },
];

const segments = (path: string) =>
  path
    .split('/')
    .filter(Boolean)
    .map((part) => part.toLowerCase());

/** The methods whose endpoint `relative` is, read as the raw path and as the decoded one. */
const methodsOf = (relative: string): Set<SignInMethod> => {
  const found = new Set<SignInMethod>();

  for (const parts of [segments(relative), segments(decoded(relative))]) {
    for (const { method, roots, signIn, paths = [] } of METHOD_ENDPOINTS) {
      if (
        roots.includes(parts[0]) ||
        (parts[0] === 'sign-in' && signIn.includes(parts[1])) ||
        paths.includes(`${parts[0]}/${parts[1]}`)
      ) {
        found.add(method);
      }
    }
  }

  return found;
};

/**
 * Whether the endpoint at `relative` (its path under the base path, `/reset-password`) may be called:
 * not one of the blocked ones, and not one of a sign-in method an administrator has turned off. The
 * catch-all route asks it of every request, and so does every other way into the engine (the GraphQL
 * compat operations).
 */
export const isEndpointAllowed = async (
  strapi: Core.Strapi,
  relative: string
): Promise<boolean> => {
  if (isBlocked(relative)) {
    return false;
  }

  const owners = methodsOf(relative);

  if (owners.size === 0) {
    return true;
  }

  const { methods } = await (
    strapi.plugin(PLUGIN_ID).service('settings') as ReturnType<typeof settingsService>
  ).get();

  return [...owners].every((method) => methods[method]);
};

export const endpointAllowlist: Core.MiddlewareFactory = (_config, { strapi }) => {
  const basePath = resolveBasePath(strapi.config);

  return async (ctx, next) => {
    const relative = relativeTo(requestPathname(ctx), basePath);

    // Not under the base path: Better Auth would answer 404, so the answer is the same
    if (relative === null || !(await isEndpointAllowed(strapi, relative))) {
      return ctx.notFound();
    }

    return next();
  };
};

export default endpointAllowlist;
