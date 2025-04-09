import * as React from 'react';

import { Flex, Menu, VisuallyHidden, Avatar, Typography, Badge } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';
import { styled } from 'styled-components';

import { useAuth } from '../../features/Auth';

const MenuTrigger = styled(Menu.Trigger)`
  height: ${({ theme }) => theme.spaces[7]};
  width: ${({ theme }) => theme.spaces[7]};
  border: none;
  border-radius: 50%;
  padding: 0;
  overflow: hidden;
`;

const MenuContent = styled(Menu.Content)`
  max-height: fit-content;
  width: 200px;
`;

const UserInfo = styled(Flex)`
  && {
    padding: ${({ theme }) => theme.spaces[3]};
  }
  align-items: flex-start;
`;

const BadgeWrapper = styled(Flex)`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spaces[1]};

  width: 100%;
`;
const StyledTypography = styled(Typography)`
  margin-bottom: ${({ theme }) => theme.spaces[3]};
`;

const MenuItem = styled(Menu.Item)`
  & > span {
    width: 100%;
    display: flex;
    align-items: center;
    gap: ${({ theme }) => theme.spaces[3]};
  }
`;

const MenuItemDanger = styled(MenuItem)`
  &:hover {
    background: ${({ theme }) => theme.colors.danger100};
  }
`;

export interface NavUserProps {
  initials: string;
  children: React.ReactNode;
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

        <MenuContent popoverPlacement="top-start" zIndex={3}>
          <UserInfo direction="column" gap={0} alignItems="flex-start">
            <Typography variant="omega" fontWeight="bold" textTransform="none">
              {children}
            </Typography>
            <StyledTypography variant="pi" textColor="neutral600">
              {user?.email}
            </StyledTypography>
            <BadgeWrapper>
              {user?.roles?.map((role) => <Badge key={role.id}>{role.name}</Badge>)}
            </BadgeWrapper>
          </UserInfo>

          <Menu.Separator />

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
