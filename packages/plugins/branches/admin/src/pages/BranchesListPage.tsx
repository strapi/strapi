import * as React from 'react';

import {
  ConfirmDialog,
  Layouts,
  Page,
  useAPIErrorHandler,
  useNotification,
  useRBAC,
} from '@strapi/admin/strapi-admin';
import {
  Box,
  Button,
  Dialog,
  EmptyStateLayout,
  Flex,
  IconButton,
  Status,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Typography,
} from '@strapi/design-system';
import { ArrowsCounterClockwise, Plus, Trash } from '@strapi/icons';
import { RelativeTime } from '@strapi/content-manager/strapi-admin';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';

import { BranchNameWithDot, CreateBranchModal } from '../components/CreateBranchModal';
import { useBranches } from '../components/useBranches';
import { MAIN_SLUG, PERMISSIONS } from '../constants';
import { useDeleteBranchMutation, useGetAllBranchesQuery, type Branch } from '../services/branches';
import { getTranslation } from '../utils/getTranslation';

const StatusBadge = ({ status }: { status: Branch['status'] }) => {
  const { formatMessage } = useIntl();
  const variant =
    status === 'active' ? 'success' : status === 'merged' ? 'secondary' : 'alternative';
  return (
    <Status variant={variant} size="S">
      <Typography tag="span" variant="omega" fontWeight="bold">
        {formatMessage({
          id: getTranslation(`pages.list.status.${status}`),
          defaultMessage: status.charAt(0).toUpperCase() + status.slice(1),
        })}
      </Typography>
    </Status>
  );
};

