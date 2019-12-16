/**
 *
 * ListView
 *
 */

import React, { useEffect, useReducer } from 'react';

import { Header, List } from '@buffetjs/custom';
import { Button } from '@buffetjs/core';
import { Plus } from '@buffetjs/icons';

import { request, useGlobalContext, ListButton } from 'strapi-helper-plugin';

import ListRow from '../../../components/ListRow';
import EmptyList from '../../../components/EmptyList';
import Wrapper from './Wrapper';

import reducer, { initialState } from './reducer';

function ListView() {
  const { formatMessage } = useGlobalContext();
  const [reducerState, dispatch] = useReducer(reducer, initialState);

  const { webhooks } = reducerState.toJS();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await request(`/admin/webhooks`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
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

    fetchData();
  }, []);

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
    color: 'secondary',
    label: formatMessage({ id: `Settings.webhooks.list.button.delete` }),
    onClick: () => {},
    type: 'button',
  };

  const listProps = {
    title,
    button: buttonProps,
    items: webhooks,
  };

  return (
    <Wrapper>
      <Header {...headerProps} />
      <div className="list-wrapper">
        {rowsCount > 0 ? (
          <List
            {...listProps}
            customRowComponent={props => <ListRow {...props} />}
          />
        ) : (
          <EmptyList />
        )}
        <ListButton>
          <Button {...newButtonProps} />
        </ListButton>
      </div>
    </Wrapper>
  );
}

export default ListView;
