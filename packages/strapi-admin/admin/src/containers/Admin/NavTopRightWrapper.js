import React from 'react';
import PropTypes from 'prop-types';

const style = {
  position: 'fixed',
  top: '0',
  right: '0',
  display: 'flex',
  zIndex: '1050',
};

function NavWrapper({ children }) {
  return <div style={style}>{children}</div>;
}

NavWrapper.propTypes = {
  children: PropTypes.node,
};

NavWrapper.defaultProps = {
  children: null,
};

export default NavWrapper;
