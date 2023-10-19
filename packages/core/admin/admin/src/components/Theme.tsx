import * as React from 'react';

import { DesignSystemProvider } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { ThemeName } from 'src/contexts/themeToggle';
import { createGlobalStyle } from 'styled-components';

import { useThemeToggle } from '../hooks/useThemeToggle';

interface ThemeProps {
  children: React.ReactNode;
}

type NonSystemThemeName = Exclude<ThemeName, 'system'>;

const Theme = ({ children }: ThemeProps) => {
  const { currentTheme, themes } = useThemeToggle();
  const { locale } = useIntl();
  const [systemTheme, setSystemTheme] = React.useState<NonSystemThemeName>();

  // Listen to changes in the system theme
  React.useEffect(() => {
    const themeWatcher = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemTheme(themeWatcher.matches ? 'dark' : 'light');

    themeWatcher.addEventListener('change', (event) => {
      setSystemTheme(event.matches ? 'dark' : 'light');
    });

    // Cleanup on unmount
    return () => {
      themeWatcher.removeEventListener('change', () => {});
    };
  }, []);

  const computedThemeName = currentTheme === 'system' ? systemTheme : currentTheme;

  return (
    <DesignSystemProvider
      locale={locale}
      /**
       * TODO: could we make this neater i.e. by setting up the context to throw
       * if it can't find it, that way the type is always fully defined and we're
       * not checking it all the time...
       */
      theme={themes?.[computedThemeName || 'light']}
    >
      {children}
      <GlobalStyle />
    </DesignSystemProvider>
  );
};

const GlobalStyle = createGlobalStyle`
  body {
    background: ${({ theme }) => theme.colors.neutral100};
  }
`;

export { Theme };
