import React from 'react';
import { ThemeProvider } from '@strapi/parts/ThemeProvider';
import PropTypes from 'prop-types';
import { lightTheme } from '@strapi/parts/themes';
import GlobalStyle from '../GlobalStyle';

const Theme = ({ children, theme }) => (
  <ThemeProvider theme={theme}>
    {children}
    <GlobalStyle />
  </ThemeProvider>
);

Theme.propTypes = {
  children: PropTypes.element.isRequired,
  theme: PropTypes.object,
};

Theme.defaultProps = {
  theme: lightTheme,
};

export default Theme;
