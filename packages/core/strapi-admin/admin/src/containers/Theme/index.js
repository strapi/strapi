import React from 'react';
import { ThemeProvider } from 'styled-components';
import PropTypes from 'prop-types';
import themes from '../../themes';

const Theme = ({ children }) => {
  return <ThemeProvider theme={themes}>{children}</ThemeProvider>;
};

Theme.propTypes = {
  children: PropTypes.node.isRequired,
};

export default Theme;
