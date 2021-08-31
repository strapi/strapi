import React from 'react';
import PropTypes from 'prop-types';
import { Text } from '@buffetjs/core';

import Wrapper from './Wrapper';

const Tag = ({ label }) => {
  return (
    <Wrapper>
      <Text color="grey" fontWeight="bold" fontSize="xs" textTransform="uppercase">
        {label}
      </Text>
    </Wrapper>
  );
};

Tag.defaultProps = {
  label: null,
};

Tag.propTypes = {
  label: PropTypes.string,
};

export default Tag;
