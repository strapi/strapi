/**
 * CTAWrapper
 *
 */

import React from 'react';
import PropTypes from 'prop-types';

import Wrapper from './Wrapper';

function CTAWrapper({ children }) {
  return <Wrapper>{children}</Wrapper>;
}

CTAWrapper.propTypes = {
  children: PropTypes.node.isRequired,
};

export default CTAWrapper;
