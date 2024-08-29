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
  FormErrors,
} from '@strapi/admin/strapi-admin';
import { unstable_useDocument } from '@strapi/content-manager/strapi-admin';
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
  Tooltip,
  EmptyStateLayout,
  LinkButton,
  Dialog,
  SimpleMenu,
  MenuItem,
} from '@strapi/design-system';
import {
  CheckCircle,
  More,
  Pencil,
  Trash,
  CrossCircle,
  ArrowsCounterClockwise,
} from '@strapi/icons';
import { EmptyDocuments } from '@strapi/icons/symbols';
import format from 'date-fns/format';
import { utcToZonedTime } from 'date-fns-tz';
import { useIntl } from 'react-intl';
import { useParams, useNavigate, Link as ReactRouterLink, Navigate } from 'react-router-dom';
import { styled } from 'styled-components';

import { RelativeTime } from '../components/RelativeTime';
import { ReleaseActionMenu } from '../components/ReleaseActionMenu';
import { ReleaseActionOptions } from '../components/ReleaseActionOptions';
import { ReleaseModal, FormValues } from '../components/ReleaseModal';
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

import { getBadgeProps } from './ReleasesPage';

import type {
  ReleaseAction,
  ReleaseActionGroupBy,
  ReleaseActionEntry,
} from '../../../shared/contracts/release-actions';
import type { Struct, Internal } from '@strapi/types';

/* -------------------------------------------------------------------------------------------------
 * ReleaseDetailsLayout
 * -----------------------------------------------------------------------------------------------*/
const ReleaseInfoWrapper = styled(Flex)`
  align-self: stretch;
  border-bottom-right-radius: ${({ theme }) => theme.borderRadius};
  border-bottom-left-radius: ${({ theme }) => theme.borderRadius};
  border-top: 1px solid ${({ theme }) => theme.colors.neutral150};
`;

const StyledMenuItem = styled(MenuItem)<{
  disabled?: boolean;
  $variant?: 'neutral' | 'danger';
}>`
  svg path {
    fill: ${({ theme, disabled }) => disabled && theme.colors.neutral500};
  }
  span {
    color: ${({ theme, disabled }) => disabled && theme.colors.neutral500};
  }

  &:hover {
    background: ${({ theme, $variant = 'neutral' }) => theme.colors[`${$variant}100`]};
  }
`;

const PencilIcon = styled(Pencil)`
  width: ${({ theme }) => theme.spaces[4]};
  height: ${({ theme }) => theme.spaces[4]};
  path {
    fill: ${({ theme }) => theme.colors.neutral600};
  }
`;

const TrashIcon = styled(Trash)`
  width: ${({ theme }) => theme.spaces[4]};
  height: ${({ theme }) => theme.spaces[4]};
  path {
    fill: ${({ theme }) => theme.colors.danger600};
  }
`;

const TypographyMaxWidth = styled(Typography)`
  max-width: 300px;
`;

interface EntryValidationTextProps {
  action: ReleaseAction['type'];
  schema?: Struct.ContentTypeSchema;
  components: { [key: Internal.UID.Component]: Struct.ComponentSchema };
  entry: ReleaseActionEntry;
  status: ReleaseAction['status'];
}

