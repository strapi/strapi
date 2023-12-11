import * as React from 'react';

import {
  Button,
  ContentLayout,
  EmptyStateLayout,
  Flex,
  HeaderLayout,
  IconButton,
  Link,
  Main,
  Popover,
  Typography,
  Tr,
  Td,
} from '@strapi/design-system';
import {
  AnErrorOccurred,
  CheckPermissions,
  LoadingIndicatorPage,
  PageSizeURLQuery,
  PaginationURLQuery,
  Table,
  useAPIErrorHandler,
  useNotification,
  useQueryParams,
} from '@strapi/helper-plugin';
import { ArrowLeft, EmptyDocuments, More, Pencil, Trash } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { useParams } from 'react-router-dom';
import styled from 'styled-components';

import { GetReleaseActions } from '../../../shared/contracts/release-actions';
import { ReleaseModal, FormValues } from '../components/ReleaseModal';
import { PERMISSIONS } from '../constants';
import { isAxiosError } from '../services/axios';
import {
  GetReleaseActionsQueryParams,
  useUpdateReleaseMutation,
  useGetReleaseQuery,
  useGetReleaseActionsQuery,
} from '../services/release';
/* -------------------------------------------------------------------------------------------------
 * ReleaseDetailsLayout
 * -----------------------------------------------------------------------------------------------*/
const ReleaseInfoWrapper = styled(Flex)`
  align-self: stretch;
  border-bottom-right-radius: ${({ theme }) => theme.borderRadius};
  border-bottom-left-radius: ${({ theme }) => theme.borderRadius};
  border-top: 1px solid ${({ theme }) => theme.colors.neutral150};
`;

