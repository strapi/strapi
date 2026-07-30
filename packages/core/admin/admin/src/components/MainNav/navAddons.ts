import type * as React from 'react';

/**
 * Extension point: plugins can mount a compact widget in the main navigation,
 * right above the user avatar (e.g. @strapi/plugin-spaces mounts its workspace
 * switcher there). Registration happens during a plugin's `register(app)` /
 * `bootstrap(app)`, which always runs before the admin shell renders, so plain
 * module state is enough — no reactivity needed.
 *
 * Widgets render inside the icon-wide desktop nav: keep the collapsed trigger
 * ~4rem (the `NavUser` avatar is the reference) and open a Menu/Popover for
 * anything larger.
 */

interface MainNavAddon {
  id: string;
  Component: React.ComponentType;
}

const mainNavAddons: MainNavAddon[] = [];

export const registerMainNavAddon = (addon: MainNavAddon) => {
  const index = mainNavAddons.findIndex((item) => item.id === addon.id);
  if (index === -1) {
    mainNavAddons.push(addon);
  } else {
    mainNavAddons[index] = addon;
  }
};

export const getMainNavAddons = (): readonly MainNavAddon[] => mainNavAddons;

export type { MainNavAddon };
