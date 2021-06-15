import React from 'react';
import PropTypes from 'prop-types';
import LocalesProviderContext from './context';

const LocalesProvider = ({ changeLocale, children, localesNativeNames, messages }) => {
  return (
    <LocalesProviderContext.Provider value={{ changeLocale, localesNativeNames, messages }}>
      {children}
    </LocalesProviderContext.Provider>
  );
};

LocalesProvider.propTypes = {
  changeLocale: PropTypes.func.isRequired,
  children: PropTypes.element.isRequired,
  localesNativeNames: PropTypes.object.isRequired,
  messages: PropTypes.object.isRequired,
};

export default LocalesProvider;
