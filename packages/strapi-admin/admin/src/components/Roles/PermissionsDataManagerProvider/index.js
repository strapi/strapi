import React from 'react';
import PropTypes from 'prop-types';
import { PermissionsDataManagerContext } from '../../../contexts';

const PermissionsDataManagerProvider = ({ children, value }) => {
  return (
    <PermissionsDataManagerContext.Provider value={value}>
      {children}
    </PermissionsDataManagerContext.Provider>
  );
};

PermissionsDataManagerProvider.propTypes = {
  children: PropTypes.node.isRequired,
  value: PropTypes.exact({
    availableConditions: PropTypes.array.isRequired,
    modifiedData: PropTypes.object.isRequired,
    onChangeCollectionTypeLeftActionRowCheckbox: PropTypes.func.isRequired,
    onChangeConditions: PropTypes.func.isRequired,
    onChangeSimpleCheckbox: PropTypes.func.isRequired,
    onChangeParentCheckbox: PropTypes.func.isRequired,
    onChangeCollectionTypeGlobalActionCheckbox: PropTypes.func.isRequired,
  }).isRequired,
};

export default PermissionsDataManagerProvider;
