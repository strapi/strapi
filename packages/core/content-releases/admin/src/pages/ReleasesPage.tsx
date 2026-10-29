import * as React from 'react';

import {
  Filters,
  Page,
  Pagination,
  useTracking,
  useAPIErrorHandler,
  useNotification,
  useQueryParams,
  useRBAC,
  Layouts,
  GradientBadge,
  Table,
  useField,
  withEncodedUserParams,
} from '@strapi/admin/strapi-admin';
import { useLicenseLimits } from '@strapi/admin/strapi-admin/ee';
import {
  Alert,
  Button,
  Flex,
  Main,
  MenuItem,
  SimpleMenu,
  SingleSelect,
  SingleSelectOption,
  Typography,
  Link,
} from '@strapi/design-system';
import { Calendar, ChartCircle, Clock, Plus, WarningCircle } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { useNavigate, useLocation, NavLink } from 'react-router-dom';
import { styled } from 'styled-components';

import {
  DEFAULT_RELEASE_CONDITION,
  RELEASE_CONDITIONS,
  RELEASE_STATUSES,
} from '../../../shared/constants';
import { GetReleases } from '../../../shared/contracts/releases';
import { RelativeTime as BaseRelativeTime } from '../components/RelativeTime';
import { ReleaseDrawer, type ReleaseDrawerValues } from '../components/ReleaseDrawer';
import { ReleaseStatusBadge, STATUS_MESSAGES } from '../components/ReleaseStatusBadge';
import { ScheduleFilterInput } from '../components/ScheduleFilterInput';
import { PERMISSIONS } from '../constants';
import {
  useGetReleasesQuery,
  useGetReleaseSettingsQuery,
  GetReleasesQueryParams,
  useCreateReleaseMutation,
} from '../services/release';
import { isBaseQueryError } from '../utils/api';
import { splitScheduleFilterValue, toReleasesApiFilters } from '../utils/scheduleFilters';
import { getTimezoneOffset } from '../utils/time';

import type { MessageDescriptor } from 'react-intl';

type ReleaseRow = GetReleases.Response['data'][number];

// Stable defaults: a literal default prop is a new reference on every render
const EMPTY_RELEASES: ReleaseRow[] = [];
const EMPTY_OPTIONS: NonNullable<Filters.ValueInputProps['options']> = [];

/* -------------------------------------------------------------------------------------------------
 * ReleasesTable
 * -----------------------------------------------------------------------------------------------*/

const RelativeTime = styled(BaseRelativeTime)`
  display: inline-block;
  &::first-letter {
    text-transform: uppercase;
  }
`;

const RELEASE_CONDITION_BADGES = {
  allow_partial: {
    icon: ChartCircle,
    message: {
      id: 'content-releases.pages.Releases.release-condition.allow_partial',
      defaultMessage: 'Allow partial',
    },
  },
  all_or_nothing: {
    icon: Clock,
    message: {
      id: 'content-releases.pages.Releases.release-condition.all_or_nothing',
      defaultMessage: 'All required',
    },
  },
} satisfies Record<
  ReleaseRow['releaseCondition'],
  { icon: React.ComponentType; message: MessageDescriptor }
>;

const ScheduleCell = ({ release }: { release: ReleaseRow }) => {
  const { formatMessage, formatDate, formatTime } = useIntl();
  const isFrozen = Boolean(release.releasedAt);
  // A release that froze without running never ran: `releasedAt` is when it froze, not a run
  const date = release.failureReason
    ? release.scheduledAt
    : (release.releasedAt ?? release.scheduledAt);

  if (!date) {
    return (
      <Typography textColor="neutral600">
        {formatMessage({
          id: 'content-releases.pages.Releases.not-scheduled',
          defaultMessage: 'Not scheduled',
        })}
      </Typography>
    );
  }

  const timestamp = new Date(date);
  const timeZone = release.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const Icon = isFrozen ? Calendar : Clock;
  const absoluteTime = `${formatDate(timestamp, { day: 'numeric', month: 'short', year: 'numeric', timeZone })} • ${formatTime(timestamp, { timeZone, hourCycle: 'h23' })} ${getTimezoneOffset(timeZone, timestamp)}`;

  return (
    <Flex gap={2} alignItems="flex-start">
      <Flex paddingTop={1} color="neutral500">
        <Icon width="1.2rem" height="1.2rem" aria-hidden />
      </Flex>
      <Flex direction="column" alignItems="flex-start">
        <Typography textColor={isFrozen ? 'neutral600' : 'neutral800'}>
          {/* The browser-zone default title would contradict the release-zone line below */}
          <RelativeTime timestamp={timestamp} title={absoluteTime} />
        </Typography>
        <Typography variant="pi" textColor="neutral600">
          {absoluteTime}
        </Typography>
      </Flex>
    </Flex>
  );
};

