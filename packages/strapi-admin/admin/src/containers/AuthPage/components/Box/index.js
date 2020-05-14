import React from 'react';
import PropTypes from 'prop-types';
import { Padded, Text } from '@buffetjs/core';
import Wrapper from './Wrapper';

const Box = ({ children, errorMessage }) => (
  <Wrapper>
    <Padded top size="20px">
      <Padded bottom size="25px">
        <Padded left right size="30px">
          <Text fontSize="md" color="#f64d0a" style={{ textAlign: 'center' }}>
            {errorMessage}&nbsp;
          </Text>
          <Padded top size="2px">
            {children}
          </Padded>
        </Padded>
      </Padded>
    </Padded>
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
