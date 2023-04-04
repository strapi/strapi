import React from 'react';
import { useIntl } from 'react-intl';
import { Book, Discord, Write, ArrowRight, Layout } from '@strapi/icons';

import { useMenu } from '../../hooks';
import Item from './Item';
import Group from './Group';
import { useCommand } from './context';
import ContentManager from './ContentManager';
import ContentTypeBuilder from './ContentTypeBuilder';

const Main = () => {
  const { generalSectionLinks } = useMenu();
  const { formatMessage } = useIntl();
  const { goTo, changePage } = useCommand();

  return (
    <>
      <Group heading="Content Manager">
        <Item onSelect={() => changePage('content-manager')}>
          <Write /> Create entry...
        </Item>
        <Item onSelect={() => goTo('/content-manager')}>
          <ArrowRight /> Go to Content Manager
        </Item>
        <ContentManager />
      </Group>
      <Group heading="Content Type Builder">
        <Item onSelect={() => changePage('content-type-builder')}>
          <Layout /> Manage Content Types...
        </Item>
        <Item onSelect={() => goTo('/plugins/content-type-builder')}>
          <ArrowRight /> Go to Content Types
        </Item>
        <ContentTypeBuilder />
      </Group>

      <Group heading="Navigation">
        {generalSectionLinks.map((d) => {
          return (
            <Item key={d.to} onSelect={() => goTo(d.to)}>
              {d.icon()} {formatMessage(d.intlLabel)}
            </Item>
          );
        })}
      </Group>
      <Group heading="Help">
        <Item
          onSelect={() => {
            window.open('https://docs.strapi.io/', '_blank');
          }}
        >
          <Book /> Search the documentation
        </Item>
        <Item
          onSelect={() => {
            window.open('https://discord.strapi.io/', '_blank');
          }}
        >
          <Discord /> Get help
        </Item>
      </Group>
    </>
  );
};

export default Main;
