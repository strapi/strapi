import { Flex, Status, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { isMfaFeatureEnabled } from '../../../../../utils/mfaFeature';

import type { AdminUserMfaState } from '../../../../../../../shared/contracts/user';

type UserStatusUser = { isActive?: boolean } & AdminUserMfaState;

/**
 * The account's login state: Active, Inactive or Locked. Inactive comes first: it blocks every
 * login, so an inactive account stays unusable whatever its lock says. A lock only stops password
 * login, and only exists while the two-factor feature is on. With the feature off this renders
 * exactly what the list showed before it.
 */
const UserStatus = ({ user }: { user: UserStatusUser }) => {
  if (!isMfaFeatureEnabled()) {
    return (
      <Flex>
        <Status size="S" variant={user.isActive ? 'success' : 'danger'}>
          <Typography tag="span" variant="omega" fontWeight="bold">
            {user.isActive ? 'Active' : 'Inactive'}
          </Typography>
        </Status>
      </Flex>
    );
  }

  return <MfaUserStatus user={user} />;
};

const MfaUserStatus = ({ user }: { user: UserStatusUser }) => {
  const { formatMessage } = useIntl();

  let variant: 'success' | 'neutral' | 'danger';
  let label: string;

  if (!user.isActive) {
    variant = 'neutral';
    label = formatMessage({
      id: 'Settings.permissions.users.inactive',
      defaultMessage: 'Inactive',
    });
  } else if (user.mfaLockedAt) {
    variant = 'danger';
    label = formatMessage({
      id: 'Settings.permissions.users.mfa.status.locked',
      defaultMessage: 'Locked',
    });
  } else {
    variant = 'success';
    label = formatMessage({ id: 'Settings.permissions.users.active', defaultMessage: 'Active' });
  }

  return (
    <Flex>
      <Status size="S" variant={variant}>
        <Typography tag="span" variant="omega" fontWeight="bold">
          {label}
        </Typography>
      </Status>
    </Flex>
  );
};

export { UserStatus };
