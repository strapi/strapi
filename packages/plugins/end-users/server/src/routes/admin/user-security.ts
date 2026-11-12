import type { Core } from '@strapi/types';

import { USER_SECURITY_ACTIONS } from '../../admin-actions';
import { guard } from './guard';

/**
 * One end user's security, under `/end-users/users/:documentId`.
 * `:documentId`, never the database id.
 *
 * The reads need only a signed-in admin: the Content Manager's `explorer.read` on the end-user type
 * is checked by the controller, with the admin's own ability and the user in hand. The changes need
 * the plugin's `security.manage` as well, and the controller then checks `explorer.update` the same
 * way: the Content Manager's update permission alone is a routine editor's, and these changes can
 * take an account over. No `PATCH`: the changes are `POST`s, as they are actions, not edits of a
 * document.
 */
const signedIn: Core.RouteConfig = { policies: ['admin::isAuthenticatedAdmin'] };
const mayManage: Core.RouteConfig = guard(USER_SECURITY_ACTIONS.manage);

const route = (
  method: 'GET' | 'POST' | 'DELETE',
  path: string,
  handler: string,
  config: Core.RouteConfig = mayManage
): Core.RouteInput => ({
  method,
  path: `/users/:documentId${path}`,
  handler: `user-security.${handler}`,
  config,
});

const routes: Core.RouterInput = {
  type: 'admin',
  routes: [
    route('GET', '/security', 'find', signedIn),
    route('GET', '/effective-permissions', 'effectivePermissions', signedIn),
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
