import { useAuth } from '@strapi/admin/strapi-admin';
import { Avatar, Badge, Flex, Typography } from '@strapi/design-system';

import { getDisplayName } from '../utils/users';

/* -------------------------------------------------------------------------------------------------
 * ProfileWidget
 * -----------------------------------------------------------------------------------------------*/

const ProfileWidget = () => {
  const user = useAuth('User', (state) => state.user);
  const userDisplayName = getDisplayName(user);
  const initials =
    user?.firstname && user.lastname
      ? `${user?.firstname.substring(0, 1)}${user.lastname.substring(0, 1)}`
      : userDisplayName
          .split(' ')
          .map((name) => name.substring(0, 1))
          .join('')
          .substring(0, 2);

  return (
    <Flex direction="column" gap={3} height="100%" justifyContent="center">
      <Avatar.Item delayMs={0} fallback={initials} />
      {userDisplayName && (
        <Typography variant="beta" fontWeight="bold" textTransform="none">
          {userDisplayName}
        </Typography>
      )}
      {user?.email && (
        <Typography variant="omega" textColor="neutral600">
          {user?.email}
        </Typography>
      )}
      {user?.roles?.length && (
        <Flex marginTop={2} gap={1} wrap="wrap">
          {user?.roles?.map((role) => <Badge key={role.id}>{role.name}</Badge>)}
        </Flex>
      )}
    </Flex>
  );
};

export { ProfileWidget };
