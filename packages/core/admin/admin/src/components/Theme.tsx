import * as React from 'react';

import { DesignSystemProvider } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { createGlobalStyle } from 'styled-components';

import { useThemeToggle } from '../../hooks/useThemeToggle';

interface ThemeProps {
  children: React.ReactNode;
}

const Theme = ({ children }: ThemeProps) => {
  const { currentTheme, themes } = useThemeToggle();
  const { locale } = useIntl();

  return (
    <DesignSystemProvider locale={locale} theme={themes[currentTheme] || themes.light}>
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
