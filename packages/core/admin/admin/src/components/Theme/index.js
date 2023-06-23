import React from 'react';

import { DesignSystemProvider } from '@strapi/design-system';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

import { useThemeToggle } from '../../hooks';
import GlobalStyle from '../GlobalStyle';

const Theme = ({ children }) => {
  const { currentTheme, themes } = useThemeToggle();
  const { locale } = useIntl();

  return (
    <DesignSystemProvider locale={locale} theme={themes[currentTheme] || themes.light}>
      {children}
      <GlobalStyle />
    </DesignSystemProvider>
  );
};

Theme.propTypes = {
  children: PropTypes.element.isRequired,
};

export default Theme;
