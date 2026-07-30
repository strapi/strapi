import type { Core } from '@strapi/types';

/**
 * RBAC actions owned by the Spaces plugin. `uid: 'move-entry'` + `pluginName:
 * 'spaces'` yields the fully-qualified `plugin::spaces.move-entry` action the
 * admin UI checks (see `admin/src/constants.ts`) and the `POST /spaces/move`
 * route policy enforces.
 */
// NOTE: `category` is only legal for `section: 'settings'` actions — the action
// registry rejects it on the plugins section (plugins are grouped by pluginName).
const actions = [
  {
    section: 'plugins',
    pluginName: 'spaces',
    displayName: 'Move entries between spaces',
    uid: 'move-entry',
  },
  {
    section: 'plugins',
    pluginName: 'spaces',
    displayName: 'Create spaces',
    uid: 'create',
  },
  {
    section: 'plugins',
    pluginName: 'spaces',
    displayName: 'Update spaces (rename, recolor, archive)',
    uid: 'update',
  },
  {
    section: 'plugins',
    pluginName: 'spaces',
    displayName: 'Delete spaces',
    uid: 'delete',
  },
];

export const registerSpacesActions = async (strapi: Core.Strapi) => {
  const { actionProvider } = strapi.service('admin::permission') as any;

  await actionProvider.registerMany(actions);
};
