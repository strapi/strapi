import { Flex, Status, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { getMfaRequirement, type MfaRequirement } from '../../../../../utils/mfaRequirement';

import type { AdminUserMfaState } from '../../../../../../../shared/contracts/user';

/**
 * The requirement as one line of text, or nothing when the account has none. Shared with
 * `TwoFactorPanel`, so the list and the user page word it the same way.
 */
const MfaRequirementText = ({ requirement }: { requirement: MfaRequirement }) => {
  const { formatMessage } = useIntl();

  switch (requirement.kind) {
    case 'nextLogin':
      return formatMessage({
        id: 'Settings.permissions.users.mfa.requirement.nextLogin',
        defaultMessage: 'Required from next login',
      });
    case 'daysLeft':
      return formatMessage(
        {
          id: 'Settings.permissions.users.mfa.requirement.daysLeft',
          defaultMessage: 'Required, {days, plural, one {# day} other {# days}} left',
        },
        { days: requirement.days }
      );
    case 'required':
      return formatMessage({
        id: 'Settings.permissions.users.mfa.requirement.required',
        defaultMessage: 'Required',
      });
    default:
      return null;
  }
};

/**
 * One account's two-factor state in a table cell: Enabled or Not set up, with the requirement as a
 * small line under it. Whether the account is locked is a login state, not a two-factor one, and is
 * shown in the User status column instead. Status text, not colour alone, carries the meaning.
 */
const TwoFactorStatus = ({ user }: { user: AdminUserMfaState }) => {
  const { formatMessage } = useIntl();
  const enabled = Boolean(user.mfaEnabledAt);
  const requirement = getMfaRequirement(user);

  return (
    <Flex direction="column" alignItems="flex-start" gap={1}>
      <Status size="S" variant={enabled ? 'success' : 'neutral'}>
        <Typography tag="span" variant="omega" fontWeight="bold">
          {enabled
            ? formatMessage({
                id: 'Settings.permissions.users.mfa.status.enrolled',
                defaultMessage: 'Enabled',
              })
            : formatMessage({
                id: 'Settings.permissions.users.mfa.status.notSetUp',
                defaultMessage: 'Not set up',
              })}
        </Typography>
      </Status>
      {requirement.kind !== 'none' ? (
        <Typography variant="pi" textColor="neutral600">
          <MfaRequirementText requirement={requirement} />
        </Typography>
      ) : null}
    </Flex>
  );
};

export { TwoFactorStatus, MfaRequirementText };
