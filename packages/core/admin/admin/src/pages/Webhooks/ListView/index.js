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
  PopUpWarning,
  useRBAC,
  LoadingIndicatorPage,
  useNotification,
  useFocusWhenNavigate,
} from '@strapi/helper-plugin';

import { HeaderLayout, Layout, ContentLayout } from '@strapi/parts/Layout';
import { EmptyStateLayout } from '@strapi/parts/EmptyStateLayout';
import { Row } from '@strapi/parts/Row';
import { Stack } from '@strapi/parts/Stack';
import { IconButton } from '@strapi/parts/IconButton';
import { BaseCheckbox } from '@strapi/parts/BaseCheckbox';
import { Table, Thead, Tr, Th, Tbody, Td, TFooter } from '@strapi/parts/Table';
import { Text, TableLabel } from '@strapi/parts/Text';
import { Button } from '@strapi/parts/Button';
import { VisuallyHidden } from '@strapi/parts/VisuallyHidden';
import { Switch } from '@strapi/parts/Switch';
import { Main } from '@strapi/parts/Main';
import AddIcon from '@strapi/icons/AddIcon';
import EditIcon from '@strapi/icons/EditIcon';
import DeleteIcon from '@strapi/icons/DeleteIcon';
import EmptyStateDocument from '@strapi/icons/EmptyStateDocument';
import reducer, { initialState } from './reducer';
import PageTitle from '../../../components/SettingsPageTitle';
import adminPermissions from '../../../permissions';

function ListView() {
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

  useFocusWhenNavigate();
  const { push } = useHistory();
  const { pathname } = useLocation();
  const rowsCount = webhooks.length;
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
      }
    } catch (err) {
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

    dispatch({
      type: 'SET_WEBHOOK_TO_DELETE',
      id,
    });
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
      <PageTitle name="Webhooks" />
      <Main labelledBy="webhooks" aria-busy={isLoading || loadingWebhooks}>
        <>
          <HeaderLayout
            as="h1"
            id="webhooks"
            title={formatMessage({ id: 'Settings.webhooks.title' })}
            subtitle={formatMessage({ id: 'Settings.webhooks.list.description' })}
            primaryAction={
              <Button
                onClick={() => (canCreate ? handleGoTo('create') : {})}
                startIcon={<AddIcon />}
              >
                {formatMessage({ id: 'Settings.webhooks.list.button.add' })}
              </Button>
            }
          />
          {isLoading || loadingWebhooks ? (
            <LoadingIndicatorPage />
          ) : (
            <ContentLayout>
              <>
                {rowsCount > 0 ? (
                  <Table
                    colCount={5}
                    rowCount={rowsCount + 1}
                    footer={
                      <TFooter
                        onClick={() => (canCreate ? handleGoTo('create') : {})}
                        icon={<AddIcon />}
                      >
                        {formatMessage({ id: 'Settings.webhooks.list.field.add' })}
                      </TFooter>
                    }
                  >
                    <Thead>
                      <Tr>
                        <Th>
                          <BaseCheckbox
                            aria-label={formatMessage({
                              id: 'Settings.webhooks.list.all-entries.select',
                            })}
                            indeterminate={
                              webhooksToDelete.length > 0 && webhooksToDelete.length < rowsCount
                            }
                            value={webhooksToDelete.length === rowsCount}
                            onValueChange={handleSelectAllCheckbox}
                          />
                        </Th>
                        <Th>
                          <TableLabel>
                            {formatMessage({ id: 'Settings.webhooks.form.name' })}
                          </TableLabel>
                        </Th>
                        <Th>
                          <TableLabel>
                            {formatMessage({ id: 'Settings.webhooks.form.url' })}
                          </TableLabel>
                        </Th>
                        <Th width="30%">
                          <TableLabel>
                            {formatMessage({ id: 'Settings.webhooks.list.th.status' })}
                          </TableLabel>
                        </Th>
                        <Th>
                          <VisuallyHidden>
                            {formatMessage({ id: 'Settings.webhooks.list.th.actions' })}
                          </VisuallyHidden>
                        </Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {webhooks.map(webhook => (
                        <Tr key={webhook.id}>
                          <Td>
                            <BaseCheckbox
                              aria-label={`${formatMessage({
                                id: 'Settings.webhooks.list.select',
                              })} ${webhook.name}`}
                              value={webhooksToDelete?.includes(webhook.id)}
                              onValueChange={value => handleSelectOneCheckbox(value, webhook.id)}
                              id="select"
                              name="select"
                            />
                          </Td>
                          <Td>
                            <Text highlighted textColor="neutral800">
                              {webhook.name}
                            </Text>
                          </Td>
                          <Td>
                            <Text textColor="neutral800">{webhook.url}</Text>
                          </Td>
                          <Td>
                            <Row>
                              <Switch
                                onLabel={formatMessage({ id: 'Settings.webhooks.enabled' })}
                                offLabel={formatMessage({
                                  id: 'Settings.webhooks.disabled',
                                })}
                                label={`${webhook.name} ${formatMessage({
                                  id: 'Settings.webhooks.list.th.status',
                                })}`}
                                selected={webhook.isEnabled}
                                onChange={() => handleEnabledChange(!webhook.isEnabled, webhook.id)}
                                visibleLabels
                              />
                            </Row>
                          </Td>
                          <Td>
                            <Stack horizontal size={1}>
                              {canUpdate && (
                                <IconButton
                                  onClick={() => {
                                    handleGoTo(webhook.id);
                                  }}
                                  label={formatMessage({ id: 'Settings.webhooks.events.update' })}
                                  icon={<EditIcon />}
                                  noBorder
                                />
                              )}
                              {canDelete && (
                                <IconButton
                                  onClick={() => handleDeleteClick(webhook.id)}
                                  label={formatMessage({ id: 'Settings.webhooks.events.delete' })}
                                  icon={<DeleteIcon />}
                                  noBorder
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
                    icon={<EmptyStateDocument width="160px" />}
                    content={formatMessage({ id: 'Settings.webhooks.list.empty.description' })}
                    action={
                      <Button
                        variant="secondary"
                        startIcon={<AddIcon />}
                        onClick={() => (canCreate ? handleGoTo('create') : {})}
                      >
                        {formatMessage({ id: 'Settings.webhooks.list.button.add' })}
                      </Button>
                    }
                  />
                )}
              </>
            </ContentLayout>
          )}
        </>
      </Main>
      <PopUpWarning
        isOpen={showModal}
        toggleModal={() => setShowModal(!showModal)}
        popUpWarningType="danger"
        onConfirm={handleConfirmDelete}
      />
    </Layout>
  );
}

export default ListView;
