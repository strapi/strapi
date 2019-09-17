import React, { createContext, useContext } from 'react';
import PropTypes from 'prop-types';

const MarketPlaceContext = createContext({});

const MarketPlaceContextProvider = ({ children, ...rest }) => {
  return (
    <MarketPlaceContext.Provider value={rest}>
      {children}
    </MarketPlaceContext.Provider>
  );
};

const useMarketPlaceContext = () => useContext(MarketPlaceContext);

MarketPlaceContextProvider.propTypes = {
  children: PropTypes.node.isRequired,
  downloadPlugin: PropTypes.func.isRequired,
};

export {
  MarketPlaceContext,
  MarketPlaceContextProvider,
  useMarketPlaceContext,
};
