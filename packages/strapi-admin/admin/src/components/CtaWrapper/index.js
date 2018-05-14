/**
 * CtaWrapper
 */

import React from 'react';
import PropTypes from 'prop-types';

function CtaWrapper({ children }) {
  return <div style={style}>{children}</div>;
}

const style = {
  position: 'fixed',
  top: '0',
  right: '0',
  display: 'flex',
  zIndex: '999',
};

CtaWrapper.propTypes = {
  children: PropTypes.node.isRequired,
};

export default CtaWrapper;
