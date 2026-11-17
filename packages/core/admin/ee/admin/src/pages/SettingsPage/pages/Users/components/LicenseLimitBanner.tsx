import * as React from 'react';

import { Alert, Box, Button } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { RESPONSIVE_DEFAULT_SPACING } from '../../../../../../../../admin/src/constants/theme';
import { useLicenseLimits } from '../../../../../hooks/useLicenseLimits';

const CONTACT_SALES_URL = 'mailto:sales@strapi.io';

/**
 * `Alert` colors every link inside `action` with its variant color, which breaks a Button rendered
 * as a link. Restore the Button's own colors (same fix as the upgrade banner).
 */
const AlertAction = styled(Box)`
  && a > span {
    color: inherit;
  }
`;

/**
 * Shown on the Users page when the license limit is reached or exceeded. Uses the count across
 * all instances when the license registry sent one, otherwise this instance's count.
 */
export const LicenseLimitBanner = () => {
  const { formatMessage } = useIntl();
  const { license, isError, isLoading } = useLicenseLimits();
  const [isClosed, setIsClosed] = React.useState(false);

  if (isError || isLoading || !license || isClosed) {
    return null;
  }

  const { adminUsersAcrossInstances, enforcementUserCount, permittedSeats } = license;
  const count = adminUsersAcrossInstances?.activeUsers ?? enforcementUserCount;
  const limit = adminUsersAcrossInstances
    ? adminUsersAcrossInstances.contractedUsers
    : permittedSeats;

  if (!limit || count < limit) {
    return null;
  }

  const isOverLimit = count > limit;

  return (
    <Box
      paddingLeft={RESPONSIVE_DEFAULT_SPACING}
      paddingRight={RESPONSIVE_DEFAULT_SPACING}
      paddingBottom={4}
    >
      <Alert
        variant={isOverLimit ? 'danger' : 'default'}
        title={
          isOverLimit
            ? formatMessage({
                id: 'Settings.permissions.users.license-limit.over.title',
                defaultMessage: "You're using more users than your license includes",
              })
            : formatMessage({
                id: 'Settings.permissions.users.license-limit.at.title',
                defaultMessage: "You're using all the users included in your license",
              })
        }
        closeLabel={formatMessage({ id: 'global.close', defaultMessage: 'Close' })}
        onClose={() => setIsClosed(true)}
        action={
          <AlertAction>
            <Button tag="a" href={CONTACT_SALES_URL} variant="default">
              {formatMessage({
                id: 'Settings.permissions.users.license-limit.contact-sales',
                defaultMessage: 'Contact sales',
              })}
            </Button>
          </AlertAction>
        }
      >
        {isOverLimit
          ? formatMessage(
              {
                id: 'Settings.permissions.users.license-limit.over.message',
                defaultMessage:
                  '{count} unique users are active across your environments, but your license includes {limit} users. Remove a user to free a seat, or contact sales to add more users to your license.',
              },
              { count, limit }
            )
          : formatMessage(
              {
                id: 'Settings.permissions.users.license-limit.at.message',
                defaultMessage:
                  '{count} unique users are active across your environments, which is the number included in your license. If needed, remove a user to free a seat, or contact sales to add more users to your license.',
              },
              { count }
            )}
      </Alert>
    </Box>
  );
};
