/**
 *
 * ThemeToggleProvider
 *
 */

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { ThemeToggleContext } from '../../contexts';

const THEME_KEY = 'STRAPI_THEME';

const getDefaultTheme = () => {
  const browserTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  const persistedTheme = localStorage.getItem(THEME_KEY);

  return persistedTheme || browserTheme;
};

const ThemeToggleProvider = ({ children, themes }) => {
  const [currentTheme, setCurrentTheme] = useState(getDefaultTheme());

  const handleChangeTheme = nextTheme => {
    setCurrentTheme(nextTheme);
    localStorage.setItem(THEME_KEY, nextTheme);
  };

  return (
    <ThemeToggleContext.Provider value={{ currentTheme, onChangeTheme: handleChangeTheme, themes }}>
      {children}
    </ThemeToggleContext.Provider>
  );
};

ThemeToggleProvider.propTypes = {
  children: PropTypes.node.isRequired,
  themes: PropTypes.shape({
    light: PropTypes.shape({
      colors: PropTypes.object.isRequired,
      shadows: PropTypes.object.isRequired,
      sizes: PropTypes.object.isRequired,
      zIndices: PropTypes.array.isRequired,
      spaces: PropTypes.array.isRequired,
      borderRadius: PropTypes.string.isRequired,
      mediaQueries: PropTypes.object.isRequired,
      fontSizes: PropTypes.array.isRequired,
      lineHeights: PropTypes.array.isRequired,
      fontWeights: PropTypes.object.isRequired,
    }).isRequired,
    dark: PropTypes.shape({
      colors: PropTypes.object.isRequired,
      shadows: PropTypes.object.isRequired,
      sizes: PropTypes.object.isRequired,
      zIndices: PropTypes.array.isRequired,
      spaces: PropTypes.array.isRequired,
      borderRadius: PropTypes.string.isRequired,
      mediaQueries: PropTypes.object.isRequired,
      fontSizes: PropTypes.array.isRequired,
      lineHeights: PropTypes.array.isRequired,
      fontWeights: PropTypes.object.isRequired,
    }).isRequired,
    custom: PropTypes.object,
  }).isRequired,
};

export default ThemeToggleProvider;
