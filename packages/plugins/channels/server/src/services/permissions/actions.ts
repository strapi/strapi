import type { Core } from '@strapi/types';

/**
 * RBAC actions owned by the Channels plugin (`plugin::channels.<uid>`).
 * Content-level permissions on the documents themselves keep being enforced by
 * the Content Manager: these only gate channel management and override resets.
 */
// NOTE: `category` is only legal for `section: 'settings'` actions — the action
// registry rejects it on the plugins section (plugins are grouped by pluginName).
const actions = [
  {
    section: 'plugins',
    pluginName: 'channels',
    displayName: 'Read channels and their overrides',
    uid: 'read',
  },
  {
    section: 'plugins',
    pluginName: 'channels',
    displayName: 'Create channels',
    uid: 'create',
  },
  {
    section: 'plugins',
    pluginName: 'channels',
    displayName: 'Update channels (rename, recolor, reorder, archive)',
    uid: 'update',
  },
  {
    section: 'plugins',
    pluginName: 'channels',
    displayName: 'Delete channels',
    uid: 'delete',
  },
  {
    section: 'plugins',
    pluginName: 'channels',
    displayName: 'Reset channel overrides on entries',
    uid: 'reset',
  },
];

export const registerChannelsActions = async (strapi: Core.Strapi) => {
  const { actionProvider } = strapi.service('admin::permission') as any;

  await actionProvider.registerMany(actions);
};
