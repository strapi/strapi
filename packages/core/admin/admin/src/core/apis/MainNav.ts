/* eslint-disable check-file/filename-naming-convention */

import invariant from 'invariant';

import type { Permission } from '../../../../shared/contracts/shared';
import type { MessageDescriptor } from 'react-intl';

interface MainNavMenuCurrent {
  /** Read after the menu label in the tooltip and accessible name, e.g. "Space: Control center" */
  label: string;
  /** Shown in the trigger, for example the avatar of the current space */
  icon: React.ReactNode;
  /** Shows the value without opening a menu, for example when there is nothing to switch to */
  readOnly?: boolean;
}

interface MainNavMenuArgs {
  id: string;
  intlLabel: MessageDescriptor;
  /** The menu shows when the user has one of them at least. All users see it without */
  permissions?: Permission[];
  /**
   * A hook that returns the value the trigger shows. The menu is hidden while it returns `null`,
   * for example while its data loads or when there is nothing to show
   */
  useCurrent: () => MainNavMenuCurrent | null;
  /**
   * Rendered inside the design system `Menu.Content`: `Menu.Item`, `Menu.Label`,
   * `Menu.Separator`. Selecting an item closes the menu
   */
  Content: React.ComponentType;
}

class MainNav {
  menus: MainNavMenuArgs[] = [];
  private isLocked = false;

  /**
   * Called once the admin renders: the navigation reads the registry on every render, so menus
   * added later would not show until something re-renders it
   */
  lock = () => {
    this.isLocked = true;
  };

  addMenu = (menu: MainNavMenuArgs) => {
    invariant(
      !this.isLocked,
      'Main navigation menus must be added in register, before the admin renders'
    );
    invariant(menu.id, 'An id must be provided');
    invariant(menu.intlLabel, 'An intlLabel must be provided');
    invariant(typeof menu.useCurrent === 'function', 'A useCurrent hook must be provided');
    invariant(menu.Content, 'A Content component must be provided');
    invariant(
      !this.menus.some(({ id }) => id === menu.id),
      `A main navigation menu with the id "${menu.id}" has already been added`
    );

    this.menus.push(menu);
  };
}

export { MainNav };
export type { MainNavMenuArgs, MainNavMenuCurrent };
