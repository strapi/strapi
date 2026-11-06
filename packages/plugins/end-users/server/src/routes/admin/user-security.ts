import type { Core } from '@strapi/types';

/**
 * One end user's security, under `/end-users/users/:documentId`.
 * `:documentId`, never the database id.
 *
 * The routes need only a signed-in admin: the Content Manager's `explorer.read` (the reads) or
 * `explorer.update` (everything else) on the end-user type is checked by the controller, with the
 * admin's own ability and the user in hand. No `PATCH`: the changes are `POST`s, as
 * they are actions, not edits of a document.
 */
const signedIn: Core.RouteConfig = { policies: ['admin::isAuthenticatedAdmin'] };

const route = (
  method: 'GET' | 'POST' | 'DELETE',
  path: string,
  handler: string
): Core.RouteInput => ({
  method,
  path: `/users/:documentId${path}`,
  handler: `user-security.${handler}`,
  config: signedIn,
});

const routes: Core.RouterInput = {
  type: 'admin',
  routes: [
    route('GET', '/security', 'find'),
    route('GET', '/effective-permissions', 'effectivePermissions'),
    route('DELETE', '/sessions', 'revokeSessions'),
    route('DELETE', '/sessions/:sessionId', 'revokeSession'),
    route('DELETE', '/accounts/:accountId', 'unlinkAccount'),
    route('POST', '/ban', 'ban'),
    route('POST', '/unban', 'unban'),
    route('POST', '/unlock', 'unlock'),
    route('POST', '/two-factor/reset', 'resetTwoFactor'),
    route('POST', '/send-password-reset', 'sendPasswordReset'),
    route('POST', '/send-verification', 'sendVerification'),
  ],
};

export default routes;