const EntryValidationText = ({ action, schema, entry, status }: EntryValidationTextProps) => {
  const { formatMessage } = useIntl();

  const { validate, isLoading } = unstable_useDocument(
    {
      collectionType: schema?.kind ?? '',
      model: schema?.uid ?? '',
    },
    {
      // useDocument makes a request to get more data about the entry, but we only want to have the validation function so we skip the request
      skip: true,
    }
  );

  const errorsToString = (errors: FormErrors, prefix: string = ''): string => {
    if (Object.keys(errors).length === 0) {
      return '';
    }

    return Object.entries(errors)
      .map(([key, value]) => {
        if (value === undefined || value === null) {
          return '';
        }

        if (typeof value === 'string') {
          return formatMessage(
            { id: value, defaultMessage: value },
            { field: prefix ? `${prefix}.${key}` : key }
          );
        }

        if (
          typeof value === 'object' &&
          value !== null &&
          'id' in value &&
          'defaultMessage' in value
        ) {
          return formatMessage(
            // @ts-expect-error – TODO: default message will be a string
            { id: `${value.id}.withField`, defaultMessage: value.defaultMessage },
            { field: prefix ? `${prefix}.${key}` : key }
          );
        }

        return errorsToString(value as FormErrors, key);
      })
      .join(' ');
  };

  if (isLoading) {
    return null;
  }

  const errors = validate(entry) ?? {};

  if (action === 'publish') {
    if (Object.keys(errors).length > 0) {
      const validationErrorsMessages = errorsToString(errors);

      return (
        <Flex gap={2}>
          <CrossCircle fill="danger600" />
          <Tooltip description={validationErrorsMessages}>
            <TypographyMaxWidth
              textColor="danger600"
              variant="omega"
              fontWeight="semiBold"
              ellipsis
            >
              {validationErrorsMessages}
            </TypographyMaxWidth>
          </Tooltip>
        </Flex>
      );
    }

    if (status === 'draft') {
      return (
        <Flex gap={2}>
          <CheckCircle fill="success600" />
          <Typography>
            {formatMessage({
              id: 'content-releases.pages.ReleaseDetails.entry-validation.ready-to-publish',
              defaultMessage: 'Ready to publish',
            })}
          </Typography>
        </Flex>
      );
    }

    if (status === 'modified') {
      return (
        <Flex gap={2}>
          <ArrowsCounterClockwise fill="alternative600" />
          <Typography>
            {formatMessage({
              id: 'content-releases.pages.ReleaseDetails.entry-validation.modified',
              defaultMessage: 'Ready to publish changes',
            })}
          </Typography>
        </Flex>
      );
    }

    if (status === 'published') {
      return (
        <Flex gap={2}>
          <CheckCircle fill="success600" />
          <Typography>
            {formatMessage({
              id: 'content-releases.pages.ReleaseDetails.entry-validation.already-published',
              defaultMessage: 'Already published',
            })}
          </Typography>
        </Flex>
      );
    }
  }

  return (
    <Flex gap={2}>
      <CheckCircle fill="success600" />
      {!entry.publishedAt ? (
        <Typography textColor="success600" fontWeight="bold">
          {formatMessage({
            id: 'content-releases.pages.ReleaseDetails.entry-validation.already-unpublished',
            defaultMessage: 'Already unpublished',
          })}
        </Typography>
      ) : (
        <Typography>
          {formatMessage({
            id: 'content-releases.pages.ReleaseDetails.entry-validation.ready-to-unpublish',
            defaultMessage: 'Ready to unpublish',
          })}
        </Typography>
      )}
    </Flex>
  );
};
interface ReleaseDetailsLayoutProps {
  toggleEditReleaseModal: () => void;
  toggleWarningSubmit: () => void;
  children: React.ReactNode;
}

