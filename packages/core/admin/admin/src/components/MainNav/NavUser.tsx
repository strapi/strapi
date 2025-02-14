import * as React from 'react';

import { Flex, Menu, ButtonProps, VisuallyHidden, Avatar, Typography, Badge } from '@strapi/design-system';
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
  padding: 0;
  overflow: hidden;
`;

const MenuContent = styled(Menu.Content)`
  left: ${({ theme }) => theme.spaces[3]};
  width: auto;
  max-width: 300px;
  height: auto;
  max-height: 300px;
  overflow-y: auto;
  border-radius: ${({ theme }) => theme.spaces[2]};
  box-shadow: ${({ theme }) => theme.shadows.filterShadow};
  background: ${({ theme }) => theme.colors.neutral0};
  color: ${({ theme }) => theme.colors.neutral800};
`;

const MenuItem = styled(Menu.Item)`
  & > span {
    width: 100%;
    display: flex;
    align-items: flex-start;
    gap: 3px;
    justify-content: space-between;
  }
  color: ${({ theme }) => theme.colors.neutral800};
`;

const MenuItemDanger = styled(MenuItem)`
  color: ${({ theme }) => theme.colors.danger600};
  &:hover {
    ${({ theme }) => `
    background: ${theme.colors.danger100};
  `}
  }
`;

export const NavUser = ({ children, initials, ...props }: NavUserProps) => {
  const { formatMessage } = useIntl();
  const navigate = useNavigate();
  const user = useAuth('User', (state) => state.user);
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
          {user && (
            <Flex direction="column" padding={0} gap={0} alignItems="flex-start">
              <Flex direction="column" padding={4} gap={0} alignItems="flex-start">
                <Typography variant="beta" fontWeight="bold" style={{ marginBottom: '2px' }}>
                  {user.firstname ? `${user.firstname} ${user.lastname}` : user.username}
                </Typography>
                <Typography variant="pi" textColor="neutral600">
                  {user.email}
                </Typography>
                
                <Flex wrap="wrap" gap={1} style={{ paddingBlockStart: '12px'}}>
                  {user.roles.map((role) => (
                    <Badge key={role.id}>
                      {role.name}
                    </Badge>
                  ))}
                </Flex>
              </Flex>
            </Flex>
          )}
          <hr style={{ width: '100%', borderColor: '#4a4a6ac7', color: '#32324d'}} />
          <MenuItem onSelect={handleProfile}>
            {formatMessage({
              id: 'global.profileSettings',
              defaultMessage: 'Profile settings',
            })}
          </MenuItem>

          <MenuItemDanger onSelect={handleLogout}>
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
