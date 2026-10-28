import type { Core } from '@strapi/types';

import { getService } from './utils';

// Add permissions
const RBAC_ACTIONS = [
  {
    section: 'plugins',
    displayName: 'Access the Documentation',
    uid: 'read',
    pluginName: 'documentation',
  },
  {
    section: 'plugins',
    displayName: 'Update and delete',
    uid: 'settings.update',
    pluginName: 'documentation',
  },
  {
    section: 'plugins',
    displayName: 'Regenerate',
    uid: 'settings.regenerate',
    pluginName: 'documentation',
  },
  {
    section: 'settings',
    displayName: 'Access the documentation settings page',
    uid: 'settings.read',
    pluginName: 'documentation',
    category: 'documentation',
  },
] as const;

// The declared permission action IDs match the registered actions.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type ActionIds = Core.Assert<
  Core.SameNames<
    Core.PermissionActionId<(typeof RBAC_ACTIONS)[number]>,
    Extract<Core.RegisteredPermissionAction, `plugin::documentation.${string}`>
  >
>;

export async function bootstrap({ strapi }: { strapi: Core.Strapi }) {
  await strapi.service('admin::permission').actionProvider.registerMany(RBAC_ACTIONS);

  const pluginStore = strapi.store!({
    environment: '',
    type: 'plugin',
    name: 'documentation',
  });

  const config = await pluginStore.get({ key: 'config' });

  if (!config) {
    pluginStore.set({ key: 'config', value: { restrictedAccess: false } });
  }
  if (process.env.NODE_ENV !== 'production') {
    await getService('documentation').generateFullDoc();
  }
}
