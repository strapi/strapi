/* eslint-disable no-nested-ternary */
import React, { useEffect, useState } from 'react';

import {
  ActionLayout,
  BaseCheckbox,
  Box,
  Button,
  ContentLayout,
  EmptyStateLayout,
  Flex,
  HeaderLayout,
  IconButton,
  Layout,
  Main,
  Switch,
  Table,
  Tbody,
  Td,
  TFooter,
  Th,
  Thead,
  Tr,
  Typography,
  useNotifyAT,
  VisuallyHidden,
} from '@strapi/design-system';
import {
  ConfirmDialog,
  LinkButton,
  LoadingIndicatorPage,
  onRowClick,
  SettingsPageTitle,
  stopPropagation,
  useAPIErrorHandler,
  useFetchClient,
  useFocusWhenNavigate,
  useNotification,
  useRBAC,
} from '@strapi/helper-plugin';
import { EmptyDocuments, Pencil, Plus, Trash } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { useMutation, useQuery } from 'react-query';
import { useSelector } from 'react-redux';
import { useHistory, useLocation } from 'react-router-dom';

import { selectAdminPermissions } from '../../../../App/selectors';

const ListView = () => {
  const [showModal, setShowModal] = useState(false);
  const [webhooksToDelete, setWebhooksToDelete] = useState([]);
  const permissions = useSelector(selectAdminPermissions);
  const { formatMessage } = useIntl();
  const { formatAPIError } = useAPIErrorHandler();
  const toggleNotification = useNotification();
  useFocusWhenNavigate();
  const { push } = useHistory();
  const { pathname } = useLocation();

  const {
    isLoading: isRBACLoading,
    allowedActions: { canCreate, canUpdate, canDelete },
  } = useRBAC(permissions.settings.webhooks);
  const { get, post, put } = useFetchClient();
  const { notifyStatus } = useNotifyAT();

  const QUERY_KEY = 'webhooks';
  const {
    isLoading: isWebhooksLoading,
    data: webhooks,
    error: webhooksError,
    refetch: refetchWebhooks,
  } = useQuery(QUERY_KEY, async () => {
    const {
      data: { data },
    } = await get('/admin/webhooks');

    return data;
  });

  useEffect(() => {
    if (webhooksError) {
      toggleNotification({
        type: 'warning',
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

  const deleteMutation = useMutation(
    async () => {
      await post('/admin/webhooks/batch-delete', {
        ids: webhooksToDelete,
      });
    },
    {
      onError(error) {
        toggleNotification({
          type: 'warning',
          message: formatAPIError(error),
        });
        setShowModal(false);
      },
      onSuccess() {
        setWebhooksToDelete([]);
        setShowModal(false);
        refetchWebhooks();
      },
    }
  );

  const enabledMutation = useMutation(
    async ({ isEnabled, id }) => {
      const { id: _, ...webhook } = webhooks.find((webhook) => webhook.id === id) ?? {};
      const body = {
        ...webhook,
        isEnabled,
      };

      await put(`/admin/webhooks/${id}`, body);
    },
    {
      onError(error) {
        toggleNotification({
          type: 'warning',
          message: formatAPIError(error),
        });
      },
      onSuccess() {
        refetchWebhooks();
      },
    }
  );

  const confirmDelete = () => deleteMutation.mutate();

  const selectAllCheckbox = (selected) =>
    selected ? setWebhooksToDelete(webhooks.map((webhook) => webhook.id)) : setWebhooksToDelete([]);

  const selectOneCheckbox = (selected, id) =>
    selected
      ? setWebhooksToDelete((prev) => [...prev, id])
      : setWebhooksToDelete((prev) => prev.filter((webhookId) => webhookId !== id));

  const goTo = (to) => push(`${pathname}/${to}`);

  const isLoading = isRBACLoading || isWebhooksLoading;
  const numberOfWebhooks = webhooks?.length ?? 0;
  const webhooksToDeleteLength = webhooksToDelete.length;

  return (
    <Layout>
      <SettingsPageTitle name="Webhooks" />
      <Main aria-busy={isLoading}>
        <HeaderLayout
          title={formatMessage({ id: 'Settings.webhooks.title', defaultMessage: 'Webhooks' })}
          subtitle={formatMessage({
            id: 'Settings.webhooks.list.description',
            defaultMessage: 'Get POST changes notifications',
          })}
          primaryAction={
            canCreate &&
            !isLoading && (
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
        <ContentLayout>
          {isLoading ? (
            <Box background="neutral0" padding={6} shadow="filterShadow" hasRadius>
              <LoadingIndicatorPage />
            </Box>
          ) : numberOfWebhooks > 0 ? (
            <Table
              colCount={5}
              rowCount={numberOfWebhooks + 1}
              footer={
                <TFooter onClick={() => (canCreate ? goTo('create') : {})} icon={<Plus />}>
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
                        webhooksToDeleteLength > 0 && webhooksToDeleteLength < numberOfWebhooks
                      }
                      value={webhooksToDeleteLength === numberOfWebhooks}
                      onValueChange={selectAllCheckbox}
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
                      fn: () => goTo(webhook.id),
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
                        onValueChange={(selected) => selectOneCheckbox(selected, webhook.id)}
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
                          label={`${webhook.name} ${formatMessage({
                            id: 'Settings.webhooks.list.th.status',
                            defaultMessage: 'Status',
                          })}`}
                          selected={webhook.isEnabled}
                          onChange={(e) => {
                            e.stopPropagation();
                            enabledMutation.mutate({
                              isEnabled: !webhook.isEnabled,
                              id: webhook.id,
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
                            icon={<Pencil />}
                            noBorder
                          />
                        )}
                        {canDelete && (
                          <IconButton
                            onClick={(e) => {
                              e.stopPropagation();
                              setWebhooksToDelete([webhook.id]);
                              setShowModal(true);
                            }}
                            label={formatMessage({
                              id: 'Settings.webhooks.events.delete',
                              defaultMessage: 'Delete webhook',
                            })}
                            icon={<Trash />}
                            noBorder
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
                  onClick={() => (canCreate ? goTo('create') : {})}
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
        onToggleDialog={() => setShowModal((prev) => !prev)}
        onConfirm={confirmDelete}
        isConfirmButtonLoading={deleteMutation.isLoading}
      />
    </Layout>
  );
};

export default ListView;
