/**
 * CTAWrapper
 *
 */

import React from 'react';
import PropTypes from 'prop-types';

function CTAWrapper({ children }) {
  return <div style={style}>{children}</div>;
}

const style = {
  position: 'fixed',
  top: '0',
  right: '0',
  display: 'flex',
  zIndex: '999',
};

CTAWrapper.propTypes = {
  children: PropTypes.node.isRequired,
};

export default CTAWrapper;
