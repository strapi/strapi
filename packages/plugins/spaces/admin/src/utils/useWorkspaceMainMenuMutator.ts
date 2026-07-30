import { DEFAULT_SPACE_SLUG, getCurrentSpaceSlug } from './currentSpace';

import type { Menu, MenuMutator } from '@strapi/admin/strapi-admin';

const CTB_LINK_RE = /content-type-builder/;

/**
 * The schema is global, so the Content-Type Builder only exists in the default
 * workspace — a hard rule, not a capability. Registered through the admin's
 * `registerMenuMutator` seam; the server 404s the CTB routes outside default
 * as the enforcement half.
 */
export const useWorkspaceMainMenuMutator = (): MenuMutator => {
  const currentSlug = getCurrentSpaceSlug();

  return (menu: Menu): Menu => {
    if (currentSlug === DEFAULT_SPACE_SLUG) {
      return menu;
    }

    return {
      ...menu,
      pluginsSectionLinks: menu.pluginsSectionLinks.filter(
        (link) => !CTB_LINK_RE.test(String(link.to))
      ),
    };
  };
};