const EntriesCell = ({ release }: { release: ReleaseRow }) => {
  const { formatMessage } = useIntl();
  const isFrozen = Boolean(release.releasedAt);
  const { count, notReadyCount = 0 } = release.actions.meta;

  return (
    <Flex direction="column" alignItems="flex-start">
      <Typography textColor={isFrozen ? 'neutral600' : 'neutral800'}>
        {formatMessage(
          {
            id: 'content-releases.pages.Releases.table.entries',
            defaultMessage: '{number, plural, one {# entry} other {# entries}}',
          },
          { number: count }
        )}
      </Typography>
      {!isFrozen && notReadyCount > 0 && (
        <Flex gap={1} color="warning600">
          <WarningCircle width="1.2rem" height="1.2rem" aria-hidden />
          <Typography variant="pi" textColor="warning600">
            {formatMessage(
              {
                id: 'content-releases.pages.Releases.table.entries-ready',
                defaultMessage: '{ready} of {total} ready',
              },
              { ready: count - notReadyCount, total: count }
            )}
          </Typography>
        </Flex>
      )}
    </Flex>
  );
};

const ReleaseConditionBadge = ({
  releaseCondition,
}: {
  releaseCondition: ReleaseRow['releaseCondition'];
}) => {
  const { formatMessage } = useIntl();
  const { icon: Icon, message } = RELEASE_CONDITION_BADGES[releaseCondition];

  return (
    <Flex gap={1} color="neutral800">
      <Icon width="1.2rem" height="1.2rem" aria-hidden />
      <Typography variant="pi" fontWeight="semiBold">
        {formatMessage(message)}
      </Typography>
    </Flex>
  );
};

/* -------------------------------------------------------------------------------------------------
 * ReleasesFilters
 * -----------------------------------------------------------------------------------------------*/

/**
 * The value input of the status and release mode filters. The default enumeration input would
 * offer an empty "Choose here" option, but these fields always have a value. Being a custom
 * input with options, its tag also shows the option's label rather than the stored value.
 */
const OptionFilterInput = ({
  name,
  options = EMPTY_OPTIONS,
  ...props
}: Filters.ValueInputProps) => {
  const field = useField<string>(name);

  return (
    <SingleSelect
      aria-label={props['aria-label']}
      value={field.value}
      onChange={(value) => field.onChange(name, String(value))}
    >
      {options.map((option) =>
        typeof option === 'string' ? (
          <SingleSelectOption key={option} value={option}>
            {option}
          </SingleSelectOption>
        ) : (
          <SingleSelectOption key={option.value} value={option.value}>
            {option.label ?? option.value}
          </SingleSelectOption>
        )
      )}
    </SingleSelect>
  );
};

