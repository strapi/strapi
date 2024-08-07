import * as React from 'react';

import {
  useNotifyAT,
  Checkbox,
  Button,
  EmptyStateLayout,
  Flex,
  IconButton,
  Switch,
  Table,
  Tbody,
  Td,
  TFooter,
  Th,
  Thead,
  Tr,
  Typography,
  VisuallyHidden,
  LinkButton,
  Dialog,
} from '@strapi/design-system';
import { Pencil, Plus, Trash } from '@strapi/icons';
import { EmptyDocuments } from '@strapi/icons/symbols';
import { useIntl } from 'react-intl';
import { NavLink, useNavigate } from 'react-router-dom';

import { UpdateWebhook } from '../../../../../../shared/contracts/webhooks';
import { ConfirmDialog } from '../../../../components/ConfirmDialog';
import { Layouts } from '../../../../components/Layouts/Layout';
import { Page } from '../../../../components/PageHelpers';
import { useTypedSelector } from '../../../../core/store/hooks';
import { useNotification } from '../../../../features/Notifications';
import { useAPIErrorHandler } from '../../../../hooks/useAPIErrorHandler';
import { useRBAC } from '../../../../hooks/useRBAC';

import { useWebhooks } from './hooks/useWebhooks';

/* -------------------------------------------------------------------------------------------------
 * ListPage
 * -----------------------------------------------------------------------------------------------*/

