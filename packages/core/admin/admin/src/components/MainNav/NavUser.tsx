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
  padding: 0;
  max-height: 300px;
  width: max-content;
  max-width: 240px;
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

const getDisplayUserName = (user: any) =>
  user?.firstname && user?.lastname
    ? `${user.firstname} ${user.lastname}`
    : user?.username || 'Unknown User';

const StyledMenuSeparator = styled(Menu.Separator)`
  margin: 0;
  height: 1px;
  background: ${({ theme }) => theme.colors.neutral150};
`;

export interface NavUserProps extends ButtonProps {
  initials: string;
}

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

  const displayUserName = React.useMemo(() => getDisplayUserName(user), [user]);

  return (
    <Flex
      justifyContent="center"
      padding={1}
      borderStyle="solid"
      borderWidth="1px 0 0 0"
      borderColor="neutral150"
      {...props}
    >
      <Menu.Root>
        <MenuTrigger endIcon={null} fullWidth justifyContent="center">
          <Avatar.Item delayMs={0} fallback={initials} />
          <VisuallyHidden tag="span">{displayUserName}</VisuallyHidden>
        </MenuTrigger>
        <MenuContent popoverPlacement="top-start" zIndex={3}>
          {user && (
            <Flex
              direction="column"
              gap={0}
              alignItems="flex-start"
              padding={4}
            >
              <Typography
                variant="omega"
                fontWeight="bold"
                textTransform="none"
                
              >
                {displayUserName}
              </Typography>

              <Typography
                variant="pi"
                textColor="neutral600"
                marginBottom={3}
              >
                {user?.email}
              </Typography>

              <Flex wrap="wrap" gap={2} width="100%">
                {user?.roles?.map((role) => (
                  <Badge key={role.id}>{role.name}</Badge>
                ))}
              </Flex>
            </Flex>
          )}

          <StyledMenuSeparator />

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
