import { Badge, Flex, Tooltip, Typography } from '@strapi/design-system';
import { Information } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';

import { RelativeTime } from '../../../../../../../../admin/src/components/RelativeTime';
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

  const { enforcementUserCount, permittedSeats, seats, adminUsersAcrossInstances } = license;

  // `permittedSeats` is wiped once the licence stops being usable, so fall back to the retained
  // `seats` to keep showing the limit on an expired licence. Enforcement is unchanged.
  const instanceLimit = permittedSeats ?? seats;

  // The count across instances when the registry sent one, otherwise this instance's.
  // Without `contractedUsers` from the registry, use this instance's limit.
  const count = adminUsersAcrossInstances?.activeUsers ?? enforcementUserCount;
  const limit = adminUsersAcrossInstances
    ? (adminUsersAcrossInstances.contractedUsers ?? instanceLimit ?? null)
    : instanceLimit || null;

  if (!adminUsersAcrossInstances && !limit) {
    return null;
  }

  const overBy = limit ? count - limit : 0;

  return (
    <Flex direction="column" alignItems="start" gap={2}>
      <Flex gap={2} alignItems="center" tag="dt">
        <Typography variant="sigma" textColor="neutral600">
          {formatMessage({
            id: 'Settings.application.admin-users',
            defaultMessage: 'Admin users',
          })}
        </Typography>
        <Tooltip
          label={formatMessage({
            id: 'Settings.application.admin-users.tooltip',
            defaultMessage:
              'Unique active admin users across every instance using this license. Updated at each license check and when users are added or removed.',
          })}
        >
          <Information width="1.4rem" height="1.4rem" fill="neutral500" />
        </Tooltip>
      </Flex>
      <Flex direction="column" alignItems="start" gap={1} tag="dd">
        <Flex gap={2} alignItems="center">
          <Typography tag="p" textColor={overBy > 0 ? 'danger600' : undefined}>
            {limit === null ? count : `${count}/${limit}`}
          </Typography>
          {overBy > 0 && (
            <Badge size="S" variant="danger">
              {formatMessage(
                {
                  id: 'Settings.application.admin-users.over',
                  defaultMessage: '{count} over',
                },
                { count: overBy }
              )}
            </Badge>
          )}
        </Flex>
        {adminUsersAcrossInstances && (
          <Typography variant="pi" textColor="neutral500">
            {formatMessage(
              {
                id: 'Settings.application.admin-users.caption',
                defaultMessage:
                  'Across all environments · {count} in this environment · updated {updatedAt}',
              },
              {
                count: enforcementUserCount,
                // Reports can fail or lag behind a change, so say how old the count is. The
                // date comes from the registry's clock: never show it in the future.
                updatedAt: (
                  <RelativeTime
                    timestamp={
                      new Date(
                        Math.min(Date.parse(adminUsersAcrossInstances.updatedAt), Date.now())
                      )
                    }
                  />
                ),
              }
            )}
          </Typography>
        )}
      </Flex>
    </Flex>
  );
};
