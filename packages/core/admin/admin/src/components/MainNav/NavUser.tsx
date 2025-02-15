import * as React from 'react';
import {
  Flex,
  Menu,
  ButtonProps,
  VisuallyHidden,
  Avatar,
  Typography,
  Badge,
} from '@strapi/design-system';
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
  padding: 0;
  max-height: 300px;
  // min-width: 240px;
  width: max-content;
  max-width: 240px;
`;

const UserInfo = styled(Flex)`
  && {
    padding: ${({ theme }) => theme.spaces[4]};
  }
  align-items: flex-start;
`;

const BadgeWrapper = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spaces[2]};

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

const StyledMenuSeparator = styled(Menu.Separator)`
  margin: 0;
  height: 1px;
  background: ${({ theme }) => theme.colors.neutral150};
`;

export interface NavUserProps extends ButtonProps {
  initials: string;
}

export const NavUser = ({ initials, ...props }: NavUserProps) => {
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

  const displayName =
    user?.firstname && user?.lastname
      ? `${user.firstname} ${user.lastname}`
      : user?.username || 'Unknown User';

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
          <VisuallyHidden tag="span">{displayName}</VisuallyHidden>
        </MenuTrigger>

        <MenuContent popoverPlacement="top-start" zIndex={3}>
          <UserInfo direction="column" gap={0} alignItems="flex-start">
            <Typography variant="omega" fontWeight="bold" textTransform="none">
              {displayName}
            </Typography>
            <StyledTypography variant="pi" textColor="neutral600">
              {user?.email}
            </StyledTypography>
            <BadgeWrapper>
              {user?.roles?.map((role) => <Badge key={role.id}>{role.name}</Badge>)}
            </BadgeWrapper>
          </UserInfo>

          <StyledMenuSeparator />

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

export default NavUser;
