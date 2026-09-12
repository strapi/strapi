import * as React from 'react';

import { Layouts, Page, useNotification, useRBAC, ConfirmDialog } from '@strapi/admin/strapi-admin';
import {
  Button,
  Dialog,
  EmptyStateLayout,
  Flex,
  IconButton,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Typography,
} from '@strapi/design-system';
import { Pencil, Plus, Trash, User } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { PERMISSIONS } from '../constants';
import {
  useDeleteSpaceMutation,
  useGetSpacesQuery,
  useSetDefaultSpaceMutation,
  type Space,
} from '../services/api';
import { formatApiError } from '../utils/formatApiError';
import { getTranslation } from '../utils/getTranslation';

import { MembersModal } from './MembersModal';
import { SpaceModal } from './SpaceModal';

const SettingsPage = () => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();

  /**
   * Asked separately, because `useRBAC` names what it found after the last
   * segment of the action: `spaces.manage` and `members.manage` would both
   * come back as `canManage`, and holding either would look like holding both.
   */
  const { allowedActions: spaceActions, isLoading: isLoadingSpaceRBAC } = useRBAC(
    PERMISSIONS.manage
  );
  const { allowedActions: memberActions, isLoading: isLoadingMemberRBAC } = useRBAC(
    PERMISSIONS.manageMembers
  );

  const canManage = spaceActions.canManage;
  const canManageMembers = memberActions.canManage;

  const { data: spaces, isLoading, error } = useGetSpacesQuery();
  const [deleteSpace] = useDeleteSpaceMutation();
  const [setDefaultSpace] = useSetDefaultSpaceMutation();

  const [editing, setEditing] = React.useState<Space | null | 'new'>(null);
  const [managingMembers, setManagingMembers] = React.useState<Space | null>(null);
  const [pendingDeletion, setPendingDeletion] = React.useState<Space | null>(null);

  if (isLoading || isLoadingSpaceRBAC || isLoadingMemberRBAC) {
    return <Page.Loading />;
  }

  if (error) {
    return <Page.Error />;
  }

  const handleDelete = async () => {
    if (!pendingDeletion) {
      return;
    }

    const result = await deleteSpace(pendingDeletion.id);

    if ('error' in result) {
      toggleNotification({ type: 'danger', message: formatApiError(result.error) });
    } else {
      toggleNotification({
        type: 'success',
        message: formatMessage(
          {
            id: getTranslation('settings.deleted'),
            defaultMessage: '"{name}" and its content were deleted.',
          },
          { name: pendingDeletion.name }
        ),
      });
    }

    setPendingDeletion(null);
  };

  const handleSetDefault = async (space: Space) => {
    const result = await setDefaultSpace(space.id);

    if ('error' in result) {
      toggleNotification({ type: 'danger', message: formatApiError(result.error) });
    }
  };

  return (
    <Page.Main>
      <Page.Title>
        {formatMessage({ id: getTranslation('plugin.name'), defaultMessage: 'Spaces' })}
      </Page.Title>

      <Layouts.Header
        title={formatMessage({ id: getTranslation('plugin.name'), defaultMessage: 'Spaces' })}
        subtitle={formatMessage({
          id: getTranslation('settings.subtitle'),
          defaultMessage:
            'Keep content, media and members apart. Each space holds its own entries; the schema is shared by all of them.',
        })}
        primaryAction={
          canManage ? (
            <Button startIcon={<Plus />} onClick={() => setEditing('new')}>
              {formatMessage({
                id: getTranslation('settings.create'),
                defaultMessage: 'Create a space',
              })}
            </Button>
          ) : null
        }
      />

      <Layouts.Content>
        {spaces && spaces.length > 0 ? (
          <Table colCount={5} rowCount={spaces.length}>
            <Thead>
              <Tr>
                <Th>
                  <Typography variant="sigma">
                    {formatMessage({
                      id: getTranslation('settings.name'),
                      defaultMessage: 'Name',
                    })}
                  </Typography>
                </Th>
                <Th>
                  <Typography variant="sigma">
                    {formatMessage({
                      id: getTranslation('settings.slug'),
                      defaultMessage: 'Slug',
                    })}
                  </Typography>
                </Th>
                <Th>
                  <Typography variant="sigma">
                    {formatMessage({
                      id: getTranslation('settings.contentTypes'),
                      defaultMessage: 'Content types',
                    })}
                  </Typography>
                </Th>
                <Th>
                  <Typography variant="sigma">
                    {formatMessage({
                      id: getTranslation('settings.status'),
                      defaultMessage: 'Status',
                    })}
                  </Typography>
                </Th>
                <Th>
                  <Typography variant="sigma">
                    {formatMessage({
                      id: getTranslation('settings.actions'),
                      defaultMessage: 'Actions',
                    })}
                  </Typography>
                </Th>
              </Tr>
            </Thead>
            <Tbody>
              {spaces.map((space) => (
                <Tr key={space.id}>
                  <Td>
                    <Flex gap={2}>
                      <Typography fontWeight="semiBold" textColor="neutral800">
                        {space.name}
                      </Typography>
                      {space.isDefault ? (
                        <Typography variant="pi" textColor="neutral600">
                          {formatMessage({
                            id: getTranslation('settings.default'),
                            defaultMessage: '(default)',
                          })}
                        </Typography>
                      ) : null}
                    </Flex>
                  </Td>
                  <Td>
                    <Typography textColor="neutral600">{space.slug}</Typography>
                  </Td>
                  <Td>
                    <Typography textColor="neutral600">
                      {space.contentTypes === null || space.contentTypes === undefined
                        ? formatMessage({
                            id: getTranslation('settings.contentTypes.all'),
                            defaultMessage: 'All',
                          })
                        : formatMessage(
                            {
                              id: getTranslation('settings.contentTypes.count'),
                              defaultMessage: '{count, plural, one {# type} other {# types}}',
                            },
                            { count: space.contentTypes.length }
                          )}
                    </Typography>
                  </Td>
                  <Td>
                    <Typography textColor={space.status === 'active' ? 'success600' : 'neutral600'}>
                      {space.status}
                    </Typography>
                  </Td>
                  <Td>
                    <Flex gap={1} justifyContent="flex-end">
                      {canManageMembers ? (
                        <IconButton
                          label={formatMessage({
                            id: getTranslation('settings.members'),
                            defaultMessage: 'Manage members',
                          })}
                          variant="ghost"
                          onClick={() => setManagingMembers(space)}
                        >
                          <User />
                        </IconButton>
                      ) : null}

                      {canManage ? (
                        <>
                          <IconButton
                            label={formatMessage({
                              id: getTranslation('settings.edit'),
                              defaultMessage: 'Edit',
                            })}
                            variant="ghost"
                            onClick={() => setEditing(space)}
                          >
                            <Pencil />
                          </IconButton>

                          {!space.isDefault ? (
                            <>
                              <Button
                                size="S"
                                variant="tertiary"
                                onClick={() => handleSetDefault(space)}
                              >
                                {formatMessage({
                                  id: getTranslation('settings.makeDefault'),
                                  defaultMessage: 'Make default',
                                })}
                              </Button>

                              <IconButton
                                label={formatMessage({
                                  id: getTranslation('settings.delete'),
                                  defaultMessage: 'Delete',
                                })}
                                variant="ghost"
                                onClick={() => setPendingDeletion(space)}
                              >
                                <Trash />
                              </IconButton>
                            </>
                          ) : null}
                        </>
                      ) : null}
                    </Flex>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        ) : (
          <EmptyStateLayout
            icon={null}
            content={formatMessage({
              id: getTranslation('settings.empty'),
              defaultMessage: 'No space yet.',
            })}
            action={
              canManage ? (
                <Button variant="secondary" startIcon={<Plus />} onClick={() => setEditing('new')}>
                  {formatMessage({
                    id: getTranslation('settings.create'),
                    defaultMessage: 'Create a space',
                  })}
                </Button>
              ) : null
            }
          />
        )}
      </Layouts.Content>

      {editing !== null ? (
        <SpaceModal space={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />
      ) : null}

      {managingMembers !== null ? (
        <MembersModal space={managingMembers} onClose={() => setManagingMembers(null)} />
      ) : null}

      <Dialog.Root open={pendingDeletion !== null} onOpenChange={() => setPendingDeletion(null)}>
        <ConfirmDialog onConfirm={handleDelete}>
          {formatMessage(
            {
              id: getTranslation('settings.delete.confirm'),
              defaultMessage:
                'Deleting "{name}" permanently removes every entry, asset and membership that belongs to it. This cannot be undone.',
            },
            { name: pendingDeletion?.name ?? '' }
          )}
        </ConfirmDialog>
      </Dialog.Root>
    </Page.Main>
  );
};

const ProtectedSettingsPage = () => (
  <Page.Protect permissions={PERMISSIONS.read}>
    <SettingsPage />
  </Page.Protect>
);

export { SettingsPage, ProtectedSettingsPage };
