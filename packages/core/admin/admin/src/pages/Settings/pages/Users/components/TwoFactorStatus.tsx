import { Flex, Status, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import type { AdminUserMfaState } from '../../../../../../../shared/contracts/user';

/**
 * One account's enforcement state, compact enough for a table cell: the same four states
 * `TwoFactorPanel` describes in full on the user's own page. Status text, not colour alone, carries
 * the meaning.
 */
const TwoFactorStatus = ({ user }: { user: AdminUserMfaState }) => {
  const { formatMessage, formatDate } = useIntl();

  if (user.mfaLockedAt) {
    return (
      <Flex>
        <Status size="S" variant="danger">
          <Typography tag="span" variant="omega" fontWeight="bold">
            {formatMessage({
              id: 'Settings.permissions.users.mfa.status.locked',
              defaultMessage: 'Locked',
            })}
          </Typography>
        </Status>
      </Flex>
    );
  }

  if (user.mfaEnabledAt) {
    return (
      <Flex>
        <Status size="S" variant="success">
          <Typography tag="span" variant="omega" fontWeight="bold">
            {formatMessage({
              id: 'Settings.permissions.users.mfa.status.enrolled',
              defaultMessage: 'Set up',
            })}
          </Typography>
        </Status>
      </Flex>
    );
  }

  if (user.mfaGraceUntil) {
    return (
      <Flex>
        <Status size="S" variant="warning">
          <Typography tag="span" variant="omega" fontWeight="bold">
            {formatMessage(
              {
                id: 'Settings.permissions.users.mfa.status.grace',
                defaultMessage: 'Due {date}',
              },
              { date: formatDate(user.mfaGraceUntil, { dateStyle: 'medium' }) }
            )}
          </Typography>
        </Status>
      </Flex>
    );
  }

  return (
    <Typography textColor="neutral600">
      {formatMessage({
        id: 'Settings.permissions.users.mfa.status.none',
        defaultMessage: 'Not set up',
      })}
    </Typography>
  );
};

export { TwoFactorStatus };
