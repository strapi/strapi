import React from 'react';

import {
  Initials,
  Flex,
  Menu,
  ButtonProps,
  VisuallyHidden,
  Typography,
} from '@strapi/design-system';
import { SignOut } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { NavLink as RouterNavLink } from 'react-router-dom';
import styled from 'styled-components';

import { useAuth } from '../../features/Auth';

export interface NavUserProps extends ButtonProps {
  initials: string;
  children?: React.ReactNode;
}

/**
 * TODO: this needs to be solved in the Design-System
 */
const MenuTrigger = styled(Menu.Trigger)`
  height: 100%;
`;

const MenuContent = styled(Menu.Content)`
  left: ${({ theme }) => theme.spaces[5]};
`;

const LinkUser = styled(RouterNavLink)<{ logout?: boolean }>`
  display: flex;
  width: 100%;
  justify-content: space-between;
  align-items: center;
  text-decoration: none;
  padding: ${({ theme }) => `${theme.spaces[2]} ${theme.spaces[4]}`};
  border-radius: ${({ theme }) => theme.spaces[1]};

  &:hover {
    background: ${({ theme, logout }) =>
      logout ? theme.colors.danger100 : theme.colors.primary100};
    text-decoration: none;
  }

  svg {
    fill: ${({ theme }) => theme.colors.danger600};
    width: 1.6rem;
    height: 1.6rem;
  }
`;

export const NavUser = React.forwardRef<HTMLDivElement, NavUserProps>(
  ({ children, initials, ...props }, ref) => {
    const { formatMessage } = useIntl();
    const logout = useAuth('Logout', (state) => state.logout);
    return (
      <Flex ref={ref} justifyContent="center" {...props}>
        <Menu.Root>
          <MenuTrigger endIcon={null} fullWidth justifyContent="center">
            <Initials>{initials}</Initials>
            <VisuallyHidden as="span">{children}</VisuallyHidden>
          </MenuTrigger>
          <MenuContent popoverPlacement="top" zIndex={3} width="15rem">
            <LinkUser to="/me">
              <Typography>
                {formatMessage({
                  id: 'global.profile',
                  defaultMessage: 'Profile',
                })}
              </Typography>
            </LinkUser>
            <LinkUser onClick={logout} to="/auth/login">
              <Typography textColor="danger600">
                {formatMessage({
                  id: 'app.components.LeftMenu.logout',
                  defaultMessage: 'Logout',
                })}
              </Typography>
              <SignOut />
            </LinkUser>
          </MenuContent>
        </Menu.Root>
      </Flex>
    );
  }
);