const ReleaseDetailsLayout = ({
  toggleEditReleaseModal,
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
  const { canUpdate, canDelete, canPublish } = allowedActions;
  const dispatch = useTypedDispatch();
  const { trackUsage } = useTracking();

  const release = data?.data;

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
    <Main aria-busy={isLoadingDetails}>
      <Layouts.Header
        title={release.name}
        subtitle={
          <Flex gap={2} lineHeight={6}>
            <Typography textColor="neutral600" variant="epsilon">
              {numberOfEntriesText + (isScheduled ? ` - ${scheduledText}` : '')}
            </Typography>
            <Badge {...getBadgeProps(release.status)}>{release.status}</Badge>
          </Flex>
        }
        navigationAction={<BackButton />}
        primaryAction={
          !release.releasedAt && (
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
                <StyledMenuItem disabled={!canUpdate} onSelect={toggleEditReleaseModal}>
                  <Flex alignItems="center" gap={2} hasRadius width="100%">
                    <PencilIcon />
                    <Typography ellipsis>
                      {formatMessage({
                        id: 'content-releases.header.actions.edit',
                        defaultMessage: 'Edit',
                      })}
                    </Typography>
                  </Flex>
                </StyledMenuItem>
                <StyledMenuItem
                  disabled={!canDelete}
                  onSelect={toggleWarningSubmit}
                  $variant="danger"
                >
                  <Flex alignItems="center" gap={2} hasRadius width="100%">
                    <TrashIcon />
                    <Typography ellipsis textColor="danger600">
                      {formatMessage({
                        id: 'content-releases.header.actions.delete',
                        defaultMessage: 'Delete',
                      })}
                    </Typography>
                  </Flex>
                </StyledMenuItem>
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
                  disabled={release.actions.meta.count === 0}
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
    </Main>
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
  const { displayedHeaders, hasI18nEnabled }: { displayedHeaders: any; hasI18nEnabled: boolean } =
    runHookWaterfall('ContentReleases/pages/ReleaseDetails/add-locale-in-releases', {
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
    });

  const release = releaseData?.data;
  const selectedGroupBy = query?.groupBy || 'contentType';

  const {
    isLoading,
    isFetching,
    isError,
    data,
    error: releaseActionsError,
  } = useGetReleaseActionsQuery({
    ...query,
    releaseId,
  });

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
      query, // We are passing the query params to make optimistic updates
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
  const components = releaseMeta?.components || {};

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

  if (Object.keys(releaseActions).length === 0) {
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
  const headers = [
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
    ...(!release.releasedAt
      ? [
          {
            label: {
              id: 'content-releases.page.ReleaseDetails.table.header.label.status',
              defaultMessage: 'status',
            },
            name: 'status',
          },
        ]
      : []),
  ];

  const options = hasI18nEnabled ? GROUP_BY_OPTIONS : GROUP_BY_OPTIONS_NO_LOCALE;

  return (
    <Layouts.Content>
      <Flex gap={8} direction="column" alignItems="stretch">
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
        {Object.keys(releaseActions).map((key) => (
          <Flex key={`releases-group-${key}`} gap={4} direction="column" alignItems="stretch">
            <Flex role="separator" aria-label={key}>
              <Badge>{key}</Badge>
            </Flex>
            <Table.Root
              rows={releaseActions[key].map((item) => ({
                ...item,
                id: Number(item.entry.id),
              }))}
              headers={headers}
              isLoading={isLoading || isFetching}
            >
              <Table.Content>
                <Table.Head>
                  {headers.map(({ label, name }) => (
                    <Table.HeaderCell key={name} label={formatMessage(label)} name={name} />
                  ))}
                </Table.Head>
                <Table.Loading />
                <Table.Body>
                  {releaseActions[key].map(
                    ({ id, contentType, locale, type, entry, status }, actionIndex) => (
                      <Tr key={id}>
                        <Td width="25%" maxWidth="200px">
                          <Typography ellipsis>{`${
                            contentType.mainFieldValue || entry.id
                          }`}</Typography>
                        </Td>
                        {hasI18nEnabled && (
                          <Td width="10%">
                            <Typography>{`${locale?.name ? locale.name : '-'}`}</Typography>
                          </Td>
                        )}

                        <Td width="10%">
                          <Typography>{contentType.displayName || ''}</Typography>
                        </Td>
                        <Td width="20%">
                          {release.releasedAt ? (
                            <Typography>
                              {formatMessage(
                                {
                                  id: 'content-releases.page.ReleaseDetails.table.action-published',
                                  defaultMessage:
                                    'This entry was <b>{isPublish, select, true {published} other {unpublished}}</b>.',
                                },
                                {
                                  isPublish: type === 'publish',
                                  b: (children: React.ReactNode) => (
                                    <Typography fontWeight="bold">{children}</Typography>
                                  ),
                                }
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
                        {!release.releasedAt && (
                          <>
                            <Td width="20%" minWidth="200px">
                              <EntryValidationText
                                action={type}
                                schema={contentTypes?.[contentType.uid]}
                                components={components}
                                entry={entry}
                                status={status}
                              />
                            </Td>
                            <Td>
                              <Flex justifyContent="flex-end">
                                <ReleaseActionMenu.Root>
                                  <ReleaseActionMenu.ReleaseActionEntryLinkItem
                                    contentTypeUid={contentType.uid}
                                    documentId={entry.documentId}
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
                    )
                  )}
                </Table.Body>
              </Table.Content>
            </Table.Root>
          </Flex>
        ))}
        <Pagination.Root
          {...releaseMeta?.pagination}
          defaultPageSize={releaseMeta?.pagination?.pageSize}
        >
          <Pagination.PageSize />
          <Pagination.Links />
        </Pagination.Root>
      </Flex>
    </Layouts.Content>
  );
};

/* -------------------------------------------------------------------------------------------------
 * ReleaseDetailsPage
 * -----------------------------------------------------------------------------------------------*/
const ReleaseDetailsPage = () => {
  const { formatMessage } = useIntl();
  const { releaseId } = useParams<{ releaseId: string }>();
  const { toggleNotification } = useNotification();
  const { formatAPIError } = useAPIErrorHandler();
  const navigate = useNavigate();
  const [releaseModalShown, setReleaseModalShown] = React.useState(false);
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
  const { data: dataTimezone, isLoading: isLoadingTimezone } = useGetReleaseSettingsQuery();
  const [updateRelease, { isLoading: isSubmittingForm }] = useUpdateReleaseMutation();
  const [deleteRelease] = useDeleteReleaseMutation();

  const toggleEditReleaseModal = () => {
    setReleaseModalShown((prev) => !prev);
  };

  const getTimezoneValue = () => {
    if (releaseData?.timezone) {
      return releaseData.timezone;
    } else {
      if (dataTimezone?.data.defaultTimezone) {
        return dataTimezone.data.defaultTimezone;
      }
      return null;
    }
  };

  const toggleWarningSubmit = () => setWarningSubmit((prevState) => !prevState);

  if (isLoadingDetails || isLoadingTimezone) {
    return (
      <ReleaseDetailsLayout
        toggleEditReleaseModal={toggleEditReleaseModal}
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

  const title = releaseData?.name || '';
  const timezone = getTimezoneValue();
  const scheduledAt =
    releaseData?.scheduledAt && timezone ? utcToZonedTime(releaseData.scheduledAt, timezone) : null;
  // Just get the date and time to display without considering updated timezone time
  const date = scheduledAt ? format(scheduledAt, 'yyyy-MM-dd') : undefined;
  const time = scheduledAt ? format(scheduledAt, 'HH:mm') : '';

  const handleEditRelease = async (values: FormValues) => {
    const response = await updateRelease({
      id: releaseId,
      name: values.name,
      scheduledAt: values.scheduledAt,
      timezone: values.timezone,
    });

    if ('data' in response) {
      // When the response returns an object with 'data', handle success
      toggleNotification({
        type: 'success',
        message: formatMessage({
          id: 'content-releases.modal.release-updated-notification-success',
          defaultMessage: 'Release updated.',
        }),
      });
      toggleEditReleaseModal();
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
      toggleEditReleaseModal={toggleEditReleaseModal}
      toggleWarningSubmit={toggleWarningSubmit}
    >
      <ReleaseDetailsBody releaseId={releaseId} />
      <ReleaseModal
        open={releaseModalShown}
        handleClose={toggleEditReleaseModal}
        handleSubmit={handleEditRelease}
        isLoading={isLoadingDetails || isSubmittingForm}
        initialValues={{
          name: title || '',
          scheduledAt,
          date,
          time,
          isScheduled: Boolean(scheduledAt),
          timezone,
        }}
      />
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
