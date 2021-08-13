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
} from '@strapi/helper-plugin';

import { HeaderLayout, Layout, ContentLayout } from '@strapi/parts/Layout';
import { EmptyStateLayout } from '@strapi/parts/EmptyStateLayout';
import { Row } from '@strapi/parts/Row';
import { Box } from '@strapi/parts/Box';
import { IconButton } from '@strapi/parts/IconButton';
import { BaseCheckbox } from '@strapi/parts/BaseCheckbox';
import { Table, Thead, Tr, Th, Tbody, Td, TFooter } from '@strapi/parts/Table';
import { Text, TableLabel } from '@strapi/parts/Text';
import { Button } from '@strapi/parts/Button';
import { VisuallyHidden } from '@strapi/parts/VisuallyHidden';
import { Switch } from '@strapi/parts/Switch';
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
  const [{ webhooks, webhooksToDelete, webhookToDelete }, dispatch] = useReducer(
    reducer,
    initialState
  );
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
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canRead]);

  const headerProps = {
    title: {
      label: formatMessage({ id: 'Settings.webhooks.title' }),
    },
    content: formatMessage({ id: 'Settings.webhooks.list.description' }),
    addBtnLabel: formatMessage({ id: 'Settings.webhooks.list.button.add' }),
    deleteBtmLabel: formatMessage({ id: 'app.utils.delete' }),
  };

  const fetchData = async () => {
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

  const handleCheckboxChange = (checkbox, value, id) => {
    if (checkbox === 'secondary') {
      dispatch({
        type: 'SET_WEBHOOKS_TO_DELETE',
        value,
        id,
      });
    } else {
      const webhooksIds = webhooks.map(webhook => webhook.id);

      if (webhooksToDelete.length === 0) {
        for (let i = 0; i < webhooksIds.length; i++) {
          dispatch({
            type: 'SET_WEBHOOKS_TO_DELETE',
            value: true,
            id: webhooksIds[i],
          });
        }
      } else {
        for (let i = 0; i < webhooksIds.length; i++) {
          dispatch({
            type: 'SET_WEBHOOKS_TO_DELETE',
            value: false,
            id: webhooksIds[i],
          });
        }
      }
    }
  };

  const handleGoTo = to => {
    push(`${pathname}/${to}`);
  };

  if (isLoading) {
    return <LoadingIndicatorPage />;
  }

  return (
    <Layout>
      <PageTitle name="Webhooks" />
      <HeaderLayout
        title={headerProps.title.label}
        subtitle={headerProps.content}
        primaryAction={(
          <Button onClick={() => (canCreate ? handleGoTo('create') : {})} startIcon={<AddIcon />}>
            {headerProps.addBtnLabel}
          </Button>
        )}
      />

      <ContentLayout>
        <>
          {rowsCount > 0 ? (
            <Table
              colCount={5}
              rowCount={webhooks.length}
              footer={(
                <TFooter onClick={() => (canCreate ? handleGoTo('create') : {})} icon={<AddIcon />}>
                  Add another field to this collection type
                </TFooter>
              )}
            >
              <Thead>
                <Tr>
                  <Th>
                    <BaseCheckbox
                      aria-label="Select all entries"
                      indeterminate={
                        webhooksToDelete.length > 0 && webhooksToDelete.length < webhooks.length
                      }
                      value={webhooksToDelete.length === webhooks.length}
                      onValueChange={value => handleCheckboxChange('main', value)}
                    />
                  </Th>
                  <Th>
                    <TableLabel>name</TableLabel>
                  </Th>
                  <Th>
                    <TableLabel>url</TableLabel>
                  </Th>
                  <Th width="30%">
                    <TableLabel>status</TableLabel>
                  </Th>
                  <Th>
                    <VisuallyHidden>actions</VisuallyHidden>
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {webhooks.map(webhook => (
                  <Tr key={webhook.id}>
                    <Td>
                      <BaseCheckbox
                        aria-label={`Select ${webhook.name}`}
                        value={webhooksToDelete?.includes(webhook.id)}
                        onValueChange={value =>
                          handleCheckboxChange('secondary', value, webhook.id)}
                        id={`Select ${webhook.id}`}
                        name={`Select ${webhook.name}`}
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
                          onLabel="Enabled"
                          offLabel="Not enabled"
                          label={`${webhook.name} status`}
                          selected={webhook.isEnabled}
                          onChange={() => handleEnabledChange(!webhook.isEnabled, webhook.id)}
                          visibleLabels
                        />
                      </Row>
                    </Td>
                    <Td>
                      <Row justifyContent="flex-end">
                        {canUpdate && (
                          <IconButton
                            onClick={() => {
                              handleGoTo(webhook.id);
                            }}
                            label="Edit"
                            icon={<EditIcon />}
                            noBorder
                          />
                        )}
                        {canDelete && (
                          <Box paddingLeft={1}>
                            <IconButton
                              onClick={() => handleDeleteClick(webhook.id)}
                              label="Delete"
                              icon={<DeleteIcon />}
                              noBorder
                            />
                          </Box>
                        )}
                      </Row>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          ) : (
            <EmptyStateLayout
              icon={<EmptyStateDocument width="160px" />}
              content={formatMessage({ id: 'Settings.webhooks.list.empty.description' })}
              action={(
                <Button
                  variant="secondary"
                  startIcon={<AddIcon />}
                  onClick={() => (canCreate ? handleGoTo('create') : {})}
                >
                  {formatMessage({ id: 'Settings.webhooks.list.button.add' })}
                </Button>
              )}
            />
          )}
        </>
      </ContentLayout>
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

// TO KEEP AS EXEMPLE UNTIL WE KNOW HOW TO DEAL WITH EVENTS AND FUNCTIONS DEFINED IN THIS COMPONENT

// {canRead && (
//   <>
//     {rowsCount > 0 ?
//     (
//       <List
//         {...listProps}
//         customRowComponent={props => {
//           return (
//             <ListRow
//               {...props}
//               canUpdate={canUpdate}
//               canDelete={canDelete}
//               onCheckChange={handleChange}
//               onEditClick={handleGoTo}
//               onDeleteCLick={handleDeleteClick}
//               onEnabledChange={handleEnabledChange}
//               itemsToDelete={webhooksToDelete}
//             />
//           );
//         }}
//       />
//     ) : (
//       <EmptyState
//         title={formatMessage({ id: 'Settings.webhooks.list.empty.title' })}
//         description={formatMessage({ id: 'Settings.webhooks.list.empty.description' })}
//         link="https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#webhooks"
//         linkText={formatMessage({ id: 'Settings.webhooks.list.empty.link' })}
//       />
//     )}
//     <ListButton>{canCreate && <Button {...omit(newButtonProps, 'Component')} />}</ListButton>
//   </>
// )}
// <PopUpWarning
//   isOpen={showModal}
//   toggleModal={() => setShowModal(!showModal)}
//   popUpWarningType="danger"
//   onConfirm={handleConfirmDelete}
// />
