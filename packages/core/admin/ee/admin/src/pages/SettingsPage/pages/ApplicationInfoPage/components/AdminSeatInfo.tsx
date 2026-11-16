import type { ReactNode } from 'react';

import { Flex, Status, Tooltip, Typography } from '@strapi/design-system';
import { WarningCircle } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';

import { useRBAC } from '../../../../../../../../admin/src/hooks/useRBAC';
import { selectAdminPermissions } from '../../../../../../../../admin/src/selectors';
import { useLicenseLimits } from '../../../../../hooks/useLicenseLimits';

import type { GetLicenseLimitInformation } from '../../../../../../../../shared/contracts/admin';

type ProjectUsage = NonNullable<GetLicenseLimitInformation.Response['data']['projectUsage']>;

/** Active admin users the license registry counted across all instances. Information only. */
const ProjectUsageInfo = ({ usage }: { usage: ProjectUsage }) => {
  const { formatMessage, formatDate } = useIntl();
  const { activeUsers, contractedUsers, updatedAt } = usage;
  const isOverLimit = contractedUsers !== null && activeUsers > contractedUsers;

  return (
    <Flex direction="column" alignItems="start" gap={2}>
      <Typography variant="sigma" textColor="neutral600">
        {formatMessage({
          id: 'Settings.application.ee.project-usage.title',
          defaultMessage: 'Active admin users across all instances',
        })}
      </Typography>
      <Flex gap={2} alignItems="center">
        <Typography tag="p" fontWeight="semiBold">
          {contractedUsers === null
            ? activeUsers
            : formatMessage(
                {
                  id: 'Settings.application.ee.project-usage.count',
                  defaultMessage: '{activeUsers} / {contractedUsers}',
                },
                { activeUsers, contractedUsers }
              )}
        </Typography>
        {isOverLimit && (
          <Status size="S" variant="danger">
            <Typography variant="omega" fontWeight="bold">
              {formatMessage({
                id: 'Settings.application.ee.project-usage.over-limit',
                defaultMessage: 'Over limit',
              })}
            </Typography>
          </Status>
        )}
      </Flex>
      <Typography variant="pi" textColor="neutral500">
        {formatMessage(
          {
            id: 'Settings.application.ee.project-usage.updated-at',
            defaultMessage: 'Last updated {date}',
          },
          { date: formatDate(updatedAt, { dateStyle: 'medium', timeStyle: 'short' }) }
        )}
      </Typography>
    </Flex>
  );
};

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

  const { enforcementUserCount, permittedSeats, seats, projectUsage } = license;

  // `permittedSeats` is the live enforcement limit and is wiped once the licence stops being
  // usable, so fall back to the retained `seats` to keep showing the count on an expired
  // licence. Enforcement itself (`licenseLimitStatus`, `shouldStopCreate`) still runs off
  // `permittedSeats` server-side and is untouched by this.
  const seatLimit = permittedSeats ?? seats;

  if (!seatLimit && !projectUsage) {
    return null;
  }

  // The red count and the warning follow the same displayed limit. Server-side
  // `licenseLimitStatus` tracks only the live limit, so it is empty once the licence expires.
  const isOverLimit = seatLimit ? enforcementUserCount > seatLimit : false;

  return (
    <Flex direction="column" alignItems="start" gap={4}>
      {seatLimit ? (
        <Flex direction="column" alignItems="start" gap={2}>
          <Typography variant="sigma" textColor="neutral600">
            {formatMessage({
              id: 'Settings.application.admin-seats',
              defaultMessage: 'Active admin users in this instance',
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
                    permittedSeats: seatLimit,
                    enforcementUserCount,
                    text: (chunks: ReactNode) => (
                      <Typography
                        fontWeight="semiBold"
                        textColor={isOverLimit ? 'danger500' : undefined}
                      >
                        {chunks}
                      </Typography>
                    ),
                  }
                )}
              </Typography>
            </Flex>
            {isOverLimit && (
              <Tooltip
                label={formatMessage({
                  id: 'Settings.application.ee.admin-seats.at-limit-tooltip',
                  defaultMessage: 'Limit reached: upgrade your license to invite more admin users',
                })}
              >
                <WarningCircle width="1.4rem" height="1.4rem" fill="danger500" />
              </Tooltip>
            )}
          </Flex>
        </Flex>
      ) : null}
      {projectUsage ? <ProjectUsageInfo usage={projectUsage} /> : null}
    </Flex>
  );
};
