import React from 'react';
import { ThemeProvider } from '@strapi/parts/ThemeProvider';
import { ThemeProvider as TP } from 'styled-components';
import PropTypes from 'prop-types';
import { lightTheme } from '@strapi/parts';
import themes from '../../themes';
import GlobalStyle from '../GlobalStyle';

const Theme = ({ children, theme }) => (
  <ThemeProvider theme={theme}>
    <TP theme={themes}>
      {children}
      <GlobalStyle />
    </TP>
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
