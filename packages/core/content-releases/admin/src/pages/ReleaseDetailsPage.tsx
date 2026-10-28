import * as React from 'react';

import {
  Page,
  Pagination,
  Table,
  BackButton,
  ConfirmDialog,
  useTracking,
  useAPIErrorHandler,
  useNotification,
  useQueryParams,
  useRBAC,
  isFetchError,
  useStrapiApp,
  Layouts,
} from '@strapi/admin/strapi-admin';
import {
  Button,
  Flex,
  Main,
  Tr,
  Td,
  Typography,
  Badge,
  SingleSelect,
  SingleSelectOption,
  EmptyStateLayout,
  LinkButton,
  Dialog,
  SimpleMenu,
  Menu,
  Tabs,
  Divider,
} from '@strapi/design-system';
import { More, Pencil, Trash } from '@strapi/icons';
import { EmptyDocuments } from '@strapi/icons/symbols';
import { useIntl, type MessageDescriptor } from 'react-intl';
import { useParams, useNavigate, Link as ReactRouterLink, Navigate } from 'react-router-dom';
import { styled } from 'styled-components';

import {
  CreateReleaseFromSkippedDrawer,
  getExistingEntries,
  hasLoadedEveryEntry,
  getSkippedEntriesQuery,
} from '../components/CreateReleaseFromSkippedDrawer';
import { EntryLinkButton } from '../components/EntryLinkButton';
import { EntryReasonDrawer, type EntryReasonDetails } from '../components/EntryReasonDrawer';
import { RelativeTime } from '../components/RelativeTime';
import { ReleaseActionMenu } from '../components/ReleaseActionMenu';
import { ReleaseActionOptions } from '../components/ReleaseActionOptions';
import { PlannedActionStatus, ReleasedActionStatus } from '../components/ReleaseActionStatus';
import { ReleaseDrawer, type ReleaseDrawerValues } from '../components/ReleaseDrawer';
import { ReleaseStatusBadge } from '../components/ReleaseStatusBadge';
import { PERMISSIONS } from '../constants';
import {
  GetReleaseActionsQueryParams,
  useGetReleaseActionsQuery,
  useGetReleaseQuery,
  useGetReleaseSettingsQuery,
  useUpdateReleaseMutation,
  useUpdateReleaseActionMutation,
  usePublishReleaseMutation,
  useDeleteReleaseMutation,
  releaseApi,
} from '../services/release';
import { useTypedDispatch } from '../store/hooks';
import { isBaseQueryError } from '../utils/api';
import { getTimezoneOffset } from '../utils/time';

import type { ReleaseActionFilter } from '../../../shared/constants';
import type {
  ReleaseAction,
  ReleaseActionGroupBy,
} from '../../../shared/contracts/release-actions';
import type { ReleaseDataResponse } from '../../../shared/contracts/releases';

const getRunTotals = (release: ReleaseDataResponse) => {
  if (
    !release.releasedAt ||
    release.failureReason === 'failed_before_upgrade' ||
    typeof release.totalSkippedEntries !== 'number'
  ) {
    return null;
  }

  const released = (release.totalPublishedEntries ?? 0) + (release.totalUnpublishedEntries ?? 0);

  return {
    released,
    skipped: release.totalSkippedEntries,
    total: released + release.totalSkippedEntries,
  };
};

type ReleaseTabValue = 'all' | ReleaseActionFilter;

interface ReleaseTab {
  value: ReleaseTabValue;
  label: MessageDescriptor;
  count?: number;
}

const ALL_TAB_LABEL = {
  id: 'content-releases.pages.ReleaseDetails.tab.all',
  defaultMessage: 'All',
};

const getReleaseTabs = (release: ReleaseDataResponse): ReleaseTab[] => {
  if (release.releasedAt) {
    const totals = getRunTotals(release);

    if (!totals) {
      return [{ value: 'all', label: ALL_TAB_LABEL }];
    }

    return [
      { value: 'all', label: ALL_TAB_LABEL, count: totals.total },
      {
        value: 'released',
        label: {
          id: 'content-releases.pages.ReleaseDetails.tab.released',
          defaultMessage: 'Released',
        },
        count: totals.released,
      },
      {
        value: 'skipped',
        label: {
          id: 'content-releases.pages.ReleaseDetails.tab.skipped',
          defaultMessage: 'Skipped',
        },
        count: totals.skipped,
      },
    ];
  }

  const total = release.actions.meta.count;
  const { notReadyCount } = release.actions.meta;

  return [
    { value: 'all', label: ALL_TAB_LABEL, count: total },
    {
      value: 'ready',
      label: { id: 'content-releases.pages.ReleaseDetails.tab.ready', defaultMessage: 'Ready' },
      count: notReadyCount === undefined ? undefined : total - notReadyCount,
    },
    {
      value: 'notReady',
      label: {
        id: 'content-releases.pages.ReleaseDetails.tab.not-ready',
        defaultMessage: 'Not ready',
      },
      count: notReadyCount,
    },
  ];
};

