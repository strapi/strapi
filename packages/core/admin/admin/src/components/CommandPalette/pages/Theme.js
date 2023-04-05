import React from 'react';
import { Moon, Sun } from '@strapi/icons';
import { useThemeToggle } from '../../../hooks';
import Item from '../Item';
import { useCommand } from '../context';

const THEMES = [
  { name: 'dark', icon: <Moon /> },
  { name: 'light', icon: <Sun /> },
];

const Theme = () => {
  const { onChangeTheme } = useThemeToggle();
  const { page } = useCommand();

  const displayOnSearchOnly = page !== 'theme';

  return (
    <>
      {THEMES.map(({ name, icon }) => {
        const label = `Change theme to ${name}`;

        return (
          <Item
            displayOnSearchOnly={displayOnSearchOnly}
            onSelect={() => onChangeTheme(name)}
            value={label}
          >
            {icon} {label}
          </Item>
        );
      })}
    </>
  );
};

export default Theme;
