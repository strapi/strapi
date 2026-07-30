import * as React from 'react';

import { DesignSystemProvider } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';
import { type DefaultTheme, createGlobalStyle } from 'styled-components';

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
  const isIos =
    ['iPad Simulator', 'iPhone Simulator', 'iPod Simulator', 'iPad', 'iPhone', 'iPod'].includes(
      navigator.platform
    ) ||
    (navigator.userAgent.includes('Mac') && 'ontouchend' in document);

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
      <GlobalStyle $shouldOverrideInputFontSize={isIos} />
    </DesignSystemProvider>
  );
};

const GlobalStyle = createGlobalStyle<{ $shouldOverrideInputFontSize: boolean }>`
  body {
    background: ${({ theme }) => theme.colors.neutral100};
  }

  // Temporary fix override to fix iOS zoom due to the 14px input font size
  ${({ $shouldOverrideInputFontSize }) =>
    $shouldOverrideInputFontSize
      ? `
    input[type="color"],
    input[type="date"],
    input[type="datetime"],
    input[type="datetime-local"],
    input[type="email"],
    input[type="month"],
    input[type="number"],
    input[type="password"],
    input[type="search"],
    input[type="tel"],
    input[type="text"],
    input[type="time"],
    input[type="url"],
    input[type="week"],
    select:focus,
    textarea {
      font-size: 16px !important;
      line-height: 2.4rem !important;
    }
  `
      : undefined}
`;

export { Theme };
export type { ThemeProps };
