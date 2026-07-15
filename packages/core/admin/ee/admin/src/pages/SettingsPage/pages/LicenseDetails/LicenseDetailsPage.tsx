import * as React from 'react';

import {
  Box,
  Flex,
  Grid,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Typography,
} from '@strapi/design-system';
import { useIntl, type MessageDescriptor } from 'react-intl';

import { Layouts } from '../../../../../../../admin/src/components/Layouts/Layout';
import { Page } from '../../../../../../../admin/src/components/PageHelpers';
import { useLicenseLimits } from '../../../../hooks/useLicenseLimits';

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

const LicenseDetailsPage = () => {
  const { formatMessage, formatDate } = useIntl();
  const { license, isLoading, isError } = useLicenseLimits();

  if (isLoading) {
    return <Page.Loading />;
  }

  if (isError || !license) {
    return <Page.Error />;
  }

  const entitlementsByFeature = new Map(license.entitlements.map((e) => [e.feature, e.limits]));

  const formatLimit = (limits: (typeof license.entitlements)[number]['limits']): string =>
    limits
      .map((limit) => {
        if (limit.value === null) {
          return formatMessage({ id: 'Settings.license.unlimited', defaultMessage: 'Unlimited' });
        }
        if (limit.unit === 'days') {
          return formatMessage(
            { id: 'Settings.license.limit.days', defaultMessage: '{value} days' },
            { value: limit.value }
          );
        }
        return String(limit.value);
      })
      .join(' / ');

  return (
    <Page.Main>
      <Page.Title>
        {formatMessage(
          { id: 'Settings.PageTitle', defaultMessage: 'Settings - {name}' },
          { name: formatMessage({ id: 'Settings.license.title', defaultMessage: 'License' }) }
        )}
      </Page.Title>
      <Layouts.Header
        title={formatMessage({ id: 'Settings.license.title', defaultMessage: 'License' })}
        subtitle={formatMessage({
          id: 'Settings.license.subtitle',
          defaultMessage: 'Your plan, entitlements, and expiration',
        })}
      />
      <Layouts.Content>
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
              {formatMessage({ id: 'Settings.license.overview', defaultMessage: 'Overview' })}
            </Typography>
            <Grid.Root gap={5} tag="dl">
              <Detail
                label={{ id: 'Settings.license.plan', defaultMessage: 'Plan' }}
                value={window.strapi.projectType}
              />
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
                label={{ id: 'Settings.license.seats', defaultMessage: 'Seats' }}
                value={formatMessage(
                  { id: 'Settings.license.seats.count', defaultMessage: '{used} / {total}' },
                  {
                    used: license.currentActiveUserCount,
                    total: license.permittedSeats ?? '∞',
                  }
                )}
              />
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
                    'Using a cached license — the license registry was unreachable at the last check.',
                })}
              </Typography>
            )}
          </Flex>

          <Box
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
                        <Typography>
                          {limits && limits.length
                            ? formatLimit(limits)
                            : formatMessage({
                                id: 'Settings.license.limit.none',
                                defaultMessage: '—',
                              })}
                        </Typography>
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          </Box>
        </Flex>
      </Layouts.Content>
    </Page.Main>
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

export { LicenseDetailsPage };
