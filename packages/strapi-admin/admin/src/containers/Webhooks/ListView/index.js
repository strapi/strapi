/**
 *
 * ListView
 *
 */

import React, { useEffect, useReducer, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';

import { Header, List } from '@buffetjs/custom';
import { Button } from '@buffetjs/core';
import { Plus } from '@buffetjs/icons';

import {
  request,
  useGlobalContext,
  ListButton,
  PopUpWarning,
} from 'strapi-helper-plugin';

import ListRow from '../../../components/ListRow';
import EmptyList from '../../../components/EmptyList';
import Wrapper from './Wrapper';

import reducer, { initialState } from './reducer';

function ListView() {
  const { formatMessage } = useGlobalContext();
  const [showModal, setShowModal] = useState(false);
  const [reducerState, dispatch] = useReducer(reducer, initialState);
  const { push } = useHistory();
  const { pathname } = useLocation();

  const { webhooks, webhooksToDelete } = reducerState.toJS();

  useEffect(() => {
    fetchData();
  }, []);

  const getWebhookIndex = id =>
    webhooks.findIndex(webhook => webhook.id === id);

  // New button
  const addBtnLabel = formatMessage({
    id: `Settings.webhooks.list.button.add`,
  });

  const newButtonProps = {
    label: addBtnLabel,
    onClick: () => handleGoTo('create'),
    color: 'primary',
    type: 'button',
    icon: <Plus fill="#007eff" width="11px" height="11px" />,
  };

  // Header props
  const actions = [
    {
      ...newButtonProps,
      icon: true,
      style: {
        paddingLeft: 15,
        paddingRight: 15,
      },
    },
  ];

  const headerProps = {
    title: {
      label: formatMessage({ id: `Settings.webhooks.title` }),
    },
    content: formatMessage({ id: `Settings.webhooks.list.description` }),
    actions: actions,
  };

  // List props
  const rowsCount = webhooks.length;
  const titleLabel = `${
    rowsCount > 1
      ? formatMessage({ id: `Settings.webhooks.title` })
      : formatMessage({ id: `Settings.webhooks.singular` })
  }`;
  const title = `${rowsCount} ${titleLabel}`;

  const buttonProps = {
    color: 'delete',
    disabled: webhooksToDelete.length > 0 ? false : true,
    label: formatMessage({ id: `Settings.webhooks.list.button.delete` }),
    onClick: () => setShowModal(true),
    type: 'button',
  };

  const listProps = {
    title,
    button: buttonProps,
    items: webhooks,
  };

  const fetchData = async () => {
    try {
      const { data } = await request(`/admin/webhooks`, {
        method: 'GET',
      });

      dispatch({
        type: 'GET_DATA_SUCCEEDED',
        data,
      });
    } catch (err) {
      if (err.code !== 20) {
        strapi.notification.error('notification.error');
      }
    }
  };

  const handleChange = (value, id) => {
    const updatedWebhooksToDelete = value
      ? [...webhooksToDelete, id]
      : webhooksToDelete.filter(webhookId => webhookId !== id);

    dispatch({
      type: 'SET_WEBHOOKS_TO_DELETE',
      webhooks: updatedWebhooksToDelete,
    });
  };

  const handleDeleteAllConfirm = async () => {
    await onDeleteAllCLick();
    setShowModal(false);
  };

  const handleDeleteConfirm = async id => {
    await onDeleteCLick(id);
    setShowModal(false);
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
        value: value,
      });

      await request(`/admin/webhooks/${id}`, {
        method: 'PUT',
        body,
      });
    } catch (err) {
      dispatch({
        type: 'SET_WEBHOOK_ENABLED',
        keys,
        value: !value,
      });

      if (err.code !== 20) {
        strapi.notification.error('notification.error');
      }
    }
  };

  const handleGoTo = to => {
    push(`${pathname}/${to}`);
  };

  const onDeleteAllCLick = async () => {
    const body = {
      ids: webhooksToDelete,
    };

    try {
      await request(`/admin/webhooks/batch-delete`, {
        method: 'POST',
        body,
      });

      dispatch({
        type: 'WEBHOOKS_DELETED',
      });
    } catch (err) {
      if (err.code !== 20) {
        strapi.notification.error('notification.error');
      }
    }
  };

  const onDeleteCLick = async id => {
    try {
      await request(`/admin/webhooks/${id}`, {
        method: 'DELETE',
      });

      dispatch({
        type: 'WEBHOOK_DELETED',
        index: getWebhookIndex(id),
      });
    } catch (err) {
      if (err.code !== 20) {
        strapi.notification.error('notification.error');
      }
    }
  };

  return (
    <Wrapper>
      <Header {...headerProps} />
      <div className="list-wrapper">
        {rowsCount > 0 ? (
          <List
            {...listProps}
            customRowComponent={props => {
              return (
                <ListRow
                  {...props}
                  onCheckChange={handleChange}
                  onEditClick={handleGoTo}
                  onDeleteCLick={handleDeleteConfirm}
                  onEnabledChange={handleEnabledChange}
                  itemsToDelete={webhooksToDelete}
                />
              );
            }}
          />
        ) : (
          <EmptyList />
        )}
        <ListButton>
          <Button {...newButtonProps} />
        </ListButton>
      </div>
      <PopUpWarning
        isOpen={showModal}
        toggleModal={() => setShowModal(!showModal)}
        popUpWarningType="danger"
        onConfirm={handleDeleteAllConfirm}
      />
    </Wrapper>
  );
}

export default ListView;
