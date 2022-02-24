import React from 'react';
import { ThemeProvider } from '@strapi/design-system/ThemeProvider';
import PropTypes from 'prop-types';
import { useThemeToggle } from '../../hooks';
import GlobalStyle from '../GlobalStyle';

const Theme = ({ children }) => {
  const { currentTheme } = useThemeToggle();

  return (
    <ThemeProvider theme={currentTheme}>
      {children}
      <GlobalStyle />
    </ThemeProvider>
  );
};

Theme.propTypes = {
  children: PropTypes.element.isRequired,
};

export default Theme;
