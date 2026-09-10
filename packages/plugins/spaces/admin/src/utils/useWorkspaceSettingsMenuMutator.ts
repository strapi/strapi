import { DEFAULT_SPACE_SLUG, useCurrentSpaceSlug } from './currentSpace';

import type { SettingsMenu, SettingsMenuMutator } from '@strapi/admin/strapi-admin';

/**
 * Settings entries that only exist in the default workspace: workspace
 * management, and the licence / seats / upsell surfaces (instance-level).
 * Everything else is decided by the users' roles, as anywhere in Strapi.
 * Registered through the admin's `registerSettingsMenuMutator` seam; the
 * server enforces the management rule too.
 */
export const useWorkspaceSettingsMenuMutator = (): SettingsMenuMutator => {
  const currentSlug = useCurrentSpaceSlug();

  return (menu: SettingsMenu): SettingsMenu => {
    if (currentSlug === DEFAULT_SPACE_SLUG) {
      return menu;
    }

    const hiddenLinkIds = new Set([
      'workspaces',
      '000-application-infos',
      ...menu.flatMap((section) =>
        section.links.map((link) => String(link.id)).filter((id) => id.endsWith('-purchase-page'))
      ),
    ]);

    return menu.map((section) => ({
      ...section,
      links: section.links.filter((link) => !hiddenLinkIds.has(String(link.id))),
    }));
  };
};