const PopoverButton = styled(Flex)`
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

const countDays = (date: string) => {
  const currentDateInMillis = new Date().getTime();
  const startDateInMilliseconds = new Date(date).getTime();
  const timeDiff = currentDateInMillis - startDateInMilliseconds;

  const daysPassed = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

  return daysPassed;
};

interface ReleaseDetailsLayoutProps {
  toggleEditReleaseModal: () => void;
  children: React.ReactNode;
}

export const ReleaseDetailsLayout = ({
  toggleEditReleaseModal,
  children,
}: ReleaseDetailsLayoutProps) => {
  const { formatMessage } = useIntl();
  const { releaseId } = useParams<{ releaseId: string }>();
  const [isPopoverVisible, setIsPopoverVisible] = React.useState(false);
  const moreButtonRef = React.useRef<HTMLButtonElement>(null!);

  const { data, isLoading } = useGetReleaseQuery({ id: releaseId });

  const title = data?.data?.name;
  const createdAt = data?.data?.createdAt;
  const totalEntries = data?.data?.actions?.meta?.total || 0;
  const daysPassed = createdAt ? countDays(createdAt) : 0;
  const createdBy = 'John Doe'; // TODO: replace it with the name of the user who created the release

  const handleTogglePopover = () => {
    setIsPopoverVisible((prev) => !prev);
  };

  const openReleaseModal = () => {
    toggleEditReleaseModal();
    handleTogglePopover();
  };
  return (
    <Main aria-busy={isLoading}>
      <HeaderLayout
        title={!isLoading && title ? title : undefined}
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
          <Flex gap={2}>
            <IconButton
              label={formatMessage({
                id: 'content-releases.header.actions.open-release-actions',
                defaultMessage: 'Release actions',
              })}
              onClick={handleTogglePopover}
              ref={moreButtonRef}
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
                  <CheckPermissions permissions={PERMISSIONS.update}>
                    <PopoverButton
                      paddingTop={2}
                      paddingBottom={2}
                      paddingLeft={4}
                      paddingRight={4}
                      alignItems="center"
                      gap={2}
                      as="button"
                      hasRadius
                      onClick={openReleaseModal}
                    >
                      <PencilIcon />
                      <Typography ellipsis>
                        {formatMessage({
                          id: 'content-releases.header.actions.edit',
                          defaultMessage: 'Edit',
                        })}
                      </Typography>
                    </PopoverButton>
                  </CheckPermissions>
                  <PopoverButton
                    paddingTop={2}
                    paddingBottom={2}
                    paddingLeft={4}
                    paddingRight={4}
                    alignItems="center"
                    gap={2}
                    as="button"
                    hasRadius
                  >
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
                    {formatMessage(
                      {
                        id: 'content-releases.header.actions.created.description',
                        defaultMessage:
                          '{number, plural, =0 {# days} one {# day} other {# days}} ago by {createdBy}',
                      },
                      { number: daysPassed, createdBy }
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
            <Button size="S" disabled={true} variant="default">
              {formatMessage({
                id: 'content-releases.header.actions.release',
                defaultMessage: 'Release',
              })}
            </Button>
          </Flex>
        }
      />
      {children}
    </Main>
  );
};

/* -------------------------------------------------------------------------------------------------
 * ReleaseDetailsBody
 * -----------------------------------------------------------------------------------------------*/
const ReleaseDetailsBody = ({ releaseId }: { releaseId: GetReleaseActions.Request['params'] }) => {
  const { formatMessage } = useIntl();
  const [{ query }] = useQueryParams<GetReleaseActionsQueryParams>();

  const { isLoading, isError, data } = useGetReleaseActionsQuery({ ...query, releaseId });

  if (isLoading) {
    return (
      <ContentLayout>
        <LoadingIndicatorPage />
      </ContentLayout>
    );
  }

  if (isError) {
    return (
      <ContentLayout>
        <AnErrorOccurred />
      </ContentLayout>
    );
  }

  if (data?.data.length === 0) {
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
        <Table.Root rows={data?.data} colCount={data?.data.length} isLoading={isLoading}>
          <Table.Content>
            <Table.Head>
              <Table.HeaderCell fieldSchemaType="string" label="name" name="name" />
              <Table.HeaderCell fieldSchemaType="string" label="locale" name="locale" />
              <Table.HeaderCell fieldSchemaType="string" label="content-type" name="content-type" />
            </Table.Head>
            <Table.LoadingBody />
            <Table.Body>
              {data?.data.map(({ contentType, entry }) => (
                <Tr key={entry.id}>
                  <Td>
                    <Typography>{entry.mainField || entry.id}</Typography>
                  </Td>
                  <Td>
                    <Typography>{entry.locale || '-'}</Typography>
                  </Td>
                  <Td>
                    <Typography>{contentType}</Typography>
                  </Td>
                </Tr>
              ))}
            </Table.Body>
          </Table.Content>
        </Table.Root>
        <Flex paddingTop={4} alignItems="flex-end" justifyContent="space-between">
          <PageSizeURLQuery defaultValue={data?.meta?.pagination?.pageSize.toString()} />
          <PaginationURLQuery
            pagination={{
              pageCount: data?.meta?.pagination?.pageCount || 0,
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
  const { releaseId } = useParams<GetReleaseActions.Request['params']>();
  const toggleNotification = useNotification();
  const { formatAPIError } = useAPIErrorHandler();
  const [releaseModalShown, setReleaseModalShown] = React.useState(false);

  const { isLoading: isLoadingDetails, data } = useGetReleaseQuery({ id: releaseId });
  const [updateRelease, { isLoading: isSubmittingForm }] = useUpdateReleaseMutation();

  const title = data?.data?.name;

  const toggleEditReleaseModal = () => {
    setReleaseModalShown((prev) => !prev);
  };

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

  if (isLoadingDetails) {
    return (
      <ReleaseDetailsLayout toggleEditReleaseModal={toggleEditReleaseModal}>
        <ContentLayout>
          <LoadingIndicatorPage />
        </ContentLayout>
      </ReleaseDetailsLayout>
    );
  }

  return (
    <ReleaseDetailsLayout toggleEditReleaseModal={toggleEditReleaseModal}>
      <ReleaseDetailsBody releaseId={releaseId} />
      {releaseModalShown && (
        <ReleaseModal
          handleClose={toggleEditReleaseModal}
          handleSubmit={handleEditRelease}
          isLoading={isLoadingDetails || isSubmittingForm}
          initialValues={{ name: title || '' }}
        />
      )}
    </ReleaseDetailsLayout>
  );
};

const ProtectedReleaseDetailsPage = () => (
  <CheckPermissions permissions={PERMISSIONS.main}>
    <ReleaseDetailsPage />
  </CheckPermissions>
);

export { ReleaseDetailsPage, ProtectedReleaseDetailsPage };
