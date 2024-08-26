import * as React from 'react';

import { Flex, Menu, ButtonProps, VisuallyHidden, Avatar } from '@strapi/design-system';
import { SignOut } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';
import { styled } from 'styled-components';

import { useAuth } from '../../features/Auth';

export interface NavUserProps extends ButtonProps {
  initials: string;
  children?: React.ReactNode;
}

const MenuTrigger = styled(Menu.Trigger)`
  height: 100%;
  border-radius: 0;
  border-width: 1px 0 0 0;
  border-color: ${({ theme }) => theme.colors.neutral150};
  border-style: solid;
  padding: ${({ theme }) => theme.spaces[3]};
  // padding 12px - 1px border width
  padding-top: 11px;
  // Prevent empty pixel from appearing below the main nav
  overflow: hidden;
`;

const MenuContent = styled(Menu.Content)`
  left: ${({ theme }) => theme.spaces[5]};
`;

const MenuItem = styled(Menu.Item)`
  & > span {
    width: 100%;
    display: flex;
    align-items: center;
    gap: ${({ theme }) => theme.spaces[3]};
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
          <Avatar.Item delayMs={0} fallback={initials} />
          <VisuallyHidden tag="span">{children}</VisuallyHidden>
        </MenuTrigger>
        <MenuContent popoverPlacement="top-center" zIndex={3}>
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
