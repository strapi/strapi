import * as React from 'react';

import { useAuth, useTracking } from '@strapi/admin/strapi-admin';
import {
  Avatar,
  Badge,
  Box,
  Flex,
  IconButton,
  LinkButton,
  Popover,
  Typography,
} from '@strapi/design-system';
import {
  Cloud,
  CloudUpload,
  Earth,
  Images,
  User,
  Key,
  Files,
  Layout,
  Graph,
  Webhooks,
  Information,
} from '@strapi/icons';
import { useIntl } from 'react-intl';
import { Link } from 'react-router-dom';
import { styled } from 'styled-components';

import {
  useGetCountDocumentsQuery,
  useGetKeyStatisticsQuery,
  useGetPerformanceHomeMetricsQuery,
} from '../services/homepage';
import { getDisplayName, getInitials } from '../utils/users';

import { Widget } from './WidgetHelpers';

/* -------------------------------------------------------------------------------------------------
 * ProfileWidget
 * -----------------------------------------------------------------------------------------------*/

const DisplayNameTypography = styled(Typography)`
  font-size: 2.4rem;
`;

const ProfileWidget = () => {
  const user = useAuth('User', (state) => state.user);
  const userDisplayName = getDisplayName(user);
  const initials = getInitials(user);

  return (
    <Flex direction="column" gap={3} height="100%" justifyContent="center">
      <Avatar.Item delayMs={0} fallback={initials} />
      {userDisplayName && (
        <DisplayNameTypography fontWeight="bold" textTransform="none" textAlign="center">
          {userDisplayName}
        </DisplayNameTypography>
      )}
      {user?.email && (
        <Typography variant="omega" textColor="neutral600">
          {user?.email}
        </Typography>
      )}
      {user?.roles?.length && (
        <Flex marginTop={2} gap={1} wrap="wrap">
          {user?.roles?.map((role) => <Badge key={role.id}>{role.name}</Badge>)}
        </Flex>
      )}
    </Flex>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Key Statistics
 * -----------------------------------------------------------------------------------------------*/
const Grid = styled(Box)`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
  border: 1px solid ${({ theme }) => theme.colors.neutral200};
  border-radius: ${({ theme }) => theme.borderRadius};
  overflow: hidden;
`;

const GridCell = styled(Box)`
  border-bottom: 1px solid ${({ theme }) => theme.colors.neutral200};
  border-right: 1px solid ${({ theme }) => theme.colors.neutral200};
  display: flex;
  flex-direction: row;
  align-items: flex-start;

  &:nth-child(2n) {
    border-right: none;
  }
  &:nth-last-child(-n + 2) {
    border-bottom: none;
  }
`;

const PerfStatCell = styled(GridCell)`
  flex-direction: column;
  align-items: flex-start;
  padding: ${({ theme }) => theme.spaces[3]};
`;

const FingerprintPanel = styled(Box)`
  max-height: 11rem;
  overflow-y: auto;
  border-radius: ${({ theme }) => theme.borderRadius};
  border: 1px solid ${({ theme }) => theme.colors.neutral200};
  background: ${({ theme }) => theme.colors.neutral100};
  padding: ${({ theme }) => theme.spaces[2]};
`;

const FingerprintText = styled.span`
  display: block;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono',
    'Courier New', monospace;
  font-size: 1.1rem;
  line-height: 1.4;
  word-break: break-word;
  color: ${({ theme }) => theme.colors.neutral800};
`;

const formatNumber = ({ locale, number }: { locale: string; number: number }) => {
  return new Intl.NumberFormat(locale, {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(number);
};

const LinkCell = styled(Link)`
  text-decoration: none;
  padding: ${({ theme }) => theme.spaces[3]};
`;

const KeyStatisticsWidget = () => {
  const { trackUsage } = useTracking();
  const { formatMessage, locale } = useIntl();
  const { data: countDocuments, isLoading: isLoadingCountDocuments } = useGetCountDocumentsQuery();
  const { data: countKeyStatistics, isLoading: isLoadingKeyStatistics } =
    useGetKeyStatisticsQuery();

  if (isLoadingKeyStatistics || isLoadingCountDocuments) {
    return <Widget.Loading />;
  }

  if (!countKeyStatistics || !countDocuments) {
    return <Widget.Error />;
  }

  const keyStatisticsList = {
    entries: {
      label: {
        id: 'widget.key-statistics.list.entries',
        defaultMessage: 'Entries',
      },
      icon: {
        component: <Files />,
        background: 'primary100',
        color: 'primary600',
      },
      link: '/content-manager',
    },
    assets: {
      label: {
        id: 'widget.key-statistics.list.assets',
        defaultMessage: 'Assets',
      },
      icon: {
        component: <Images />,
        background: 'warning100',
        color: 'warning600',
      },
      link: '/plugins/upload',
    },
    contentTypes: {
      label: {
        id: 'widget.key-statistics.list.contentTypes',
        defaultMessage: 'Content-Types',
      },
      icon: {
        component: <Layout />,
        background: 'secondary100',
        color: 'secondary600',
      },
      link: '/plugins/content-type-builder',
    },
    components: {
      label: {
        id: 'widget.key-statistics.list.components',
        defaultMessage: 'Components',
      },
      icon: {
        component: <Graph />,
        background: 'alternative100',
        color: 'alternative600',
      },
      link: '/plugins/content-type-builder',
    },
    locales: {
      label: {
        id: 'widget.key-statistics.list.locales',
        defaultMessage: 'Locales',
      },
      icon: {
        component: <Earth />,
        background: 'success100',
        color: 'success600',
      },
      link: '/settings/internationalization',
    },
    admins: {
      label: {
        id: 'widget.key-statistics.list.admins',
        defaultMessage: 'Admins',
      },
      icon: {
        component: <User />,
        background: 'danger100',
        color: 'danger600',
      },
      link: '/settings/users?pageSize=10&page=1&sort=firstname',
    },
    webhooks: {
      label: {
        id: 'widget.key-statistics.list.webhooks',
        defaultMessage: 'Webhooks',
      },
      icon: {
        component: <Webhooks />,
        background: 'alternative100',
        color: 'alternative600',
      },
      link: '/settings/webhooks',
    },
    apiTokens: {
      label: {
        id: 'widget.key-statistics.list.apiTokens',
        defaultMessage: 'API Tokens',
      },
      icon: {
        component: <Key />,
        background: 'neutral100',
        color: 'neutral600',
      },
      link: '/settings/api-tokens?sort=name:ASC',
    },
  };

  const { draft, published, modified } = countDocuments ?? {
    draft: 0,
    published: 0,
    modified: 0,
  };

  const totalCountEntries = draft + published + modified;

  return (
    <Grid>
      {Object.entries(keyStatisticsList).map(([key, item]) => {
        const value = countKeyStatistics?.[key as keyof typeof countKeyStatistics];
        return (
          value !== null && (
            <GridCell
              as={LinkCell}
              to={item.link}
              key={`key-statistics-${key}`}
              data-testid={`stat-${key}`}
              onClick={() => trackUsage('didOpenKeyStatisticsWidgetLink', { itemKey: key })}
            >
              <Flex alignItems="center" gap={2}>
                <Flex
                  padding={2}
                  borderRadius={1}
                  background={item.icon.background}
                  color={item.icon.color}
                >
                  {item.icon.component}
                </Flex>
                <Flex direction="column" alignItems="flex-start">
                  <Typography variant="pi" fontWeight="bold" textColor="neutral500">
                    {formatMessage(item.label)}
                  </Typography>
                  <Typography variant="omega" fontWeight="bold" textColor="neutral800">
                    {formatNumber({
                      locale,
                      number: key === 'entries' ? totalCountEntries : value,
                    })}
                  </Typography>
                </Flex>
              </Flex>
            </GridCell>
          )
        );
      })}
    </Grid>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Performance — two homepage widgets share one artifact tail query
 * -----------------------------------------------------------------------------------------------*/

const perfTailKb = (maxBytes: number) => Math.max(1, Math.round(maxBytes / 1024));

const usePerformanceMetricsFormatters = () => {
  const { locale } = useIntl();
  const formatInt = (n: number) =>
    new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(n);
  const formatMs = (n: number | null) =>
    n == null || Number.isNaN(n) ? '—' : `${formatInt(Math.round(n))} ms`;
  const formatPct = (n: number | null) =>
    n == null || Number.isNaN(n)
      ? '—'
      : `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(n)}%`;
  return { formatInt, formatMs, formatPct };
};

const PerformanceQuickStatsContextPopover = ({
  tailWindowLines,
  tailWindowKb,
  databasePerformanceEnabled,
  requestTimelineEnabled,
  lastGeneratedAt,
  linesScanned,
  batchesParsed,
}: {
  tailWindowLines: number;
  tailWindowKb: number;
  databasePerformanceEnabled: boolean;
  requestTimelineEnabled: boolean;
  lastGeneratedAt: string | null | undefined;
  linesScanned: number;
  batchesParsed: number;
}) => {
  const { formatMessage } = useIntl();
  const [open, setOpen] = React.useState(false);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger>
        <IconButton
          type="button"
          variant="tertiary"
          size="S"
          label={formatMessage({
            id: 'widget.performance-quick.context-trigger',
            defaultMessage: 'How this data is computed',
          })}
        >
          <Information />
        </IconButton>
      </Popover.Trigger>
      <Popover.Content side="bottom" align="end" style={{ maxWidth: '32rem' }}>
        <Flex direction="column" gap={3} alignItems="flex-start" padding={4}>
          <Typography variant="omega" textColor="neutral600">
            {formatMessage(
              {
                id: 'widget.performance-quick.caption',
                defaultMessage:
                  'Aggregated from the last {lines} non-empty lines (~{kb} KB) of the performance artifact — a rolling window, not lifetime totals.',
              },
              { lines: tailWindowLines, kb: tailWindowKb }
            )}
          </Typography>
          <Typography variant="omega" textColor="neutral600">
            {formatMessage(
              {
                id: 'widget.performance.flags',
                defaultMessage: 'DB perf: {db} · Request timeline: {req}',
              },
              {
                db: databasePerformanceEnabled ? 'on' : 'off',
                req: requestTimelineEnabled ? 'on' : 'off',
              }
            )}
          </Typography>
          {lastGeneratedAt ? (
            <Typography variant="omega" textColor="neutral600">
              {formatMessage(
                {
                  id: 'widget.performance.last-flush',
                  defaultMessage: 'Last batch: {time}',
                },
                { time: lastGeneratedAt }
              )}
            </Typography>
          ) : null}
          <Typography variant="omega" textColor="neutral600">
            {formatMessage(
              {
                id: 'widget.performance.tail-meta',
                defaultMessage: '{linesRead} tail lines · {batches} v1 batches',
              },
              { linesRead: linesScanned, batches: batchesParsed }
            )}
          </Typography>
        </Flex>
      </Popover.Content>
    </Popover.Root>
  );
};

const PerformanceLiveContextPopover = ({
  windowMinutes,
  databasePerformanceEnabled,
  requestTimelineEnabled,
}: {
  windowMinutes: number;
  databasePerformanceEnabled: boolean;
  requestTimelineEnabled: boolean;
}) => {
  const { formatMessage } = useIntl();
  const [open, setOpen] = React.useState(false);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger>
        <IconButton
          type="button"
          variant="tertiary"
          size="S"
          label={formatMessage({
            id: 'widget.performance-quick.context-trigger',
            defaultMessage: 'How this data is computed',
          })}
        >
          <Information />
        </IconButton>
      </Popover.Trigger>
      <Popover.Content side="bottom" align="end" style={{ maxWidth: '32rem' }}>
        <Flex direction="column" gap={3} alignItems="flex-start" padding={4}>
          <Typography variant="omega" textColor="neutral600">
            {formatMessage(
              {
                id: 'widget.performance-live.caption',
                defaultMessage:
                  'Live, in-memory rolling window of the last {minutes} min for this instance only — not cluster-wide, historical, or persisted across restarts.',
              },
              { minutes: windowMinutes }
            )}
          </Typography>
          <Typography variant="omega" textColor="neutral600">
            {formatMessage(
              {
                id: 'widget.performance.flags',
                defaultMessage: 'DB perf: {db} · Request timeline: {req}',
              },
              {
                db: databasePerformanceEnabled ? 'on' : 'off',
                req: requestTimelineEnabled ? 'on' : 'off',
              }
            )}
          </Typography>
        </Flex>
      </Popover.Content>
    </Popover.Root>
  );
};

const PerformanceQuickStatsWidget = () => {
  const { formatMessage } = useIntl();
  const { formatInt, formatMs, formatPct } = usePerformanceMetricsFormatters();
  const { data, isLoading, isError } = useGetPerformanceHomeMetricsQuery();

  if (isLoading) {
    return <Widget.Loading />;
  }

  if (isError || !data) {
    return <Widget.Error />;
  }

  if (data.source === 'none') {
    return <Widget.NoData>{data.hint}</Widget.NoData>;
  }

  if (data.source === 'artifact' && !data.fileFound) {
    return (
      <Widget.NoData>
        {formatMessage({
          id: 'widget.performance.missing-file',
          defaultMessage:
            'Performance artifact path is set, but the file does not exist yet. Traffic will create it on first flush.',
        })}
      </Widget.NoData>
    );
  }

  const { quickStats: q, databasePerformanceEnabled, requestTimelineEnabled } = data;

  return (
    <Flex direction="column" gap={2} flex={1} minHeight={0} width="100%">
      <Flex justifyContent="flex-end" alignItems="center" shrink={0} width="100%">
        {data.source === 'live' ? (
          <PerformanceLiveContextPopover
            windowMinutes={Math.max(1, Math.round(data.windowMs / 60000))}
            databasePerformanceEnabled={databasePerformanceEnabled}
            requestTimelineEnabled={requestTimelineEnabled}
          />
        ) : (
          <PerformanceQuickStatsContextPopover
            tailWindowLines={data.tailWindow.maxNonEmptyLines}
            tailWindowKb={perfTailKb(data.tailWindow.maxTailBytes)}
            databasePerformanceEnabled={databasePerformanceEnabled}
            requestTimelineEnabled={requestTimelineEnabled}
            lastGeneratedAt={data.lastGeneratedAt}
            linesScanned={data.linesScanned}
            batchesParsed={data.batchesParsed}
          />
        )}
      </Flex>
      <Box flex={1} minHeight={0} width="100%" overflow="auto">
        <Grid>
          <PerfStatCell>
            <Flex direction="column" alignItems="flex-start" gap={1}>
              <Typography variant="pi" fontWeight="bold" textColor="neutral700">
                {formatMessage({
                  id: 'widget.performance-quick.requests',
                  defaultMessage: 'Request summaries',
                })}
              </Typography>
              <Typography variant="omega" textColor="neutral600">
                {formatMessage({
                  id: 'widget.performance-quick.requests-hint',
                  defaultMessage: 'Sampled HTTP rows in window',
                })}
              </Typography>
              <Typography variant="alpha" fontWeight="bold">
                {formatInt(q.requestSummariesInWindow)}
              </Typography>
            </Flex>
          </PerfStatCell>
          <PerfStatCell>
            <Flex direction="column" alignItems="flex-start" gap={1}>
              <Typography variant="pi" fontWeight="bold" textColor="neutral700">
                {formatMessage({
                  id: 'widget.performance-quick.avg',
                  defaultMessage: 'Avg wall time',
                })}
              </Typography>
              <Typography variant="omega" textColor="neutral600">
                {formatMessage({
                  id: 'widget.performance-quick.avg-hint',
                  defaultMessage: 'Mean request duration',
                })}
              </Typography>
              <Typography variant="alpha" fontWeight="bold">
                {formatMs(q.avgRequestDurationMs)}
              </Typography>
            </Flex>
          </PerfStatCell>
          <PerfStatCell>
            <Flex direction="column" alignItems="flex-start" gap={1}>
              <Typography variant="pi" fontWeight="bold" textColor="neutral700">
                {formatMessage({
                  id: 'widget.performance-quick.median',
                  defaultMessage: 'Median wall time',
                })}
              </Typography>
              <Typography variant="omega" textColor="neutral600">
                {formatMessage({
                  id: 'widget.performance-quick.median-hint',
                  defaultMessage: 'p50 of summaries',
                })}
              </Typography>
              <Typography variant="alpha" fontWeight="bold">
                {formatMs(q.medianRequestDurationMs)}
              </Typography>
            </Flex>
          </PerfStatCell>
          <PerfStatCell>
            <Flex direction="column" alignItems="flex-start" gap={1}>
              <Typography variant="pi" fontWeight="bold" textColor="neutral700">
                {formatMessage({
                  id: 'widget.performance-quick.p95',
                  defaultMessage: 'p95 wall time',
                })}
              </Typography>
              <Typography variant="omega" textColor="neutral600">
                {formatMessage({
                  id: 'widget.performance-quick.p95-hint',
                  defaultMessage: 'Slow tail of requests',
                })}
              </Typography>
              <Typography variant="alpha" fontWeight="bold">
                {formatMs(q.p95RequestDurationMs)}
              </Typography>
            </Flex>
          </PerfStatCell>
          <PerfStatCell>
            <Flex direction="column" alignItems="flex-start" gap={1}>
              <Typography variant="pi" fontWeight="bold" textColor="neutral700">
                {formatMessage({
                  id: 'widget.performance-quick.db-share',
                  defaultMessage: 'Avg DB % of wall',
                })}
              </Typography>
              <Typography variant="omega" textColor="neutral600">
                {formatMessage({
                  id: 'widget.performance-quick.db-share-hint',
                  defaultMessage: 'dbTotalMs ÷ duration per summary',
                })}
              </Typography>
              <Typography variant="alpha" fontWeight="bold">
                {formatPct(q.avgDbPercentOfWallTime)}
              </Typography>
            </Flex>
          </PerfStatCell>
          <PerfStatCell>
            <Flex direction="column" alignItems="flex-start" gap={1}>
              <Typography variant="pi" fontWeight="bold" textColor="neutral700">
                {formatMessage({
                  id: 'widget.performance-quick.db-ms',
                  defaultMessage: 'Avg DB time',
                })}
              </Typography>
              <Typography variant="omega" textColor="neutral600">
                {formatMessage({
                  id: 'widget.performance-quick.db-ms-hint',
                  defaultMessage: 'Mean dbTotalMs',
                })}
              </Typography>
              <Typography variant="alpha" fontWeight="bold">
                {formatMs(q.avgDbTimePerRequestMs)}
              </Typography>
            </Flex>
          </PerfStatCell>
          <PerfStatCell>
            <Flex direction="column" alignItems="flex-start" gap={1}>
              <Typography variant="pi" fontWeight="bold" textColor="neutral700">
                {formatMessage({
                  id: 'widget.performance-quick.slow-sql',
                  defaultMessage: 'Slow / error SQL rows',
                })}
              </Typography>
              <Typography variant="omega" textColor="neutral600">
                {formatMessage({
                  id: 'widget.performance-quick.slow-sql-hint',
                  defaultMessage: 'In current window',
                })}
              </Typography>
              <Typography variant="alpha" fontWeight="bold">
                {formatInt(q.slowDbEventsInWindow)}
              </Typography>
            </Flex>
          </PerfStatCell>
          <PerfStatCell>
            <Flex direction="column" alignItems="flex-start" gap={1}>
              <Typography variant="pi" fontWeight="bold" textColor="neutral700">
                {formatMessage({
                  id: 'widget.performance-quick.slow-in-req',
                  defaultMessage: 'Slow queries (per request)',
                })}
              </Typography>
              <Typography variant="omega" textColor="neutral600">
                {formatMessage({
                  id: 'widget.performance-quick.slow-in-req-hint',
                  defaultMessage: 'Sum of slowQueryCount on summaries',
                })}
              </Typography>
              <Typography variant="alpha" fontWeight="bold">
                {formatInt(q.slowOrErrorQueriesAttributedToRequests)}
              </Typography>
            </Flex>
          </PerfStatCell>
        </Grid>
      </Box>
    </Flex>
  );
};

const RouteRow = styled(Box)`
  padding-bottom: ${({ theme }) => theme.spaces[2]};
  margin-bottom: ${({ theme }) => theme.spaces[2]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.neutral200};

  &:last-child {
    border-bottom: none;
    margin-bottom: 0;
    padding-bottom: 0;
  }
`;

const PerformanceRoutesSqlWidget = () => {
  const { formatMessage } = useIntl();
  const { formatInt, formatMs, formatPct } = usePerformanceMetricsFormatters();
  const { data, isLoading, isError } = useGetPerformanceHomeMetricsQuery();

  if (isLoading) {
    return <Widget.Loading />;
  }

  if (isError || !data) {
    return <Widget.Error />;
  }

  if (data.source === 'none') {
    return <Widget.NoData>{data.hint}</Widget.NoData>;
  }

  if (data.source === 'artifact' && !data.fileFound) {
    return (
      <Widget.NoData>
        {formatMessage({
          id: 'widget.performance.missing-file',
          defaultMessage:
            'Performance artifact path is set, but the file does not exist yet. Traffic will create it on first flush.',
        })}
      </Widget.NoData>
    );
  }

  const { slowestRoutes, topSqlFingerprints } = data;

  if (slowestRoutes.length === 0 && topSqlFingerprints.length === 0) {
    return (
      <Widget.NoData>
        {formatMessage({
          id: 'widget.performance-routes.empty',
          defaultMessage:
            'No HTTP request summaries or slow SQL rows in the current window yet. Generate some traffic and check back.',
        })}
      </Widget.NoData>
    );
  }

  return (
    <Flex direction="column" gap={4} height="100%">
      {slowestRoutes.length > 0 ? (
        <Flex direction="column" gap={2}>
          <Typography variant="pi" fontWeight="bold" textColor="neutral700">
            {formatMessage({
              id: 'widget.performance-routes.slowest',
              defaultMessage: 'Slowest routes (by average wall time)',
            })}
          </Typography>
          {slowestRoutes.map((r, index) => (
            <RouteRow key={`perf-route-${index}`}>
              <Typography variant="pi" fontWeight="bold" textColor="neutral800" ellipsis>
                {r.method} {r.route}
              </Typography>
              <Typography variant="omega" textColor="neutral600">
                {formatMessage(
                  {
                    id: 'widget.performance-routes.row-stats',
                    defaultMessage:
                      '{count} requests · avg {wall} · DB {dbpct} of wall · {dbms} DB time',
                  },
                  {
                    count: formatInt(r.count),
                    wall: formatMs(r.avgDurationMs),
                    dbpct: formatPct(r.avgDbPercent),
                    dbms: formatMs(r.avgDbMs),
                  }
                )}
              </Typography>
            </RouteRow>
          ))}
        </Flex>
      ) : null}
      {topSqlFingerprints.length > 0 ? (
        <Flex direction="column" gap={2}>
          <Typography variant="pi" fontWeight="bold" textColor="neutral700">
            {formatMessage({
              id: 'widget.performance-routes.top-sql',
              defaultMessage: 'Most frequent slow / error SQL shapes',
            })}
          </Typography>
          <FingerprintPanel>
            <Flex direction="column" gap={2}>
              {topSqlFingerprints.map((fp) => (
                <Flex
                  key={fp.fingerprint}
                  justifyContent="space-between"
                  alignItems="flex-start"
                  gap={3}
                >
                  <FingerprintText title={fp.fingerprint}>{fp.fingerprint}</FingerprintText>
                  <Typography variant="pi" textColor="neutral600" fontWeight="bold">
                    {formatMessage(
                      {
                        id: 'widget.performance.fingerprint-count',
                        defaultMessage: '{count, number}×',
                      },
                      { count: fp.count }
                    )}
                  </Typography>
                </Flex>
              ))}
            </Flex>
          </FingerprintPanel>
        </Flex>
      ) : null}
    </Flex>
  );
};

/* -------------------------------------------------------------------------------------------------
 * DeployNowWidget
 * -----------------------------------------------------------------------------------------------*/

const DeployNowWidget = () => {
  const { formatMessage } = useIntl();

  return (
    <Flex direction="column" gap={4} height="100%" alignItems="center" justifyContent="center">
      <CloudUpload width="3.2rem" height="3.2rem" />
      <Flex direction="column" gap={2}>
        <Typography variant="beta" textAlign="center">
          {formatMessage({
            id: 'HomePage.widget.deploy-now.title',
            defaultMessage: 'Ready to go live ?',
          })}
        </Typography>
        <Typography variant="omega" textColor="neutral600" textAlign="center">
          {formatMessage({
            id: 'HomePage.widget.deploy-now.description',
            defaultMessage: 'Deploy with Strapi Cloud',
          })}
        </Typography>
      </Flex>
      <LinkButton href="https://cloud.strapi.io/login" isExternal size="L" startIcon={<Cloud />}>
        {formatMessage({ id: 'HomePage.widget.deploy-now.button', defaultMessage: 'Deploy Now' })}
      </LinkButton>
    </Flex>
  );
};

export {
  ProfileWidget,
  KeyStatisticsWidget,
  PerformanceQuickStatsWidget,
  PerformanceRoutesSqlWidget,
  DeployNowWidget,
};
