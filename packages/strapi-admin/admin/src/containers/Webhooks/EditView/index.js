/**
 *
 * EditView
 *
 */

import React, { useEffect, useReducer } from 'react';
import { useLocation } from 'react-router-dom';
import { isEmpty, difference } from 'lodash';
import { Header } from '@buffetjs/custom';
import { request, useGlobalContext } from 'strapi-helper-plugin';

import Wrapper from './Wrapper';

import reducer, { initialState } from './reducer';

function EditView() {
  const { formatMessage } = useGlobalContext();
  const [reducerState, dispatch] = useReducer(reducer, initialState);
  const location = useLocation();

  const { modifiedWebhook, initialWebhook } = reducerState.toJS();

  const { name } = modifiedWebhook;

  const id = location.pathname.split('/')[3];
  const isCreatingWebhook = id === 'create';

  useEffect(() => {
    if (!isCreatingWebhook) {
      fetchData();
    }
  }, [fetchData, isCreatingWebhook]);

  const fetchData = async () => {
    try {
      const { data } = await request(`/admin/webhooks/${id}`, {
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

  // Header props
  const headerTitle = isCreatingWebhook
    ? formatMessage({
        id: `Settings.webhooks.create`,
      })
    : name;

  const actionsAreDisabled = isEmpty(
    difference(initialWebhook, modifiedWebhook)
  );

  const actions = [
    {
      onClick: () => {},
      color: 'primary',
      disabled: actionsAreDisabled,
      type: 'button',
      title: formatMessage({
        id: `Settings.webhooks.trigger`,
      }),
      style: {
        paddingRight: 15,
        paddingLeft: 15,
      },
    },
    {
      onClick: () => {},
      color: 'cancel',
      disabled: actionsAreDisabled,
      type: 'button',
      title: formatMessage({
        id: `app.components.Button.reset`,
      }),
      style: {
        paddingRight: 20,
        paddingLeft: 20,
      },
    },
    {
      onClick: () => {},
      color: 'success',
      disabled: actionsAreDisabled,
      type: 'submit',
      title: formatMessage({
        id: `app.components.Button.save`,
      }),
      style: {
        minWidth: 140,
      },
    },
  ];
  const headerProps = {
    title: {
      label: headerTitle,
    },
    actions: actions,
  };

  return (
    <Wrapper>
      <Header {...headerProps} />
      <p>Edit</p>
    </Wrapper>
  );
}

export default EditView;
