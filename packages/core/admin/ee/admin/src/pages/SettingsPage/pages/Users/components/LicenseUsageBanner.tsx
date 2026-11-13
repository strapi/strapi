import * as React from 'react';

import { Alert, Box, Link } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { useLicenseLimits } from '../../../../../hooks/useLicenseLimits';

const CONTACT_SALES_URL = 'mailto:sales@strapi.io';
const MANAGE_SUBSCRIPTION_URL = 'https://billing.strapi.io';

/**
 * Informational banner shown once the active admin users counted by the license registry, across
 * every environment of the project, reach the number the license covers. Information only: seats
 * are enforced per instance, against this instance's own active users.
 */
export const LicenseUsageBanner = () => {
  const { formatMessage } = useIntl();
  const { license } = useLicenseLimits();
  const [isDismissed, setIsDismissed] = React.useState(false);

  const usage = license?.projectUsage;

  if (
    isDismissed ||
    !usage ||
    usage.contractedUsers === null ||
    usage.activeUsers < usage.contractedUsers
  ) {
    return null;
  }

  const isOverLimit = usage.activeUsers > usage.contractedUsers;
  const isEnterprise = license?.type === 'gold';

  return (
    <Box paddingBottom={4}>
      <Alert
        variant={isOverLimit ? 'warning' : 'default'}
        closeLabel={formatMessage({ id: 'global.close', defaultMessage: 'Close' })}
        onClose={() => setIsDismissed(true)}
        action={
          <Link href={isEnterprise ? CONTACT_SALES_URL : MANAGE_SUBSCRIPTION_URL} isExternal>
            {isEnterprise
              ? formatMessage({
                  id: 'Settings.permissions.users.license-usage.contact-sales',
                  defaultMessage: 'Contact sales',
                })
              : formatMessage({
                  id: 'Settings.application.plan.manage-subscription',
                  defaultMessage: 'Manage subscription',
                })}
          </Link>
        }
      >
        {formatMessage(
          {
            id: 'Settings.permissions.users.license-usage.banner',
            defaultMessage:
              'Your license covers {contractedUsers} active admin users across all environments. {activeUsers} are currently active.',
          },
          { contractedUsers: usage.contractedUsers, activeUsers: usage.activeUsers }
        )}
      </Alert>
    </Box>
  );
};
