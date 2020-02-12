import React, { createContext, useContext } from 'react';
import PropTypes from 'prop-types';

const HomePageContext = createContext({});

const HomePageContextProvider = ({ children, ...rest }) => {
  return (
    <HomePageContext.Provider value={rest}>{children}</HomePageContext.Provider>
  );
};

const useHomePageContext = () => useContext(HomePageContext);

HomePageContextProvider.propTypes = {
  children: PropTypes.node.isRequired,
  deleteData: PropTypes.func.isRequired,
};

export { HomePageContext, HomePageContextProvider, useHomePageContext };
