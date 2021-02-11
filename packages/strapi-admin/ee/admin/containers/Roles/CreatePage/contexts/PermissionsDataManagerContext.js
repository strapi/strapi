import React, { createContext, useContext } from 'react';
import PropTypes from 'prop-types';

const PermissionsDataManagerContext = createContext({});

const PermissionsDataManagerProvider = ({ children, value }) => {
  return (
    <PermissionsDataManagerContext.Provider value={value}>
      {children}
    </PermissionsDataManagerContext.Provider>
  );
};

const usePermissionsDataManager = () => useContext(PermissionsDataManagerContext);

PermissionsDataManagerProvider.propTypes = {
  children: PropTypes.node.isRequired,
  value: PropTypes.exact({
    modifiedData: PropTypes.object.isRequired,
    onChangeSimpleCheckbox: PropTypes.func.isRequired,
  }).isRequired,
};

export { PermissionsDataManagerContext, PermissionsDataManagerProvider, usePermissionsDataManager };
