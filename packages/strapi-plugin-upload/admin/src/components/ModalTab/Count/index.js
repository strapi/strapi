import React from 'react';
import PropTypes from 'prop-types';

import Text from '../../Text';
import Wrapper from './Wrapper';

const Count = ({ count, isActive }) => (
  <Wrapper isActive={isActive} justifyContent="center" alignItems="center">
    <Text
      lineHeight="none"
      fontWeight="bold"
      color={isActive ? 'mediumBlue' : 'grey'}
      fontSize="xs"
    >
      {count}
    </Text>
  </Wrapper>
);

Count.propTypes = {
  count: PropTypes.number,
  isActive: PropTypes.bool,
};

Count.defaultProps = {
  count: 0,
  isActive: false,
};

export default Count;
