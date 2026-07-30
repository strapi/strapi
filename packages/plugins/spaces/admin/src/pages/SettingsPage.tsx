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
  Box,
  Button,
  Dialog,
  Flex,
  IconButton,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tooltip,
  Tr,
  Typography,
  VisuallyHidden,
} from '@strapi/design-system';
import { Pencil, Plus, Trash } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { Route, Routes, useNavigate } from 'react-router-dom';

import { PERMISSIONS } from '../constants';
import {
  useDeleteSpaceMutation,
  useGetAllSpacesQuery,
  type ManagedSpace,
} from '../services/spaces';
import { DEFAULT_SPACE_SLUG } from '../utils/currentSpace';
import { getTranslation } from '../utils/getTranslation';

import { CreatePage } from './CreatePage';
import { EditPage } from './EditPage';

const Dot = ({ color }: { color: string | null }) => (
  <Box
    width="10px"
    height="10px"
    borderRadius="50%"
    background={color ?? 'neutral300'}
    shrink={0}
  />
);

/**
 * Settings → Workspaces list. Rows navigate to the workspace's edit page
 * (`/settings/workspaces/:id`) — archiving lives THERE, not here. The delete
 * trash is always visible; for the default workspace it's disabled with an
 * explanatory tooltip (the server refuses anyway).
 */
const ListPage = () => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();
  const navigate = useNavigate();
  const { data: spaces, isLoading } = useGetAllSpacesQuery();
  const [deleteSpace] = useDeleteSpaceMutation();
  // `useRBAC` derives keys from the action id's last segment — see constants.ts.
  const {
    allowedActions: { canCreate, canUpdate, canDelete },
  } = useRBAC(PERMISSIONS);

  const [deleting, setDeleting] = React.useState<ManagedSpace | null>(null);

  if (isLoading) {
    return <Page.Loading />;
  }

  if (!Array.isArray(spaces)) {
    return <Page.Error />;
  }

  const handleDelete = async () => {
    if (!deleting) {
      return;
    }
    try {
      await deleteSpace(deleting.id).unwrap();
      toggleNotification({
        type: 'success',
        message: formatMessage(
          {
            id: getTranslation('settings.deleted.success'),
            defaultMessage: '{name} deleted.',
          },
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
        title={formatMessage({
          id: getTranslation('settings.title'),
          defaultMessage: 'Workspaces',
        })}
        subtitle={formatMessage({
          id: getTranslation('settings.subtitle'),
          defaultMessage: 'Create, rename and archive the workspaces of this deployment.',
        })}
        primaryAction={
          canCreate && (
            <Button startIcon={<Plus />} onClick={() => navigate('create')} size="S">
              {formatMessage({
                id: getTranslation('switcher.addWorkspace'),
                defaultMessage: 'Add a workspace',
              })}
            </Button>
          )
        }
      />
      <Layouts.Content>
        <Table colCount={4} rowCount={spaces.length + 1}>
          <Thead>
            <Tr>
              <Th>
                <Typography variant="sigma" textColor="neutral600">
                  {formatMessage({
                    id: getTranslation('createModal.name.label'),
                    defaultMessage: 'Name',
                  })}
                </Typography>
              </Th>
              <Th>
                <Typography variant="sigma" textColor="neutral600">
                  {formatMessage({
                    id: getTranslation('createModal.slug.label'),
                    defaultMessage: 'Slug',
                  })}
                </Typography>
              </Th>
              <Th>
                <Typography variant="sigma" textColor="neutral600">
                  {formatMessage({
                    id: getTranslation('settings.status'),
                    defaultMessage: 'Status',
                  })}
                </Typography>
              </Th>
              <Th>
                <VisuallyHidden>Actions</VisuallyHidden>
              </Th>
            </Tr>
          </Thead>
          <Tbody>
            {spaces.map((space) => {
              const isDefault = space.slug === DEFAULT_SPACE_SLUG;

              return (
                <Tr
                  key={space.id}
                  onClick={() => canUpdate && navigate(String(space.id))}
                  style={{ cursor: canUpdate ? 'pointer' : 'default' }}
                >
                  <Td>
                    <Flex alignItems="center" gap={2}>
                      <Dot color={space.color} />
                      <Typography textColor="neutral800">{space.name}</Typography>
                    </Flex>
                  </Td>
                  <Td>
                    <Typography textColor="neutral600">{space.slug}</Typography>
                  </Td>
                  <Td>
                    <Badge
                      active={space.status === 'active'}
                      textColor={space.status === 'active' ? 'success600' : 'neutral600'}
                    >
                      {formatMessage({
                        id: getTranslation(`settings.status.${space.status}`),
                        defaultMessage: space.status === 'active' ? 'Active' : 'Archived',
                      })}
                    </Badge>
                  </Td>
                  <Td onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                    <Flex gap={2} justifyContent="flex-end">
                      {canUpdate && (
                        <IconButton
                          onClick={() => navigate(String(space.id))}
                          label={formatMessage(
                            {
                              id: getTranslation('settings.edit.title'),
                              defaultMessage: 'Edit {name}',
                            },
                            { name: space.name }
                          )}
                          variant="ghost"
                        >
                          <Pencil />
                        </IconButton>
                      )}
                      {canDelete &&
                        (isDefault ? (
                          <Tooltip
                            label={formatMessage({
                              id: getTranslation('settings.delete.default.tooltip'),
                              defaultMessage: 'Default workspace cannot be deleted',
                            })}
                          >
                            <Box tag="span">
                              <IconButton
                                disabled
                                label={formatMessage({
                                  id: getTranslation('settings.delete.default.tooltip'),
                                  defaultMessage: 'Default workspace cannot be deleted',
                                })}
                                variant="ghost"
                              >
                                <Trash />
                              </IconButton>
                            </Box>
                          </Tooltip>
                        ) : (
                          <IconButton
                            onClick={() => setDeleting(space)}
                            label={formatMessage(
                              {
                                id: getTranslation('settings.delete.label'),
                                defaultMessage: 'Delete {name}',
                              },
                              { name: space.name }
                            )}
                            variant="ghost"
                          >
                            <Trash />
                          </IconButton>
                        ))}
                    </Flex>
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      </Layouts.Content>

      <Dialog.Root
        open={deleting !== null}
        onOpenChange={(open: boolean) => !open && setDeleting(null)}
      >
        <ConfirmDialog onConfirm={handleDelete}>
          {formatMessage(
            {
              id: getTranslation('settings.delete.confirm'),
              defaultMessage:
                'Are you sure you want to delete {name}? Its entries must have been moved or deleted first.',
            },
            { name: deleting?.name ?? '' }
          )}
        </ConfirmDialog>
      </Dialog.Root>
    </Page.Main>
  );
};

/**
 * The settings link is mounted at `/settings/workspaces/*`, so the section owns
 * its sub-routes: index = list, `:id` = the full edit page (webhook-style).
 */
const SettingsPage = () => (
  <Routes>
    <Route index element={<ListPage />} />
    <Route path="create" element={<CreatePage />} />
    <Route path=":id" element={<EditPage />} />
  </Routes>
);

const ProtectedSettingsPage = () => (
  <Page.Protect permissions={PERMISSIONS.createSpace}>
    <SettingsPage />
  </Page.Protect>
);

export { ProtectedSettingsPage, SettingsPage };
