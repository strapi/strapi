import React, { createContext, useContext } from 'react';
import PropTypes from 'prop-types';

const GlobalContext = createContext({});

const GlobalContextProvider = ({ children, ...rest }) => {
  return (
    <GlobalContext.Provider value={rest}>{children}</GlobalContext.Provider>
  );
};

const useGlobalContext = () => useContext(GlobalContext);

GlobalContextProvider.defaultProps = {
  currentEnvironment: 'development',
  disableGlobalOverlayBlocker: () => {},
  emitEvent: () => {},
  enableGlobalOverlayBlocker: () => {},
  plugins: {},
  updatePlugin: () => {},
};

GlobalContextProvider.propTypes = {
  children: PropTypes.node.isRequired,
  currentEnvironment: PropTypes.string,
  disableGlobalOverlayBlocker: PropTypes.func,
  emitEvent: PropTypes.func,
  enableGlobalOverlayBlocker: PropTypes.func,
};

export { GlobalContext, GlobalContextProvider, useGlobalContext };
