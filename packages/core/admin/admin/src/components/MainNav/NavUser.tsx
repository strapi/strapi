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
  height: ${({ theme }) => theme.spaces[7]};
  width: ${({ theme }) => theme.spaces[7]};
  border: none;
  border-radius: 50%;
  // Removes inherited 16px padding
  padding: 0;
  // Prevent empty pixel from appearing below the main nav
  overflow: hidden;
`;

const MenuContent = styled(Menu.Content)`
  left: ${({ theme }) => theme.spaces[3]};
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

const MenuItemDanger = styled(MenuItem)`
  &:hover {
    ${({ theme }) => `
    background: ${theme.colors.danger100};
  `}
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
    <Flex
      justifyContent="center"
      padding={3}
      borderStyle="solid"
      borderWidth="1px 0 0 0"
      borderColor="neutral150"
      {...props}
    >
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

          <MenuItemDanger onSelect={handleLogout} color="danger600">
            {formatMessage({
              id: 'app.components.LeftMenu.logout',
              defaultMessage: 'Logout',
            })}
            <SignOut />
          </MenuItemDanger>
        </MenuContent>
      </Menu.Root>
    </Flex>
  );
};
