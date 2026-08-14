import type { ReactNode } from 'react';

import { Flex, Tooltip, Typography } from '@strapi/design-system';
import { WarningCircle } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';

import { useRBAC } from '../../../../../../../../admin/src/hooks/useRBAC';
import { selectAdminPermissions } from '../../../../../../../../admin/src/selectors';
import { useLicenseLimits } from '../../../../../hooks/useLicenseLimits';

export const AdminSeatInfoEE = () => {
  const { formatMessage } = useIntl();
  const { settings } = useSelector(selectAdminPermissions);
  const {
    isLoading: isRBACLoading,
    allowedActions: { canRead, canCreate, canUpdate, canDelete },
  } = useRBAC(settings?.users ?? {});
  const {
    license,
    isError,
    isLoading: isLicenseLoading,
  } = useLicenseLimits({
    // TODO: this creates a waterfall which we should avoid to render earlier, but for that
    // we will have to move away from data-fetching hooks to query functions.
    // Short-term we could at least implement a loader, for the user to have visual feedback
    // in case the requests take a while
    enabled: !isRBACLoading && canRead && canCreate && canUpdate && canDelete,
  });

  const isLoading = isRBACLoading || isLicenseLoading;

  if (isError || isLoading || !license) {
    return null;
  }

  const { licenseLimitStatus, enforcementUserCount, permittedSeats } = license;

  if (!permittedSeats) {
    return null;
  }

  return (
    <Flex direction="column" alignItems="start" gap={2}>
      <Typography variant="sigma" textColor="neutral600">
        {formatMessage({
          id: 'Settings.application.admin-seats',
          defaultMessage: 'Admin seats',
        })}
      </Typography>
      <Flex gap={2}>
        <Flex>
          <Typography tag="p">
            {formatMessage(
              {
                id: 'Settings.application.ee.admin-seats.count',
                defaultMessage: '<text>{enforcementUserCount}</text>/{permittedSeats}',
              },
              {
                permittedSeats,
                enforcementUserCount,
                text: (chunks: ReactNode) => (
                  <Typography
                    fontWeight="semiBold"
                    textColor={enforcementUserCount > permittedSeats ? 'danger500' : undefined}
                  >
                    {chunks}
                  </Typography>
                ),
              }
            )}
          </Typography>
        </Flex>
        {licenseLimitStatus === 'OVER_LIMIT' && (
          <Tooltip
            label={formatMessage({
              id: 'Settings.application.ee.admin-seats.at-limit-tooltip',
              defaultMessage: 'At limit: add seats to invite more users',
            })}
          >
            <WarningCircle width="1.4rem" height="1.4rem" fill="danger500" />
          </Tooltip>
        )}
      </Flex>
    </Flex>
  );
};
