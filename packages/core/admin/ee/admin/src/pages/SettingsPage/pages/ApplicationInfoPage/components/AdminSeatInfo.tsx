import { Flex, Tooltip, Typography, Link, Grid } from '@strapi/design-system';
import { ExternalLink, WarningCircle } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';

import { useRBAC } from '../../../../../../../../admin/src/hooks/useRBAC';
import { selectAdminPermissions } from '../../../../../../../../admin/src/selectors';
import { useLicenseLimits } from '../../../../../hooks/useLicenseLimits';

const BILLING_STRAPI_CLOUD_URL = 'https://cloud.strapi.io/profile/billing';
const BILLING_SELF_HOSTED_URL = 'https://strapi.io/billing/request-seats';

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

  const { licenseLimitStatus, enforcementUserCount, permittedSeats, isHostedOnStrapiCloud } =
    license;

  if (!permittedSeats) {
    return null;
  }

  return (
    <Grid.Item col={6} s={12} direction="column" alignItems="stretch">
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
                text: (chunks) =>
                  (
                    <Typography
                      fontWeight="semiBold"
                      textColor={enforcementUserCount > permittedSeats ? 'danger500' : undefined}
                    >
                      {chunks}
                    </Typography>
                  ) as any,
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
      <Link
        href={isHostedOnStrapiCloud ? BILLING_STRAPI_CLOUD_URL : BILLING_SELF_HOSTED_URL}
        isExternal
        endIcon={<ExternalLink />}
      >
        {formatMessage(
          {
            id: 'Settings.application.ee.admin-seats.add-seats',
            defaultMessage:
              '{isHostedOnStrapiCloud, select, true {Add seats} other {Contact sales}}',
          },
          { isHostedOnStrapiCloud }
        )}
      </Link>
    </Grid.Item>
  );
};
