import React from 'react';
import { Book, Discord, Write, ArrowRight, Layout, Exit, Cog } from '@strapi/icons';
import Item from './Item';
import Group from './Group';
import { useCommand } from './context';
import ContentManager from './pages/ContentManager';
import ContentTypeBuilder from './pages/ContentTypeBuilder';
import Theme from './pages/Theme';
import Settings from './pages/Settings';
import Computer from './icons/Computer';

const Main = () => {
  const { goTo, changePage } = useCommand();

  return (
    <>
      <Group heading="Content Manager">
        <Item onSelect={() => changePage('content-manager')}>
          <Write /> Create entry
        </Item>
        <Item onSelect={() => goTo('/content-manager')}>
          <ArrowRight /> Go to Content Manager
        </Item>
        <ContentManager />
      </Group>
      <Group heading="Content Type Builder">
        <Item onSelect={() => changePage('content-type-builder')}>
          <Layout /> Manage Content Types
        </Item>
        <Item onSelect={() => goTo('/plugins/content-type-builder')}>
          <ArrowRight /> Go to Content Types
        </Item>
        <ContentTypeBuilder />
      </Group>
      <Group heading="General">
        <Item onSelect={() => changePage('theme')}>
          <Computer /> Change Theme
        </Item>
        <Theme />
      </Group>
      <Group heading="Navigation">
        <Item onSelect={() => goTo('/marketplace')}>
          <ArrowRight /> Go to the marketplace
        </Item>
        <Item onSelect={() => goTo('/me')}>
          <ArrowRight /> Go to my profile
        </Item>
        <Item onSelect={() => goTo('/me')}>
          <Exit /> Logout
        </Item>
      </Group>
      <Group heading="Settings">
        <Item onSelect={() => changePage('settings')}>
          <Cog /> Search settings
        </Item>
        <Settings />
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
