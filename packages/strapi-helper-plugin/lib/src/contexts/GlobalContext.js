import React, { createContext, useContext } from 'react';
import PropTypes from 'prop-types';

const GlobalContext = createContext({});

const GlobalContextProvider = ({ children, ...rest }) => {
  return (
    <GlobalContext.Provider value={rest}>{children}</GlobalContext.Provider>
  );
};

const useGlobalContext = () => useContext(GlobalContext);

GlobalContextProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export { GlobalContext, GlobalContextProvider, useGlobalContext };
