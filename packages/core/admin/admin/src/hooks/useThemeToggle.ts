import { useContext } from 'react';

import { ThemeToggleContext } from '../contexts/themeToggle';

export const useThemeToggle = () => {
  const context = useContext(ThemeToggleContext);

  return context;
};
