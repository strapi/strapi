import {
  Divider,
  Flex,
  Status,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tooltip,
  Tr,
  Typography,
  VisuallyHidden,
} from '@strapi/design-system';
import { Check, ClockCounterClockwise, Cross, Information } from '@strapi/icons';
import { useIntl, type MessageDescriptor } from 'react-intl';

import { PlanDetail } from '../../../../../../../../admin/src/pages/Settings/pages/ApplicationInfo/components/PlanCard';
import { useGetLicenseTrialTimeLeftQuery } from '../../../../../../../../admin/src/services/admin';
import { useLicenseLimits } from '../../../../../hooks/useLicenseLimits';

import { AdminSeatInfoEE } from './AdminSeatInfo';
import { AIUsage } from './AIUsage';

import type { GetLicenseLimitInformation } from '../../../../../../../../shared/contracts/admin';

// Feature key -> display label. Labels themselves resolve through i18n; only the
// mapping of known license feature keys lives here.
const FEATURE_LABELS: Record<string, MessageDescriptor> = {
  sso: { id: 'Settings.license.feature.sso', defaultMessage: 'Single Sign-On' },
  'cms-advanced-preview': {
    id: 'Settings.license.feature.cms-advanced-preview',
    defaultMessage: 'Live Preview',
  },
  'cms-content-releases': {
    id: 'Settings.license.feature.cms-content-releases',
    defaultMessage: 'Releases',
  },
  'review-workflows': {
    id: 'Settings.license.feature.review-workflows',
    defaultMessage: 'Review Workflows',
  },
  'cms-content-history': {
    id: 'Settings.license.feature.cms-content-history',
    defaultMessage: 'Content History',
  },
  'audit-logs': { id: 'Settings.license.feature.audit-logs', defaultMessage: 'Audit Logs' },
};

// Entitlement limit key -> display label. Only used when a feature has more than one limit and
// each value needs to be told apart; a single limit is rendered on its own, unlabelled.
const LIMIT_LABELS: Record<string, MessageDescriptor> = {
  numberOfWorkflows: {
    id: 'Settings.license.limit.numberOfWorkflows',
    defaultMessage: 'Workflows',
  },
  stagesPerWorkflow: {
    id: 'Settings.license.limit.stagesPerWorkflow',
    defaultMessage: 'Stages per workflow',
  },
  maximumReleases: { id: 'Settings.license.limit.maximumReleases', defaultMessage: 'Releases' },
  retentionDays: { id: 'Settings.license.limit.retentionDays', defaultMessage: 'Retention' },
};

type License = NonNullable<GetLicenseLimitInformation.Response['data']>;
type PlanEntitlement = License['planEntitlements'][number];
type Limit = PlanEntitlement['limits'][number];

const STATUS_BADGE: Record<
  License['licenseStatus'],
  { variant: 'success' | 'danger' | 'warning'; label: MessageDescriptor }
> = {
  active: {
    variant: 'success',
    label: { id: 'Settings.license.status.active', defaultMessage: 'Active' },
  },
  expired: {
    variant: 'danger',
    label: { id: 'Settings.license.status.expired', defaultMessage: 'Expired' },
  },
  unknown: {
    variant: 'warning',
    label: { id: 'Settings.license.status.unknown', defaultMessage: 'Unknown' },
  },
  // A license-gated component only mounts for EE instances, so `none` should never occur here
  // in practice. Fall back to the same treatment as `unknown` rather than rendering nothing.
  none: {
    variant: 'warning',
    label: { id: 'Settings.license.status.unknown', defaultMessage: 'Unknown' },
  },
};