const useReleasesFilterOptions = (): Filters.Filter[] => {
  const { formatMessage, formatDate } = useIntl();

  return React.useMemo(() => {
    // A date alone matches the day, a date and time the minute: the tag says which
    const formatScheduleValue = (value: string) => {
      const { date, time } = splitScheduleFilterValue(value);
      if (!date) {
        return value;
      }

      return time
        ? formatDate(new Date(value), { dateStyle: 'medium', timeStyle: 'short' })
        : formatDate(date, { dateStyle: 'medium' });
    };

    // Status and release mode are always set: only "is" and "is not" make sense
    const enumerationOperators = [
      {
        label: formatMessage({
          id: 'components.FilterOptions.FILTER_TYPES.$eq',
          defaultMessage: 'is',
        }),
        value: '$eq',
      },
      {
        label: formatMessage({
          id: 'components.FilterOptions.FILTER_TYPES.$ne',
          defaultMessage: 'is not',
        }),
        value: '$ne',
      },
    ];

    return [
      {
        name: 'status',
        label: formatMessage({
          id: 'content-releases.pages.Releases.filters.status',
          defaultMessage: 'Status',
        }),
        type: 'enumeration',
        input: OptionFilterInput,
        operators: enumerationOperators,
        options: RELEASE_STATUSES.map((status) => ({
          label: formatMessage(STATUS_MESSAGES[status]),
          value: status,
        })),
      },
      {
        name: 'releaseCondition',
        label: formatMessage({
          id: 'content-releases.pages.Releases.filters.release-mode',
          defaultMessage: 'Release mode',
        }),
        type: 'enumeration',
        input: OptionFilterInput,
        operators: enumerationOperators,
        options: RELEASE_CONDITIONS.map((releaseCondition) => ({
          label: formatMessage(RELEASE_CONDITION_BADGES[releaseCondition].message),
          value: releaseCondition,
        })),
      },
      {
        // "Not scheduled" is "is null"
        name: 'scheduledAt',
        label: formatMessage({
          id: 'content-releases.pages.Releases.filters.scheduled-for',
          defaultMessage: 'Scheduled for',
        }),
        type: 'datetime',
        input: ScheduleFilterInput,
        formatValue: formatScheduleValue,
      },
      {
        // "Not released yet" is "is null"
        name: 'releasedAt',
        label: formatMessage({
          id: 'content-releases.pages.Releases.filters.released-on',
          defaultMessage: 'Released on',
        }),
        type: 'datetime',
        input: ScheduleFilterInput,
        formatValue: formatScheduleValue,
      },
    ];
  }, [formatMessage, formatDate]);
};

/* -------------------------------------------------------------------------------------------------
 * ReleasesSort
 * -----------------------------------------------------------------------------------------------*/

const DEFAULT_SORT = 'updatedAt:desc';

// No schedule sort: releases without a date land first or last depending on the database
const SORT_OPTIONS = [
  {
    value: 'updatedAt:desc',
    message: {
      id: 'content-releases.pages.Releases.sort.updated-at-desc',
      defaultMessage: 'Most recent updates',
    },
  },
  {
    value: 'updatedAt:asc',
    message: {
      id: 'content-releases.pages.Releases.sort.updated-at-asc',
      defaultMessage: 'Oldest updates',
    },
  },
  {
    value: 'createdAt:desc',
    message: {
      id: 'content-releases.pages.Releases.sort.created-at-desc',
      defaultMessage: 'Most recently created',
    },
  },
  {
    value: 'name:asc',
    message: {
      id: 'content-releases.pages.Releases.sort.name-asc',
      defaultMessage: 'Name (A to Z)',
    },
  },
  {
    value: 'name:desc',
    message: {
      id: 'content-releases.pages.Releases.sort.name-desc',
      defaultMessage: 'Name (Z to A)',
    },
  },
] satisfies Array<{ value: string; message: MessageDescriptor }>;

interface ReleasesSortProps {
  value: string;
  onChange: (sort: string) => void;
}

const ReleasesSort = ({ value, onChange }: ReleasesSortProps) => {
  const { formatMessage } = useIntl();
  const selected = SORT_OPTIONS.find((option) => option.value === value);

  return (
    <SimpleMenu
      popoverPlacement="bottom-end"
      label={
        // A sort typed in the URL still applies, it just has no label
        selected
          ? formatMessage(
              {
                id: 'content-releases.pages.Releases.sort.label',
                defaultMessage: 'Sort: {sort}',
              },
              { sort: formatMessage(selected.message) }
            )
          : formatMessage({
              id: 'content-releases.pages.Releases.sort.placeholder',
              defaultMessage: 'Sort',
            })
      }
    >
      {SORT_OPTIONS.map((option) => (
        <MenuItem key={option.value} onSelect={() => onChange(option.value)}>
          {formatMessage(option.message)}
        </MenuItem>
      ))}
    </SimpleMenu>
  );
};

