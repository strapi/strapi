import { Flex, Status, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { isMfaFeatureEnabled } from '../../../../../utils/mfaFeature';

import type { AdminUserMfaState } from '../../../../../../../shared/contracts/user';

/**
 * The account's login state: Active, Inactive or Locked. A lock stops password login, so it wins
 * over the active flag; the lock only exists while the two-factor feature is on.
 */
const UserStatus = ({ user }: { user: { isActive?: boolean } & AdminUserMfaState }) => {
  const { formatMessage } = useIntl();

  const [variant, label] =
    isMfaFeatureEnabled() && user.mfaLockedAt
      ? ([
          'danger',
          formatMessage({
            id: 'Settings.permissions.users.mfa.status.locked',
            defaultMessage: 'Locked',
          }),
        ] as const)
      : user.isActive
        ? ([
            'success',
            formatMessage({ id: 'Settings.permissions.users.active', defaultMessage: 'Active' }),
          ] as const)
        : ([
            'neutral',
            formatMessage({
              id: 'Settings.permissions.users.inactive',
              defaultMessage: 'Inactive',
            }),
          ] as const);

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
