import React from 'react';
import { ThemeProvider } from '@strapi/design-system';
import PropTypes from 'prop-types';
import { useThemeToggle } from '../../hooks';
import GlobalStyle from '../GlobalStyle';

const Theme = ({ children }) => {
  const { currentTheme, themes } = useThemeToggle();

  return (
    <ThemeProvider theme={themes[currentTheme] || themes.light}>
      {children}
      <GlobalStyle />
    </ThemeProvider>
  );
};

Theme.propTypes = {
  children: PropTypes.element.isRequired,
};

export default Theme;
