import * as React from 'react';

import { unstable_useDocument } from '@strapi/admin/strapi-admin';
import {
  Button,
  ContentLayout,
  Flex,
  HeaderLayout,
  IconButton,
  Link,
  Main,
  Tr,
  Td,
  Typography,
  Badge,
  SingleSelect,
  SingleSelectOption,
  Icon,
  Tooltip,
} from '@strapi/design-system';
import { LinkButton, Menu } from '@strapi/design-system/v2';
import {
  CheckPermissions,
  LoadingIndicatorPage,
  NoContent,
  PageSizeURLQuery,
  PaginationURLQuery,
  RelativeTime,
  Table,
  useAPIErrorHandler,
  useNotification,
  useQueryParams,
  ConfirmDialog,
  useRBAC,
  AnErrorOccurred,
  useTracking,
  useStrapiApp,
} from '@strapi/helper-plugin';
import { ArrowLeft, CheckCircle, More, Pencil, Trash, CrossCircle } from '@strapi/icons';
import { Attribute, Schema } from '@strapi/types';
import format from 'date-fns/format';
import { utcToZonedTime } from 'date-fns-tz';
import { useIntl } from 'react-intl';
import { useParams, useHistory, Link as ReactRouterLink, Redirect } from 'react-router-dom';
import styled from 'styled-components';

import { ReleaseActionMenu } from '../components/ReleaseActionMenu';
import { ReleaseActionOptions } from '../components/ReleaseActionOptions';
import { ReleaseModal, FormValues } from '../components/ReleaseModal';
import { PERMISSIONS } from '../constants';
import { isAxiosError } from '../services/axios';
import {
  GetReleaseActionsQueryParams,
  useGetReleaseActionsQuery,
  useGetReleaseQuery,
  useUpdateReleaseMutation,
  useUpdateReleaseActionMutation,
  usePublishReleaseMutation,
  useDeleteReleaseMutation,
  releaseApi,
} from '../services/release';
import { useTypedDispatch } from '../store/hooks';
import { getTimezoneOffset } from '../utils/time';

import { getBadgeProps } from './ReleasesPage';

import type {
  ReleaseAction,
  ReleaseActionGroupBy,
  ReleaseActionEntry,
} from '../../../shared/contracts/release-actions';

/* -------------------------------------------------------------------------------------------------
 * ReleaseDetailsLayout
 * -----------------------------------------------------------------------------------------------*/
const ReleaseInfoWrapper = styled(Flex)`
  align-self: stretch;
  border-bottom-right-radius: ${({ theme }) => theme.borderRadius};
  border-bottom-left-radius: ${({ theme }) => theme.borderRadius};
  border-top: 1px solid ${({ theme }) => theme.colors.neutral150};
`;

const StyledMenuItem = styled(Menu.Item)<{
  disabled?: boolean;
  variant?: 'neutral' | 'danger';
}>`
  svg path {
    fill: ${({ theme, disabled }) => disabled && theme.colors.neutral500};
  }
  span {
    color: ${({ theme, disabled }) => disabled && theme.colors.neutral500};
  }

  &:hover {
    background: ${({ theme, variant = 'neutral' }) => theme.colors[`${variant}100`]};
  }
`;

const PencilIcon = styled(Pencil)`
  width: ${({ theme }) => theme.spaces[3]};
  height: ${({ theme }) => theme.spaces[3]};
  path {
    fill: ${({ theme }) => theme.colors.neutral600};
  }
`;

const TrashIcon = styled(Trash)`
  width: ${({ theme }) => theme.spaces[3]};
  height: ${({ theme }) => theme.spaces[3]};
  path {
    fill: ${({ theme }) => theme.colors.danger600};
  }
`;

const TypographyMaxWidth = styled(Typography)`
  max-width: 300px;
`;

interface EntryValidationTextProps {
  action: ReleaseAction['type'];
  schema: Schema.ContentType;
  components: { [key: Schema.Component['uid']]: Schema.Component };
  entry: ReleaseActionEntry;
}

