import React, { createContext, useContext } from 'react';
import PropTypes from 'prop-types';

const GlobalContext = createContext({});

const GlobalContextProvider = ({ children, ...rest }) => {
  return <GlobalContext.Provider value={rest}>{children}</GlobalContext.Provider>;
};

const useGlobalContext = () => useContext(GlobalContext);

GlobalContextProvider.defaultProps = {
  emitEvent: () => {},
};

GlobalContextProvider.propTypes = {
  children: PropTypes.node.isRequired,
  emitEvent: PropTypes.func,
};

export { GlobalContext, GlobalContextProvider, useGlobalContext };
