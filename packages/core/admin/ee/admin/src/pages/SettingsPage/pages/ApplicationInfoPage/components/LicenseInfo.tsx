import * as React from 'react';

import { Flex, Grid, Table, Tbody, Td, Th, Thead, Tr, Typography } from '@strapi/design-system';
import { useIntl, type MessageDescriptor } from 'react-intl';

import { useLicenseLimits } from '../../../../../hooks/useLicenseLimits';

// Feature key -> display label. Labels themselves resolve through i18n; only the
// mapping of known license feature keys lives here.
const FEATURE_LABELS: Record<string, MessageDescriptor> = {
  sso: { id: 'Settings.license.feature.sso', defaultMessage: 'Single Sign-On' },
  'audit-logs': { id: 'Settings.license.feature.audit-logs', defaultMessage: 'Audit Logs' },
  'review-workflows': {
    id: 'Settings.license.feature.review-workflows',
    defaultMessage: 'Review Workflows',
  },
  'cms-content-releases': {
    id: 'Settings.license.feature.cms-content-releases',
    defaultMessage: 'Content Releases',
  },
  'cms-content-history': {
    id: 'Settings.license.feature.cms-content-history',
    defaultMessage: 'Content History',
  },
  'cms-advanced-preview': {
    id: 'Settings.license.feature.cms-advanced-preview',
    defaultMessage: 'Advanced Preview',
  },
  'cms-ai': { id: 'Settings.license.feature.cms-ai', defaultMessage: 'AI' },
};

// Entitlement limit key -> display label. Only known limit keys are mapped;
// unmapped keys fall back to rendering just the value.
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

