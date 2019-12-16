/**
 *
 * ListView
 *
 */

import React, { useEffect, useReducer } from 'react';

import { Header } from '@buffetjs/custom';
import { request, useGlobalContext } from 'strapi-helper-plugin';
import { List } from '@buffetjs/custom';

import ListRow from '../../../components/ListRow';
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

  // Header props
  const actions = [
    {
      title: formatMessage({ id: `Settings.webhook.list.button.add` }),
      onClick: () => {},
      color: 'primary',
      type: 'button',
      icon: true,
      style: {
        paddingLeft: 15,
        paddingRight: 15,
      },
    },
  ];

  const headerProps = {
    title: {
      label: formatMessage({ id: `Settings.webhook.list.title` }),
    },
    content: formatMessage({ id: `Settings.webhook.list.description` }),
    actions: actions,
  };

  // List props
  const rowsCount = webhooks.length;
  const titleLabel = `${
    rowsCount > 1
      ? formatMessage({ id: `Settings.webhook.list.label.plur` })
      : formatMessage({ id: `Settings.webhook.list.label.sing` })
  }`;
  const title = `${rowsCount} ${titleLabel}`;
  const buttonProps = {
    color: 'secondary',
    label: formatMessage({ id: `Settings.webhook.list.button.delete` }),
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
      <List
        {...listProps}
        customRowComponent={props => <ListRow {...props} />}
      />
    </Wrapper>
  );
}

export default ListView;
