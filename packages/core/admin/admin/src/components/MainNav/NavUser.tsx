import React from 'react';

import { Initials, Flex, Menu, ButtonProps, VisuallyHidden } from '@strapi/design-system';
import { SignOut } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';
import { styled } from 'styled-components';

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

const MenuItem = styled(Menu.Item)`
  span {
    width: 100%;
    display: flex;
    justify-content: space-between;
  }
`;

export const NavUser = ({ children, initials, ...props }: NavUserProps) => {
  const { formatMessage } = useIntl();
  const navigate = useNavigate();
  const logout = useAuth('Logout', (state) => state.logout);
  const handleProfile = () => {
    navigate('/me');
  };
  const handleLogout = () => {
    logout();
    navigate('/auth/login');
  };
  return (
    <Flex justifyContent="center" {...props}>
      <Menu.Root>
        <MenuTrigger endIcon={null} fullWidth justifyContent="center">
          <Initials>{initials}</Initials>
          <VisuallyHidden tag="span">{children}</VisuallyHidden>
        </MenuTrigger>
        <MenuContent popoverPlacement="top" zIndex={3} width="15rem">
          <MenuItem onSelect={handleProfile}>
            {formatMessage({
              id: 'global.profile',
              defaultMessage: 'Profile',
            })}
          </MenuItem>

          <MenuItem onSelect={handleLogout} color="danger600">
            {formatMessage({
              id: 'app.components.LeftMenu.logout',
              defaultMessage: 'Logout',
            })}
            <SignOut />
          </MenuItem>
        </MenuContent>
      </Menu.Root>
    </Flex>
  );
};
