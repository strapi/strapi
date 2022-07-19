import React, { createContext, useContext } from 'react';
import PropTypes from 'prop-types';

const ApiTokenPermissionsContext = createContext({});

const ApiTokenPermissionsContextProvider = ({ children, ...rest }) => {
  return (
    <ApiTokenPermissionsContext.Provider value={rest}>
      {children}
    </ApiTokenPermissionsContext.Provider>
  );
};

const useApiTokenPermissionsContext = () => useContext(ApiTokenPermissionsContext);

ApiTokenPermissionsContextProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export {
  ApiTokenPermissionsContext,
  ApiTokenPermissionsContextProvider,
  useApiTokenPermissionsContext,
};
