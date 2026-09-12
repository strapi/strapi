import { ACTIONS } from '../../../shared/constants';

const withPermission = (...actions: string[]) => ({
  policies: ['admin::isAuthenticatedAdmin', { name: 'admin::hasPermissions', config: { actions } }],
});

/**
 * Only authentication is required here: every administrator needs to know which
 * spaces they may work in, and the answer is derived from their own
 * memberships. Everything that changes a space, or reads another user's
 * access, is behind a permission.
 */
const authenticatedOnly = { policies: ['admin::isAuthenticatedAdmin'] };

export default {
  type: 'admin' as const,
  routes: [
    {
      method: 'GET',
      path: '/mine',
      handler: 'spaces.mine',
      config: authenticatedOnly,
    },
    {
      method: 'GET',
      path: '/spaces',
      handler: 'spaces.find',
      config: withPermission(ACTIONS.read),
    },
    {
      method: 'GET',
      path: '/settings',
      handler: 'spaces.settings',
      config: withPermission(ACTIONS.read),
    },
    {
      method: 'POST',
      path: '/spaces',
      handler: 'spaces.create',
      config: withPermission(ACTIONS.manage),
    },
    {
      method: 'PUT',
      path: '/spaces/:id',
      handler: 'spaces.update',
      config: withPermission(ACTIONS.manage),
    },
    {
      method: 'PUT',
      path: '/spaces/:id/default',
      handler: 'spaces.setDefault',
      config: withPermission(ACTIONS.manage),
    },
    {
      method: 'GET',
      path: '/spaces/:id/deletion-preview',
      handler: 'spaces.deletionPreview',
      config: withPermission(ACTIONS.manage),
    },
    {
      method: 'DELETE',
      path: '/spaces/:id',
      handler: 'spaces.delete',
      config: withPermission(ACTIONS.manage),
    },
    {
      method: 'GET',
      path: '/spaces/:spaceId/members',
      handler: 'members.find',
      config: withPermission(ACTIONS.manageMembers),
    },
    {
      method: 'GET',
      path: '/spaces/:spaceId/members/candidates',
      handler: 'members.candidates',
      config: withPermission(ACTIONS.manageMembers, 'admin::users.read'),
    },
    {
      method: 'POST',
      path: '/spaces/:spaceId/members',
      handler: 'members.upsert',
      config: withPermission(ACTIONS.manageMembers),
    },
    {
      method: 'DELETE',
      path: '/spaces/:spaceId/members/:userId',
      handler: 'members.remove',
      config: withPermission(ACTIONS.manageMembers),
    },
  ],
};
