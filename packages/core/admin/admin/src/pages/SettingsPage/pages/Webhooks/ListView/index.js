/* eslint-disable no-nested-ternary */
import React, { useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { useIntl } from 'react-intl';
import { useQuery, useMutation } from 'react-query';

import {
  useFetchClient,
  useRBAC,
  LoadingIndicatorPage,
  useNotification,
  useFocusWhenNavigate,
  SettingsPageTitle,
  ConfirmDialog,
  onRowClick,
  stopPropagation,
  LinkButton,
} from '@strapi/helper-plugin';
import {
  HeaderLayout,
  Layout,
  ContentLayout,
  ActionLayout,
  EmptyStateLayout,
  Flex,
  IconButton,
  BaseCheckbox,
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
  TFooter,
  Typography,
  Button,
  Switch,
  Main,
  useNotifyAT,
  Box,
  VisuallyHidden,
} from '@strapi/design-system';
import { Plus, Pencil, Trash, EmptyDocuments } from '@strapi/icons';
import adminPermissions from '../../../../../permissions';

const ListView = () => {
  const [webhooks, setWebhooks] = useState([]);
  const [webhookToDelete, setWebhookToDelete] = useState(null);
  const [webhooksToDelete, setWebhooksToDelete] = useState([]);
  const [showModal, setShowModal] = useState(false);

  const { formatMessage } = useIntl();
  const toggleNotification = useNotification();
  const {
    isLoading: RBACLoading,
    allowedActions: { canCreate, canUpdate, canDelete },
  } = useRBAC(adminPermissions.settings.webhooks);
  const { get, del, post, put } = useFetchClient();
  const { notifyStatus } = useNotifyAT();

  useFocusWhenNavigate();
  const { push } = useHistory();
  const { pathname } = useLocation();
  const rowsCount = webhooks.length;
  const webhooksToDeleteLength = webhooksToDelete.length;
  const getWebhookIndex = (id) => webhooks.findIndex((webhook) => webhook.id === id);

  const fetchWebHooks = async () => {
    try {
      const {
        data: { data },
      } = await get('/admin/webhooks');

      setWebhooks(data);
      notifyStatus('webhooks have been loaded');

      return data;
    } catch (err) {
      toggleNotification({
        type: 'warning',
        message: { id: 'notification.error' },
      });

      return null;
    }
  };
  const QUERY_KEY = 'webhooks';
  const { isLoading: webhooksLoading } = useQuery(QUERY_KEY, fetchWebHooks);
  const loading = RBACLoading || webhooksLoading;

  const { mutateAsync: deleteOne } = useMutation(async () => {
    try {
      await del(`/admin/webhooks/${webhookToDelete}`);

      const webhookIndex = getWebhookIndex(webhookToDelete);

      if (webhookIndex !== -1) {
        setWebhooks((prev) => {
          prev.splice(webhookIndex, 1);

          return [...prev];
        });
      }
    } catch (err) {
      toggleNotification({
        type: 'warning',
        message: { id: 'notification.error' },
      });
    }
    setShowModal(false);
  });

  const { mutateAsync: deleteSelected } = useMutation(async () => {
    const body = {
      ids: webhooksToDelete,
    };

    try {
      await post('/admin/webhooks/batch-delete', body);

      setWebhooks((prevWebhooks) =>
        prevWebhooks.filter((webhook) => !webhooksToDelete.includes(webhook.id))
      );
      setWebhooksToDelete([]);
    } catch (err) {
      toggleNotification({
        type: 'warning',
        message: { id: 'notification.error' },
      });
    }
    setShowModal(false);
  });

  const { mutateAsync: enabledChange } = useMutation(async ({ enabled, id }) => {
    const webhookIndex = getWebhookIndex(id);
    const initialWebhookProps = webhooks[webhookIndex];

    const body = {
      ...initialWebhookProps,
      isEnabled: enabled,
    };

    delete body.id;

    try {
      await put(`/admin/webhooks/${id}`, body);

      setWebhooks((prevWebhooks) =>
        prevWebhooks.map((webhook) =>
          webhook.id === id ? { ...webhook, isEnabled: enabled } : webhook
        )
      );
    } catch (err) {
      toggleNotification({
        type: 'warning',
        message: { id: 'notification.error' },
      });
    }
  });

  const handleToggleModal = () => {
    setShowModal((prev) => !prev);
  };

  const handleConfirmDelete = () => {
    if (webhookToDelete) {
      deleteOne();
    } else {
      deleteSelected();
    }
  };

  const handleDeleteClick = (id) => {
    setShowModal(true);

    if (id !== 'all') {
      setWebhookToDelete(id);
    }
  };

  const handleSelectAllCheckbox = (value) =>
    value ? setWebhooksToDelete(webhooks.map((webhook) => webhook.id)) : setWebhooksToDelete([]);

  const handleSelectOneCheckbox = (value, id) =>
    value
      ? setWebhooksToDelete((prev) => [...prev, id])
      : setWebhooksToDelete((prev) => prev.filter((webhookId) => webhookId !== id));

  const handleGoTo = (to) => {
    push(`${pathname}/${to}`);
  };

  return (
    <Layout>
      <SettingsPageTitle name="Webhooks" />
      <Main aria-busy={loading}>
        <HeaderLayout
          title={formatMessage({ id: 'Settings.webhooks.title', defaultMessage: 'Webhooks' })}
          subtitle={formatMessage({
            id: 'Settings.webhooks.list.description',
            defaultMessage: 'Get POST changes notifications',
          })}
          primaryAction={
            canCreate &&
            !loading && (
              <LinkButton startIcon={<Plus />} variant="default" to={`${pathname}/create`} size="S">
                {formatMessage({
                  id: 'Settings.webhooks.list.button.add',
                  defaultMessage: 'Create new webhook',
                })}
              </LinkButton>
            )
          }
        />
        {webhooksToDeleteLength > 0 && canDelete && (
          <ActionLayout
            startActions={
              <>
                <Typography variant="epsilon" textColor="neutral600">
                  {formatMessage(
                    {
                      id: 'Settings.webhooks.to.delete',
                      defaultMessage:
                        '{webhooksToDeleteLength, plural, one {# asset} other {# assets}} selected',
                    },
                    { webhooksToDeleteLength }
                  )}
                </Typography>
                <Button
                  onClick={() => handleDeleteClick('all')}
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
        <ContentLayout>
          {loading ? (
            <Box background="neutral0" padding={6} shadow="filterShadow" hasRadius>
              <LoadingIndicatorPage />
            </Box>
          ) : rowsCount > 0 ? (
            <Table
              colCount={5}
              rowCount={rowsCount + 1}
              footer={
                <TFooter onClick={() => (canCreate ? handleGoTo('create') : {})} icon={<Plus />}>
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
                    <BaseCheckbox
                      aria-label={formatMessage({
                        id: 'global.select-all-entries',
                        defaultMessage: 'Select all entries',
                      })}
                      indeterminate={
                        webhooksToDeleteLength > 0 && webhooksToDeleteLength < rowsCount
                      }
                      value={webhooksToDeleteLength === rowsCount}
                      onValueChange={handleSelectAllCheckbox}
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
                {webhooks.map((webhook) => (
                  <Tr
                    key={webhook.id}
                    {...onRowClick({
                      fn: () => handleGoTo(webhook.id),
                      condition: canUpdate,
                    })}
                  >
                    <Td {...stopPropagation}>
                      <BaseCheckbox
                        aria-label={`${formatMessage({
                          id: 'global.select',
                          defaultMessage: 'Select',
                        })} ${webhook.name}`}
                        value={webhooksToDelete?.includes(webhook.id)}
                        onValueChange={(value) => handleSelectOneCheckbox(value, webhook.id)}
                        id="select"
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
                    <Td>
                      <Flex {...stopPropagation}>
                        <Switch
                          onLabel={formatMessage({
                            id: 'global.enabled',
                            defaultMessage: 'Enabled',
                          })}
                          offLabel={formatMessage({
                            id: 'global.disabled',
                            defaultMessage: 'Disabled',
                          })}
                          label={`${webhook.name} ${formatMessage({
                            id: 'Settings.webhooks.list.th.status',
                            defaultMessage: 'Status',
                          })}`}
                          selected={webhook.isEnabled}
                          onChange={() =>
                            enabledChange({ enabled: !webhook.isEnabled, id: webhook.id })
                          }
                          visibleLabels
                        />
                      </Flex>
                    </Td>
                    <Td>
                      <Flex gap={1} {...stopPropagation}>
                        {canUpdate && (
                          <IconButton
                            onClick={() => {
                              handleGoTo(webhook.id);
                            }}
                            label={formatMessage({
                              id: 'Settings.webhooks.events.update',
                              defaultMessage: 'Update',
                            })}
                            icon={<Pencil />}
                            noBorder
                          />
                        )}
                        {canDelete && (
                          <IconButton
                            onClick={() => handleDeleteClick(webhook.id)}
                            label={formatMessage({
                              id: 'global.delete',
                              defaultMessage: 'Delete',
                            })}
                            icon={<Trash />}
                            noBorder
                            id={`delete-${webhook.id}`}
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
                <Button
                  variant="secondary"
                  startIcon={<Plus />}
                  onClick={() => (canCreate ? handleGoTo('create') : {})}
                >
                  {formatMessage({
                    id: 'Settings.webhooks.list.button.add',
                    defaultMessage: 'Create new webhook',
                  })}
                </Button>
              }
            />
          )}
        </ContentLayout>
      </Main>
      <ConfirmDialog
        isOpen={showModal}
        onToggleDialog={handleToggleModal}
        onConfirm={handleConfirmDelete}
      />
    </Layout>
  );
};

export default ListView;
