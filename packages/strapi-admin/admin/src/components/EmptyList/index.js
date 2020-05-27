/**
 *
 * ListView
 *
 */

import React from 'react';
import { useGlobalContext } from 'strapi-helper-plugin';

import Wrapper from './Wrapper';

function EmptyList() {
  const { formatMessage } = useGlobalContext();

  return (
    <Wrapper>
      <p>{formatMessage({ id: 'Settings.webhooks.list.empty.title' })}</p>
      <p>{formatMessage({ id: 'Settings.webhooks.list.empty.description' })}</p>
      <a
        href="https://strapi.io/documentation/v3.x/concepts/webhooks.html"
        target="_blank"
        rel="noopener noreferrer"
      >
        {formatMessage({ id: 'Settings.webhooks.list.empty.link' })}
      </a>
    </Wrapper>
  );
}

export default EmptyList;
