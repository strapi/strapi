import React from 'react';
import PropTypes from 'prop-types';
import LocalesProviderContext from './context';

const LocalesProvider = ({ changeLocale, children, localeNames, messages }) => {
  return (
    <LocalesProviderContext.Provider value={{ changeLocale, localeNames, messages }}>
      {children}
    </LocalesProviderContext.Provider>
  );
};

LocalesProvider.propTypes = {
  changeLocale: PropTypes.func.isRequired,
  children: PropTypes.element.isRequired,
  localeNames: PropTypes.object.isRequired,
  messages: PropTypes.object.isRequired,
};

export default LocalesProvider;