const EntryValidationText = ({ action, schema, components, entry }: EntryValidationTextProps) => {
  const { formatMessage } = useIntl();
  const { validate } = unstable_useDocument();

  const { errors } = validate(entry, {
    contentType: schema,
    components,
    isCreatingEntry: false,
  });

  if (Object.keys(errors).length > 0) {
    const validationErrorsMessages = Object.entries(errors)
      .map(([key, value]) =>
        formatMessage(
          { id: `${value.id}.withField`, defaultMessage: value.defaultMessage },
          { field: key }
        )
      )
      .join(' ');

    return (
      <Flex gap={2}>
        <Icon color="danger600" as={CrossCircle} />
        <Tooltip description={validationErrorsMessages}>
          <TypographyMaxWidth textColor="danger600" variant="omega" fontWeight="semiBold" ellipsis>
            {validationErrorsMessages}
          </TypographyMaxWidth>
        </Tooltip>
      </Flex>
    );
  }

  if (action == 'publish') {
    return (
      <Flex gap={2}>
        <Icon color="success600" as={CheckCircle} />
        {entry.publishedAt ? (
          <Typography textColor="success600" fontWeight="bold">
            {formatMessage({
              id: 'content-releases.pages.ReleaseDetails.entry-validation.already-published',
              defaultMessage: 'Already published',
            })}
          </Typography>
        ) : (
          <Typography>
            {formatMessage({
              id: 'content-releases.pages.ReleaseDetails.entry-validation.ready-to-publish',
              defaultMessage: 'Ready to publish',
            })}
          </Typography>
        )}
      </Flex>
    );
  }

  return (
    <Flex gap={2}>
      <Icon color="success600" as={CheckCircle} />
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

export const ReleaseDetailsLayout = ({
  toggleEditReleaseModal,
  toggleWarningSubmit,
  children,
}: ReleaseDetailsLayoutProps) => {
  const { formatMessage, formatDate, formatTime } = useIntl();
  const { releaseId } = useParams<{ releaseId: string }>();
  const {
    data,
    isLoading: isLoadingDetails,
    isError,
    error,
  } = useGetReleaseQuery({ id: releaseId });
  const [publishRelease, { isLoading: isPublishing }] = usePublishReleaseMutation();
  const toggleNotification = useNotification();
  const { formatAPIError } = useAPIErrorHandler();
  const {
    allowedActions: { canUpdate, canDelete },
  } = useRBAC(PERMISSIONS);
  const dispatch = useTypedDispatch();
  const { trackUsage } = useTracking();

  const release = data?.data;

  const handlePublishRelease = async () => {
    const response = await publishRelease({ id: releaseId });

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
    } else if (isAxiosError(response.error)) {
      // When the response returns an object with 'error', handle axios error
      toggleNotification({
        type: 'warning',
        message: formatAPIError(response.error),
      });
    } else {
      // Otherwise, the response returns an object with 'error', handle a generic error
      toggleNotification({
        type: 'warning',
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
    return (
      <Main aria-busy={isLoadingDetails}>
        <LoadingIndicatorPage />
      </Main>
    );
  }

  if (isError || !release) {
    return (
      <Redirect
        to={{
          pathname: '/plugins/content-releases',
          state: {
            errors: [
              {
                code: error?.code,
              },
            ],
          },
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
      <HeaderLayout
        title={release.name}
        subtitle={
          <Flex gap={2} lineHeight={6}>
            <Typography textColor="neutral600" variant="epsilon">
              {numberOfEntriesText + (isScheduled ? ` - ${scheduledText}` : '')}
            </Typography>
            <Badge {...getBadgeProps(release.status)}>{release.status}</Badge>
          </Flex>
        }
        navigationAction={
          <Link startIcon={<ArrowLeft />} to="/plugins/content-releases">
            {formatMessage({
              id: 'global.back',
              defaultMessage: 'Back',
            })}
          </Link>
        }
        primaryAction={
          !release.releasedAt && (
            <Flex gap={2}>
              <Menu.Root>
                {/* 
                  TODO Fix in the DS
                  - as={IconButton} has TS error:  Property 'icon' does not exist on type 'IntrinsicAttributes & TriggerProps & RefAttributes<HTMLButtonElement>'
                  - The Icon doesn't actually show unless you hack it with some padding...and it's still a little strange
                */}
                <Menu.Trigger
                  as={IconButton}
                  paddingLeft={2}
                  paddingRight={2}
                  aria-label={formatMessage({
                    id: 'content-releases.header.actions.open-release-actions',
                    defaultMessage: 'Release edit and delete menu',
                  })}
                  // @ts-expect-error See above
                  icon={<More />}
                  variant="tertiary"
                />
                {/*
                  TODO: Using Menu instead of SimpleMenu mainly because there is no positioning provided from the DS,
                  Refactor this once fixed in the DS
                */}
                <Menu.Content top={1} popoverPlacement="bottom-end">
                  <Flex
                    alignItems="center"
                    justifyContent="center"
                    direction="column"
                    padding={1}
                    width="100%"
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
                      variant="danger"
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
                  </Flex>
                  <ReleaseInfoWrapper
                    direction="column"
                    justifyContent="center"
                    alignItems="flex-start"
                    gap={1}
                    padding={5}
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
                </Menu.Content>
              </Menu.Root>
              <Button size="S" variant="tertiary" onClick={handleRefresh}>
                {formatMessage({
                  id: 'content-releases.header.actions.refresh',
                  defaultMessage: 'Refresh',
                })}
              </Button>
              <CheckPermissions permissions={PERMISSIONS.publish}>
                <Button
                  size="S"
                  variant="default"
                  onClick={handlePublishRelease}
                  loading={isPublishing}
                  disabled={release.actions.meta.count === 0}
                >
                  {formatMessage({
                    id: 'content-releases.header.actions.publish',
                    defaultMessage: 'Publish',
                  })}
                </Button>
              </CheckPermissions>
            </Flex>
          )
        }
      />
      {children}
    </Main>
  );
};

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

interface ReleaseHeaderItem {
  key: string;
  fieldSchema: { type: Attribute.Kind | 'custom' };
  metadatas: {
    label: { id: string; defaultMessage: string };
    searchable: boolean;
    sortable: boolean;
  };
  name: string;
}

const DEFAULT_RELEASE_DETAILS_HEADER: ReleaseHeaderItem[] = [
  {
    key: '__name__',
    fieldSchema: { type: 'string' },
    metadatas: {
      label: {
        id: 'content-releases.page.ReleaseDetails.table.header.label.name',
        defaultMessage: 'name',
      },
      searchable: false,
      sortable: false,
    },
    name: 'name',
  },
];

const ReleaseDetailsBody = () => {
  const { formatMessage } = useIntl();
  const { releaseId } = useParams<{ releaseId: string }>();
  const [{ query }, setQuery] = useQueryParams<GetReleaseActionsQueryParams>();
  const toggleNotification = useNotification();
  const { formatAPIError } = useAPIErrorHandler();
  const {
    data: releaseData,
    isLoading: isReleaseLoading,
    isError: isReleaseError,
    error: releaseError,
  } = useGetReleaseQuery({ id: releaseId });
  const {
    allowedActions: { canUpdate },
  } = useRBAC(PERMISSIONS);
  const { runHookWaterfall } = useStrapiApp();

  const {
    displayedHeaders,
    hasI18nEnabled,
  }: { displayedHeaders: ReleaseHeaderItem[]; hasI18nEnabled: boolean } = runHookWaterfall(
    'ContentReleases/pages/ReleaseDetails/add-locale-in-releases',
    {
      displayedHeaders: DEFAULT_RELEASE_DETAILS_HEADER,
      hasI18nEnabled: false,
    }
  );

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
      if (isAxiosError(response.error)) {
        // When the response returns an object with 'error', handle axios error
        toggleNotification({
          type: 'warning',
          message: formatAPIError(response.error),
        });
      } else {
        // Otherwise, the response returns an object with 'error', handle a generic error
        toggleNotification({
          type: 'warning',
          message: formatMessage({ id: 'notification.error', defaultMessage: 'An error occurred' }),
        });
      }
    }
  };

  if (isLoading || isReleaseLoading) {
    return (
      <ContentLayout>
        <LoadingIndicatorPage />
      </ContentLayout>
    );
  }

  const releaseActions = data?.data;
  const releaseMeta = data?.meta;
  const contentTypes = releaseMeta?.contentTypes || {};
  const components = releaseMeta?.components || {};

  if (isReleaseError || !release) {
    const errorsArray = [];
    if (releaseError) {
      errorsArray.push({
        code: releaseError.code,
      });
    }
    if (releaseActionsError) {
      errorsArray.push({
        code: releaseActionsError.code,
      });
    }
    return (
      <Redirect
        to={{
          pathname: '/plugins/content-releases',
          state: {
            errors: errorsArray,
          },
        }}
      />
    );
  }

  if (isError || !releaseActions) {
    return (
      <ContentLayout>
        <AnErrorOccurred />
      </ContentLayout>
    );
  }

  if (Object.keys(releaseActions).length === 0) {
    return (
      <ContentLayout>
        <NoContent
          content={{
            id: 'content-releases.pages.Details.tab.emptyEntries',
            defaultMessage:
              'This release is empty. Open the Content Manager, select an entry and add it to the release.',
          }}
          action={
            <LinkButton
              as={ReactRouterLink}
              // @ts-expect-error - types are not inferred correctly through the as prop.
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
        />
      </ContentLayout>
    );
  }

  const options = hasI18nEnabled ? GROUP_BY_OPTIONS : GROUP_BY_OPTIONS_NO_LOCALE;

  return (
    <ContentLayout>
      <Flex gap={8} direction="column" alignItems="stretch">
        <Flex>
          <SingleSelect
            aria-label={formatMessage({
              id: 'content-releases.pages.ReleaseDetails.groupBy.aria-label',
              defaultMessage: 'Group by',
            })}
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
              colCount={releaseActions[key].length}
              isLoading={isLoading}
              isFetching={isFetching}
            >
              <Table.Content>
                <Table.Head>
                  {displayedHeaders.map(({ key, fieldSchema, metadatas, name }) => (
                    <Table.HeaderCell
                      key={key}
                      fieldSchemaType={fieldSchema.type}
                      label={formatMessage(metadatas.label)}
                      name={name}
                    />
                  ))}
                  <Table.HeaderCell
                    fieldSchemaType="string"
                    label={formatMessage({
                      id: 'content-releases.page.ReleaseDetails.table.header.label.content-type',
                      defaultMessage: 'content-type',
                    })}
                    name="content-type"
                  />
                  <Table.HeaderCell
                    fieldSchemaType="string"
                    label={formatMessage({
                      id: 'content-releases.page.ReleaseDetails.table.header.label.action',
                      defaultMessage: 'action',
                    })}
                    name="action"
                  />
                  {!release.releasedAt && (
                    <Table.HeaderCell
                      fieldSchemaType="string"
                      label={formatMessage({
                        id: 'content-releases.page.ReleaseDetails.table.header.label.status',
                        defaultMessage: 'status',
                      })}
                      name="status"
                    />
                  )}
                </Table.Head>
                <Table.LoadingBody />
                <Table.Body>
                  {releaseActions[key].map(
                    ({ id, contentType, locale, type, entry }, actionIndex) => (
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
                              />
                            </Td>
                            <Td>
                              <Flex justifyContent="flex-end">
                                <ReleaseActionMenu.Root>
                                  <ReleaseActionMenu.ReleaseActionEntryLinkItem
                                    contentTypeUid={contentType.uid}
                                    entryId={entry.id}
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
        <Flex paddingTop={4} alignItems="flex-end" justifyContent="space-between">
          <PageSizeURLQuery defaultValue={releaseMeta?.pagination?.pageSize.toString()} />
          <PaginationURLQuery
            pagination={{
              pageCount: releaseMeta?.pagination?.pageCount || 0,
            }}
          />
        </Flex>
      </Flex>
    </ContentLayout>
  );
};

/* -------------------------------------------------------------------------------------------------
 * ReleaseDetailsPage
 * -----------------------------------------------------------------------------------------------*/
const ReleaseDetailsPage = () => {
  const { formatMessage } = useIntl();
  const { releaseId } = useParams<{ releaseId: string }>();
  const toggleNotification = useNotification();
  const { formatAPIError } = useAPIErrorHandler();
  const { replace } = useHistory();
  const [releaseModalShown, setReleaseModalShown] = React.useState(false);
  const [showWarningSubmit, setWarningSubmit] = React.useState(false);

  const {
    isLoading: isLoadingDetails,
    data,
    isSuccess: isSuccessDetails,
  } = useGetReleaseQuery({ id: releaseId });
  const [updateRelease, { isLoading: isSubmittingForm }] = useUpdateReleaseMutation();
  const [deleteRelease, { isLoading: isDeletingRelease }] = useDeleteReleaseMutation();

  const toggleEditReleaseModal = () => {
    setReleaseModalShown((prev) => !prev);
  };

  const toggleWarningSubmit = () => setWarningSubmit((prevState) => !prevState);

  if (isLoadingDetails) {
    return (
      <ReleaseDetailsLayout
        toggleEditReleaseModal={toggleEditReleaseModal}
        toggleWarningSubmit={toggleWarningSubmit}
      >
        <ContentLayout>
          <LoadingIndicatorPage />
        </ContentLayout>
      </ReleaseDetailsLayout>
    );
  }

  const releaseData = (isSuccessDetails && data?.data) || null;

  const title = releaseData?.name || '';
  const timezone = releaseData?.timezone ?? null;
  const scheduledAt =
    releaseData?.scheduledAt && timezone ? utcToZonedTime(releaseData.scheduledAt, timezone) : null;
  // Just get the date and time to display without considering updated timezone time
  const date = scheduledAt ? format(scheduledAt, 'yyyy-MM-dd') : null;
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
    } else if (isAxiosError(response.error)) {
      // When the response returns an object with 'error', handle axios error
      toggleNotification({
        type: 'warning',
        message: formatAPIError(response.error),
      });
    } else {
      // Otherwise, the response returns an object with 'error', handle a generic error
      toggleNotification({
        type: 'warning',
        message: formatMessage({ id: 'notification.error', defaultMessage: 'An error occurred' }),
      });
    }
  };

  const handleDeleteRelease = async () => {
    const response = await deleteRelease({
      id: releaseId,
    });

    if ('data' in response) {
      replace('/plugins/content-releases');
    } else if (isAxiosError(response.error)) {
      // When the response returns an object with 'error', handle axios error
      toggleNotification({
        type: 'warning',
        message: formatAPIError(response.error),
      });
    } else {
      // Otherwise, the response returns an object with 'error', handle a generic error
      toggleNotification({
        type: 'warning',
        message: formatMessage({ id: 'notification.error', defaultMessage: 'An error occurred' }),
      });
    }
  };

  return (
    <ReleaseDetailsLayout
      toggleEditReleaseModal={toggleEditReleaseModal}
      toggleWarningSubmit={toggleWarningSubmit}
    >
      <ReleaseDetailsBody />
      {releaseModalShown && (
        <ReleaseModal
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
      )}
      <ConfirmDialog
        bodyText={{
          id: 'content-releases.dialog.confirmation-message',
          defaultMessage: 'Are you sure you want to delete this release?',
        }}
        isOpen={showWarningSubmit}
        isConfirmButtonLoading={isDeletingRelease}
        onToggleDialog={toggleWarningSubmit}
        onConfirm={handleDeleteRelease}
      />
    </ReleaseDetailsLayout>
  );
};

export { ReleaseDetailsPage };
