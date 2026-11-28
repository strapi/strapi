import * as React from 'react';

import { Alert, Box, Button } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { RESPONSIVE_DEFAULT_SPACING } from '../../../../../../../../admin/src/constants/theme';
import { getLicensedPlan } from '../../../../../../../../shared/utils/get-project-type';
import { useLicenseLimits } from '../../../../../hooks/useLicenseLimits';

const MANAGE_SEATS_URL = 'https://billing.strapi.io';
const CONTACT_SALES_URL = 'mailto:sales@strapi.io';

const AlertAction = styled(Box)`
  && a > span {
    color: inherit;
  }
`;

const MESSAGES = {
  across: {
    at: {
      id: 'Settings.permissions.users.license-limit.at.message',
      defaultMessage:
        '{count} unique users are active across your environments, which is the number included in your license. If needed, remove a user to free a seat, or {isGrowth, select, true {manage your seats} other {contact sales}} to add more users to your license.',
    },
    over: {
      id: 'Settings.permissions.users.license-limit.over.message',
      defaultMessage:
        '{count} unique users are active across your environments, but your license includes {limit} users. Remove a user to free a seat, or {isGrowth, select, true {manage your seats} other {contact sales}} to add more users to your license.',
    },
  },
  instance: {
    at: {
      id: 'Settings.permissions.users.license-limit.instance.at.message',
      defaultMessage:
        '{count} users are active in this environment, which is the number included in your license. If needed, remove a user to free a seat, or {isGrowth, select, true {manage your seats} other {contact sales}} to add more users to your license.',
    },
    over: {
      id: 'Settings.permissions.users.license-limit.instance.over.message',
      defaultMessage:
        '{count} users are active in this environment, but your license includes {limit} users. Remove a user to free a seat, or {isGrowth, select, true {manage your seats} other {contact sales}} to add more users to your license.',
    },
  },
};

const getMessage = ({
  isOverLimit,
  isAcrossInstances,
}: {
  isOverLimit: boolean;
  isAcrossInstances: boolean;
}) => MESSAGES[isAcrossInstances ? 'across' : 'instance'][isOverLimit ? 'over' : 'at'];

type License = NonNullable<ReturnType<typeof useLicenseLimits>['license']>;

const getReachedLimit = ({
  adminUsersAcrossInstances,
  enforcementUserCount,
  permittedSeats,
}: License) => {
  const instanceLimit: number | null = permittedSeats ?? null;

  if (adminUsersAcrossInstances) {
    const limit = adminUsersAcrossInstances.contractedUsers ?? instanceLimit;

    if (limit !== null && adminUsersAcrossInstances.activeUsers >= limit) {
      return { count: adminUsersAcrossInstances.activeUsers, limit, isAcrossInstances: true };
    }
  }

  if (instanceLimit !== null && enforcementUserCount >= instanceLimit) {
    return { count: enforcementUserCount, limit: instanceLimit, isAcrossInstances: false };
  }

  return null;
};

export const LicenseLimitBanner = () => {
  const { formatMessage } = useIntl();
  const { license, isError, isLoading } = useLicenseLimits();
  const [isClosed, setIsClosed] = React.useState(false);

  if (isError || isLoading || !license || isClosed) {
    return null;
  }

  const reachedLimit = getReachedLimit(license);

  if (!reachedLimit) {
    return null;
  }

  const { count, limit, isAcrossInstances } = reachedLimit;
  const isOverLimit = count > limit;
  const isGrowth =
    getLicensedPlan({
      licenseStatus: license.licenseStatus,
      type: license.type,
      planPriceId: license.planPriceId,
    }) === 'Growth';

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
            {isGrowth ? (
              <Button
                tag="a"
                href={MANAGE_SEATS_URL}
                target="_blank"
                rel="noopener noreferrer"
                variant="default"
              >
                {formatMessage({
                  id: 'Settings.permissions.users.license-limit.manage-seats',
                  defaultMessage: 'Manage seats',
                })}
              </Button>
            ) : (
              <Button tag="a" href={CONTACT_SALES_URL} variant="default">
                {formatMessage({
                  id: 'Settings.permissions.users.license-limit.contact-sales',
                  defaultMessage: 'Contact sales',
                })}
              </Button>
            )}
          </AlertAction>
        }
      >
        {formatMessage(getMessage({ isOverLimit, isAcrossInstances }), {
          count,
          limit,
          isGrowth: String(isGrowth),
        })}
      </Alert>
    </Box>
  );
};
