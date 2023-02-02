import React, { createContext, useContext } from 'react';
import PropTypes from 'prop-types';

const TransferTokenPermissionsContext = createContext({});

const TransferTokenPermissionsContextProvider = ({ children, ...rest }) => {
  return (
    <TransferTokenPermissionsContext.Provider value={rest}>
      {children}
    </TransferTokenPermissionsContext.Provider>
  );
};

const useTransferTokenPermissionsContext = () => useContext(TransferTokenPermissionsContext);

TransferTokenPermissionsContextProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export {
  TransferTokenPermissionsContext,
  TransferTokenPermissionsContextProvider,
  useTransferTokenPermissionsContext,
};
