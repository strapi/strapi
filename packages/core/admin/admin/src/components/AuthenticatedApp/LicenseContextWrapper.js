import React from 'react';
import PropTypes from 'prop-types';

// This wrapper is needed for ee_else_ce component substitution to add ee specific license context in ee mode
const LicenseContextWrapper = ({ children }) => {
  // eslint-disable-next-line react/jsx-no-useless-fragment
  return <>{children}</>;
};

LicenseContextWrapper.propTypes = {
  children: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.node), PropTypes.node]).isRequired,
};

export default LicenseContextWrapper;
