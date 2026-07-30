import { DEFAULT_CAPABILITIES, useGetMineSpacesQuery } from '../services/spaces';
import { DEFAULT_SPACE_SLUG, getCurrentSpaceSlug } from './currentSpace';

import type { SettingsMenu, SettingsMenuMutator } from '@strapi/admin/strapi-admin';

/**
 * Hides the Settings menu entries a workspace isn't entitled to (per its
 * capabilities — see CapabilitiesCard). Registered through the admin's
 * `registerSettingsMenuMutator` seam; the server enforces the same rule by
 * 404ing the underlying routes. The default workspace sees everything.
 */
export const useWorkspaceSettingsMenuMutator = (): SettingsMenuMutator => {
  const { data: spaces } = useGetMineSpacesQuery();
  const currentSlug = getCurrentSpaceSlug();

  return (menu: SettingsMenu): SettingsMenu => {
    if (currentSlug === DEFAULT_SPACE_SLUG) {
      return menu;
    }

    const current = spaces?.find((s) => s.slug === currentSlug);
    if (!current) {
      return menu;
    }

    const capabilities = { ...DEFAULT_CAPABILITIES, ...(current.capabilities ?? {}) };
    const hiddenLinkIds = new Set(
      [
        // Hard rule: workspaces are managed from the default workspace only.
        'workspaces',
        !capabilities.apiTokens && 'api-tokens',
        !capabilities.transferTokens && 'transfer-tokens',
        !capabilities.webhooks && 'webhooks',
        !capabilities.users && 'users',
        !capabilities.roles && 'roles',
        !capabilities.internationalization && 'internationalization',
        !capabilities.mediaLibrarySettings && 'media-library-settings',
      ].filter((id): id is string => typeof id === 'string')
    );

    if (hiddenLinkIds.size === 0) {
      return menu;
    }

    return menu.map((section) => ({
      ...section,
      links: section.links.filter((link) => !hiddenLinkIds.has(String(link.id))),
    }));
  };
};
