import type { Core } from '@strapi/types';

/**
 * RBAC actions owned by the Branches plugin (`plugin::branches.<uid>`).
 * Content-level permissions on the documents themselves keep being enforced by
 * the Content Manager: these only gate the branch lifecycle.
 */
// NOTE: `category` is only legal for `section: 'settings'` actions — the action
// registry rejects it on the plugins section (plugins are grouped by pluginName).
const actions = [
  {
    section: 'plugins',
    pluginName: 'branches',
    displayName: 'Read branches and their changes',
    uid: 'read',
  },
  {
    section: 'plugins',
    pluginName: 'branches',
    displayName: 'Create branches',
    uid: 'create',
  },
  {
    section: 'plugins',
    pluginName: 'branches',
    displayName: 'Update branches (rename, archive, discard changes)',
    uid: 'update',
  },
  {
    section: 'plugins',
    pluginName: 'branches',
    displayName: 'Delete branches',
    uid: 'delete',
  },
  {
    section: 'plugins',
    pluginName: 'branches',
    displayName: 'Merge branches into their parent',
    uid: 'merge',
  },
];

export const registerBranchesActions = async (strapi: Core.Strapi) => {
  const { actionProvider } = strapi.service('admin::permission') as any;

  await actionProvider.registerMany(actions);
};
