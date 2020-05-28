import React from 'react';
import PropTypes from 'prop-types';
import { Text } from '@buffetjs/core';
import Wrapper from './Wrapper';

const Box = ({ borderColor, children, errorMessage, withoutError }) => (
  <Wrapper borderColor={borderColor}>
    {!withoutError && (
      <Text fontSize="md" color="#f64d0a" style={{ textAlign: 'center' }} lineHeight="18px">
        {errorMessage}&nbsp;
      </Text>
    )}
    {children}
  </Wrapper>
);

Box.defaultProps = {
  borderColor: '#1c5de7',
  errorMessage: null,
  withoutError: false,
};

Box.propTypes = {
  borderColor: PropTypes.string,
  children: PropTypes.node.isRequired,
  errorMessage: PropTypes.string,
  withoutError: PropTypes.bool,
};

export default Box;
