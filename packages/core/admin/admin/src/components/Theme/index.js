import React from 'react';
import { ThemeProvider } from 'styled-components';
import PropTypes from 'prop-types';
// import GlobalStyle from '../GlobalStyle';
import Fonts from '../Fonts';

const Theme = ({ children, theme }) => (
  <ThemeProvider theme={theme}>
    {/* <GlobalStyle /> */}
    <Fonts />
    {children}
  </ThemeProvider>
);

Theme.propTypes = {
  children: PropTypes.element.isRequired,
  theme: PropTypes.object.isRequired,
};

export default Theme;
