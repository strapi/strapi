import React from 'react';
import { Book, Discord, Write, ArrowRight, Layout, Cog } from '@strapi/icons';
import ContentManager from './pages/ContentManager';
import ContentTypeBuilder from './pages/ContentTypeBuilder';
import Theme from './pages/Theme';
import Settings from './pages/Settings';
import Computer from './icons/Computer';
import Groups from './Groups';

/** @type {import('./types').Items}  */
const items = [
  {
    group: 'Content Manager',
    icon: Write,
    label: 'Create entry',
    action({ changePage }) {
      changePage('content-manager');
    },
  },
  {
    group: 'Content Manager',
    icon: ArrowRight,
    label: 'Go to Content Manager',
    action({ goTo }) {
      goTo('/content-manager');
    },
  },
  {
    group: 'Content Manager',
    component: ContentManager,
  },
  {
    group: 'Content Type Builder',
    icon: Layout,
    label: 'Manage Content Types',
    action({ changePage }) {
      changePage('content-type-builder');
    },
  },
  {
    group: 'Content Type Builder',
    icon: ArrowRight,
    label: 'Go to Content Type Builder',
    action({ goTo }) {
      goTo('/plugins/content-type-builder');
    },
  },
  {
    group: 'Content Type Builder',
    component: ContentTypeBuilder,
  },
  {
    group: 'General',
    icon: Computer,
    label: 'Change Theme',
    action({ changePage }) {
      changePage('theme');
    },
  },
  {
    group: 'General',
    component: Theme,
  },
  {
    group: 'Navigation',
    icon: ArrowRight,
    label: 'Go to the marketplace',
    action({ goTo }) {
      goTo('/marketplace');
    },
  },
  {
    group: 'Navigation',
    icon: ArrowRight,
    label: 'Go to my profile',
    action({ goTo }) {
      goTo('/me');
    },
  },
  {
    group: 'Settings',
    icon: Cog,
    label: 'Search settings',
    action({ changePage }) {
      changePage('settings');
    },
  },
  {
    group: 'Settings',
    component: Settings,
  },
  {
    group: 'Help',
    icon: Book,
    label: 'Search the documentation',
    action() {
      window.open('https://docs.strapi.io/', '_blank');
    },
  },
  {
    group: 'Help',
    icon: Discord,
    label: 'Get help',
    action() {
      window.open('https://discord.strapi.io/', '_blank');
    },
  },
];

const Main = () => {
  return <Groups items={items} />;
};

export default Main;
