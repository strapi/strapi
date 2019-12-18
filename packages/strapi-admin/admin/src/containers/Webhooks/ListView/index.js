/**
 *
 * ListView
 *
 */

import React, { useEffect, useReducer, useState } from 'react';

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
  const [webhooksToDelete, setWebhooksToDelete] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [reducerState, dispatch] = useReducer(reducer, initialState);

  const { shouldRefetchData, webhooks } = reducerState.toJS();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (shouldRefetchData) {
      fetchData();
    }
  }, [shouldRefetchData]);

  const webhookIndex = id => webhooks.findIndex(webhook => webhook.id === id);

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

  // New button
  const addBtnLabel = formatMessage({
    id: `Settings.webhooks.list.button.add`,
  });

  const newButtonProps = {
    label: addBtnLabel,
    onClick: () => {},
    color: 'primary',
    type: 'button',
    icon: <Plus fill="#007eff" />,
  };

  // Header props
  const actions = [
    {
      ...newButtonProps,
      title: addBtnLabel,
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

  const handleCheckChange = (value, id) => {
    if (value && !webhooksToDelete.includes(id)) {
      setWebhooksToDelete([...webhooksToDelete, id]);
    }

    if (!value && webhooksToDelete.includes(id)) {
      setWebhooksToDelete([
        ...webhooksToDelete.filter(webhookId => webhookId !== id),
      ]);
    }
  };

  const handleEditClick = id => {
    console.log(id);
  };

  const handleDeleteAllConfirm = () => {
    handleDeleteAllClick();
    setShowModal(false);
  };

  const handleDeleteAllClick = async () => {
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

      setWebhooksToDelete([]);
    } catch (err) {
      if (err.code !== 20) {
        strapi.notification.error('notification.error');
      }
    }
  };

  const handleDeleteClick = id => {
    deleteWebhook(id);
  };

  const deleteWebhook = async id => {
    try {
      await request(`/admin/webhooks/${id}`, {
        method: 'DELETE',
      });

      dispatch({
        type: 'WEBHOOK_DELETED',
        index: webhookIndex(id),
      });
    } catch (err) {
      if (err.code !== 20) {
        strapi.notification.error('notification.error');
      }
    }
  };

  const handleEnabledChange = async (value, id) => {
    const initialWebhookProps = webhooks[webhookIndex(id)];

    const body = {
      ...initialWebhookProps,
      isEnabled: value,
    };

    try {
      await request(`/admin/webhooks/${id}`, {
        method: 'PUT',
        body,
      });

      dispatch({
        type: 'SET_WEBHOOK_ENABLED',
        keys: [webhookIndex(id), 'isEnabled'],
        value: value,
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
                  onCheckChange={handleCheckChange}
                  onEditClick={handleEditClick}
                  onDeleteCLick={handleDeleteClick}
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