const ListPage = () => {
  const [showModal, setShowModal] = React.useState(false);
  const [webhooksToDelete, setWebhooksToDelete] = React.useState<string[]>([]);
  const permissions = useTypedSelector((state) => state.admin_app.permissions.settings?.webhooks);
  const { formatMessage } = useIntl();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();
  const { toggleNotification } = useNotification();
  const navigate = useNavigate();

  const {
    isLoading: isRBACLoading,
    allowedActions: { canCreate, canUpdate, canDelete },
  } = useRBAC(permissions);
  const { notifyStatus } = useNotifyAT();

  const {
    isLoading: isWebhooksLoading,
    webhooks,
    error: webhooksError,
    updateWebhook,
    deleteManyWebhooks,
  } = useWebhooks();

  React.useEffect(() => {
    if (webhooksError) {
      toggleNotification({
        type: 'danger',
        message: formatAPIError(webhooksError),
      });

      return;
    }
    if (webhooks) {
      notifyStatus(
        formatMessage({
          id: 'Settings.webhooks.list.loading.success',
          defaultMessage: 'Webhooks have been loaded',
        })
      );
    }
  }, [webhooks, webhooksError, toggleNotification, formatMessage, notifyStatus, formatAPIError]);

  const enableWebhook = async (body: UpdateWebhook.Request['body'] & UpdateWebhook.Params) => {
    try {
      const res = await updateWebhook(body);

      if ('error' in res) {
        toggleNotification({
          type: 'danger',
          message: formatAPIError(res.error),
        });
      }
    } catch {
      toggleNotification({
        type: 'danger',
        message: formatMessage({
          id: 'notification.error',
          defaultMessage: 'An error occurred',
        }),
      });
    }
  };

  const deleteWebhook = async (id: string) => {
    try {
      const res = await deleteManyWebhooks({
        ids: [id],
      });

      if ('error' in res) {
        toggleNotification({
          type: 'danger',
          message: formatAPIError(res.error),
        });

        return;
      }

      setWebhooksToDelete((prev) => prev.filter((webhookId) => webhookId !== id));
    } catch {
      toggleNotification({
        type: 'danger',
        message: formatMessage({
          id: 'notification.error',
          defaultMessage: 'An error occurred',
        }),
      });
    }
  };

  const confirmBulkDelete = async () => {
    try {
      const res = await deleteManyWebhooks({
        ids: webhooksToDelete,
      });

      if ('error' in res) {
        toggleNotification({
          type: 'danger',
          message: formatAPIError(res.error),
        });

        return;
      }

      setWebhooksToDelete([]);
    } catch {
      toggleNotification({
        type: 'danger',
        message: formatMessage({
          id: 'notification.error',
          defaultMessage: 'An error occurred',
        }),
      });
    } finally {
      setShowModal(false);
    }
  };

  const selectAllCheckbox = (selected: boolean) =>
    selected
      ? setWebhooksToDelete(webhooks?.map((webhook) => webhook.id) ?? [])
      : setWebhooksToDelete([]);

  const selectOneCheckbox = (selected: boolean, id: string) =>
    selected
      ? setWebhooksToDelete((prev) => [...prev, id])
      : setWebhooksToDelete((prev) => prev.filter((webhookId) => webhookId !== id));

  const isLoading = isRBACLoading || isWebhooksLoading;
  const numberOfWebhooks = webhooks?.length ?? 0;
  const webhooksToDeleteLength = webhooksToDelete.length;

  if (isLoading) {
    return <Page.Loading />;
  }

  return (
    <Layouts.Root>
      <Page.Title>
        {formatMessage(
          { id: 'Settings.PageTitle', defaultMessage: 'Settings - {name}' },
          {
            name: 'Webhooks',
          }
        )}
      </Page.Title>
      <Page.Main aria-busy={isLoading}>
        <Layouts.Header
          title={formatMessage({ id: 'Settings.webhooks.title', defaultMessage: 'Webhooks' })}
          subtitle={formatMessage({
            id: 'Settings.webhooks.list.description',
            defaultMessage: 'Get POST changes notifications',
          })}
          primaryAction={
            canCreate &&
            !isLoading && (
              <LinkButton tag={NavLink} startIcon={<Plus />} variant="default" to="create" size="S">
                {formatMessage({
                  id: 'Settings.webhooks.list.button.add',
                  defaultMessage: 'Create new webhook',
                })}
              </LinkButton>
            )
          }
        />
        {webhooksToDeleteLength > 0 && canDelete && (
          <Layouts.Action
            startActions={
              <>
                <Typography variant="epsilon" textColor="neutral600">
                  {formatMessage(
                    {
                      id: 'Settings.webhooks.to.delete',
                      defaultMessage:
                        '{webhooksToDeleteLength, plural, one {# webhook} other {# webhooks}} selected',
                    },
                    { webhooksToDeleteLength }
                  )}
                </Typography>
                <Button
                  onClick={() => setShowModal(true)}
                  startIcon={<Trash />}
                  size="L"
                  variant="danger-light"
                >
                  {formatMessage({
                    id: 'global.delete',
                    defaultMessage: 'Delete',
                  })}
                </Button>
              </>
            }
          />
        )}
        <Layouts.Content>
          {numberOfWebhooks > 0 ? (
            <Table
              colCount={5}
              rowCount={numberOfWebhooks + 1}
              footer={
                <TFooter
                  onClick={() => {
                    if (canCreate) {
                      navigate('create');
                    }
                  }}
                  icon={<Plus />}
                >
                  {formatMessage({
                    id: 'Settings.webhooks.list.button.add',
                    defaultMessage: 'Create new webhook',
                  })}
                </TFooter>
              }
            >
              <Thead>
                <Tr>
                  <Th>
                    <Checkbox
                      aria-label={formatMessage({
                        id: 'global.select-all-entries',
                        defaultMessage: 'Select all entries',
                      })}
                      checked={
                        webhooksToDeleteLength > 0 && webhooksToDeleteLength < numberOfWebhooks
                          ? 'indeterminate'
                          : webhooksToDeleteLength === numberOfWebhooks
                      }
                      onCheckedChange={selectAllCheckbox}
                    />
                  </Th>
                  <Th width="20%">
                    <Typography variant="sigma" textColor="neutral600">
                      {formatMessage({
                        id: 'global.name',
                        defaultMessage: 'Name',
                      })}
                    </Typography>
                  </Th>
                  <Th width="60%">
                    <Typography variant="sigma" textColor="neutral600">
                      {formatMessage({
                        id: 'Settings.webhooks.form.url',
                        defaultMessage: 'URL',
                      })}
                    </Typography>
                  </Th>
                  <Th width="20%">
                    <Typography variant="sigma" textColor="neutral600">
                      {formatMessage({
                        id: 'Settings.webhooks.list.th.status',
                        defaultMessage: 'Status',
                      })}
                    </Typography>
                  </Th>
                  <Th>
                    <VisuallyHidden>
                      {formatMessage({
                        id: 'Settings.webhooks.list.th.actions',
                        defaultMessage: 'Actions',
                      })}
                    </VisuallyHidden>
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {webhooks?.map((webhook) => (
                  <Tr
                    key={webhook.id}
                    onClick={() => {
                      if (canUpdate) {
                        navigate(webhook.id);
                      }
                    }}
                    style={{ cursor: canUpdate ? 'pointer' : 'default' }}
                  >
                    <Td onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        aria-label={`${formatMessage({
                          id: 'global.select',
                          defaultMessage: 'Select',
                        })} ${webhook.name}`}
                        checked={webhooksToDelete?.includes(webhook.id)}
                        onCheckedChange={(selected) => selectOneCheckbox(!!selected, webhook.id)}
                        name="select"
                      />
                    </Td>
                    <Td>
                      <Typography fontWeight="semiBold" textColor="neutral800">
                        {webhook.name}
                      </Typography>
                    </Td>
                    <Td>
                      <Typography textColor="neutral800">{webhook.url}</Typography>
                    </Td>
                    <Td onClick={(e) => e.stopPropagation()}>
                      <Flex>
                        <Switch
                          onLabel={formatMessage({
                            id: 'global.enabled',
                            defaultMessage: 'Enabled',
                          })}
                          offLabel={formatMessage({
                            id: 'global.disabled',
                            defaultMessage: 'Disabled',
                          })}
                          aria-label={`${webhook.name} ${formatMessage({
                            id: 'Settings.webhooks.list.th.status',
                            defaultMessage: 'Status',
                          })}`}
                          checked={webhook.isEnabled}
                          onCheckedChange={(enabled) => {
                            enableWebhook({
                              ...webhook,
                              isEnabled: enabled,
                            });
                          }}
                          visibleLabels
                        />
                      </Flex>
                    </Td>
                    <Td>
                      <Flex gap={1}>
                        {canUpdate && (
                          <IconButton
                            label={formatMessage({
                              id: 'Settings.webhooks.events.update',
                              defaultMessage: 'Update',
                            })}
                            variant="ghost"
                          >
                            <Pencil />
                          </IconButton>
                        )}
                        {canDelete && (
                          <DeleteActionButton
                            onDelete={() => {
                              deleteWebhook(webhook.id);
                            }}
                          />
                        )}
                      </Flex>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          ) : (
            <EmptyStateLayout
              icon={<EmptyDocuments width="160px" />}
              content={formatMessage({
                id: 'Settings.webhooks.list.empty.description',
                defaultMessage: 'No webhooks found',
              })}
              action={
                canCreate ? (
                  <LinkButton variant="secondary" startIcon={<Plus />} tag={NavLink} to="create">
                    {formatMessage({
                      id: 'Settings.webhooks.list.button.add',
                      defaultMessage: 'Create new webhook',
                    })}
                  </LinkButton>
                ) : null
              }
            />
          )}
        </Layouts.Content>
      </Page.Main>
      <Dialog.Root open={showModal} onOpenChange={setShowModal}>
        <ConfirmDialog onConfirm={confirmBulkDelete} />
      </Dialog.Root>
    </Layouts.Root>
  );
};

/* -------------------------------------------------------------------------------------------------
 * DeleteActionButton
 * -----------------------------------------------------------------------------------------------*/

type DeleteActionButtonProps = {
  onDelete: () => void;
};

const DeleteActionButton = ({ onDelete }: DeleteActionButtonProps) => {
  const [showModal, setShowModal] = React.useState(false);
  const { formatMessage } = useIntl();

  return (
    <>
      <IconButton
        onClick={(e) => {
          e.stopPropagation();
          setShowModal(true);
        }}
        label={formatMessage({
          id: 'Settings.webhooks.events.delete',
          defaultMessage: 'Delete webhook',
        })}
        variant="ghost"
      >
        <Trash />
      </IconButton>

      <Dialog.Root open={showModal} onOpenChange={setShowModal}>
        <ConfirmDialog
          onConfirm={(e) => {
            e?.stopPropagation();
            onDelete();
          }}
        />
      </Dialog.Root>
    </>
  );
};

/* -------------------------------------------------------------------------------------------------
 * ProtectedListView
 * -----------------------------------------------------------------------------------------------*/

const ProtectedListPage = () => {
  const permissions = useTypedSelector(
    (state) => state.admin_app.permissions.settings?.webhooks.main
  );

  return (
    <Page.Protect permissions={permissions}>
      <ListPage />
    </Page.Protect>
  );
};

export { ListPage, ProtectedListPage };
