import * as React from 'react';

import {
  Box,
  Button,
  ContentLayout,
  EmptyStateLayout,
  Flex,
  HeaderLayout,
  IconButton,
  Link,
  Main,
  Popover,
  Tr,
  Td,
  Typography,
} from '@strapi/design-system';
import {
  AnErrorOccurred,
  CheckPermissions,
  LoadingIndicatorPage,
  PageSizeURLQuery,
  PaginationURLQuery,
  RelativeTime,
  Table,
  useAPIErrorHandler,
  useNotification,
  useQueryParams,
  ConfirmDialog,
} from '@strapi/helper-plugin';
import { ArrowLeft, EmptyDocuments, More, Pencil, Trash } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { useParams, useHistory } from 'react-router-dom';
import styled from 'styled-components';

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
} from '../services/release';

import type { ReleaseAction } from '../../../shared/contracts/release-actions';

/* -------------------------------------------------------------------------------------------------
 * ReleaseDetailsLayout
 * -----------------------------------------------------------------------------------------------*/
const ReleaseInfoWrapper = styled(Flex)`
  align-self: stretch;
  border-bottom-right-radius: ${({ theme }) => theme.borderRadius};
  border-bottom-left-radius: ${({ theme }) => theme.borderRadius};
  border-top: 1px solid ${({ theme }) => theme.colors.neutral150};
`;

const StyledFlex = styled(Flex)`
  align-self: stretch;
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

interface PopoverButtonProps {
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
  children: React.ReactNode;
}

const PopoverButton = ({ onClick, children }: PopoverButtonProps) => {
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
    >
      {children}
    </StyledFlex>
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
  const { data, isLoading: isLoadingDetails, isError } = useGetReleaseQuery({ id: releaseId });
  const [publishRelease, { isLoading: isPublishing }] = usePublishReleaseMutation();
  const toggleNotification = useNotification();
  const { formatAPIError } = useAPIErrorHandler();

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

  if (isLoadingDetails) {
    return (
      <Main aria-busy={isLoadingDetails}>
        <Box paddingBottom={8}>
          <LoadingIndicatorPage />
        </Box>
      </Main>
    );
  }

  if (isError || !release) {
    return (
      <Main>
        <Box paddingBottom={8}>
          <AnErrorOccurred />
        </Box>
      </Main>
    );
  }

  const totalEntries = release.actions.meta.count || 0;
  const createdBy = `${release.createdBy.firstname} ${release.createdBy.lastname}`;

  return (
    <Main aria-busy={isLoadingDetails}>
      <Box paddingBottom={8}>
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
                    defaultMessage: 'Release actions',
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
                    <Flex
                      alignItems="center"
                      justifyContent="center"
                      direction="column"
                      padding={1}
                    >
                      <CheckPermissions permissions={PERMISSIONS.update}>
                        <PopoverButton onClick={openReleaseModal}>
                          <PencilIcon />
                          <Typography ellipsis>
                            {formatMessage({
                              id: 'content-releases.header.actions.edit',
                              defaultMessage: 'Edit',
                            })}
                          </Typography>
                        </PopoverButton>
                      </CheckPermissions>
                      <CheckPermissions permissions={PERMISSIONS.delete}>
                        <PopoverButton onClick={openWarningConfirmDialog}>
                          <TrashIcon />
                          <Typography ellipsis textColor="danger600">
                            {formatMessage({
                              id: 'content-releases.header.actions.delete',
                              defaultMessage: 'Delete',
                            })}
                          </Typography>
                        </PopoverButton>
                      </CheckPermissions>
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
                            defaultMessage: ' by {createdBy}',
                          },
                          { createdBy }
                        )}
                      </Typography>
                    </ReleaseInfoWrapper>
                  </Popover>
                )}
                <Button size="S" variant="tertiary">
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
      </Box>
      {children}
    </Main>
  );
};

/* -------------------------------------------------------------------------------------------------
 * ReleaseDetailsBody
 * -----------------------------------------------------------------------------------------------*/
const ReleaseDetailsBody = () => {
  const { formatMessage } = useIntl();
  const { releaseId } = useParams<{ releaseId: string }>();
  const [{ query }] = useQueryParams<GetReleaseActionsQueryParams>();
  const toggleNotification = useNotification();
  const { formatAPIError } = useAPIErrorHandler();
  const {
    data: releaseData,
    isLoading: isReleaseLoading,
    isError: isReleaseError,
  } = useGetReleaseQuery({ id: releaseId });
  const release = releaseData?.data;

  const { isLoading, isFetching, isError, data } = useGetReleaseActionsQuery({
    ...query,
    releaseId,
  });

  const [updateReleaseAction] = useUpdateReleaseActionMutation();

  const handleChangeType = async (
    e: React.ChangeEvent<HTMLInputElement>,
    actionId: ReleaseAction['id']
  ) => {
    const response = await updateReleaseAction({
      params: {
        releaseId,
        actionId,
      },
      body: {
        type: e.target.value as ReleaseAction['type'],
      },
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

  if (isError || isReleaseError || !release) {
    return (
      <ContentLayout>
        <AnErrorOccurred />
      </ContentLayout>
    );
  }

  const releaseActions = data?.data;
  const releaseMeta = data?.meta;

  if (!releaseActions || !releaseActions.length) {
    return (
      <ContentLayout>
        <EmptyStateLayout
          content={formatMessage({
            id: 'content-releases.pages.Details.empty-state.content',
            defaultMessage: 'This release is empty.',
          })}
          icon={<EmptyDocuments width="10rem" />}
        />
      </ContentLayout>
    );
  }

  return (
    <ContentLayout>
      <Flex gap={4} direction="column" alignItems="stretch">
        <Table.Root
          rows={releaseActions.map((item) => ({
            ...item,
            id: Number(item.entry.id),
          }))}
          colCount={releaseActions.length}
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
            </Table.Head>
            <Table.LoadingBody />
            <Table.Body>
              {releaseActions.map(({ id, type, entry }) => (
                <Tr key={id}>
                  <Td>
                    <Typography>{`${entry.contentType.mainFieldValue || entry.id}`}</Typography>
                  </Td>
                  <Td>
                    <Typography>{`${entry?.locale?.name ? entry.locale.name : '-'}`}</Typography>
                  </Td>
                  <Td>
                    <Typography>{entry.contentType.displayName || ''}</Typography>
                  </Td>
                  <Td>
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
                        handleChange={(e) => handleChangeType(e, id)}
                        name={`release-action-${id}-type`}
                      />
                    )}
                  </Td>
                </Tr>
              ))}
            </Table.Body>
          </Table.Content>
        </Table.Root>
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

const ProtectedReleaseDetailsPage = () => (
  <CheckPermissions permissions={PERMISSIONS.main}>
    <ReleaseDetailsPage />
  </CheckPermissions>
);

export { ReleaseDetailsPage, ProtectedReleaseDetailsPage };