const LicenseInfoEE = () => {
  const { formatMessage, formatDate, formatRelativeTime } = useIntl();
  const { license, isLoading, isError } = useLicenseLimits();
  const { data: trialTimeLeft } = useGetLicenseTrialTimeLeftQuery(undefined, {
    skip: !license?.isTrial,
  });

  if (isLoading) {
    return null;
  }

  if (isError || !license) {
    return null;
  }

  const {
    licenseMode,
    licenseStatus,
    renewalDate,
    subscriptionId,
    lastRegistrySyncAt,
    expireAt,
    isTrial,
    planEntitlements,
  } = license;

  const isGrowth = window.strapi.projectType === 'Growth';

  // Retention is shown in days (the design lists "30 days retention" / "90 days
  // retention"); only sentinel-sized values collapse to years, so a licence with
  // e.g. 1500 days does not read as a meaningless number.
  const formatDays = (value: number): string => {
    if (value >= 365) {
      return formatMessage(
        {
          id: 'Settings.license.limit.years',
          defaultMessage: '~{years, plural, one {# year} other {# years}}',
        },
        { years: Math.round(value / 365) }
      );
    }
    return formatMessage(
      {
        id: 'Settings.license.limit.days',
        defaultMessage: '{days, plural, one {# day retention} other {# days retention}}',
      },
      { days: value }
    );
  };

  const formatLimitValue = (limit: Limit): string => {
    if (limit.value === null) {
      return formatMessage({ id: 'Settings.license.unlimited', defaultMessage: 'Unlimited' });
    }
    if (limit.unit === 'days') {
      return formatDays(limit.value);
    }
    return formatMessage(
      { id: 'Settings.license.limit.count', defaultMessage: '{value, number}' },
      { value: limit.value }
    );
  };

  // Shown relative ("2 hours ago") rather than as an absolute timestamp, matching how the rest of
  // the admin surfaces recency.
  const formatLastCheck = (timestamp: number | null): string => {
    if (typeof timestamp !== 'number') {
      return formatMessage({ id: 'Settings.license.checkin.never', defaultMessage: 'Not yet' });
    }
    const diffMs = timestamp - Date.now();
    const diffHours = Math.round(diffMs / (60 * 60 * 1000));
    if (Math.abs(diffHours) >= 1) {
      return formatRelativeTime(diffHours, 'hour', { numeric: 'auto' });
    }
    const diffMinutes = Math.round(diffMs / (60 * 1000));
    return formatRelativeTime(diffMinutes, 'minute', { numeric: 'auto' });
  };

  const currentPlanValue =
    licenseMode === 'offline'
      ? `${window.strapi.projectType} - offline`
      : window.strapi.projectType;

  const dateLabel: MessageDescriptor = isTrial
    ? { id: 'Settings.license.trial-end-date', defaultMessage: 'trial end date' }
    : { id: 'Settings.license.renewal-date', defaultMessage: 'renewal date' };

  const rawDateValue = isTrial ? (trialTimeLeft?.trialEndsAt ?? null) : renewalDate;

  const formattedDate = rawDateValue
    ? formatDate(new Date(rawDateValue), { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  const statusBadge = STATUS_BADGE[licenseStatus];

  const checkinLine =
    licenseMode === 'offline'
      ? expireAt
        ? formatMessage(
            { id: 'Settings.license.valid-until', defaultMessage: 'License valid until {date}' },
            {
              date: formatDate(new Date(expireAt), {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              }),
            }
          )
        : null
      : formatMessage(
          {
            id: 'Settings.license.last-check',
            defaultMessage: 'Last license validity check {relative}',
          },
          { relative: formatLastCheck(lastRegistrySyncAt) }
        );

  const renderLimitCell = (entitlement: PlanEntitlement) => {
    const { available, limits } = entitlement;

    if (limits.length === 0) {
      return available ? (
        <Check
          aria-label={formatMessage({ id: 'Settings.license.yes', defaultMessage: 'Yes' })}
          fill="success600"
        />
      ) : (
        <Cross
          aria-label={formatMessage({ id: 'Settings.license.no', defaultMessage: 'No' })}
          fill="danger600"
        />
      );
    }

    if (limits.length === 1) {
      return <Typography>{formatLimitValue(limits[0])}</Typography>;
    }

    return (
      <Flex direction="column" alignItems="end" gap={1}>
        {limits.map((limit) => (
          <Typography key={limit.key} variant="pi">
            {LIMIT_LABELS[limit.key]
              ? `${formatMessage(LIMIT_LABELS[limit.key])}: ${formatLimitValue(limit)}`
              : formatLimitValue(limit)}
          </Typography>
        ))}
      </Flex>
    );
  };

  return (
    <Flex direction="column" alignItems="stretch" gap={6}>
      <Flex alignItems="flex-start" gap={5} tag="dl">
        <Flex direction="column" alignItems="stretch" gap={5} flex="1">
          <PlanDetail
            label={{ id: 'Settings.application.plan.current', defaultMessage: 'current plan' }}
            value={currentPlanValue}
          />
          {!isGrowth && formattedDate && <PlanDetail label={dateLabel} value={formattedDate} />}
          {isGrowth && (
            <>
              <AdminSeatInfoEE />
              <AIUsage />
            </>
          )}
        </Flex>
        <Flex direction="column" alignItems="stretch" gap={5} flex="1">
          <Flex direction="column" alignItems="start" gap={2}>
            <Flex gap={2} alignItems="center" tag="dt">
              <Typography variant="sigma" textColor="neutral600">
                {formatMessage({
                  id: 'Settings.license.status',
                  defaultMessage: 'license status',
                })}
              </Typography>
              <Tooltip
                label={formatMessage({
                  id: 'Settings.license.status-tooltip',
                  defaultMessage:
                    'Strapi checks the license status every 12 hours and on every build.',
                })}
              >
                <Information width="1.4rem" height="1.4rem" fill="neutral500" />
              </Tooltip>
            </Flex>
            <Flex direction="column" alignItems="start" gap={2} tag="dd">
              <Status size="S" variant={statusBadge.variant}>
                <Typography variant="omega" fontWeight="bold">
                  {formatMessage(statusBadge.label)}
                </Typography>
              </Status>
              {checkinLine && (
                <Flex gap={1} alignItems="center">
                  <ClockCounterClockwise width="1.2rem" height="1.2rem" fill="neutral500" />
                  <Typography variant="pi" textColor="neutral600">
                    {checkinLine}
                  </Typography>
                </Flex>
              )}
            </Flex>
          </Flex>
          {isGrowth && formattedDate && <PlanDetail label={dateLabel} value={formattedDate} />}
          {subscriptionId && (
            <PlanDetail
              label={{ id: 'Settings.license.subscription', defaultMessage: 'Subscription ID' }}
              value={subscriptionId}
            />
          )}
        </Flex>
      </Flex>

      {planEntitlements.length > 0 && (
        <Flex direction="column" alignItems="stretch" gap={4}>
          <Divider />
          <Typography variant="sigma" textColor="neutral600">
            {formatMessage({
              id: 'Settings.license.entitlements',
              defaultMessage: 'plan entitlements',
            })}
          </Typography>
          <Table colCount={2} rowCount={planEntitlements.length}>
            <Thead>
              <Tr>
                <Th>
                  <Typography variant="sigma">
                    {formatMessage({ id: 'Settings.license.feature', defaultMessage: 'Feature' })}
                  </Typography>
                </Th>
                <Th>
                  <VisuallyHidden>
                    {formatMessage({ id: 'Settings.license.limit', defaultMessage: 'Limit' })}
                  </VisuallyHidden>
                </Th>
              </Tr>
            </Thead>
            <Tbody>
              {planEntitlements.map((entitlement) => {
                const label = FEATURE_LABELS[entitlement.feature];

                return (
                  <Tr key={entitlement.feature}>
                    <Td>
                      <Typography>{label ? formatMessage(label) : entitlement.feature}</Typography>
                    </Td>
                    <Td>
                      <Flex justifyContent="flex-end">{renderLimitCell(entitlement)}</Flex>
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        </Flex>
      )}
    </Flex>
  );
};

export { LicenseInfoEE };
