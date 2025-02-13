import * as React from 'react';

import {
  Flex,
  Menu,
  ButtonProps,
  VisuallyHidden,
  Avatar,
  Typography,
  Badge,
  Box,
} from '@strapi/design-system';
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
  max-height: none;
  max-width: 300px;
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
const UserInfoSection = styled(Box)`
  padding: ${({ theme }) => theme.spaces[4]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.neutral150};
`;

const MenuItemDanger = styled(MenuItem)`
  &:hover {
    ${({ theme }) => `
    background: ${theme.colors.danger100};
  `}
  }
`;
const sampleRoles = [
  { id: 1, name: 'Super Admin' },
  { id: 2, name: 'Content Editor' },
  { id: 3, name: 'API User' },
  { id: 4, name: 'Developer' },
  { id: 5, name: 'Moderator' },
];
export const NavUser = ({ children, initials, ...props }: NavUserProps) => {
  const { formatMessage } = useIntl();
  const navigate = useNavigate();
  const logout = useAuth('Logout', (state) => state.logout);
  const user = useAuth('User info', (state) => state.user);
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
          <UserInfoSection>
            <Typography variant="omega">
              {user?.firstname} {user?.lastname}
            </Typography>

            <Box>
              <Typography variant="pi" textColor="neutral600">
                {user?.email}
              </Typography>
            </Box>
            <Box paddingTop={3}>
              <Flex gap={2} wrap="wrap">
                {user?.roles?.map((role) => <Badge key={role.id}>{role.name}</Badge>)}
              </Flex>
            </Box>
          </UserInfoSection>
          <MenuItem onSelect={handleProfile}>
            {formatMessage({
              id: 'global.profile',
              defaultMessage: 'Profile settings',
            })}
          </MenuItem>

          <MenuItemDanger onSelect={handleLogout} color="danger600">
            {formatMessage({
              id: 'app.components.LeftMenu.logout',
              defaultMessage: 'Log out',
            })}
          </MenuItemDanger>
        </MenuContent>
      </Menu.Root>
    </Flex>
  );
};
