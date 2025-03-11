import * as React from 'react';

import { Menu, useComposedRefs } from '@strapi/design-system';

/* -------------------------------------------------------------------------------------------------
 * SimpleMenu
 * -----------------------------------------------------------------------------------------------*/

type SimpleMenuProps = Menu.TriggerProps &
  Pick<Menu.ContentProps, 'popoverPlacement' | 'intersectionId'> & {
    children?: React.ReactNode;
    onOpen?: () => void;
    onClose?: () => void;
  };

const SimpleMenu = React.forwardRef<HTMLButtonElement, SimpleMenuProps>(
  ({ children, onOpen, onClose, popoverPlacement, ...props }, forwardedRef) => {
    const triggerRef = React.useRef<HTMLButtonElement>(null);
    const composedRef = useComposedRefs(forwardedRef, triggerRef);

    const handleOpenChange = (isOpen: boolean) => {
      if (isOpen && typeof onOpen === 'function') {
        onOpen();
      } else if (!isOpen && typeof onClose === 'function') {
        onClose();
      }
    };

    return (
      <Menu.Root onOpenChange={handleOpenChange}>
        <Menu.Trigger ref={composedRef} {...props}>
          {props.label}
        </Menu.Trigger>
        <Menu.Content zIndex={10000} popoverPlacement={popoverPlacement}>
          {children}
        </Menu.Content>
      </Menu.Root>
    );
  }
);

const MenuItem = Menu.Item;
type MenuItemProps = Menu.ItemProps;

export { SimpleMenu, MenuItem, Menu };
export type { SimpleMenuProps, MenuItemProps };
