import { useContext } from 'react';

import { ThemeToggleContext } from '../../contexts';

const useThemeToggle = () => {
  const context = useContext(ThemeToggleContext);

  return context;
};

export default useThemeToggle;
