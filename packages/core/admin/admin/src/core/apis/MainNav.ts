/* eslint-disable check-file/filename-naming-convention */

import invariant from 'invariant';

import type { Permission } from '../../../../shared/contracts/shared';
import type { MessageDescriptor } from 'react-intl';

interface MainNavMenuCurrent {
  /** Read after the menu label in the tooltip and accessible name, e.g. "Space: Control center" */
  label: string;
  /** Shown in the trigger instead of the menu `icon` */
  icon?: React.ReactNode;
}

interface MainNavMenuArgs {
  id: string;
  /** Shown in the trigger while `useCurrent` returns no value */
  icon: React.ElementType;
  intlLabel: MessageDescriptor;
  /** The menu shows when the user has one of them at least. All users see it without */
  permissions?: Permission[];
  /** A hook that returns the value the trigger shows, or `null` */
  useCurrent?: () => MainNavMenuCurrent | null;
  /**
   * Rendered inside the design system `Menu.Content`: `Menu.Item`, `Menu.Label`,
   * `Menu.Separator`. Selecting an item closes the menu
   */
  Content: React.ComponentType;
}

class MainNav {
  menus: MainNavMenuArgs[] = [];

  addMenu = (menu: MainNavMenuArgs) => {
    invariant(menu.id, 'An id must be provided');
    invariant(menu.icon, 'An icon must be provided');
    invariant(menu.intlLabel, 'An intlLabel must be provided');
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
