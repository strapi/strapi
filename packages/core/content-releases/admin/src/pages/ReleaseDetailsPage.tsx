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
  Popover,
  Tr,
  Td,
  Typography,
  Badge,
  SingleSelect,
  SingleSelectOption,
  Icon,
  Tooltip,
} from '@strapi/design-system';
import { LinkButton } from '@strapi/design-system/v2';
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
} from '@strapi/helper-plugin';
import { ArrowLeft, CheckCircle, More, Pencil, Trash, CrossCircle } from '@strapi/icons';
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

import type {
  ReleaseAction,
  ReleaseActionGroupBy,
  ReleaseActionEntry,
} from '../../../shared/contracts/release-actions';
import type { Schema } from '@strapi/types';

/* -------------------------------------------------------------------------------------------------
 * ReleaseDetailsLayout
 * -----------------------------------------------------------------------------------------------*/
// @ts-expect-error – issue with styled-components types.
const ReleaseInfoWrapper = styled(Flex)`
  align-self: stretch;
  border-bottom-right-radius: ${({ theme }) => theme.borderRadius};
  border-bottom-left-radius: ${({ theme }) => theme.borderRadius};
  border-top: 1px solid ${({ theme }) => theme.colors.neutral150};
`;

const StyledFlex = styled(Flex)<{ disabled?: boolean }>`
  align-self: stretch;
  cursor: ${({ disabled }) => (disabled ? 'not-allowed' : 'pointer')};

  svg path {
    fill: ${({ theme, disabled }) => disabled && theme.colors.neutral500};
  }
  span {
    color: ${({ theme, disabled }) => disabled && theme.colors.neutral500};
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

interface PopoverButtonProps {
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
  disabled?: boolean;
  children: React.ReactNode;
}

const PopoverButton = ({ onClick, disabled, children }: PopoverButtonProps) => {
  return (
    <StyledFlex
      paddingTop={2}
      paddingBottom={2}
      paddingLeft={4}
      paddingRight={4}
      alignItems="center"
      gap={2}
      as="button"
      hasRadius
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </StyledFlex>
  );
};

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
  const { formatMessage } = useIntl();
  const { releaseId } = useParams<{ releaseId: string }>();
  const [isPopoverVisible, setIsPopoverVisible] = React.useState(false);
  const moreButtonRef = React.useRef<HTMLButtonElement>(null!);
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

  const handleTogglePopover = () => {
    setIsPopoverVisible((prev) => !prev);
  };

  const openReleaseModal = () => {
    toggleEditReleaseModal();
    handleTogglePopover();
  };

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

  const openWarningConfirmDialog = () => {
    toggleWarningSubmit();
    handleTogglePopover();
  };

  const handleRefresh = () => {
    dispatch(releaseApi.util.invalidateTags([{ type: 'ReleaseAction', id: 'LIST' }]));
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

  return (
    <Main aria-busy={isLoadingDetails}>
      <HeaderLayout
        title={release.name}
        subtitle={formatMessage(
          {
            id: 'content-releases.pages.Details.header-subtitle',
            defaultMessage: '{number, plural, =0 {No entries} one {# entry} other {# entries}}',
          },
          { number: totalEntries }
        )}
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
              <IconButton
                label={formatMessage({
                  id: 'content-releases.header.actions.open-release-actions',
                  defaultMessage: 'Release edit and delete menu',
                })}
                ref={moreButtonRef}
                onClick={handleTogglePopover}
              >
                <More />
              </IconButton>
              {isPopoverVisible && (
                <Popover
                  source={moreButtonRef}
                  placement="bottom-end"
                  onDismiss={handleTogglePopover}
                  spacing={4}
                  minWidth="242px"
                >
                  <Flex alignItems="center" justifyContent="center" direction="column" padding={1}>
                    <PopoverButton disabled={!canUpdate} onClick={openReleaseModal}>
                      <PencilIcon />
                      <Typography ellipsis>
                        {formatMessage({
                          id: 'content-releases.header.actions.edit',
                          defaultMessage: 'Edit',
                        })}
                      </Typography>
                    </PopoverButton>
                    <PopoverButton disabled={!canDelete} onClick={openWarningConfirmDialog}>
                      <TrashIcon />
                      <Typography ellipsis textColor="danger600">
                        {formatMessage({
                          id: 'content-releases.header.actions.delete',
                          defaultMessage: 'Delete',
                        })}
                      </Typography>
                    </PopoverButton>
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
                </Popover>
              )}
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
            {GROUP_BY_OPTIONS.map((option) => (
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
                  <Table.HeaderCell
                    fieldSchemaType="string"
                    label={formatMessage({
                      id: 'content-releases.page.ReleaseDetails.table.header.label.name',
                      defaultMessage: 'name',
                    })}
                    name="name"
                  />
                  <Table.HeaderCell
                    fieldSchemaType="string"
                    label={formatMessage({
                      id: 'content-releases.page.ReleaseDetails.table.header.label.locale',
                      defaultMessage: 'locale',
                    })}
                    name="locale"
                  />
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
                        <Td width="10%">
                          <Typography>{`${locale?.name ? locale.name : '-'}`}</Typography>
                        </Td>
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
  const { push } = useHistory();
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

  const title = (isSuccessDetails && data?.data?.name) || '';

  const handleEditRelease = async (values: FormValues) => {
    const response = await updateRelease({
      id: releaseId,
      name: values.name,
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

    toggleEditReleaseModal();
  };

  const handleDeleteRelease = async () => {
    const response = await deleteRelease({
      id: releaseId,
    });

    if ('data' in response) {
      push('/plugins/content-releases');
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
          initialValues={{ name: title || '' }}
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
