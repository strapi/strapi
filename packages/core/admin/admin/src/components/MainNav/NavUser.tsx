import React from 'react';

import { Initials, Flex, ButtonProps, VisuallyHidden } from '@strapi/design-system';

export interface NavUserProps extends ButtonProps {
  id: string;
  initials: string;
  children?: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
}

export const NavUser = React.forwardRef<HTMLButtonElement, NavUserProps>(
  ({ children, initials, ...props }, ref) => {
    return (
      <Flex paddingTop={3} paddingBottom={3} justifyContent="center" {...props}>
        <Flex as="button" justifyContent="center" ref={ref}>
          <Initials>{initials}</Initials>
          <VisuallyHidden>
            <span>{children}</span>
          </VisuallyHidden>
        </Flex>
      </Flex>
    );
  }
);