/* -------------------------------------------------------------------------------------------------
 * ReleaseDetailsLayout
 * -----------------------------------------------------------------------------------------------*/
const ReleaseInfoWrapper = styled(Flex)`
  align-self: stretch;
  border-bottom-right-radius: ${({ theme }) => theme.borderRadius};
  border-bottom-left-radius: ${({ theme }) => theme.borderRadius};
  border-top: 1px solid ${({ theme }) => theme.colors.neutral150};
`;

interface ReleaseDetailsLayoutProps {
  toggleEditDrawer: () => void;
  toggleWarningSubmit: () => void;
  children: React.ReactNode;
}

const ReleaseDetailsLayout = ({
  toggleEditDrawer,
  toggleWarningSubmit,
  children,
}: ReleaseDetailsLayoutProps) => {
  const { formatMessage, formatDate, formatTime } = useIntl();
  const { releaseId } = useParams<{ releaseId: string }>();
  const {
    data,
    isLoading: isLoadingDetails,
    error,
  } = useGetReleaseQuery(
    { id: releaseId! },
    {
      skip: !releaseId,
    }
  );
  const [publishRelease, { isLoading: isPublishing }] = usePublishReleaseMutation();
  const { toggleNotification } = useNotification();
  const { formatAPIError } = useAPIErrorHandler();
  const { allowedActions } = useRBAC(PERMISSIONS);
  const { canCreate, canCreateAction, canUpdate, canDelete, canPublish } = allowedActions;
  const dispatch = useTypedDispatch();
  const { trackUsage } = useTracking();
  const [isSkippedDrawerOpen, setIsSkippedDrawerOpen] = React.useState(false);

  const release = data?.data;
  // Creating the release adds its actions, so it takes both permissions, as the route does.
  // A run that failed before the upgrade may have released some entries without recording which,
  // so the page doesn't offer to release them again.
  const canCreateFromSkipped =
    Boolean(release?.releasedAt) &&
    (release?.status === 'partial' || release?.status === 'failed') &&
    release?.failureReason !== 'failed_before_upgrade' &&
    canCreate &&
    canCreateAction;
  const { data: skippedData } = useGetReleaseActionsQuery(getSkippedEntriesQuery(releaseId!), {
    skip: !canCreateFromSkipped,
  });

  const handlePublishRelease = (id: string) => async () => {
    const response = await publishRelease({ id });

    if ('data' in response) {
      // When the response returns an object with 'data', handle success
      toggleNotification({
        type: 'success',
        message: formatMessage({
          id: 'content-releases.pages.ReleaseDetails.publish-notification-success',
          defaultMessage: 'Release was published successfully.',
        }),
      });

      const { totalEntries, totalPublishedEntries, totalUnpublishedEntries } = response.data.meta;

      trackUsage('didPublishRelease', {
        totalEntries,
        totalPublishedEntries,
        totalUnpublishedEntries,
      });
    } else if (isFetchError(response.error)) {
      // When the response returns an object with 'error', handle fetch error
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

  const handleRefresh = () => {
    dispatch(
      releaseApi.util.invalidateTags([
        { type: 'ReleaseAction', id: 'LIST' },
        { type: 'Release', id: releaseId },
      ])
    );
  };

  const getCreatedByUser = () => {
    if (!release?.createdBy) {
      return null;
    }

    // Favor the username
    if (release.createdBy.username) {
      return release.createdBy.username;
    }

    // Firstname may not exist if created with SSO
    if (release.createdBy.firstname) {
      return `${release.createdBy.firstname} ${release.createdBy.lastname || ''}`.trim();
    }

    // All users must have at least an email
    return release.createdBy.email;
  };

  if (isLoadingDetails) {
    return <Page.Loading />;
  }

  if ((isBaseQueryError(error) && 'code' in error) || !release) {
    return (
      <Navigate
        to=".."
        state={{
          errors: [
            {
              // @ts-expect-error – TODO: fix this weird error flow
              code: error?.code,
            },
          ],
        }}
      />
    );
  }

  const totalEntries = release.actions.meta.count || 0;
  // Entries deleted since the run can't be carried over. Unloaded ones may still exist.
  const hasSkippedEntriesToCarryOver =
    skippedData !== undefined &&
    (getExistingEntries(skippedData).length > 0 || !hasLoadedEveryEntry(skippedData));
  const showCreateFromSkipped = canCreateFromSkipped && hasSkippedEntriesToCarryOver;
  const hasCreatedByUser = Boolean(getCreatedByUser());

  const isScheduled = release.scheduledAt && release.timezone;
  const numberOfEntriesText = formatMessage(
    {
      id: 'content-releases.pages.Details.header-subtitle',
      defaultMessage: '{number, plural, =0 {No entries} one {# entry} other {# entries}}',
    },
    { number: totalEntries }
  );
  const scheduledText = isScheduled
    ? formatMessage(
        {
          id: 'content-releases.pages.ReleaseDetails.header-subtitle.scheduled',
          defaultMessage: 'Scheduled for {date} at {time} ({offset})',
        },
        {
          date: formatDate(new Date(release.scheduledAt!), {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            timeZone: release.timezone!,
          }),
          time: formatTime(new Date(release.scheduledAt!), {
            timeZone: release.timezone!,
            hourCycle: 'h23',
          }),
          offset: getTimezoneOffset(release.timezone!, new Date(release.scheduledAt!)),
        }
      )
    : '';

  return (
    <Layouts.Root>
      <Main aria-busy={isLoadingDetails}>
        <Layouts.Header
          title={release.name}
          subtitle={
            <Flex gap={2} lineHeight={6}>
              {release.releasedAt ? (
                <RunSummary
                  release={release}
                  scheduledText={isScheduled ? scheduledText : ''}
                  numberOfEntriesText={numberOfEntriesText}
                />
              ) : (
                <Typography textColor="neutral600" variant="epsilon">
                  {numberOfEntriesText + (isScheduled ? ` - ${scheduledText}` : '')}
                </Typography>
              )}
            </Flex>
          }
          secondaryAction={<ReleaseStatusBadge status={release.status} />}
          navigationAction={<BackButton fallback=".." />}
          primaryAction={
            release.releasedAt ? (
              showCreateFromSkipped && (
                <Button size="S" variant="default" onClick={() => setIsSkippedDrawerOpen(true)}>
                  {formatMessage({
                    id: 'content-releases.header.actions.create-from-skipped',
                    defaultMessage: 'Create release from skipped',
                  })}
                </Button>
              )
            ) : (
              <Flex gap={2}>
                <SimpleMenuButton
                  label={<More />}
                  variant="tertiary"
                  endIcon={null}
                  paddingLeft="7px"
                  paddingRight="7px"
                  aria-label={formatMessage({
                    id: 'content-releases.header.actions.open-release-actions',
                    defaultMessage: 'Release edit and delete menu',
                  })}
                  popoverPlacement="bottom-end"
                >
                  <Menu.Item
                    disabled={!canUpdate}
                    onSelect={toggleEditDrawer}
                    startIcon={<Pencil />}
                  >
                    {formatMessage({
                      id: 'content-releases.header.actions.edit',
                      defaultMessage: 'Edit',
                    })}
                  </Menu.Item>
                  <Menu.Item
                    disabled={!canDelete}
                    onSelect={toggleWarningSubmit}
                    variant="danger"
                    startIcon={<Trash />}
                  >
                    {formatMessage({
                      id: 'content-releases.header.actions.delete',
                      defaultMessage: 'Delete',
                    })}
                  </Menu.Item>
                  <ReleaseInfoWrapper
                    direction="column"
                    justifyContent="center"
                    alignItems="flex-start"
                    gap={1}
                    padding={4}
                  >
                    <Typography variant="pi" fontWeight="bold">
                      {formatMessage({
                        id: 'content-releases.header.actions.created',
                        defaultMessage: 'Created',
                      })}
                    </Typography>
                    <Typography variant="pi" color="neutral300">
                      <RelativeTime timestamp={new Date(release.createdAt)} />
                      {formatMessage(
                        {
                          id: 'content-releases.header.actions.created.description',
                          defaultMessage:
                            '{hasCreatedByUser, select, true { by {createdBy}} other { by deleted user}}',
                        },
                        { createdBy: getCreatedByUser(), hasCreatedByUser }
                      )}
                    </Typography>
                  </ReleaseInfoWrapper>
                </SimpleMenuButton>
                <Button size="S" variant="tertiary" onClick={handleRefresh}>
                  {formatMessage({
                    id: 'content-releases.header.actions.refresh',
                    defaultMessage: 'Refresh',
                  })}
                </Button>
                {canPublish ? (
                  <Button
                    size="S"
                    variant="default"
                    onClick={handlePublishRelease(release.id.toString())}
                    loading={isPublishing}
                    // A blocked release stays clickable: the stored status can be stale, and the
                    // run re-checks every entry before refusing
                    disabled={release.status === 'empty'}
                  >
                    {formatMessage({
                      id: 'content-releases.header.actions.publish',
                      defaultMessage: 'Publish',
                    })}
                  </Button>
                ) : null}
              </Flex>
            )
          }
        />
        {children}
        {showCreateFromSkipped && (
          <CreateReleaseFromSkippedDrawer
            release={release}
            open={isSkippedDrawerOpen}
            onClose={() => setIsSkippedDrawerOpen(false)}
          />
        )}
      </Main>
    </Layouts.Root>
  );
};

interface RunSummaryProps {
  release: ReleaseDataResponse;
  scheduledText: string;
  numberOfEntriesText: string;
}

const RunSummary = ({ release, scheduledText, numberOfEntriesText }: RunSummaryProps) => {
  const { formatMessage } = useIntl();
  const totals = getRunTotals(release);

  const getCountsText = () => {
    if (!totals) {
      return numberOfEntriesText;
    }

    if (totals.total === 0) {
      return formatMessage({
        id: 'content-releases.pages.ReleaseDetails.ran-empty',
        defaultMessage: 'This release ran with no entries.',
      });
    }

    return formatMessage(
      {
        id: 'content-releases.pages.ReleaseDetails.header-subtitle.released',
        defaultMessage: 'Released {released} of {total, plural, one {# entry} other {# entries}}',
      },
      totals
    );
  };

  const parts = [scheduledText, getCountsText()].filter(Boolean);

  return (
    <Typography textColor="neutral600" variant="epsilon">
      {parts.join(' • ')}
      {totals && totals.skipped > 0 && (
        <>
          {parts.length > 0 && ' • '}
          <Typography textColor="danger600" variant="epsilon">
            {formatMessage(
              {
                id: 'content-releases.pages.ReleaseDetails.header-subtitle.skipped',
                defaultMessage: '{skipped} skipped',
              },
              { skipped: totals.skipped }
            )}
          </Typography>
        </>
      )}
    </Typography>
  );
};

const SimpleMenuButton = styled(SimpleMenu)`
  & > span {
    display: flex;
  }
`;

/* -------------------------------------------------------------------------------------------------
 * ReleaseDetailsBody
 * -----------------------------------------------------------------------------------------------*/
const GROUP_BY_OPTIONS = ['contentType', 'locale', 'action'] as const;
const GROUP_BY_OPTIONS_NO_LOCALE = ['contentType', 'action'] as const;
type ReleaseDetailsHeader = {
  label: MessageDescriptor;
  name: string;
};

type ReleaseDetailsTableHeader = {
  label: string;
  name: string;
};

const getGroupByOptionLabel = (value: (typeof GROUP_BY_OPTIONS)[number]) => {
  if (value === 'locale') {
    return {
      id: 'content-releases.pages.ReleaseDetails.groupBy.option.locales',
      defaultMessage: 'Locales',
    };
  }

  if (value === 'action') {
    return {
      id: 'content-releases.pages.ReleaseDetails.groupBy.option.actions',
      defaultMessage: 'Actions',
    };
  }

  return {
    id: 'content-releases.pages.ReleaseDetails.groupBy.option.content-type',
    defaultMessage: 'Content-Types',
  };
};

interface ReleaseDetailsBodyProps {
  releaseId: string;
}

const ReleaseDetailsBody = ({ releaseId }: ReleaseDetailsBodyProps) => {
  const { formatMessage } = useIntl();
  // The row whose reason the drawer shows
  const [reasonActionId, setReasonActionId] = React.useState<ReleaseAction['id'] | null>(null);
  const [{ query }, setQuery] = useQueryParams<GetReleaseActionsQueryParams>();
  const { toggleNotification } = useNotification();
  const { formatAPIError } = useAPIErrorHandler();
  const {
    data: releaseData,
    isLoading: isReleaseLoading,
    error: releaseError,
  } = useGetReleaseQuery({ id: releaseId });
  const {
    allowedActions: { canUpdate },
  } = useRBAC(PERMISSIONS);
  const runHookWaterfall = useStrapiApp('ReleaseDetailsPage', (state) => state.runHookWaterfall);

  // TODO: Migrated displayedHeader to v5
  const {
    displayedHeaders,
    hasI18nEnabled,
  }: { displayedHeaders: ReleaseDetailsHeader[]; hasI18nEnabled: boolean } = runHookWaterfall(
    'ContentReleases/pages/ReleaseDetails/add-locale-in-releases',
    {
      displayedHeaders: [
        {
          label: {
            id: 'content-releases.page.ReleaseDetails.table.header.label.name',
            defaultMessage: 'name',
          },
          name: 'name',
        },
      ],
      hasI18nEnabled: false,
    }
  );

  const release = releaseData?.data;
  const selectedGroupBy = query?.groupBy || 'contentType';
  const tabs = release ? getReleaseTabs(release) : [];
  const activeTab = tabs.find(({ value }) => value === query?.filter)?.value ?? 'all';
  const actionsQuery: GetReleaseActionsQueryParams = {
    ...query,
    filter: activeTab === 'all' ? undefined : activeTab,
  };

  const {
    isLoading,
    isFetching,
    isError,
    data,
    error: releaseActionsError,
  } = useGetReleaseActionsQuery(
    {
      ...actionsQuery,
      releaseId,
    },
    { skip: !release }
  );

  const [updateReleaseAction] = useUpdateReleaseActionMutation();

  const handleChangeType = async (
    e: React.ChangeEvent<HTMLInputElement>,
    actionId: ReleaseAction['id'],
    actionPath: [string, number]
  ) => {
    const response = await updateReleaseAction({
      params: {
        releaseId,
        actionId,
      },
      body: {
        type: e.target.value as ReleaseAction['type'],
      },
      query: actionsQuery, // We are passing the query params to make optimistic updates
      actionPath, // We are passing the action path to found the position in the cache of the action for optimistic updates
    });

    if ('error' in response) {
      if (isFetchError(response.error)) {
        // When the response returns an object with 'error', handle fetch error
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
    }
  };

  if (isLoading || isReleaseLoading) {
    return <Page.Loading />;
  }

  const releaseActions = data?.data;
  const releaseMeta = data?.meta;
  const contentTypes = releaseMeta?.contentTypes || {};

  if (isBaseQueryError(releaseError) || !release) {
    const errorsArray = [];
    if (releaseError && 'code' in releaseError) {
      errorsArray.push({
        code: releaseError.code,
      });
    }
    if (releaseActionsError && 'code' in releaseActionsError) {
      errorsArray.push({
        code: releaseActionsError.code,
      });
    }
    return (
      <Navigate
        to=".."
        state={{
          errors: errorsArray,
        }}
      />
    );
  }

  if (isError || !releaseActions) {
    return <Page.Error />;
  }

  const hasNoActions = release.actions.meta.count === 0 && Object.keys(releaseActions).length === 0;

  if (hasNoActions && release.releasedAt) {
    return (
      <Layouts.Content>
        <EmptyStateLayout
          icon={<EmptyDocuments width="16rem" />}
          content={formatMessage({
            id: 'content-releases.pages.ReleaseDetails.ran-empty',
            defaultMessage: 'This release ran with no entries.',
          })}
        />
      </Layouts.Content>
    );
  }

  if (hasNoActions) {
    return (
      <Layouts.Content>
        <EmptyStateLayout
          action={
            <LinkButton
              tag={ReactRouterLink}
              to={{
                pathname: '/content-manager',
              }}
              style={{ textDecoration: 'none' }}
              variant="secondary"
            >
              {formatMessage({
                id: 'content-releases.page.Details.button.openContentManager',
                defaultMessage: 'Open the Content Manager',
              })}
            </LinkButton>
          }
          icon={<EmptyDocuments width="16rem" />}
          content={formatMessage({
            id: 'content-releases.pages.Details.tab.emptyEntries',
            defaultMessage:
              'This release is empty. Open the Content Manager, select an entry and add it to the release.',
          })}
        />
      </Layouts.Content>
    );
  }

  const groupByLabel = formatMessage({
    id: 'content-releases.pages.ReleaseDetails.groupBy.aria-label',
    defaultMessage: 'Group by',
  });
  const headers: ReleaseDetailsTableHeader[] = [
    ...displayedHeaders,
    {
      label: {
        id: 'content-releases.page.ReleaseDetails.table.header.label.content-type',
        defaultMessage: 'content-type',
      },
      name: 'content-type',
    },
    {
      label: {
        id: 'content-releases.page.ReleaseDetails.table.header.label.action',
        defaultMessage: 'action',
      },
      name: 'action',
    },
    {
      label: {
        id: 'content-releases.page.ReleaseDetails.table.header.label.status',
        defaultMessage: 'status',
      },
      name: 'status',
    },
  ].map(({ label, name }) => ({
    label: formatMessage(label),
    name,
  }));

  const options = hasI18nEnabled ? GROUP_BY_OPTIONS : GROUP_BY_OPTIONS_NO_LOCALE;

  const isOutcomeUnknown = release.failureReason === 'failed_before_upgrade';

  type RowAction = (typeof releaseActions)[string][number];

  const getRowNaming = ({ entry, contentType }: Pick<RowAction, 'entry' | 'contentType'>) => {
    const isDeleted = Boolean(release.releasedAt) && !entry;
    const isUntitled = !isDeleted && !contentType.mainFieldValue;

    if (isDeleted) {
      return {
        isDeleted,
        isUntitled,
        entryName: formatMessage({
          id: 'content-releases.pages.ReleaseDetails.table.deleted-entry',
          defaultMessage: 'Deleted entry',
        }),
      };
    }

    if (isUntitled) {
      return {
        isDeleted,
        isUntitled,
        entryName: formatMessage({
          id: 'content-releases.pages.ReleaseDetails.table.untitled',
          defaultMessage: 'Untitled',
        }),
      };
    }

    return { isDeleted, isUntitled, entryName: `${contentType.mainFieldValue}` };
  };

  const hasReason = ({ type, outcome, isEntryValid }: RowAction) =>
    release.releasedAt
      ? !isOutcomeUnknown &&
        outcome !== null &&
        outcome !== 'published' &&
        outcome !== 'unpublished'
      : type === 'publish' && isEntryValid !== true;

  const reasonItems: EntryReasonDetails[] = Object.values(releaseActions)
    .flat()
    .filter(hasReason)
    .map((action) => ({
      id: action.id,
      ...getRowNaming(action),
      contentTypeName: action.contentType.displayName,
      localeCode: hasI18nEnabled ? action.locale?.code : undefined,
      action: action.type,
      outcome: release.releasedAt ? action.outcome : null,
      reason: action.reason,
      isUnchecked:
        !release.releasedAt &&
        action.type === 'publish' &&
        action.isEntryValid !== true &&
        !action.reason,
      location: {
        contentTypeUid: action.contentType.uid,
        kind: contentTypes?.[action.contentType.uid]?.kind,
        documentId: action.entryDocumentId,
        locale: action.locale?.code,
        showErrors: (action.reason?.validation?.errors.length ?? 0) > 0,
      },
    }));

  return (
    <Layouts.Content>
      <Flex gap={4} direction="column" alignItems="stretch">
        <Tabs.Root
          variant="simple"
          value={activeTab}
          onValueChange={(value) =>
            setQuery({
              filter: value === 'all' ? undefined : (value as ReleaseActionFilter),
              page: 1,
            })
          }
        >
          <Tabs.List
            aria-label={formatMessage({
              id: 'content-releases.pages.ReleaseDetails.tab-group.label',
              defaultMessage: 'Entries by status',
            })}
          >
            {tabs.map(({ value, label, count }) => (
              <Tabs.Trigger
                key={value}
                value={value}
                aria-label={
                  count !== undefined
                    ? formatMessage(
                        {
                          id: 'content-releases.pages.ReleaseDetails.tab.label-with-count',
                          defaultMessage: '{label} ({count})',
                        },
                        { label: formatMessage(label), count }
                      )
                    : undefined
                }
              >
                <Flex gap={2}>
                  {formatMessage(label)}
                  {count !== undefined &&
                    (value === activeTab ? (
                      <Badge active>{count}</Badge>
                    ) : (
                      <Typography textColor="neutral600">{count}</Typography>
                    ))}
                </Flex>
              </Tabs.Trigger>
            ))}
          </Tabs.List>
          <Divider />
        </Tabs.Root>
        <Flex>
          <SingleSelect
            placeholder={groupByLabel}
            aria-label={groupByLabel}
            customizeContent={(value) =>
              formatMessage(
                {
                  id: `content-releases.pages.ReleaseDetails.groupBy.label`,
                  defaultMessage: `Group by {groupBy}`,
                },
                {
                  groupBy: value,
                }
              )
            }
            value={formatMessage(getGroupByOptionLabel(selectedGroupBy))}
            onChange={(value) => setQuery({ groupBy: value as ReleaseActionGroupBy })}
          >
            {options.map((option) => (
              <SingleSelectOption key={option} value={option}>
                {formatMessage(getGroupByOptionLabel(option))}
              </SingleSelectOption>
            ))}
          </SingleSelect>
        </Flex>
        {Object.keys(releaseActions).length === 0 && (
          <EmptyStateLayout
            icon={<EmptyDocuments width="16rem" />}
            content={formatMessage({
              id: 'content-releases.pages.ReleaseDetails.tab.emptyFilter',
              defaultMessage: 'No entries to show here.',
            })}
          />
        )}
        {Object.keys(releaseActions).map((key) => (
          <Flex key={`releases-group-${key}`} gap={4} direction="column" alignItems="stretch">
            <Flex role="separator" aria-label={key}>
              <Badge>{key}</Badge>
            </Flex>
            <Table.Root
              rows={releaseActions[key]}
              headers={headers}
              isLoading={isLoading || isFetching}
            >
              <Table.Content>
                <Table.Head>
                  {headers.map(({ label, name }) => (
                    <Table.HeaderCell key={name} label={label} name={name} />
                  ))}
                </Table.Head>
                <Table.Loading />
                <Table.Body>
                  {releaseActions[key].map(
                    (
                      {
                        id,
                        contentType,
                        locale,
                        type,
                        entry,
                        entryDocumentId,
                        isEntryValid,
                        outcome,
                        reason,
                      },
                      actionIndex
                    ) => {
                      const { isDeleted, isUntitled, entryName } = getRowNaming({
                        entry,
                        contentType,
                      });
                      const textColor = isDeleted ? 'neutral500' : undefined;
                      const openReason = () => setReasonActionId(id);
                      const entryLink = !isDeleted && (
                        <EntryLinkButton
                          contentTypeUid={contentType.uid}
                          kind={contentTypes?.[contentType.uid]?.kind}
                          documentId={entryDocumentId}
                          locale={locale?.code}
                          showErrors={(reason?.validation?.errors.length ?? 0) > 0}
                        />
                      );

                      return (
                        <React.Fragment key={id}>
                          <Tr>
                            <Td width="25%" maxWidth="200px">
                              {isDeleted || isUntitled ? (
                                <ItalicName
                                  ellipsis
                                  textColor={isDeleted ? 'neutral500' : undefined}
                                >
                                  {entryName}
                                </ItalicName>
                              ) : (
                                <Typography ellipsis>{entryName}</Typography>
                              )}
                            </Td>
                            {hasI18nEnabled && (
                              <Td width="10%">
                                <Typography
                                  textColor={textColor}
                                >{`${locale?.name ? locale.name : '-'}`}</Typography>
                              </Td>
                            )}

                            <Td width="10%">
                              <Typography textColor={textColor}>
                                {contentType.displayName || ''}
                              </Typography>
                            </Td>
                            <Td width="20%">
                              {release.releasedAt ? (
                                <Typography textColor={textColor}>
                                  {formatMessage(
                                    {
                                      id: 'content-releases.pages.ReleaseDetails.table.action-type',
                                      defaultMessage:
                                        '{isPublish, select, true {Publish} other {Unpublish}}',
                                    },
                                    { isPublish: type === 'publish' }
                                  )}
                                </Typography>
                              ) : (
                                <ReleaseActionOptions
                                  selected={type}
                                  handleChange={(e) => handleChangeType(e, id, [key, actionIndex])}
                                  name={`release-action-${id}-type`}
                                  disabled={!canUpdate}
                                />
                              )}
                            </Td>
                            {release.releasedAt ? (
                              <>
                                <Td width="20%" minWidth="200px">
                                  <ReleasedActionStatus
                                    outcome={outcome}
                                    isOutcomeUnknown={isOutcomeUnknown}
                                    entryName={entryName}
                                    onOpenReason={openReason}
                                  />
                                </Td>
                                <Td>
                                  {/* A ran release has nothing to remove: the pencil is its only action */}
                                  <Flex justifyContent="flex-end">{entryLink}</Flex>
                                </Td>
                              </>
                            ) : (
                              <>
                                <Td width="20%" minWidth="200px">
                                  {entry && (
                                    <PlannedActionStatus
                                      action={type}
                                      isEntryValid={isEntryValid}
                                      entryName={entryName}
                                      onOpenReason={openReason}
                                    />
                                  )}
                                </Td>
                                <Td>
                                  {/* The menu's "Edit entry" opens the entry: no pencil next to it */}
                                  <Flex justifyContent="flex-end">
                                    <ReleaseActionMenu.Root>
                                      <ReleaseActionMenu.ReleaseActionEntryLinkItem
                                        contentTypeUid={contentType.uid}
                                        documentId={entryDocumentId}
                                        locale={locale?.code}
                                      />
                                      <ReleaseActionMenu.DeleteReleaseActionItem
                                        releaseId={release.id}
                                        actionId={id}
                                      />
                                    </ReleaseActionMenu.Root>
                                  </Flex>
                                </Td>
                              </>
                            )}
                          </Tr>
                        </React.Fragment>
                      );
                    }
                  )}
                </Table.Body>
              </Table.Content>
            </Table.Root>
          </Flex>
        ))}
        {releaseMeta?.pagination?.pageCount && releaseMeta.pagination.pageCount > 1 && (
          <Pagination.Root
            {...releaseMeta?.pagination}
            defaultPageSize={releaseMeta?.pagination?.pageSize}
          >
            <Pagination.PageSize />
            <Pagination.Links />
          </Pagination.Root>
        )}
      </Flex>
      <EntryReasonDrawer
        items={reasonItems}
        selectedId={reasonActionId}
        onSelect={setReasonActionId}
        onClose={() => setReasonActionId(null)}
        releasedAt={release.releasedAt}
      />
    </Layouts.Content>
  );
};

const ItalicName = styled(Typography)`
  font-style: italic;
`;

/* -------------------------------------------------------------------------------------------------
 * ReleaseDetailsPage
 * -----------------------------------------------------------------------------------------------*/
const ReleaseDetailsPage = () => {
  const { formatMessage } = useIntl();
  const { releaseId } = useParams<{ releaseId: string }>();
  const { toggleNotification } = useNotification();
  const { formatAPIError } = useAPIErrorHandler();
  const navigate = useNavigate();
  const [isEditDrawerOpen, setIsEditDrawerOpen] = React.useState(false);
  const [showWarningSubmit, setWarningSubmit] = React.useState(false);

  const {
    isLoading: isLoadingDetails,
    data,
    isSuccess: isSuccessDetails,
  } = useGetReleaseQuery(
    { id: releaseId! },
    {
      skip: !releaseId,
    }
  );
  const { data: settings, isLoading: isLoadingSettings } = useGetReleaseSettingsQuery();
  const [updateRelease, { isLoading: isSubmittingForm }] = useUpdateReleaseMutation();
  const [deleteRelease] = useDeleteReleaseMutation();

  const toggleEditDrawer = () => {
    setIsEditDrawerOpen((prev) => !prev);
  };

  const toggleWarningSubmit = () => setWarningSubmit((prevState) => !prevState);

  if (isLoadingDetails || isLoadingSettings) {
    return (
      <ReleaseDetailsLayout
        toggleEditDrawer={toggleEditDrawer}
        toggleWarningSubmit={toggleWarningSubmit}
      >
        <Page.Loading />
      </ReleaseDetailsLayout>
    );
  }

  if (!releaseId) {
    return <Navigate to=".." />;
  }

  const releaseData = (isSuccessDetails && data?.data) || null;

  const handleEditRelease = async (values: ReleaseDrawerValues) => {
    const response = await updateRelease({ id: releaseId, ...values });

    if ('data' in response) {
      // When the response returns an object with 'data', handle success
      toggleNotification({
        type: 'success',
        message: formatMessage({
          id: 'content-releases.modal.release-updated-notification-success',
          defaultMessage: 'Release updated.',
        }),
      });
      toggleEditDrawer();
    } else if (isFetchError(response.error)) {
      // When the response returns an object with 'error', handle fetch error
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

  const handleDeleteRelease = async () => {
    const response = await deleteRelease({
      id: releaseId,
    });

    if ('data' in response) {
      navigate('..');
    } else if (isFetchError(response.error)) {
      // When the response returns an object with 'error', handle fetch error
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
    <ReleaseDetailsLayout
      toggleEditDrawer={toggleEditDrawer}
      toggleWarningSubmit={toggleWarningSubmit}
    >
      <ReleaseDetailsBody releaseId={releaseId} />
      {releaseData && (
        <ReleaseDrawer
          open={isEditDrawerOpen}
          onClose={toggleEditDrawer}
          onSubmit={handleEditRelease}
          title={formatMessage({
            id: 'content-releases.release-drawer.edit.title',
            defaultMessage: 'Edit release',
          })}
          submitLabel={formatMessage({
            id: 'content-releases.release-drawer.form.submit.save',
            defaultMessage: 'Save',
          })}
          isSubmitting={isSubmittingForm}
          initialValues={{
            name: releaseData.name,
            isScheduled: Boolean(releaseData.scheduledAt && releaseData.timezone),
            scheduledAt: releaseData.scheduledAt,
            timezone: releaseData.timezone,
            releaseCondition: releaseData.releaseCondition,
          }}
          defaultTimezone={settings?.data.defaultTimezone}
        />
      )}
      <Dialog.Root open={showWarningSubmit} onOpenChange={toggleWarningSubmit}>
        <ConfirmDialog onConfirm={handleDeleteRelease}>
          {formatMessage({
            id: 'content-releases.dialog.confirmation-message',
            defaultMessage: 'Are you sure you want to delete this release?',
          })}
        </ConfirmDialog>
      </Dialog.Root>
    </ReleaseDetailsLayout>
  );
};

export { ReleaseDetailsPage };
