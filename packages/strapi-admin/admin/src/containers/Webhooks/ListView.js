/**
 *
 * ListView
 *
 */

import React from 'react';
import { Header } from '@buffetjs/custom';
import { useGlobalContext } from 'strapi-helper-plugin';
import { List } from '@buffetjs/custom';

import ListRow from '../../components/ListRow';
import Wrapper from './Wrapper';

function ListView() {
  const { formatMessage } = useGlobalContext();

  // Fake data for now
  const data = [
    {
      id: 0,
      name: 'gatsby',
      isEnabled: false,
      url: 'http://thisisanexample.com/1234867874',
      headers: {
        Authorisation: 'x-secret',
      },
      hooks: ['createEntry', 'editEntry', 'deleteEntry', 'createMedia'],
      links: [
        {
          icon: 'pencil',
          onClick: () => {
            console.log('edit');
          },
        },
        {
          icon: 'trash',
          onClick: () => {
            console.log('delete');
          },
        },
      ],
    },
    {
      id: 1,
      name: 'gatsby',
      isEnabled: false,
      url: 'http://thisisanexample.com/1234867874',
      headers: {
        Authorisation: 'x-secret',
      },
      hooks: ['createEntry', 'editEntry', 'deleteEntry', 'createMedia'],
      links: [
        {
          icon: 'pencil',
          onClick: () => {
            console.log('edit');
          },
        },
        {
          icon: 'trash',
          onClick: () => {
            console.log('delete');
          },
        },
      ],
    },
  ];

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

  const rowsCount = data.length;
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
    items: data,
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
