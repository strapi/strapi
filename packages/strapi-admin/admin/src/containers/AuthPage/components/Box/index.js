import React from 'react';
import PropTypes from 'prop-types';
import { Text } from '@buffetjs/core';
import Wrapper from './Wrapper';

const Box = ({ borderColor, children, errorMessage }) => (
  <Wrapper borderColor={borderColor}>
    <Text fontSize="md" color="#f64d0a" style={{ textAlign: 'center' }} lineHeight="18px">
      {errorMessage}&nbsp;
    </Text>
    {children}
  </Wrapper>
);

Box.defaultProps = {
  borderColor: '#1c5de7',
  errorMessage: null,
};

Box.propTypes = {
  borderColor: PropTypes.string,
  children: PropTypes.node.isRequired,
  errorMessage: PropTypes.string,
};

export default Box;
