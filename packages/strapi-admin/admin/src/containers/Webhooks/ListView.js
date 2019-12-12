/**
 *
 * ListView
 *
 */

import React from 'react';
import { Header } from '@buffetjs/custom';
import { useGlobalContext } from 'strapi-helper-plugin';

function ListView() {
  const { formatMessage } = useGlobalContext();

  const actions = [
    {
      title: formatMessage({ id: `Settings.webhook.list.button` }),
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

  return (
    <div>
      <Header {...headerProps} />
    </div>
  );
}

export default ListView;
