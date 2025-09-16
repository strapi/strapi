import * as React from 'react';

import { Flex, Menu, VisuallyHidden, Avatar, Typography, Badge } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';
import { styled } from 'styled-components';

import { useAuth } from '../../features/Auth';
import { getInitials, getDisplayName } from '../../utils/users';

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
  word-break: break-word;
  margin-bottom: ${({ theme }) => theme.spaces[3]};
`;

export interface NavUserProps {
  showDisplayName?: boolean;
}

export const NavUser = ({ showDisplayName = false, ...props }: NavUserProps) => {
  const { formatMessage } = useIntl();
  const navigate = useNavigate();
  const user = useAuth('User', (state) => state.user);
  const logout = useAuth('Logout', (state) => state.logout);
  const initials = getInitials(user);
  const userDisplayName = getDisplayName(user);

  const handleProfile = () => {
    navigate('/me');
  };

  const handleLogout = () => {
    logout();
    navigate('/auth/login');
  };

  return (
    <Flex {...props}>
      <Menu.Root>
        <Flex gap={3}>
          <MenuTrigger endIcon={null} fullWidth justifyContent="center">
            <Avatar.Item delayMs={0} fallback={initials} />
          </MenuTrigger>
          {showDisplayName ? (
            <Typography variant="omega">{userDisplayName}</Typography>
          ) : (
            <VisuallyHidden tag="span">{userDisplayName}</VisuallyHidden>
          )}
        </Flex>

        <MenuContent popoverPlacement="top-start" zIndex={3}>
          <UserInfo direction="column" gap={0} alignItems="flex-start">
            <Typography variant="omega" fontWeight="bold" textTransform="none">
              {userDisplayName}
            </Typography>
            <StyledTypography variant="pi" textColor="neutral600">
              {user?.email}
            </StyledTypography>
            <BadgeWrapper>
              {user?.roles?.map((role) => <Badge key={role.id}>{role.name}</Badge>)}
            </BadgeWrapper>
          </UserInfo>

          <Menu.Separator />

          <Menu.Item onSelect={handleProfile}>
            {formatMessage({
              id: 'global.profile.settings',
              defaultMessage: 'Profile settings',
            })}
          </Menu.Item>

          <Menu.Item variant="danger" onSelect={handleLogout} color="danger600">
            {formatMessage({
              id: 'app.components.LeftMenu.logout',
              defaultMessage: 'Log out',
            })}
          </Menu.Item>
        </MenuContent>
      </Menu.Root>
    </Flex>
  );
};
