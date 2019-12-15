/**
 *
 * ListView
 *
 */

import React, { memo } from 'react';

import { Header } from '@buffetjs/custom';
import { useGlobalContext } from 'strapi-helper-plugin';
import { List } from '@buffetjs/custom';

import ListRow from '../../components/ListRow';
import Wrapper from './Wrapper';

import useDataManager from '../../hooks/useDataManager';

function ListView() {
  const { formatMessage } = useGlobalContext();
  const { webhooks } = useDataManager();

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

export default memo(ListView);
