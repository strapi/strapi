import * as React from 'react';

import { DesignSystemProvider } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';
import { DefaultTheme, createGlobalStyle } from 'styled-components';

import { useTypedSelector } from '../core/store/hooks';
import { setAvailableThemes } from '../reducer';

interface ThemeProps {
  children: React.ReactNode;
  themes: {
    dark: DefaultTheme;
    light: DefaultTheme;
  };
}

const Theme = ({ children, themes }: ThemeProps) => {
  const { currentTheme } = useTypedSelector((state) => state.admin_app.theme);
  const [systemTheme, setSystemTheme] = React.useState<'light' | 'dark'>();
  const { locale } = useIntl();
  const dispatch = useDispatch();

  // Listen to changes in the system theme
  React.useEffect(() => {
    const themeWatcher = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemTheme(themeWatcher.matches ? 'dark' : 'light');

    const listener = (event: MediaQueryListEvent) => {
      setSystemTheme(event.matches ? 'dark' : 'light');
    };
    themeWatcher.addEventListener('change', listener);

    // Remove listener on cleanup
    return () => {
      themeWatcher.removeEventListener('change', listener);
    };
  }, []);

  React.useEffect(() => {
    dispatch(setAvailableThemes(Object.keys(themes)));
  }, [dispatch, themes]);

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
export type { ThemeProps };
