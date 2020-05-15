import React from 'react';
import PropTypes from 'prop-types';
import { Text } from '@buffetjs/core';
import BaselineAlignment from '../../../../components/BaselineAlignement';
import Wrapper from './Wrapper';

const Box = ({ children, errorMessage }) => (
  <Wrapper>
    <Text fontSize="md" color="#f64d0a" style={{ textAlign: 'center' }}>
      {errorMessage}&nbsp;
    </Text>
    <BaselineAlignment top size="2px">
      {children}
    </BaselineAlignment>
  </Wrapper>
);

Box.defaultProps = {
  errorMessage: null,
};

Box.propTypes = {
  children: PropTypes.node.isRequired,
  errorMessage: PropTypes.string,
};

export default Box;