/** `/content-manager/plugins/branches` — every branch of the workspace, with creation and deletion. */
const BranchesListPage = () => {
  const { formatMessage } = useIntl();
  const navigate = useNavigate();
  const { toggleNotification } = useNotification();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();
  const { data: branches = [], isLoading } = useGetAllBranchesQuery();
  const { currentSlug, switchBranch, main } = useBranches();
  const [deleteBranch] = useDeleteBranchMutation();
  const { allowedActions } = useRBAC(PERMISSIONS);
  const [toDelete, setToDelete] = React.useState<Branch | null>(null);

  const parentName = (branch: Branch) =>
    branch.parent?.name ??
    main?.name ??
    formatMessage({ id: getTranslation('main.name'), defaultMessage: 'Main' });

  const handleDelete = async () => {
    if (!toDelete || toDelete.id === null) {
      return;
    }
    try {
      await deleteBranch(toDelete.id).unwrap();
      if (currentSlug === toDelete.slug) {
        switchBranch(MAIN_SLUG);
      }
      toggleNotification({
        type: 'success',
        message: formatMessage(
          { id: getTranslation('pages.list.deleted'), defaultMessage: 'Branch {name} deleted.' },
          { name: toDelete.name }
        ),
      });
    } catch (error) {
      toggleNotification({
        type: 'danger',
        message: formatAPIError(error as Parameters<typeof formatAPIError>[0]),
      });
    }
    setToDelete(null);
  };

  const createTrigger = (
    <Button startIcon={<Plus />}>
      {formatMessage({
        id: getTranslation('pages.list.create'),
        defaultMessage: 'Create a branch',
      })}
    </Button>
  );

  if (isLoading) {
    return <Page.Loading />;
  }

  return (
    <Page.Main>
      <Page.Title>
        {formatMessage({ id: getTranslation('pages.list.title'), defaultMessage: 'Branches' })}
      </Page.Title>
      <Layouts.Header
        title={formatMessage({
          id: getTranslation('pages.list.title'),
          defaultMessage: 'Branches',
        })}
        subtitle={formatMessage({
          id: getTranslation('pages.list.subtitle'),
          defaultMessage: 'Prepare a release on an isolated branch, then merge it into main.',
        })}
        primaryAction={
          allowedActions.canCreate ? <CreateBranchModal trigger={createTrigger} /> : null
        }
      />
      <Layouts.Content>
        {branches.length === 0 ? (
          <EmptyStateLayout
            content={formatMessage({
              id: getTranslation('pages.list.empty'),
              defaultMessage:
                'No branch yet. Create one to start preparing a release without touching production.',
            })}
            action={allowedActions.canCreate ? <CreateBranchModal trigger={createTrigger} /> : null}
          />
        ) : (
          <Table colCount={6} rowCount={branches.length + 1}>
            <Thead>
              <Tr>
                <Th>
                  <Typography variant="sigma">
                    {formatMessage({
                      id: getTranslation('pages.list.column.name'),
                      defaultMessage: 'Name',
                    })}
                  </Typography>
                </Th>
                <Th>
                  <Typography variant="sigma">
                    {formatMessage({
                      id: getTranslation('pages.list.column.parent'),
                      defaultMessage: 'From',
                    })}
                  </Typography>
                </Th>
                <Th>
                  <Typography variant="sigma">
                    {formatMessage({
                      id: getTranslation('pages.list.column.status'),
                      defaultMessage: 'Status',
                    })}
                  </Typography>
                </Th>
                <Th>
                  <Typography variant="sigma">
                    {formatMessage({
                      id: getTranslation('pages.list.column.changes'),
                      defaultMessage: 'Changes',
                    })}
                  </Typography>
                </Th>
                <Th>
                  <Typography variant="sigma">
                    {formatMessage({
                      id: getTranslation('pages.list.column.updatedAt'),
                      defaultMessage: 'Last updated',
                    })}
                  </Typography>
                </Th>
                <Th>
                  <Typography variant="sigma" />
                </Th>
              </Tr>
            </Thead>
            <Tbody>
              {branches.map((branch) => (
                <Tr
                  key={branch.slug}
                  onClick={() => navigate(String(branch.id))}
                  style={{ cursor: 'pointer' }}
                >
                  <Td>
                    <Flex direction="column" alignItems="flex-start" gap={1}>
                      <BranchNameWithDot name={branch.name} color={branch.color} />
                      <Typography variant="pi" textColor="neutral600">
                        {branch.slug}
                      </Typography>
                    </Flex>
                  </Td>
                  <Td>
                    <Typography textColor="neutral800">{parentName(branch)}</Typography>
                  </Td>
                  <Td>
                    <StatusBadge status={branch.status} />
                  </Td>
                  <Td>
                    <Typography textColor="neutral800">{branch.changesCount ?? 0}</Typography>
                  </Td>
                  <Td>
                    {branch.updatedAt ? (
                      <Typography textColor="neutral800">
                        <RelativeTime timestamp={new Date(branch.updatedAt)} />
                      </Typography>
                    ) : null}
                  </Td>
                  <Td onClick={(event: React.MouseEvent) => event.stopPropagation()}>
                    <Flex gap={1} justifyContent="flex-end">
                      {branch.status === 'active' && branch.slug !== currentSlug ? (
                        <IconButton
                          variant="ghost"
                          label={formatMessage(
                            {
                              id: getTranslation('pages.list.switchTo'),
                              defaultMessage: 'Switch to {name}',
                            },
                            { name: branch.name }
                          )}
                          onClick={() => switchBranch(branch.slug)}
                        >
                          <ArrowsCounterClockwise />
                        </IconButton>
                      ) : null}
                      {allowedActions.canDelete ? (
                        <IconButton
                          variant="ghost"
                          label={formatMessage(
                            {
                              id: getTranslation('branch.delete'),
                              defaultMessage: 'Delete branch',
                            },
                            { name: branch.name }
                          )}
                          onClick={() => setToDelete(branch)}
                        >
                          <Trash />
                        </IconButton>
                      ) : null}
                    </Flex>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
        <Dialog.Root
          open={toDelete !== null}
          onOpenChange={(open) => (!open ? setToDelete(null) : undefined)}
        >
          <ConfirmDialog onConfirm={handleDelete}>
            {formatMessage(
              {
                id: getTranslation('pages.list.delete.confirm'),
                defaultMessage:
                  'Delete {name}? Every document created on it and every change made on it will be lost.',
              },
              { name: toDelete?.name ?? '' }
            )}
          </ConfirmDialog>
        </Dialog.Root>
        <Box paddingTop={4} />
      </Layouts.Content>
    </Page.Main>
  );
};

const ProtectedBranchesListPage = () => (
  <Page.Protect permissions={PERMISSIONS.read}>
    <BranchesListPage />
  </Page.Protect>
);

export { BranchesListPage, ProtectedBranchesListPage };
