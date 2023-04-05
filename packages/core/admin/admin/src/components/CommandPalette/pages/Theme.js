import React from 'react';
import { Moon, Sun } from '@strapi/icons';
import { useThemeToggle } from '../../../hooks';
import Items from '../Items';
import { useCommand } from '../context';

const THEMES = [
  { name: 'dark', icon: Moon },
  { name: 'light', icon: Sun },
];

const Theme = () => {
  const { onChangeTheme } = useThemeToggle();
  const { page } = useCommand();

  const items = THEMES.map(({ name, icon }) => {
    const label = `Change theme to ${name}`;

    return {
      icon,
      label,
      action() {
        onChangeTheme(name);
      },
    };
  });

  return <Items items={items} displayOnSearchOnly={page !== 'theme'} />;
};

export default Theme;
