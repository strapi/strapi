import React from 'react';
import PropTypes from 'prop-types';
import { Text } from '@buffetjs/core';
import Wrapper from './Wrapper';

const Box = ({ children, errorMessage, withoutError }) => (
  <Wrapper>
    {!withoutError && (
      <Text fontSize="md" color="#f64d0a" style={{ textAlign: 'center' }} lineHeight="18px">
        {errorMessage}&nbsp;
      </Text>
    )}
    {children}
  </Wrapper>
);

Box.defaultProps = {
  errorMessage: null,
  withoutError: false,
};

Box.propTypes = {
  children: PropTypes.node.isRequired,
  errorMessage: PropTypes.string,
  withoutError: PropTypes.bool,
};

export default Box;