/* -------------------------------------------------------------------------------------------------
 * ReleasesTable
 * -----------------------------------------------------------------------------------------------*/

interface ReleasesTableProps {
  releases?: GetReleases.Response['data'];
  isLoading?: boolean;
  hasFilters?: boolean;
  onClearFilters?: () => void;
}

const ReleasesTable = ({
  releases = EMPTY_RELEASES,
  isLoading = false,
  hasFilters = false,
  onClearFilters,
}: ReleasesTableProps) => {
  const { formatMessage } = useIntl();
  const navigate = useNavigate();

  const headers = [
    {
      name: 'name',
      label: formatMessage({
        id: 'content-releases.pages.Releases.table.header.name',
        defaultMessage: 'name',
      }),
    },
    {
      name: 'status',
      label: formatMessage({
        id: 'content-releases.pages.Releases.table.header.status',
        defaultMessage: 'status',
      }),
    },
    {
      name: 'schedule',
      label: formatMessage({
        id: 'content-releases.pages.Releases.table.header.schedule',
        defaultMessage: 'schedule',
      }),
    },
    {
      name: 'entries',
      label: formatMessage({
        id: 'content-releases.pages.Releases.table.header.entries',
        defaultMessage: 'entries',
      }),
    },
    {
      name: 'releaseCondition',
      label: formatMessage({
        id: 'content-releases.pages.Releases.table.header.release-mode',
        defaultMessage: 'release mode',
      }),
    },
  ];

  return (
    <Table.Root rows={releases} headers={headers} isLoading={isLoading}>
      <Table.Content>
        <Table.Head>
          {headers.map(({ label, name }) => (
            <Table.HeaderCell key={name} label={label} name={name} />
          ))}
        </Table.Head>
        {hasFilters ? (
          <Table.Empty
            content={formatMessage({
              id: 'content-releases.pages.Releases.filters.empty',
              defaultMessage: 'No releases match these filters',
            })}
            action={
              <Button variant="secondary" onClick={onClearFilters}>
                {formatMessage({
                  id: 'content-releases.pages.Releases.filters.clear',
                  defaultMessage: 'Clear filters',
                })}
              </Button>
            }
          />
        ) : (
          <Table.Empty
            content={formatMessage({
              id: 'content-releases.page.Releases.tab.emptyEntries',
              defaultMessage: 'No releases',
            })}
          />
        )}
        <Table.Loading />
        <Table.Body>
          {releases.map((release) => (
            <Table.Row key={release.id} cursor="pointer" onClick={() => navigate(`${release.id}`)}>
              <Table.Cell width="30%" maxWidth="30rem">
                <Link
                  tag={NavLink}
                  to={`${release.id}`}
                  isExternal={false}
                  onClick={(e: React.MouseEvent) => e.stopPropagation()}
                >
                  <Typography textColor="neutral800" ellipsis>
                    {release.name}
                  </Typography>
                </Link>
              </Table.Cell>
              <Table.Cell>
                <ReleaseStatusBadge status={release.status} />
              </Table.Cell>
              <Table.Cell>
                <ScheduleCell release={release} />
              </Table.Cell>
              <Table.Cell>
                <EntriesCell release={release} />
              </Table.Cell>
              <Table.Cell>
                <ReleaseConditionBadge releaseCondition={release.releaseCondition} />
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Content>
    </Table.Root>
  );
};

/* -------------------------------------------------------------------------------------------------
 * ReleasesPage
 * -----------------------------------------------------------------------------------------------*/

const StyledAlert = styled(Alert)`
  button {
    display: none;
  }
  p + div {
    margin-left: auto;
  }
`;

const ReleasesPage = () => {
  const location = useLocation();
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = React.useState(false);
  const { toggleNotification } = useNotification();
  const { formatMessage } = useIntl();
  const navigate = useNavigate();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();
  const [{ query }, setQuery] = useQueryParams<GetReleasesQueryParams & Filters.Query>();
  // Only the filters the page controls: old links can still carry the filters of the removed tabs
  const { page, pageSize, sort = DEFAULT_SORT } = query;
  // A hand-edited URL can make `$and` a string or an object
  const appliedFilters = Array.isArray(query.filters?.$and) ? query.filters.$and : [];
  const hasFilters = appliedFilters.length > 0;
  const response = useGetReleasesQuery({
    page,
    pageSize,
    sort,
    filters: hasFilters ? { $and: toReleasesApiFilters(appliedFilters) } : undefined,
  });
  const filterOptions = useReleasesFilterOptions();
  const { data: settings, isLoading: isLoadingSettings } = useGetReleaseSettingsQuery();
  const [createRelease, { isLoading: isSubmittingForm }] = useCreateReleaseMutation();
  const { getFeature } = useLicenseLimits();
  const { maximumReleases = 3 } = getFeature('cms-content-releases') as {
    maximumReleases: number;
  };
  const { trackUsage } = useTracking();
  const {
    allowedActions: { canCreate },
  } = useRBAC(PERMISSIONS);

  const { isLoading: isLoadingReleases, isFetching, isError } = response;
  // `currentData` is cleared while another page loads; the last result keeps the header steady
  const meta = response.data?.meta;

  // Check if we have some errors and show a notification to the user to explain the error
  React.useEffect(() => {
    if (location?.state?.errors) {
      toggleNotification({
        type: 'danger',
        title: formatMessage({
          id: 'content-releases.pages.Releases.notification.error.title',
          defaultMessage: 'Your request could not be processed.',
        }),
        message: formatMessage({
          id: 'content-releases.pages.Releases.notification.error.message',
          defaultMessage: 'Please try again or open another release.',
        }),
      });
      navigate('', { replace: true, state: null });
    }
  }, [formatMessage, location?.state?.errors, navigate, toggleNotification]);

  const changeSort = (nextSort: string) => {
    // The applied filters stay: their values are written back to the URL encoded
    setQuery(withEncodedUserParams(query, { sort: nextSort, page: 1 }));
  };

  const clearFilters = () => {
    setQuery({ filters: undefined, page: 1 });
  };

  const toggleCreateDrawer = () => {
    setIsCreateDrawerOpen((prev) => !prev);
  };

  if (isLoadingReleases || isLoadingSettings) {
    return <Page.Loading />;
  }

  const totalPendingReleases = meta?.pendingReleasesCount ?? 0;
  const hasReachedMaximumPendingReleases = totalPendingReleases >= maximumReleases;

  const handleAddRelease = async (values: ReleaseDrawerValues) => {
    const response = await createRelease(values);
    if ('data' in response) {
      // When the response returns an object with 'data', handle success
      toggleNotification({
        type: 'success',
        message: formatMessage({
          id: 'content-releases.modal.release-created-notification-success',
          defaultMessage: 'Release created.',
        }),
      });

      trackUsage('didCreateRelease');
      navigate(response.data.data.id.toString());
    } else if (isBaseQueryError(response.error)) {
      // The API's error, e.g. a pending release already has this name
      toggleNotification({
        type: 'danger',
        message: formatAPIError(response.error),
      });
    } else {
      // Otherwise, the response returns an object with 'error', handle a generic error
      toggleNotification({
        type: 'danger',
        message: formatMessage({ id: 'notification.error', defaultMessage: 'An error occurred' }),
      });
    }
  };

  return (
    <Layouts.Root>
      <Main aria-busy={isLoadingReleases || isLoadingSettings}>
        <Layouts.Header
          title={formatMessage({
            id: 'content-releases.pages.Releases.title',
            defaultMessage: 'Releases',
          })}
          secondaryAction={
            <GradientBadge
              label={formatMessage({
                id: 'components.premiumFeature.title',
                defaultMessage: 'Premium feature',
              })}
            />
          }
          subtitle={
            // The count would read "0 releases" next to the error
            !isError && meta
              ? formatMessage(
                  {
                    id: 'content-releases.pages.Releases.header-subtitle.count',
                    defaultMessage: '{number, plural, one {# release} other {# releases}}',
                  },
                  { number: meta.pagination?.total ?? 0 }
                )
              : undefined
          }
          primaryAction={
            canCreate ? (
              <Button
                startIcon={<Plus />}
                onClick={toggleCreateDrawer}
                disabled={hasReachedMaximumPendingReleases}
                fullWidth
              >
                {formatMessage({
                  id: 'content-releases.header.actions.add-release',
                  defaultMessage: 'New release',
                })}
              </Button>
            ) : null
          }
        />
        <Filters.Root options={filterOptions}>
          <Layouts.Action
            startActions={
              <>
                <Filters.Trigger />
                <Filters.List />
                {hasFilters && (
                  <Button variant="ghost" size="S" onClick={clearFilters}>
                    {formatMessage({
                      id: 'content-releases.pages.Releases.filters.clear-all',
                      defaultMessage: 'Clear all',
                    })}
                  </Button>
                )}
              </>
            }
            endActions={<ReleasesSort value={String(sort)} onChange={changeSort} />}
          />
          <Filters.Popover />
        </Filters.Root>
        <Layouts.Content>
          <>
            {hasReachedMaximumPendingReleases && (
              <StyledAlert
                marginBottom={6}
                action={
                  <Link href="https://strapi.io/pricing-cloud" isExternal>
                    {formatMessage({
                      id: 'content-releases.pages.Releases.max-limit-reached.action',
                      defaultMessage: 'Explore plans',
                    })}
                  </Link>
                }
                title={formatMessage(
                  {
                    id: 'content-releases.pages.Releases.max-limit-reached.title',
                    defaultMessage:
                      'You have reached the {number} pending {number, plural, one {release} other {releases}} limit.',
                  },
                  { number: maximumReleases }
                )}
                onClose={() => {}}
                closeLabel=""
              >
                {formatMessage({
                  id: 'content-releases.pages.Releases.max-limit-reached.message',
                  defaultMessage: 'Upgrade to manage an unlimited number of releases.',
                })}
              </StyledAlert>
            )}
            {isError ? (
              <Page.Error />
            ) : (
              <Flex direction="column" alignItems="stretch" gap={4}>
                <ReleasesTable
                  releases={response.currentData?.data}
                  // Background refetches keep `currentData`: only blank the table while it's missing
                  isLoading={isFetching && !response.currentData}
                  hasFilters={hasFilters}
                  onClearFilters={clearFilters}
                />
                <Pagination.Root {...meta?.pagination} defaultPageSize={meta?.pagination?.pageSize}>
                  <Pagination.PageSize options={['8', '16', '32', '64']} />
                  <Pagination.Links />
                </Pagination.Root>
              </Flex>
            )}
          </>
        </Layouts.Content>
        <ReleaseDrawer
          open={isCreateDrawerOpen}
          onClose={toggleCreateDrawer}
          onSubmit={handleAddRelease}
          title={formatMessage({
            id: 'content-releases.release-drawer.create.title',
            defaultMessage: 'New release',
          })}
          submitLabel={formatMessage({
            id: 'content-releases.release-drawer.form.submit.create',
            defaultMessage: 'Create release',
          })}
          isSubmitting={isSubmittingForm}
          initialValues={{
            name: '',
            isScheduled: true,
            scheduledAt: null,
            timezone: null,
            releaseCondition: DEFAULT_RELEASE_CONDITION,
          }}
          defaultTimezone={settings?.data.defaultTimezone}
        />
      </Main>
    </Layouts.Root>
  );
};

export { ReleasesPage };
