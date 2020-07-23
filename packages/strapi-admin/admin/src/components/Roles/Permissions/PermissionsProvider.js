import React from 'react';
import PropTypes from 'prop-types';
import PermissionsContext from '../../../contexts/Permissions';

const PermissionsProvider = ({ children, value }) => {
  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>;
};

PermissionsProvider.propTypes = {
  children: PropTypes.node.isRequired,
  value: PropTypes.object.isRequired,
};

export default PermissionsProvider;
