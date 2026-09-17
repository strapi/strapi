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
  Badge,
  Button,
  Dialog,
  Flex,
  IconButton,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Typography,
  VisuallyHidden,
} from '@strapi/design-system';
import { Pencil, Plus, Trash } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { Route, Routes, useNavigate } from 'react-router-dom';

import { ChannelDot } from '../components/ChannelDot';
import { PERMISSIONS } from '../constants';
import {
  useDeleteChannelMutation,
  useGetAllChannelsQuery,
  type Channel,
} from '../services/channels';
import { getTranslation } from '../utils/getTranslation';

import { CreatePage } from './CreatePage';
import { EditPage } from './EditPage';

/**
 * Settings → Channels list. Rows navigate to the channel's edit page
 * (`/settings/channels/:id`) — archiving lives THERE, not here.
 */
const ListPage = () => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();
  const navigate = useNavigate();
  const { data: channels, isLoading } = useGetAllChannelsQuery();
  const [deleteChannel] = useDeleteChannelMutation();
  // `useRBAC` derives keys from the action id's last segment — see constants.ts.
  const {
    allowedActions: { canCreate, canUpdate, canDelete },
  } = useRBAC(PERMISSIONS);

  const [deleting, setDeleting] = React.useState<Channel | null>(null);

  if (isLoading) {
    return <Page.Loading />;
  }

  if (!Array.isArray(channels)) {
    return <Page.Error />;
  }

  const handleDelete = async () => {
    if (!deleting) {
      return;
    }
    try {
      await deleteChannel(deleting.id).unwrap();
      toggleNotification({
        type: 'success',
        message: formatMessage(
          { id: getTranslation('settings.deleted.success'), defaultMessage: '{name} deleted.' },
          { name: deleting.name }
        ),
      });
    } catch (err) {
      toggleNotification({
        type: 'danger',
        message: formatAPIError(err as Parameters<typeof formatAPIError>[0]),
      });
    } finally {
      setDeleting(null);
    }
  };

  return (
    <Page.Main tabIndex={-1}>
      <Layouts.Header
        title={formatMessage({ id: getTranslation('settings.title'), defaultMessage: 'Channels' })}
        subtitle={formatMessage({
          id: getTranslation('settings.subtitle'),
          defaultMessage:
            'Deliver per-channel variants of your content: same entries, different field values and visibility.',
        })}
        primaryAction={
          canCreate && (
            <Button startIcon={<Plus />} onClick={() => navigate('create')} size="S">
              {formatMessage({
                id: getTranslation('settings.create'),
                defaultMessage: 'Create a channel',
              })}
            </Button>
          )
        }
      />
      <Layouts.Content>
        <Table colCount={4} rowCount={channels.length + 1}>
          <Thead>
            <Tr>
              <Th>
                <Typography variant="sigma">
                  {formatMessage({ id: getTranslation('form.name'), defaultMessage: 'Name' })}
                </Typography>
              </Th>
              <Th>
                <Typography variant="sigma">
                  {formatMessage({ id: getTranslation('form.slug'), defaultMessage: 'Slug' })}
                </Typography>
              </Th>
              <Th>
                <Typography variant="sigma">
                  {formatMessage({ id: getTranslation('form.status'), defaultMessage: 'Status' })}
                </Typography>
              </Th>
              <Th>
                <VisuallyHidden>
                  {formatMessage({
                    id: getTranslation('settings.actions'),
                    defaultMessage: 'Actions',
                  })}
                </VisuallyHidden>
              </Th>
            </Tr>
          </Thead>
          <Tbody>
            {channels.map((channel) => (
              <Tr
                key={channel.id}
                onClick={canUpdate ? () => navigate(String(channel.id)) : undefined}
                style={canUpdate ? { cursor: 'pointer' } : undefined}
              >
                <Td>
                  <Flex gap={2} alignItems="center">
                    <ChannelDot color={channel.color} />
                    <Typography fontWeight="semiBold">{channel.name}</Typography>
                  </Flex>
                </Td>
                <Td>
                  <Typography textColor="neutral600">{channel.slug}</Typography>
                </Td>
                <Td>
                  {channel.archived ? (
                    <Badge>
                      {formatMessage({
                        id: getTranslation('settings.archived'),
                        defaultMessage: 'Archived',
                      })}
                    </Badge>
                  ) : (
                    <Badge active>
                      {formatMessage({
                        id: getTranslation('settings.active'),
                        defaultMessage: 'Active',
                      })}
                    </Badge>
                  )}
                </Td>
                <Td onClick={(event: React.MouseEvent) => event.stopPropagation()}>
                  <Flex gap={1} justifyContent="flex-end">
                    {canUpdate ? (
                      <IconButton
                        variant="ghost"
                        label={formatMessage(
                          { id: getTranslation('settings.edit'), defaultMessage: 'Edit {name}' },
                          { name: channel.name }
                        )}
                        onClick={() => navigate(String(channel.id))}
                      >
                        <Pencil />
                      </IconButton>
                    ) : null}
                    {canDelete ? (
                      <IconButton
                        variant="ghost"
                        label={formatMessage(
                          {
                            id: getTranslation('settings.delete'),
                            defaultMessage: 'Delete {name}',
                          },
                          { name: channel.name }
                        )}
                        onClick={() => setDeleting(channel)}
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
        <Dialog.Root open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
          <ConfirmDialog onConfirm={handleDelete}>
            {formatMessage(
              {
                id: getTranslation('settings.delete.confirm'),
                defaultMessage:
                  'Delete {name}? Every override recorded for this channel is deleted with it. Base content is untouched.',
              },
              { name: deleting?.name ?? '' }
            )}
          </ConfirmDialog>
        </Dialog.Root>
      </Layouts.Content>
    </Page.Main>
  );
};

const SettingsPage = () => (
  <Routes>
    <Route index element={<ListPage />} />
    <Route path="create" element={<CreatePage />} />
    <Route path=":id" element={<EditPage />} />
  </Routes>
);

const ProtectedSettingsPage = () => (
  <Page.Protect permissions={PERMISSIONS.read}>
    <SettingsPage />
  </Page.Protect>
);

export { SettingsPage, ProtectedSettingsPage };
