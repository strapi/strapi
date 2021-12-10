/**
 *
 * ListView
 *
 */

import React, { useEffect, useReducer, useRef, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { useIntl } from 'react-intl';
import {
  request,
  useRBAC,
  LoadingIndicatorPage,
  useNotification,
  useFocusWhenNavigate,
  SettingsPageTitle,
  ConfirmDialog,
  onRowClick,
  stopPropagation,
} from '@strapi/helper-plugin';
import { HeaderLayout, Layout, ContentLayout, ActionLayout } from '@strapi/design-system/Layout';
import { EmptyStateLayout } from '@strapi/design-system/EmptyStateLayout';
import { Flex } from '@strapi/design-system/Flex';
import { Stack } from '@strapi/design-system/Stack';
import { IconButton } from '@strapi/design-system/IconButton';
import { BaseCheckbox } from '@strapi/design-system/BaseCheckbox';
import { Table, Thead, Tr, Th, Tbody, Td, TFooter } from '@strapi/design-system/Table';
import { Typography } from '@strapi/design-system/Typography';
import { Button } from '@strapi/design-system/Button';
import { VisuallyHidden } from '@strapi/design-system/VisuallyHidden';
import { Switch } from '@strapi/design-system/Switch';
import { Main } from '@strapi/design-system/Main';
import { LinkButton } from '@strapi/design-system/LinkButton';
import { useNotifyAT } from '@strapi/design-system/LiveRegions';
import { Box } from '@strapi/design-system/Box';
import Plus from '@strapi/icons/Plus';
import Pencil from '@strapi/icons/Pencil';
import Trash from '@strapi/icons/Trash';
import EmptyDocuments from '@strapi/icons/EmptyDocuments';
import reducer, { initialState } from './reducer';
import adminPermissions from '../../../../../permissions';

const ListView = () => {
  const {
    isLoading,
    allowedActions: { canCreate, canRead, canUpdate, canDelete },
  } = useRBAC(adminPermissions.settings.webhooks);
  const toggleNotification = useNotification();
  const isMounted = useRef(true);
  const { formatMessage } = useIntl();
  const [showModal, setShowModal] = useState(false);
  const [{ webhooks, webhooksToDelete, webhookToDelete, loadingWebhooks }, dispatch] = useReducer(
    reducer,
    initialState
  );
  const { notifyStatus } = useNotifyAT();

  useFocusWhenNavigate();
  const { push } = useHistory();
  const { pathname } = useLocation();
  const rowsCount = webhooks.length;
  const webhooksToDeleteLength = webhooksToDelete.length;
  const getWebhookIndex = id => webhooks.findIndex(webhook => webhook.id === id);

  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (canRead) {
      fetchWebHooks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canRead]);

  const fetchWebHooks = async () => {
    try {
      const { data } = await request('/admin/webhooks', {
        method: 'GET',
      });

      if (isMounted.current) {
        dispatch({
          type: 'GET_DATA_SUCCEEDED',
          data,
        });
        notifyStatus('webhooks have been loaded');
      }
    } catch (err) {
      console.log(err);

      if (isMounted.current) {
        if (err.code !== 20) {
          toggleNotification({
            type: 'warning',
            message: { id: 'notification.error' },
          });
        }
        dispatch({
          type: 'TOGGLE_LOADING',
        });
      }
    }
  };

  const handleToggleModal = () => {
    setShowModal(prev => !prev);
  };

  const handleConfirmDelete = () => {
    if (webhookToDelete) {
      handleConfirmDeleteOne();
    } else {
      handleConfirmDeleteAll();
    }
  };

  const handleConfirmDeleteOne = async () => {
    try {
      await request(`/admin/webhooks/${webhookToDelete}`, {
        method: 'DELETE',
      });

      dispatch({
        type: 'WEBHOOK_DELETED',
        index: getWebhookIndex(webhookToDelete),
      });
    } catch (err) {
      if (err.code !== 20) {
        toggleNotification({
          type: 'warning',
          message: { id: 'notification.error' },
        });
      }
    }
    setShowModal(false);
  };

  const handleConfirmDeleteAll = async () => {
    const body = {
      ids: webhooksToDelete,
    };

    try {
      await request('/admin/webhooks/batch-delete', {
        method: 'POST',
        body,
      });

      if (isMounted.current) {
        dispatch({
          type: 'WEBHOOKS_DELETED',
        });
      }
    } catch (err) {
      if (isMounted.current) {
        if (err.code !== 20) {
          toggleNotification({
            type: 'warning',
            message: { id: 'notification.error' },
          });
        }
      }
    }
    setShowModal(false);
  };

  const handleDeleteClick = id => {
    setShowModal(true);

    if (id !== 'all') {
      dispatch({
        type: 'SET_WEBHOOK_TO_DELETE',
        id,
      });
    }
  };

  const handleEnabledChange = async (value, id) => {
    const webhookIndex = getWebhookIndex(id);
    const initialWebhookProps = webhooks[webhookIndex];
    const keys = [webhookIndex, 'isEnabled'];

    const body = {
      ...initialWebhookProps,
      isEnabled: value,
    };

    delete body.id;

    try {
      dispatch({
        type: 'SET_WEBHOOK_ENABLED',
        keys,
        value,
      });

      await request(`/admin/webhooks/${id}`, {
        method: 'PUT',
        body,
      });
    } catch (err) {
      if (isMounted.current) {
        dispatch({
          type: 'SET_WEBHOOK_ENABLED',
          keys,
          value: !value,
        });

        if (err.code !== 20) {
          toggleNotification({
            type: 'warning',
            message: { id: 'notification.error' },
          });
        }
      }
    }
  };

  const handleSelectAllCheckbox = () => {
    dispatch({
      type: 'SET_ALL_WEBHOOKS_TO_DELETE',
    });
  };

  const handleSelectOneCheckbox = (value, id) => {
    dispatch({
      type: 'SET_WEBHOOKS_TO_DELETE',
      value,
      id,
    });
  };

  const handleGoTo = to => {
    push(`${pathname}/${to}`);
  };

  return (
    <Layout>
      <SettingsPageTitle name="Webhooks" />
      <Main aria-busy={isLoading || loadingWebhooks}>
        <HeaderLayout
          title={formatMessage({ id: 'Settings.webhooks.title', defaultMessage: 'Webhooks' })}
          subtitle={formatMessage({
            id: 'Settings.webhooks.list.description',
            defaultMessage: 'Get POST changes notifications',
          })}
          primaryAction={
            canCreate &&
            !loadingWebhooks && (
              <LinkButton startIcon={<Plus />} variant="default" to={`${pathname}/create`} size="L">
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
                  Delete
                </Button>
              </>
            }
          />
        )}
        <ContentLayout>
          {isLoading || loadingWebhooks ? (
            <Box background="neutral0" padding={6} shadow="filterShadow" hasRadius>
              <LoadingIndicatorPage />
            </Box>
          ) : (
            <>
              {rowsCount > 0 ? (
                <Table
                  colCount={5}
                  rowCount={rowsCount + 1}
                  footer={
                    <TFooter
                      onClick={() => (canCreate ? handleGoTo('create') : {})}
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
                        <BaseCheckbox
                          aria-label={formatMessage({
                            id: 'Settings.webhooks.list.all-entries.select',
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
                            id: 'Settings.webhooks.form.name',
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
                    {webhooks.map(webhook => (
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
                              id: 'Settings.webhooks.list.select',
                              defaultMessage: 'Select',
                            })} ${webhook.name}`}
                            value={webhooksToDelete?.includes(webhook.id)}
                            onValueChange={value => handleSelectOneCheckbox(value, webhook.id)}
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
                                id: 'Settings.webhooks.enabled',
                                defaultMessage: 'Enabled',
                              })}
                              offLabel={formatMessage({
                                id: 'Settings.webhooks.disabled',
                                defaultMessage: 'Disabled',
                              })}
                              label={`${webhook.name} ${formatMessage({
                                id: 'Settings.webhooks.list.th.status',
                                defaultMessage: 'Status',
                              })}`}
                              selected={webhook.isEnabled}
                              onChange={() => handleEnabledChange(!webhook.isEnabled, webhook.id)}
                              visibleLabels
                            />
                          </Flex>
                        </Td>
                        <Td>
                          <Stack horizontal size={1} {...stopPropagation}>
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
                                  id: 'Settings.webhooks.events.delete',
                                  defaultMessage: 'Delete',
                                })}
                                icon={<Trash />}
                                noBorder
                                id={`delete-${webhook.id}`}
                              />
                            )}
                          </Stack>
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
            </>
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