const LicenseInfoEE = () => {
  const { formatMessage, formatDate, formatRelativeTime } = useIntl();
  const { license, isLoading, isError } = useLicenseLimits();

  if (isLoading) {
    return null;
  }

  if (isError || !license) {
    return null;
  }

  const entitlementsByFeature = new Map(license.entitlements.map((e) => [e.feature, e.limits]));

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
    if (value >= 60) {
      return formatMessage(
        {
          id: 'Settings.license.limit.months',
          defaultMessage: '~{months, plural, one {# month} other {# months}}',
        },
        { months: Math.round(value / 30) }
      );
    }
    return formatMessage(
      {
        id: 'Settings.license.limit.days',
        defaultMessage: '{days, plural, one {# day} other {# days}}',
      },
      { days: value }
    );
  };

  const formatLimitValue = (
    limit: (typeof license.entitlements)[number]['limits'][number]
  ): string => {
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

  // The next check-in is shown relative ("in about 11 hours") rather than as an
  // absolute timestamp: on a 12h cadence the next check is usually the same
  // calendar day, which reads as a flipped AM/PM when shown as a date.
  const formatNextCheckin = (timestamp: number | null): string => {
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

  return (
    <Flex direction="column" alignItems="stretch" gap={6}>
      <Flex
        direction="column"
        alignItems="stretch"
        gap={4}
        hasRadius
        background="neutral0"
        shadow="tableShadow"
        paddingTop={6}
        paddingBottom={6}
        paddingRight={7}
        paddingLeft={7}
      >
        <Typography variant="delta" tag="h3">
          {formatMessage({ id: 'Settings.license.title', defaultMessage: 'License' })}
        </Typography>
        <Grid.Root gap={5} tag="dl">
          <Detail
            label={{ id: 'Settings.license.status', defaultMessage: 'Status' }}
            value={
              license.isTrial
                ? formatMessage({
                    id: 'Settings.license.status.trial',
                    defaultMessage: 'Trial',
                  })
                : formatMessage({
                    id: 'Settings.license.status.active',
                    defaultMessage: 'Active',
                  })
            }
          />
          <Detail
            label={{ id: 'Settings.license.mode', defaultMessage: 'Mode' }}
            value={
              license.licenseMode === 'offline'
                ? formatMessage({
                    id: 'Settings.license.mode.offline',
                    defaultMessage: 'Offline',
                  })
                : formatMessage({
                    id: 'Settings.license.mode.online',
                    defaultMessage: 'Online',
                  })
            }
          />
          {license.licenseMode === 'online' ? (
            <>
              <Detail
                label={{ id: 'Settings.license.lastCheckin', defaultMessage: 'Last check-in' }}
                value={
                  license.lastRegistrySyncAt
                    ? formatDate(new Date(license.lastRegistrySyncAt), {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })
                    : formatMessage({
                        id: 'Settings.license.checkin.never',
                        defaultMessage: 'Not yet',
                      })
                }
              />
              <Detail
                label={{ id: 'Settings.license.nextCheckin', defaultMessage: 'Next check-in' }}
                value={formatNextCheckin(license.nextRegistrySyncAt)}
              />
            </>
          ) : (
            <Detail
              label={{ id: 'Settings.license.expiry', defaultMessage: 'Expires' }}
              value={
                license.expireAt
                  ? formatDate(new Date(license.expireAt), {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })
                  : formatMessage({ id: 'Settings.license.expiry.none', defaultMessage: '—' })
              }
            />
          )}
          {license.subscriptionId && (
            <Detail
              label={{ id: 'Settings.license.subscription', defaultMessage: 'Subscription ID' }}
              value={license.subscriptionId}
            />
          )}
        </Grid.Root>
        {license.usingCachedLicense && (
          <Typography variant="pi" textColor="danger600">
            {formatMessage({
              id: 'Settings.license.cached-warning',
              defaultMessage:
                'Using a cached license. The license registry was unreachable at the last check.',
            })}
          </Typography>
        )}
      </Flex>

      <Flex
        direction="column"
        alignItems="stretch"
        gap={4}
        hasRadius
        background="neutral0"
        shadow="tableShadow"
        paddingTop={6}
        paddingBottom={6}
        paddingRight={7}
        paddingLeft={7}
      >
        <Typography variant="delta" tag="h3">
          {formatMessage({
            id: 'Settings.license.entitlements',
            defaultMessage: 'Entitlements',
          })}
        </Typography>
        <Table colCount={3} rowCount={license.features.length}>
          <Thead>
            <Tr>
              <Th>
                <Typography variant="sigma">
                  {formatMessage({
                    id: 'Settings.license.feature',
                    defaultMessage: 'Feature',
                  })}
                </Typography>
              </Th>
              <Th>
                <Typography variant="sigma">
                  {formatMessage({
                    id: 'Settings.license.enabled',
                    defaultMessage: 'Enabled',
                  })}
                </Typography>
              </Th>
              <Th>
                <Typography variant="sigma">
                  {formatMessage({ id: 'Settings.license.limit', defaultMessage: 'Limit' })}
                </Typography>
              </Th>
            </Tr>
          </Thead>
          <Tbody>
            {license.features.map((feature) => {
              const limits = entitlementsByFeature.get(feature.name);
              const label = FEATURE_LABELS[feature.name];
              return (
                <Tr key={feature.name}>
                  <Td>
                    <Typography>{label ? formatMessage(label) : feature.name}</Typography>
                  </Td>
                  <Td>
                    <Typography>
                      {formatMessage({ id: 'Settings.license.yes', defaultMessage: 'Yes' })}
                    </Typography>
                  </Td>
                  <Td>
                    {limits && limits.length ? (
                      <Flex direction="column" alignItems="start" gap={1}>
                        {limits.map((limit) => (
                          <Typography key={limit.key} variant="pi">
                            {LIMIT_LABELS[limit.key]
                              ? `${formatMessage(LIMIT_LABELS[limit.key])}: ${formatLimitValue(limit)}`
                              : formatLimitValue(limit)}
                          </Typography>
                        ))}
                      </Flex>
                    ) : (
                      <Typography>
                        {formatMessage({
                          id: 'Settings.license.limit.none',
                          defaultMessage: '—',
                        })}
                      </Typography>
                    )}
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      </Flex>
    </Flex>
  );
};

interface DetailProps {
  label: MessageDescriptor;
  value: React.ReactNode;
}

const Detail = ({ label, value }: DetailProps) => {
  const { formatMessage } = useIntl();
  return (
    <Grid.Item col={6} xs={12} direction="column" alignItems="start">
      <Typography variant="sigma" textColor="neutral600" tag="dt">
        {formatMessage(label)}
      </Typography>
      <Typography tag="dd">{value}</Typography>
    </Grid.Item>
  );
};

export { LicenseInfoEE };
